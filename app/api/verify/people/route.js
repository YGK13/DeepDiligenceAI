// ============================================================================
// app/api/verify/people/route.js — Team/Advisor/Board Member Verification API
// ============================================================================
// Cross-references team members, advisors, and board members against public
// databases to verify their claimed backgrounds. Uses AI with web search
// (Perplexity preferred) to check LinkedIn, Crunchbase, AngelList, press
// coverage, SEC filings, and other public sources.
//
// INPUT (POST):
//   {
//     people: [{ name, role, claimedBackground }],
//     companyName: string,
//     provider: string,         // 'perplexity' | 'anthropic' | 'openai' | 'groq'
//     model: string,            // optional model override
//     apiKeys: { perplexity: 'xxx', ... }
//   }
//
// OUTPUT:
//   {
//     success: true,
//     verifications: [{
//       name, role, verified: true|false,
//       confidence: 'high'|'medium'|'low',
//       findings: { linkedin, previousRoles, education, exits, redFlags, publicProfiles },
//       summary: string
//     }]
//   }
// ============================================================================

import { NextResponse } from 'next/server';

// ============ AUTHENTICATION ============
// Require a valid session — people verification calls external AI providers.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Prevent abuse — each verification request burns AI credits.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================
// Mirrors the exact same pattern used in app/api/ai/autofill/route.js.
// Each provider has: url, envKey, buildHeaders, buildBody, extractText.
// Perplexity is preferred because it has built-in web search — critical for
// verifying real people against real public data sources.
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
      temperature: 0.1, // low temp = factual, verifiable output
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

// ============================================================================
// RESOLVE PROVIDER & API KEY
// ============================================================================
// Priority: Perplexity (web search) > Anthropic > OpenAI > Groq
// Accepts explicit provider override from request body.
function resolveProvider(requestedProvider, clientApiKeys) {
  // If a specific provider was requested and has a key, use it
  if (requestedProvider && PROVIDER_CONFIGS[requestedProvider]) {
    const config = PROVIDER_CONFIGS[requestedProvider];
    const apiKey = process.env[config.envKey] || clientApiKeys?.[requestedProvider];
    if (apiKey) {
      return { provider: requestedProvider, config, apiKey };
    }
  }

  // Auto-detect: try providers in priority order
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

// ============================================================================
// SYSTEM PROMPT — PEOPLE VERIFICATION
// ============================================================================
// Instructs the AI to act as a background verification analyst.
// The prompt is specific about what to check and how to format results.
const PEOPLE_VERIFICATION_SYSTEM_PROMPT = `You are an expert due diligence background verification analyst. Your job is to verify the backgrounds of startup team members, advisors, and board members using publicly available information.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation text outside the JSON.
2. Be HONEST about confidence levels. If you cannot find public information about a person, say so.
3. NEVER fabricate information. If a detail cannot be verified, explicitly state "Not verified" or "No public record found".
4. For each person, search for:
   - LinkedIn profile (does it exist? Does it match claimed role/background?)
   - Previous companies and roles (verify against claimed background)
   - Previous exits or acquisitions (verify any claimed exits)
   - Education credentials (university, degree, year if available)
   - Public profiles: Crunchbase, AngelList/Wellfound, Twitter/X, GitHub
   - Red flags: lawsuits, fraud allegations, SEC violations, negative press, sanctions
5. Confidence levels:
   - "high": Multiple public sources confirm the person's background
   - "medium": Some information found but incomplete or from limited sources
   - "low": Little to no public information found, or significant discrepancies
6. Set "verified" to true ONLY when the person's claimed background is substantially confirmed.
   Set "verified" to false if there are significant discrepancies or red flags.
   Set "verified" to true with "medium" confidence if partially confirmed.
7. Be thorough and specific — cite company names, dates, and data points you find.`;

// ============================================================================
// BUILD VERIFICATION PROMPT FOR PEOPLE
// ============================================================================
// Creates a detailed prompt listing each person to verify, along with their
// claimed background and the company they're associated with.
function buildPeopleVerificationPrompt(people, companyName) {
  // Build the person list with their claimed backgrounds
  const personEntries = people.map((p, idx) => {
    return `  Person ${idx + 1}:
    - Name: "${p.name}"
    - Role at ${companyName}: "${p.role}"
    - Claimed Background: "${p.claimedBackground || 'Not provided'}"`;
  }).join('\n\n');

  return `Verify the backgrounds of the following people associated with the company "${companyName}".

For EACH person, research and return verification data.

People to verify:
${personEntries}

Return a JSON object with this EXACT structure:
{
  "verifications": [
    {
      "name": "Person's full name",
      "role": "Their role at the company",
      "verified": true or false,
      "confidence": "high" | "medium" | "low",
      "findings": {
        "linkedin": "LinkedIn profile URL if found, or description of LinkedIn presence. State 'No LinkedIn profile found' if not found.",
        "previousRoles": "List of verified previous companies and roles with approximate dates. Be specific.",
        "education": "Verified education credentials — university, degree, graduation year if available.",
        "exits": "Any verified previous exits, acquisitions, or IPOs they were involved in. State 'No exits found' if none.",
        "redFlags": "Any lawsuits, fraud allegations, SEC violations, negative press, sanctions, or concerns. State 'No red flags found' if clean.",
        "publicProfiles": "Links or descriptions of Crunchbase, AngelList/Wellfound, Twitter/X, GitHub, personal website, or other public profiles found."
      },
      "summary": "2-3 sentence summary of verification results. Highlight key confirmations or concerns."
    }
  ]
}

Return ONLY the JSON. One entry per person, in the same order as listed above. Be thorough and factual.`;
}

// ============================================================================
// PARSE JSON FROM AI RESPONSE
// ============================================================================
// Robustly extracts JSON from the AI response, handling code fences and
// other formatting artifacts that LLMs sometimes add.
function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  // Try 1: Direct parse (ideal — AI returned clean JSON)
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

  // Try 3: Find outermost braces and parse that substring
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
// CALL AI PROVIDER
// ============================================================================
// Makes the actual HTTP request to the AI provider API.
// Uses the same pattern as autofill/route.js for consistency.
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

// ============================================================================
// POST HANDLER — Main entry point
// ============================================================================
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
      people,                          // Array of { name, role, claimedBackground }
      companyName,                     // Company these people are associated with
      provider: requestedProvider,     // Optional: force a specific AI provider
      model,                           // Optional: force a specific model
      apiKeys: clientApiKeys,          // Client-side API keys from settings
    } = body;

    // ---- Validate inputs ----
    if (!people || !Array.isArray(people) || people.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one person is required for verification.' },
        { status: 400 }
      );
    }

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required for verification context.' },
        { status: 400 }
      );
    }

    // Filter out people without names (defensive — UI should prevent this)
    const validPeople = people.filter((p) => p.name && p.name.trim());
    if (validPeople.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid people to verify. Each person must have a name.' },
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

    // ---- Build prompt and call AI ----
    const userPrompt = buildPeopleVerificationPrompt(validPeople, companyName.trim());
    const rawText = await callProvider(
      config, apiKey, model, PEOPLE_VERIFICATION_SYSTEM_PROMPT, userPrompt
    );

    // ---- Parse the AI's JSON response ----
    const parsed = parseJsonFromResponse(rawText);

    if (!parsed || !parsed.verifications || !Array.isArray(parsed.verifications)) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid verification data. Try again or switch providers.',
          rawResponse: rawText?.substring(0, 500),
        },
        { status: 502 }
      );
    }

    // ---- Normalize and validate each verification result ----
    // Ensure every result has all required fields with sensible defaults
    const verifications = parsed.verifications.map((v, idx) => ({
      name: v.name || validPeople[idx]?.name || 'Unknown',
      role: v.role || validPeople[idx]?.role || 'Unknown',
      verified: typeof v.verified === 'boolean' ? v.verified : false,
      confidence: ['high', 'medium', 'low'].includes(v.confidence) ? v.confidence : 'low',
      findings: {
        linkedin: v.findings?.linkedin || 'No data returned',
        previousRoles: v.findings?.previousRoles || 'No data returned',
        education: v.findings?.education || 'No data returned',
        exits: v.findings?.exits || 'No data returned',
        redFlags: v.findings?.redFlags || 'No red flags found',
        publicProfiles: v.findings?.publicProfiles || 'No data returned',
      },
      summary: v.summary || 'Verification incomplete — no summary provided by AI.',
    }));

    // ---- Return structured verification results ----
    return NextResponse.json({
      success: true,
      provider,
      companyName: companyName.trim(),
      verifiedAt: new Date().toISOString(),
      verifications,
    });

  } catch (error) {
    console.error('[People Verification Route] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during people verification.',
      },
      { status: 500 }
    );
  }
}
