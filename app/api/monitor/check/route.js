// ============================================================================
// app/api/monitor/check/route.js — Company Monitoring Check API
// ============================================================================
// POST endpoint that checks for recent news and material events for a company.
// Used by the MonitoringView "Check for Updates" button to scan for:
//   - Funding events (new rounds, valuations, investor changes)
//   - Leadership changes (exec hires, departures, board changes)
//   - Competitor activity (competitor raises, launches, acquisitions)
//   - Regulatory/legal issues (lawsuits, compliance, regulatory actions)
//   - Product launches (new features, pivots, major releases)
//   - Press/media coverage (positive and negative)
//
// Uses the same PROVIDER_CONFIGS + resolveProvider pattern as the autofill route
// so server-side API keys are never exposed to the client. Perplexity is preferred
// because its web search capability is critical for finding recent news.
//
// Returns structured JSON: { alerts: [{ severity, category, title, description, source, timestamp }] }
// Maximum 10 alerts per check to keep responses focused and actionable.
// ============================================================================

import { NextResponse } from 'next/server';

// ============ AUTHENTICATION ============
// Require a valid session — monitoring checks call external AI providers.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Monitoring checks hit external AI APIs, so we rate-limit to prevent abuse.
// Uses the same rateLimitByApiRoute as autofill (10 req/min per IP).
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================
// Identical structure to /api/ai/autofill — each provider has its own URL,
// env key, default model, header builder, body builder, and response extractor.
// We duplicate rather than import because API routes should be self-contained
// and the monitoring prompt needs different token limits than autofill.
const PROVIDER_CONFIGS = {
  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    envKey: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar-pro',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.1, // low temp for factual, structured monitoring output
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },

  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 4096,
      temperature: 0.1,
    }),
    extractText: (data) => data?.content?.[0]?.text || '',
  },

  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },

  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },
};

// ============================================================================
// RESOLVE PROVIDER & API KEY
// ============================================================================
// SERVER-SIDE ONLY: API keys come from environment variables, never from the client.
// Priority: Perplexity (web search = critical for monitoring) > Anthropic > OpenAI > Groq
function resolveProvider(requestedProvider) {
  // If a specific provider was requested and has a server-side key, use it
  if (requestedProvider && PROVIDER_CONFIGS[requestedProvider]) {
    const config = PROVIDER_CONFIGS[requestedProvider];
    const apiKey = process.env[config.envKey];
    if (apiKey) {
      return { provider: requestedProvider, config, apiKey };
    }
  }

  // Auto-detect: try providers in priority order using SERVER env vars only
  const priority = ['perplexity', 'anthropic', 'openai', 'groq'];
  for (const provKey of priority) {
    const config = PROVIDER_CONFIGS[provKey];
    const apiKey = process.env[config.envKey];
    if (apiKey) {
      return { provider: provKey, config, apiKey };
    }
  }

  return null;
}

// ============================================================================
// MONITORING SYSTEM PROMPT
// ============================================================================
// Instructs the AI to act as a VC monitoring analyst, searching for recent
// material events. The prompt is specific about output format to ensure
// consistent structured JSON that the client can parse reliably.
const MONITORING_SYSTEM_PROMPT = `You are a VC portfolio monitoring analyst. Your job is to find RECENT material events and news about a company that would be relevant to an investor.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation text.
2. Return an object with a single "alerts" key containing an array of alert objects.
3. Each alert must have EXACTLY these fields:
   - "severity": "high" | "medium" | "low"
   - "category": "funding" | "leadership" | "competitor" | "regulatory" | "product" | "press"
   - "title": Short headline (max 100 chars)
   - "description": 1-3 sentence description with specific details, names, numbers
   - "source": Where you found this info (e.g., "TechCrunch", "SEC Filing", "LinkedIn", "Company Blog")
   - "timestamp": ISO 8601 date string of when the event occurred (best estimate if exact date unknown)
4. Return at most 10 alerts, prioritized by severity and recency.
5. Severity guidelines:
   - "high": New funding round, CEO/CTO departure, acquisition, major lawsuit, data breach
   - "medium": Senior hire, product launch, competitor funding, partnership, regulatory filing
   - "low": Press mention, minor product update, industry trend, conference appearance
6. Focus on events from the LAST 90 DAYS. Older events are less useful.
7. If you find NO recent events, return: { "alerts": [] }
8. Be FACTUAL. Only report events you are confident actually happened. Do not fabricate.
9. Include specific names, dollar amounts, dates, and sources whenever possible.`;

// ============================================================================
// BUILD MONITORING PROMPT
// ============================================================================
// Constructs the user prompt based on which monitoring categories are enabled.
// Only asks the AI to look for event types the user has turned on.
function buildMonitoringPrompt(companyName, companyUrl, monitoringConfig) {
  // Determine which categories to check — default to all if not specified
  const categories = monitoringConfig?.categories || {
    funding: true,
    leadership: true,
    competitor: true,
    regulatory: true,
    product: true,
    press: true,
  };

  // Build a human-readable list of what to look for
  const lookFor = [];
  if (categories.funding) lookFor.push('- Funding events: new rounds, valuations, investor changes, down rounds, bridge financing');
  if (categories.leadership) lookFor.push('- Leadership changes: executive hires, departures, board member additions/removals, key talent moves');
  if (categories.competitor) lookFor.push('- Competitor activity: competitor funding rounds, product launches, acquisitions, mergers, shutdowns');
  if (categories.regulatory) lookFor.push('- Regulatory/legal: lawsuits filed or settled, compliance issues, regulatory approvals/rejections, patent disputes');
  if (categories.product) lookFor.push('- Product launches: new features, major releases, pivots, platform changes, API launches');
  if (categories.press) lookFor.push('- Press/media: notable coverage (positive or negative), interviews, awards, analyst reports');

  // If no categories are enabled, return a minimal prompt
  if (lookFor.length === 0) {
    return `Search for any recent material events about "${companyName}"${companyUrl ? ` (${companyUrl})` : ''} that would be relevant to a venture capital investor. Return: { "alerts": [] } if nothing found.`;
  }

  return `Search for recent news and material events about the company "${companyName}"${companyUrl ? ` (${companyUrl})` : ''} that would matter to a venture capital investor monitoring their portfolio.

Look specifically for:
${lookFor.join('\n')}

Focus on events from the last 90 days. Return the most important findings as structured alerts. If nothing notable has happened recently, return an empty alerts array.

Return ONLY a JSON object: { "alerts": [ ... ] }`;
}

// ============================================================================
// PARSE JSON FROM AI RESPONSE
// ============================================================================
// Same robust extraction logic as autofill — handles code fences, extra text, etc.
function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  // Try 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue to fallback strategies
  }

  // Try 2: Extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try 3: Find first { and last } and parse that substring
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {
      // Give up
    }
  }

  return null;
}

// ============================================================================
// VALIDATE ALERT STRUCTURE
// ============================================================================
// Ensures each alert object has all required fields with valid values.
// Malformed alerts are filtered out rather than crashing the client.
const VALID_SEVERITIES = new Set(['high', 'medium', 'low']);
const VALID_CATEGORIES = new Set(['funding', 'leadership', 'competitor', 'regulatory', 'product', 'press']);

function validateAlert(alert) {
  if (!alert || typeof alert !== 'object') return null;

  // Normalize severity — default to 'medium' if invalid
  const severity = VALID_SEVERITIES.has(alert.severity) ? alert.severity : 'medium';

  // Normalize category — default to 'press' if invalid
  const category = VALID_CATEGORIES.has(alert.category) ? alert.category : 'press';

  // Require at least a title
  const title = typeof alert.title === 'string' ? alert.title.trim() : '';
  if (!title) return null;

  return {
    severity,
    category,
    title: title.substring(0, 200), // cap title length for UI safety
    description: typeof alert.description === 'string' ? alert.description.trim().substring(0, 1000) : '',
    source: typeof alert.source === 'string' ? alert.source.trim() : 'Unknown',
    timestamp: typeof alert.timestamp === 'string' ? alert.timestamp : new Date().toISOString(),
  };
}

// ============================================================================
// CALL AI PROVIDER
// ============================================================================
// Makes the actual HTTP request to the AI provider and returns raw text.
async function callProvider(config, apiKey, model, prompt) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(
      config.buildBody(model || config.defaultModel, MONITORING_SYSTEM_PROMPT, prompt)
    ),
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg += `: ${errData?.error?.message || errData?.message || JSON.stringify(errData)}`;
    } catch {
      errorMsg += `: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return config.extractText(data);
}

// ============================================================================
// POST HANDLER
// ============================================================================
// Accepts: { companyName, companyUrl, monitoringConfig, provider }
// Returns: { success, alerts: [...], provider, checkedAt }
export async function POST(request) {
  try {
    // ---- Authentication Check ----
    // Verify the user is logged in before burning AI credits.
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    // ---- Rate Limit Check ----
    const { success: withinLimit, remaining, resetAt } = rateLimitByApiRoute(request);
    if (!withinLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait before trying again.',
          retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toISOString(),
          },
        }
      );
    }

    // ---- Parse request body ----
    const body = await request.json();
    const {
      companyName,
      companyUrl,
      monitoringConfig,
      provider: requestedProvider,
    } = body;

    // ---- Validate ----
    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required for monitoring check.' },
        { status: 400 }
      );
    }

    // ---- Resolve provider ----
    const resolved = resolveProvider(requestedProvider);
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI provider configured on the server. Contact support@duedrill.com.',
        },
        { status: 503 }
      );
    }

    const { provider, config, apiKey } = resolved;

    // ---- Build prompt and call AI ----
    const prompt = buildMonitoringPrompt(companyName.trim(), companyUrl?.trim(), monitoringConfig);
    const rawText = await callProvider(config, apiKey, null, prompt);
    const parsed = parseJsonFromResponse(rawText);

    // ---- Validate response structure ----
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid JSON. Try again or try a different provider.',
          rawResponse: rawText?.substring(0, 500),
        },
        { status: 502 }
      );
    }

    // ---- Extract and validate alerts ----
    const rawAlerts = Array.isArray(parsed.alerts) ? parsed.alerts : [];
    const validAlerts = rawAlerts
      .map(validateAlert)             // normalize each alert
      .filter(Boolean)                // remove nulls (invalid alerts)
      .slice(0, 10);                  // cap at 10 alerts max

    // ---- Return structured response ----
    return NextResponse.json({
      success: true,
      provider,
      alerts: validAlerts,
      checkedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Monitor Check Route] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during monitoring check.',
      },
      { status: 500 }
    );
  }
}
