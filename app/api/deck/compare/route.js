// ============================================================================
// app/api/deck/compare/route.js — Deck Claims vs. Research Data Comparison
// ============================================================================
// Third and final step in the deck analysis pipeline: Upload → Analyze → **Compare**.
//
// Takes the structured deck claims (from /api/deck/analyze) and the independently
// researched data (from the company's autofill/manual entries) and sends both to
// the AI for field-by-field comparison. The AI identifies:
//
//   MATCHES       — Deck claims that align with independent research (green)
//   DISCREPANCIES — Deck claims that CONTRADICT research = RED FLAGS (red)
//   UNVERIFIABLE  — Deck claims with no independent data to verify (yellow)
//   MISSING       — Important findings in research NOT mentioned in deck (blue)
//
// This is the killer feature for DD: automatically cross-referencing what a
// startup SAYS in their deck vs. what independent research SHOWS. Discrepancies
// are where the real due diligence value lives.
//
// Request body:
//   {
//     deckClaims: object,    — structured claims from /api/deck/analyze
//     researchData: object,  — company data from autofill/manual entries
//     companyName: string,
//     provider: string,      — optional
//     model: string,         — optional
//     apiKeys: object        — client-side API keys
//   }
//
// Response:
//   {
//     success: true,
//     comparison: {
//       matches: [...],
//       discrepancies: [...],
//       unverifiable: [...],
//       missing: [...]
//     }
//   }
// ============================================================================

import { NextResponse } from 'next/server';

// ============ AUTHENTICATION ============
// Require a valid session — deck comparison calls external AI providers.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Prevent abuse — each comparison request burns AI credits.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ PROVIDER CONFIGURATIONS ============
// Same provider configs as the other deck routes. Kept self-contained
// since Next.js App Router API routes can't share module-level state
// across files without creating a shared lib (which would be overkill here).
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

// ============ SYSTEM PROMPT FOR COMPARISON ============
// The AI's job: compare deck claims against research data field by field.
// This is the heart of automated due diligence — finding where founders'
// claims don't match reality.
const COMPARISON_SYSTEM_PROMPT = `You are a world-class VC due diligence analyst performing a critical verification task. You are comparing claims from a startup's pitch deck against independently researched data.

Your job is to identify EVERY discrepancy, match, and gap between what the company claims in their deck and what independent research shows.

OUTPUT FORMAT — Return ONLY valid JSON with this exact structure:
{
  "matches": [
    {
      "section": "overview",
      "field": "yearFounded",
      "deckValue": "2019",
      "researchValue": "2019",
      "severity": "low",
      "explanation": "Founding year confirmed by Crunchbase and SEC filings"
    }
  ],
  "discrepancies": [
    {
      "section": "traction",
      "field": "arr",
      "deckValue": "$15M ARR",
      "researchValue": "$8M ARR per latest public data",
      "severity": "high",
      "explanation": "Deck claims nearly 2x the ARR that public sources indicate. Major red flag."
    }
  ],
  "unverifiable": [
    {
      "section": "product",
      "field": "aiMlUsage",
      "deckValue": "Proprietary ML model with 95% accuracy",
      "researchValue": "",
      "severity": "medium",
      "explanation": "No independent data available to verify ML accuracy claims"
    }
  ],
  "missing": [
    {
      "section": "legal",
      "field": "pendingLitigation",
      "deckValue": "",
      "researchValue": "Patent infringement lawsuit filed by CompetitorX in 2024",
      "severity": "high",
      "explanation": "Deck does not mention active litigation discovered in research"
    }
  ]
}

SEVERITY LEVELS:
- "high": Material misrepresentation, significant financial discrepancy, hidden legal issue, or anything that would materially affect an investment decision
- "medium": Notable inconsistency worth investigating further, but not necessarily deal-breaking
- "low": Minor discrepancy or rounding difference that doesn't materially affect the analysis

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no text outside the JSON.
2. Be EXHAUSTIVE — check every field where both sources have data.
3. For discrepancies, be specific about WHAT is different and WHY it matters.
4. Severity "high" should be reserved for things that would change an investment decision.
5. Items in "missing" are things found in RESEARCH but NOT in the DECK — these are potentially intentional omissions by the founders.
6. If the research data is empty for a section, most deck claims for that section go to "unverifiable".
7. Numbers that are close but not exact (e.g., "$14.5M" vs "$15M") are matches, not discrepancies.`;

// ============ PARSE JSON FROM AI RESPONSE ============
function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch {
    // Continue
  }

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

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
    // ============ AUTH + RATE LIMIT ============
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

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
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      );
    }

    const body = await request.json();
    const {
      deckClaims,
      researchData,
      companyName,
      provider: requestedProvider,
      model,
      apiKeys: clientApiKeys,
    } = body;

    // ---- Validate inputs ----
    if (!deckClaims || typeof deckClaims !== 'object') {
      return NextResponse.json(
        { success: false, error: 'deckClaims is required and must be a JSON object. Run deck analysis first.' },
        { status: 400 }
      );
    }

    if (!researchData || typeof researchData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'researchData is required. Run AI auto-fill or manually enter company data first.' },
        { status: 400 }
      );
    }

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required.' },
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

    // ---- Build the comparison prompt ----
    // We serialize both objects to JSON so the AI can compare field-by-field.
    // Truncate to stay within context limits — 50K chars each is generous.
    const deckJson = JSON.stringify(deckClaims, null, 2).substring(0, 50000);
    const researchJson = JSON.stringify(researchData, null, 2).substring(0, 50000);

    const userPrompt = `Compare the following pitch deck claims against independently researched data for "${companyName.trim()}".

=== PITCH DECK CLAIMS (what the company says) ===
${deckJson}

=== INDEPENDENT RESEARCH DATA (what we found) ===
${researchJson}

Perform a thorough field-by-field comparison. For EVERY piece of data where both sources have information, determine if they match, conflict, or cannot be verified. Pay special attention to:
- Financial metrics (ARR, revenue, burn rate, valuations)
- Team claims (backgrounds, previous exits, experience)
- Traction metrics (customer counts, growth rates)
- Market size claims (TAM, SAM, growth rates)
- Any claims that seem inflated or exaggerated

Also identify important findings in the research data that are MISSING from the deck (potential intentional omissions).

Return the comparison as the JSON object specified in your instructions.`;

    // ---- Call the AI provider ----
    const rawText = await callProvider(config, apiKey, model, COMPARISON_SYSTEM_PROMPT, userPrompt);

    // ---- Parse the AI response ----
    const parsed = parseJsonFromResponse(rawText);

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid JSON for comparison. Try again or use a different provider.',
          rawResponse: rawText?.substring(0, 500),
        },
        { status: 502 }
      );
    }

    // ---- Normalize the response structure ----
    // Ensure all four arrays exist even if the AI omitted some
    const comparison = {
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      discrepancies: Array.isArray(parsed.discrepancies) ? parsed.discrepancies : [],
      unverifiable: Array.isArray(parsed.unverifiable) ? parsed.unverifiable : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
    };

    // ---- Return the comparison ----
    return NextResponse.json({
      success: true,
      provider,
      comparison,
    });

  } catch (error) {
    console.error('[Deck Compare] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during deck comparison.',
      },
      { status: 500 }
    );
  }
}
