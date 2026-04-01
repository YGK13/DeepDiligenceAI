// ============================================================================
// app/api/deck/analyze/route.js — AI-Powered Pitch Deck Claim Extraction
// ============================================================================
// Second step in the deck analysis pipeline: Upload → **Analyze** → Compare.
//
// Takes extracted pitch deck text and sends it to an AI provider with a
// structured prompt that organizes every factual claim, statistic, name,
// and data point into the app's 16-section schema. This creates a structured
// "deck claims" object that can later be compared against independently
// researched data to identify discrepancies (red flags).
//
// Request body:
//   {
//     deckText: string,      — raw text extracted from the PDF
//     companyName: string,   — company name for context
//     provider: string,      — AI provider key (optional, auto-detects)
//     model: string,         — model override (optional)
//     apiKeys: object        — client-side API keys { perplexity: '...', ... }
//   }
//
// Response:
//   {
//     success: true,
//     provider: 'anthropic',
//     deckClaims: {
//       overview: { companyName: '...', yearFounded: '...', ... },
//       team: { ceoName: '...', ... },
//       ...
//     }
//   }
// ============================================================================

import { NextResponse } from 'next/server';

// ============ AUTHENTICATION ============
// Require a valid session — deck analysis calls external AI providers.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Prevent abuse — each analysis request burns AI credits.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ PROVIDER CONFIGURATIONS ============
// Identical structure to /api/ai/autofill/route.js — same providers, same
// header/body builders, same text extractors. Copied here to keep the deck
// analysis pipeline self-contained (no cross-route imports in Next.js App Router).
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
      max_tokens: 8192,
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
      max_tokens: 8192,
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
      max_tokens: 8192,
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
      max_tokens: 8192,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },
};

// ============ RESOLVE PROVIDER & API KEY ============
// Priority: Perplexity (web search) > Anthropic > OpenAI > Groq.
// Accepts explicit provider override from request body.
function resolveProvider(requestedProvider, clientApiKeys) {
  if (requestedProvider && PROVIDER_CONFIGS[requestedProvider]) {
    const config = PROVIDER_CONFIGS[requestedProvider];
    const apiKey = process.env[config.envKey] || clientApiKeys?.[requestedProvider];
    if (apiKey) {
      return { provider: requestedProvider, config, apiKey };
    }
  }

  const priority = ['perplexity', 'anthropic', 'openai', 'groq'];
  for (const provKey of priority) {
    const config = PROVIDER_CONFIGS[provKey];
    const apiKey = process.env[config.envKey] || clientApiKeys?.[provKey];
    if (apiKey) {
      return { provider: provKey, config, apiKey };
    }
  }

  return null;
}

// ============ SYSTEM PROMPT FOR DECK ANALYSIS ============
// Instructs the AI to extract every factual claim from the pitch deck
// and organize them into the app's structured schema. Also flags
// exaggerated or unverifiable claims — critical for due diligence.
const DECK_ANALYSIS_SYSTEM_PROMPT = `You are a world-class VC due diligence analyst specializing in pitch deck analysis. Your job is to extract EVERY factual claim, statistic, name, and data point from a pitch deck and organize them into a structured JSON format.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation text outside the JSON.
2. Extract EXACTLY what the deck claims — do not add your own research or opinions.
3. If a section has no relevant data in the deck, return an empty object {} for that section.
4. For each field, extract the EXACT claim from the deck, including specific numbers, names, dates.
5. If a claim seems exaggerated, add a "_flags" array to that section listing suspect claims.
6. Be thorough — miss nothing. Every number, every name, every statistic matters for due diligence.
7. Preserve the original language of claims where possible (e.g., "10x faster" not "significantly faster").
8. Flag any claims that seem exaggerated or unverifiable by adding them to the section's "_flags" array.

OUTPUT FORMAT:
{
  "overview": { "companyName": "...", "yearFounded": "...", "elevatorPitch": "...", ... },
  "team": { "ceoName": "...", "ceoBackground": "...", ... },
  "product": { "productDescription": "...", "techStack": "...", ... },
  "market": { "tam": "...", "sam": "...", "marketGrowthRate": "...", ... },
  "business": { "revenueModel": "...", "pricing": "...", ... },
  "traction": { "arr": "...", "mrrGrowth": "...", "totalCustomers": "...", ... },
  "financial": { "lastRoundSize": "...", "totalRaised": "...", "burnRate": "...", ... },
  "competitive": { "competitors": "...", "competitiveAdvantage": "...", ... },
  "ip": { "patents": "...", "proprietaryTech": "...", ... },
  "customers": { "keyCustomers": "...", "customerConcentration": "...", ... },
  "investors": { "currentInvestors": "...", "leadInvestor": "...", ... },
  "regulatory": { "regulatoryStatus": "...", "compliance": "...", ... },
  "legal": { "corporateStructure": "...", "pendingLitigation": "...", ... },
  "israel": { "israelEntity": "...", "rdCenter": "...", ... },
  "risks": { "keyRisks": "...", "mitigationStrategies": "...", ... },
  "deal": { "askAmount": "...", "valuation": "...", "instrument": "...", ... }
}

Each section should contain all claims from the deck that map to that category. Use descriptive field names that match common VC due diligence terminology.`;

// ============ PARSE JSON FROM AI RESPONSE ============
// Robust JSON extraction — handles code fences, surrounding text, etc.
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

  // Try 3: Find first { to last } substring
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

// ============ CALL AI PROVIDER ============
async function callProvider(config, apiKey, model, systemPrompt, userPrompt) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(
      config.buildBody(model || config.defaultModel, systemPrompt, userPrompt)
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

// ============ POST HANDLER ============
export async function POST(request) {
  try {
    // ---- Authentication Check ----
    // Verify the user is logged in before burning AI credits.
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

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

    const body = await request.json();
    const {
      deckText,
      companyName,
      provider: requestedProvider,
      model,
      apiKeys: clientApiKeys,
    } = body;

    // ---- Validate inputs ----
    if (!deckText || typeof deckText !== 'string' || deckText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'Deck text is required and must contain meaningful content (at least 50 characters).' },
        { status: 400 }
      );
    }

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required for deck analysis context.' },
        { status: 400 }
      );
    }

    // ---- Resolve AI provider ----
    const resolved = resolveProvider(requestedProvider, clientApiKeys);
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI provider API key found. Configure at least one provider key in Settings.',
        },
        { status: 401 }
      );
    }

    const { provider, config, apiKey } = resolved;

    // ---- Build the user prompt ----
    // Truncate deck text to ~100K chars to stay within model context limits.
    // Most pitch decks are 10-30 pages = 5K-20K chars, so this is generous.
    const truncatedDeckText = deckText.trim().substring(0, 100000);

    const userPrompt = `Analyze the following pitch deck for "${companyName.trim()}" and extract ALL claims into the structured JSON format specified.

=== PITCH DECK TEXT START ===
${truncatedDeckText}
=== PITCH DECK TEXT END ===

Extract every factual claim, statistic, name, metric, and data point from this pitch deck. Organize them into the JSON structure specified in your instructions. Flag any claims that seem exaggerated or unverifiable by adding a "_flags" array to the relevant section.

Return ONLY the JSON object.`;

    // ---- Call the AI provider ----
    const rawText = await callProvider(config, apiKey, model, DECK_ANALYSIS_SYSTEM_PROMPT, userPrompt);

    // ---- Parse the AI response ----
    const parsed = parseJsonFromResponse(rawText);

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid JSON for deck analysis. Try again or use a different provider.',
          rawResponse: rawText?.substring(0, 500),
        },
        { status: 502 }
      );
    }

    // ---- Return structured deck claims ----
    return NextResponse.json({
      success: true,
      provider,
      deckClaims: parsed,
    });

  } catch (error) {
    console.error('[Deck Analyze] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during deck analysis.',
      },
      { status: 500 }
    );
  }
}
