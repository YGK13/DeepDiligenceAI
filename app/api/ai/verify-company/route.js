// ============================================================================
// /api/ai/verify-company — Company Identity Verification
// ============================================================================
// CRITICAL P0 FEATURE: Before any auto-fill runs, we must verify the user
// actually means the RIGHT company. "Mercury" could be Mercury Financial,
// Mercury Systems, Mercury Insurance, or Mercury (banking for startups).
//
// This route takes a company name (and optional URL) and returns 3-5
// candidate matches with enough info for the user to pick the right one:
//   - name, domain, description, location, sector, stage, founded
//
// Uses Perplexity (web search) by default since disambiguation requires
// real-time internet data, not just LLM knowledge.
//
// POST /api/ai/verify-company
// Body: { companyName: string, companyUrl?: string, provider?: string, apiKeys?: object }
// Returns: { success: true, candidates: [...] }
// ============================================================================

import { NextResponse } from 'next/server';

// ============ AUTHENTICATION ============
// Require a valid session — this route calls external AI providers using
// server-side API keys that the app owner pays for.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Prevent abuse — each verification request burns AI credits.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ INPUT SANITIZATION ============
// Sanitize company name before it reaches AI prompts.
import { sanitizeCompanyName } from '@/lib/security/sanitize';

// ============ PROVIDER CONFIGURATIONS ============
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
      temperature: 0.1,
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
    extractText: (data) =>
      data?.content?.map((b) => b.text).join('') || '',
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
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },
};

// ============ SYSTEM PROMPT ============
// Instructs the AI to search for the company and return disambiguation candidates
const SYSTEM_PROMPT = `You are a company identification assistant for a venture capital due diligence platform.

Your job is to take a company name (and optionally a website URL) and return a list of possible matches.

RULES:
1. Search for companies matching the given name
2. Return 3-5 candidate matches (fewer if there are fewer real matches)
3. If a URL is provided, the company matching that URL should be the FIRST result
4. For each candidate, provide ALL of these fields:
   - name: Full legal/common company name
   - domain: Primary website domain (e.g., "stripe.com")
   - description: One sentence describing what the company does (max 20 words)
   - location: City, Country (e.g., "San Francisco, USA")
   - sector: Industry sector (SaaS, FinTech, HealthTech, etc.)
   - stage: Funding stage if known (Seed, Series A, etc.) or "Unknown"
   - founded: Year founded or "Unknown"
   - confidence: How confident you are this matches the query (high, medium, low)
5. If you're highly confident about one match (e.g., user provided a URL), still return
   other companies with similar names so the user can verify
6. NEVER make up companies. Only return real companies you can verify exist.
7. If you can't find ANY matches, return an empty array

Return ONLY valid JSON. No markdown, no code blocks, no explanation.

Format:
{
  "candidates": [
    {
      "name": "...",
      "domain": "...",
      "description": "...",
      "location": "...",
      "sector": "...",
      "stage": "...",
      "founded": "...",
      "confidence": "high|medium|low"
    }
  ]
}`;

// ============ ROUTE HANDLER ============
export async function POST(request) {
  try {
    // ---- Authentication Check ----
    // FIRST: verify the user is logged in. This route burns expensive AI credits.
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    // ---- Rate Limit Check ----
    // Prevent abuse — each verification call hits external AI APIs.
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

    const body = await request.json();
    const { companyName: rawCompanyName, companyUrl, provider: requestedProvider, apiKeys: clientKeys } = body;

    // ---- Sanitize user inputs ----
    const companyName = sanitizeCompanyName(rawCompanyName);

    // ============ VALIDATE INPUT ============
    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Company name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    // ============ RESOLVE PROVIDER + API KEY ============
    // Priority: Perplexity (has web search) > requested provider > any available
    const providerOrder = ['perplexity', requestedProvider, 'anthropic', 'openai', 'groq'].filter(Boolean);
    let selectedProvider = null;
    let apiKey = null;

    for (const provName of providerOrder) {
      const config = PROVIDER_CONFIGS[provName];
      if (!config) continue;

      // Check server env first, then client-side keys
      const key = process.env[config.envKey] || clientKeys?.[provName];
      if (key) {
        selectedProvider = provName;
        apiKey = key;
        break;
      }
    }

    if (!selectedProvider || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'No API key configured. Set up at least one provider in Settings.',
        },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[selectedProvider];
    const model = config.defaultModel;

    // ============ BUILD USER PROMPT ============
    let userPrompt = `Find companies matching: "${companyName.trim()}"`;
    if (companyUrl) {
      userPrompt += `\nThe user also provided this URL: ${companyUrl}`;
      userPrompt += `\nMake sure to include the company at this URL as the first result.`;
    }
    userPrompt += `\n\nReturn 3-5 candidate matches as JSON.`;

    // ============ CALL AI PROVIDER ============
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify(config.buildBody(model, SYSTEM_PROMPT, userPrompt)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VERIFY-COMPANY] ${selectedProvider} returned ${response.status}:`, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Provider "${selectedProvider}" returned HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = config.extractText(data);

    // ============ PARSE JSON RESPONSE ============
    // The AI should return valid JSON, but we need to be defensive.
    // Strip any markdown code fences if present.
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('[VERIFY-COMPANY] Failed to parse AI response:', cleanedText.slice(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned malformed data. Try again or use a different provider.',
          raw: cleanedText.slice(0, 200),
        },
        { status: 502 }
      );
    }

    // ============ VALIDATE + NORMALIZE CANDIDATES ============
    const candidates = (parsed.candidates || parsed || [])
      .filter((c) => c && c.name) // must have at least a name
      .slice(0, 5) // max 5 candidates
      .map((c) => ({
        name: String(c.name || '').trim(),
        domain: String(c.domain || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
        description: String(c.description || '').trim().slice(0, 200),
        location: String(c.location || 'Unknown').trim(),
        sector: String(c.sector || 'Unknown').trim(),
        stage: String(c.stage || 'Unknown').trim(),
        founded: String(c.founded || 'Unknown').trim(),
        confidence: ['high', 'medium', 'low'].includes(c.confidence) ? c.confidence : 'medium',
      }));

    return NextResponse.json({
      success: true,
      candidates,
      provider: selectedProvider,
      query: companyName.trim(),
    });
  } catch (err) {
    console.error('[VERIFY-COMPANY] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Company verification failed.' },
      { status: 500 }
    );
  }
}
