// ============================================================================
// app/api/verify/investors/route.js — Investor/Fund Verification API
// ============================================================================
// Cross-references investors and VC firms against public databases to verify
// their track record, fund details, portfolio companies, and reputation.
// Uses AI with web search (Perplexity preferred) to check Crunchbase,
// PitchBook data, SEC filings, press coverage, and other public sources.
//
// INPUT (POST):
//   {
//     investors: [{ name, type: 'individual'|'firm' }],
//     companyName: string,
//     provider: string,
//     model: string,
//     apiKeys: object
//   }
//
// OUTPUT:
//   {
//     success: true,
//     verifications: [{
//       name, type, verified: true|false,
//       confidence: 'high'|'medium'|'low',
//       findings: { fundDetails, investmentThesis, portfolio, trackRecord, partners, redFlags },
//       summary: string
//     }]
//   }
// ============================================================================

import { NextResponse } from 'next/server';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================
// Same provider configs as people/route.js and autofill/route.js.
// Duplicated intentionally — each API route is self-contained and independently
// deployable. No shared server-side modules to avoid coupling.
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

// ============================================================================
// RESOLVE PROVIDER & API KEY
// ============================================================================
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

// ============================================================================
// SYSTEM PROMPT — INVESTOR VERIFICATION
// ============================================================================
// Specialized for verifying investors and VC firms rather than individuals.
// Focuses on fund details, portfolio quality, track record, and reputation.
const INVESTOR_VERIFICATION_SYSTEM_PROMPT = `You are an expert VC due diligence analyst specializing in investor and fund verification. Your job is to verify the legitimacy, track record, and reputation of investors and venture capital firms using publicly available information.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation text outside the JSON.
2. Be HONEST about confidence levels. If you cannot find public information, say so clearly.
3. NEVER fabricate information. If a detail cannot be verified, state "Not verified" or "No public record found".
4. For each investor/firm, search for:
   - Fund details: AUM (assets under management), fund size, vintage year, fund number
   - Investment thesis: stated focus areas, stage preferences, check sizes
   - Notable portfolio companies: well-known investments, unicorns in portfolio
   - Track record: known exits, IPOs, acquisitions, reported returns (TVPI/DPI if public)
   - Partners/GPs: key people at the firm, their backgrounds and track records
   - Red flags: lawsuits, fraud, SEC violations, LP disputes, controversy, poor reputation
5. For INDIVIDUAL investors (angels):
   - Focus on their investment history, notable deals, professional background
   - Check AngelList/Wellfound, Crunchbase, LinkedIn, Twitter/X
6. Confidence levels:
   - "high": Well-known firm/investor with extensive public record
   - "medium": Some information found but limited public presence
   - "low": Minimal or no public information found
7. Set "verified" to true when the investor's existence and basic details are confirmed.
   Set "verified" to false if the investor cannot be found or has serious red flags.`;

// ============================================================================
// BUILD VERIFICATION PROMPT FOR INVESTORS
// ============================================================================
function buildInvestorVerificationPrompt(investors, companyName) {
  const investorEntries = investors.map((inv, idx) => {
    return `  Investor ${idx + 1}:
    - Name: "${inv.name}"
    - Type: "${inv.type || 'unknown'}" (individual angel investor or VC firm)`;
  }).join('\n\n');

  return `Verify the following investors associated with the company "${companyName}".

For EACH investor, research and return verification data.

Investors to verify:
${investorEntries}

Return a JSON object with this EXACT structure:
{
  "verifications": [
    {
      "name": "Investor or firm name",
      "type": "individual" or "firm",
      "verified": true or false,
      "confidence": "high" | "medium" | "low",
      "findings": {
        "fundDetails": "Fund size, AUM, vintage year, fund number. For individuals: estimated portfolio size and typical check size. State 'No fund details found' if unavailable.",
        "investmentThesis": "Stated investment focus: sectors, stages, geographies, check sizes. For individuals: known investment preferences.",
        "portfolio": "Notable portfolio companies, especially unicorns or well-known startups. List specific names.",
        "trackRecord": "Known exits (IPOs, acquisitions), reported returns if public, fund performance indicators. State 'No public track record data' if unavailable.",
        "partners": "Key partners/GPs and their backgrounds. For individual investors: their professional background and notable roles. State 'No partner data found' if unavailable.",
        "redFlags": "Any lawsuits, SEC violations, fraud allegations, LP disputes, negative press, or controversies. State 'No red flags found' if clean."
      },
      "summary": "2-3 sentence summary of verification results. Highlight reputation, track record quality, and any concerns."
    }
  ]
}

Return ONLY the JSON. One entry per investor, in the same order as listed above. Be thorough and factual.`;
}

// ============================================================================
// PARSE JSON FROM AI RESPONSE
// ============================================================================
function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  // Try 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue
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

  // Try 3: Find outermost braces
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
    const body = await request.json();
    const {
      investors,                       // Array of { name, type }
      companyName,                     // Company context for the search
      provider: requestedProvider,     // Optional: force a specific AI provider
      model,                           // Optional: force a specific model
      apiKeys: clientApiKeys,          // Client-side API keys from settings
    } = body;

    // ---- Validate inputs ----
    if (!investors || !Array.isArray(investors) || investors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one investor is required for verification.' },
        { status: 400 }
      );
    }

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required for verification context.' },
        { status: 400 }
      );
    }

    // Filter out investors without names
    const validInvestors = investors.filter((inv) => inv.name && inv.name.trim());
    if (validInvestors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid investors to verify. Each investor must have a name.' },
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
    const userPrompt = buildInvestorVerificationPrompt(validInvestors, companyName.trim());
    const rawText = await callProvider(
      config, apiKey, model, INVESTOR_VERIFICATION_SYSTEM_PROMPT, userPrompt
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
    const verifications = parsed.verifications.map((v, idx) => ({
      name: v.name || validInvestors[idx]?.name || 'Unknown',
      type: v.type || validInvestors[idx]?.type || 'unknown',
      verified: typeof v.verified === 'boolean' ? v.verified : false,
      confidence: ['high', 'medium', 'low'].includes(v.confidence) ? v.confidence : 'low',
      findings: {
        fundDetails: v.findings?.fundDetails || 'No data returned',
        investmentThesis: v.findings?.investmentThesis || 'No data returned',
        portfolio: v.findings?.portfolio || 'No data returned',
        trackRecord: v.findings?.trackRecord || 'No data returned',
        partners: v.findings?.partners || 'No data returned',
        redFlags: v.findings?.redFlags || 'No red flags found',
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
    console.error('[Investor Verification Route] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during investor verification.',
      },
      { status: 500 }
    );
  }
}
