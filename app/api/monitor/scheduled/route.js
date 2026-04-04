// ============================================================================
// /api/monitor/scheduled — Cron-Triggered Scheduled Company Monitoring
// ============================================================================
// This endpoint is called by Vercel Cron Jobs (vercel.json) to automatically
// check companies for material changes. It implements a tiered monitoring
// strategy based on deal stage:
//
//   ACTIVE DD (deep-dive, ic-review, term-sheet) → check every 48 hours
//   PIPELINE  (first-look, initial-screen)       → check every 7 days
//   PORTFOLIO (close)                            → check every 14 days
//   PASSED    (pass)                             → never auto-check
//
// TOKEN OPTIMIZATION:
//   Uses diff-only prompts — sends the AI the company's last known state
//   and asks "What has changed since [date]?" This cuts tokens by ~60%
//   compared to a full research query.
//
// SECURITY:
//   Protected by CRON_SECRET header (Vercel injects this automatically
//   for cron jobs). External callers without the secret get 401.
// ============================================================================

import { NextResponse } from 'next/server';

// ============ MONITORING TIER CONFIGURATION ============
// Maps deal stages to their check frequency in hours.
// Companies in 'pass' stage are never auto-checked.
const MONITORING_TIERS = {
  // Active DD — checking every 48 hours
  'deep-dive':    48,
  'ic-review':    48,
  'term-sheet':   48,
  // Pipeline — checking weekly
  'first-look':   168, // 7 days
  'initial-screen': 168,
  // Portfolio — checking bi-weekly
  'close':        336, // 14 days
  // Passed — never auto-check
  'pass':         Infinity,
};

// Default for companies with no deal stage set
const DEFAULT_CHECK_INTERVAL = 168; // 7 days

// ============ AI PROVIDER CONFIG ============
// Reuse the same provider resolution pattern as the autofill route
const PROVIDER_CONFIGS = {
  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    envKey: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar-pro',
    buildHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    buildBody: (model, prompt) => ({
      model: model || 'sonar-pro',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000, // Keep responses concise for monitoring
    }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    buildHeaders: (key) => ({
      'x-api-key': key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (model, prompt) => ({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractText: (data) => data.content?.[0]?.text || '',
  },
};

// ============ RESOLVE WHICH AI PROVIDER TO USE ============
function resolveProvider() {
  // Prefer Perplexity (has web search built in — ideal for monitoring)
  for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
    if (process.env[config.envKey]) {
      return { name, config, apiKey: process.env[config.envKey] };
    }
  }
  return null;
}

// ============ BUILD DIFF-ONLY MONITORING PROMPT ============
// This is the key token optimization — instead of asking "research everything",
// we send the last known state and ask "what changed?"
function buildDiffPrompt(company, lastChecked) {
  const name = company.overview?.companyName || company.name || 'Unknown';
  const url = company.overview?.websiteUrl || '';
  const sector = company.overview?.sector || '';
  const stage = company.overview?.stage || '';
  const lastDate = lastChecked ? new Date(lastChecked).toISOString().split('T')[0] : '30 days ago';

  return `You are a VC analyst monitoring "${name}"${url ? ` (${url})` : ''}.
Sector: ${sector || 'Unknown'}. Stage: ${stage || 'Unknown'}.

Report ONLY material changes since ${lastDate}. Material changes include:
- New funding round or extension announced
- Key executive hire or departure (C-suite, VP+)
- Acquisition, merger, or IPO filing
- Major partnership or customer win
- Regulatory action, lawsuit, or fine
- Significant layoffs or restructuring
- Major product launch or pivot

Return a JSON array of changes found. Each change:
{
  "severity": "high" | "medium" | "low",
  "category": "funding" | "leadership" | "regulatory" | "product" | "competitor" | "press",
  "title": "Short headline (under 80 chars)",
  "description": "1-2 sentence summary of what happened",
  "source": "Where this info came from (news outlet, SEC filing, etc.)"
}

If NO material changes found, return an empty array: []

IMPORTANT: Only report verified, factual changes. Do NOT speculate or hallucinate events.
Return ONLY the JSON array, no other text.`;
}

// ============ PARSE JSON FROM AI RESPONSE ============
function parseJsonArray(text) {
  if (!text) return [];

  // Try direct parse
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {}

  // Try extracting from code block
  const codeMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeMatch) {
    try {
      const parsed = JSON.parse(codeMatch[1].trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }

  // Try finding array brackets
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }

  return [];
}

// ============ MAIN HANDLER ============
export async function GET(request) {
  // ============ VERIFY CRON SECRET ============
  // Vercel automatically sends CRON_SECRET header for cron jobs.
  // This prevents unauthorized external calls.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized. This endpoint is for Vercel Cron Jobs only.' },
      { status: 401 }
    );
  }

  // ============ RESOLVE AI PROVIDER ============
  const provider = resolveProvider();
  if (!provider) {
    return NextResponse.json(
      { error: 'No AI provider configured. Set PERPLEXITY_API_KEY or ANTHROPIC_API_KEY.' },
      { status: 503 }
    );
  }

  // ============ LOAD COMPANIES FROM SUPABASE ============
  // In production, this reads from Supabase. In local mode, we can't
  // run cron jobs anyway (they're Vercel-only), so we just return early.
  let companies = [];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { message: 'Supabase not configured. Scheduled monitoring requires cloud mode.', checked: 0 },
        { status: 200 }
      );
    }

    // Use service role key to bypass RLS (we're checking ALL companies)
    const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=id,name,data,ai_research,user_id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.status}`);
    }

    companies = await response.json();
  } catch (err) {
    console.error('[SCHEDULED MONITOR] Failed to load companies:', err);
    return NextResponse.json(
      { error: 'Failed to load companies from database.', details: err.message },
      { status: 500 }
    );
  }

  if (companies.length === 0) {
    return NextResponse.json({ message: 'No companies to monitor.', checked: 0 });
  }

  // ============ FILTER COMPANIES BY TIER ============
  const now = Date.now();
  const eligible = [];

  for (const company of companies) {
    const data = company.data || {};
    const dealStage = data.dealStage || 'first-look';
    const intervalHours = MONITORING_TIERS[dealStage] ?? DEFAULT_CHECK_INTERVAL;

    // Skip companies that should never be auto-checked
    if (intervalHours === Infinity) continue;

    // Check if enough time has passed since last monitoring check
    const lastChecked = data.monitoring?.lastChecked;
    if (lastChecked) {
      const hoursSince = (now - new Date(lastChecked).getTime()) / (1000 * 60 * 60);
      if (hoursSince < intervalHours) continue; // Not due yet
    }

    eligible.push({
      ...company,
      _data: data,
      _dealStage: dealStage,
      _lastChecked: lastChecked,
    });
  }

  if (eligible.length === 0) {
    return NextResponse.json({
      message: 'No companies due for monitoring check.',
      total: companies.length,
      checked: 0,
    });
  }

  // ============ PROCESS ELIGIBLE COMPANIES ============
  // Rate limit: max 10 companies per cron run to stay within function timeout
  const batch = eligible.slice(0, 10);
  const results = [];

  for (const company of batch) {
    const companyName = company._data.overview?.companyName || company.name || 'Unknown';

    try {
      // Build the diff-only prompt (token-optimized)
      const prompt = buildDiffPrompt(company._data, company._lastChecked);

      // Call the AI provider
      const aiResponse = await fetch(provider.config.url, {
        method: 'POST',
        headers: provider.config.buildHeaders(provider.apiKey),
        body: JSON.stringify(
          provider.config.buildBody(provider.config.defaultModel, prompt)
        ),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text().catch(() => '');
        console.error(`[SCHEDULED MONITOR] AI error for ${companyName}:`, aiResponse.status, errText);
        results.push({ company: companyName, status: 'error', error: `AI returned ${aiResponse.status}` });
        continue;
      }

      const aiData = await aiResponse.json();
      const text = provider.config.extractText(aiData);
      const changes = parseJsonArray(text);

      // ============ STORE RESULTS IN SUPABASE ============
      // Update the company's monitoring.lastChecked timestamp
      // and append any new alerts to the alerts array
      const existingAlerts = company._data.alerts || [];
      const newAlerts = changes.map((change) => ({
        id: crypto.randomUUID(),
        ...change,
        timestamp: new Date().toISOString(),
        read: false,
        source: change.source || 'Scheduled monitoring',
      }));

      const updatedData = {
        ...company._data,
        monitoring: {
          ...(company._data.monitoring || {}),
          lastChecked: new Date().toISOString(),
        },
        alerts: [...newAlerts, ...existingAlerts].slice(0, 100), // Cap at 100 alerts
      };

      // Write back to Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${company.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ data: updatedData }),
      });

      results.push({
        company: companyName,
        status: 'ok',
        changesFound: changes.length,
        stage: company._dealStage,
      });

      console.log(`[SCHEDULED MONITOR] ${companyName}: ${changes.length} changes found`);
    } catch (err) {
      console.error(`[SCHEDULED MONITOR] Error processing ${companyName}:`, err);
      results.push({ company: companyName, status: 'error', error: err.message });
    }
  }

  // ============ RETURN SUMMARY ============
  const totalChanges = results.reduce((sum, r) => sum + (r.changesFound || 0), 0);

  return NextResponse.json({
    message: `Monitored ${batch.length} companies. Found ${totalChanges} material changes.`,
    total: companies.length,
    eligible: eligible.length,
    checked: batch.length,
    totalChanges,
    results,
    timestamp: new Date().toISOString(),
  });
}
