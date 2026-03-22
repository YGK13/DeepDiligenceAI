// ============================================================================
// app/api/ai/autofill/route.js — AI Auto-Fill API Route
// ============================================================================
// The CORE engine of DeepDiligence AI. When given a company name (and
// optionally a URL), this route asks the AI provider to research the company
// and return STRUCTURED JSON data that directly maps to the app's form fields.
//
// Unlike the /api/ai/research route (which returns free-form text), this route
// returns a JSON object where keys match the exact field names in schemas.js.
// The client can then merge these fields directly into the company data.
//
// Supports two modes:
//   1. Single section: { section: 'team', companyName: 'Stripe' }
//      → Returns { success: true, data: { ceoName: 'Patrick Collison', ... } }
//
//   2. All sections:  { section: 'all', companyName: 'Stripe' }
//      → Returns { success: true, data: { overview: {...}, team: {...}, ... } }
//
// Uses Perplexity by default (web search = essential for DD research),
// falls back to whichever provider has a key configured.
// ============================================================================

import { NextResponse } from 'next/server';
import { AUTOFILL_SECTIONS, AUTOFILL_SECTION_ORDER } from '@/lib/autofill-fields';

// ============ PROVIDER CONFIGURATIONS ============
// Same structure as /api/ai/research but with higher token limits
// because structured JSON output is longer than prose.
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
      temperature: 0.1, // very low — we want factual, structured output
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
      response_format: { type: 'json_object' }, // OpenAI supports JSON mode
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
// Priority: Perplexity (has web search) > Anthropic > OpenAI > Groq
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

// ============ SYSTEM PROMPT FOR STRUCTURED OUTPUT ============
const AUTOFILL_SYSTEM_PROMPT = `You are a world-class VC due diligence research analyst. Your job is to research a company and return STRUCTURED DATA as a JSON object.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation text outside the JSON.
2. Use the EXACT field keys specified in the request.
3. If you cannot find data for a field, set its value to "" (empty string). NEVER make up data.
4. For URLs, include the full URL with https://.
5. For dollar amounts, use short format like "$15M", "$2.5B", "€500K".
6. For percentages, include the % sign like "25%", "120%".
7. For 'long' type fields, write 2-4 sentences with specific details, names, and numbers.
8. For 'select' type fields, return EXACTLY one of the provided options.
9. Be as specific and factual as possible. Cite numbers, names, dates, and data points.
10. If the company is not well-known, do your best with publicly available information.

You are researching real companies using real, publicly available data. Be thorough.`;

// ============ BUILD AUTOFILL PROMPT FOR A SINGLE SECTION ============
function buildSectionPrompt(companyName, companyUrl, sectionKey) {
  const sectionDef = AUTOFILL_SECTIONS[sectionKey];
  if (!sectionDef) return null;

  // Build the field specification that tells the AI exactly what to return
  const fieldSpecs = sectionDef.fields.map((f) => {
    return `  "${f.key}": "${f.hint}" (type: ${f.type})`;
  });

  return `Research the company "${companyName}"${companyUrl ? ` (${companyUrl})` : ''} and fill in the "${sectionDef.label}" section of a VC due diligence report.

Return a JSON object with EXACTLY these fields:
{
${fieldSpecs.join(',\n')}
}

Return ONLY the JSON object, nothing else. Every field must be present. Use "" for unknown fields.`;
}

// ============ BUILD AUTOFILL PROMPT FOR ALL SECTIONS ============
function buildAllSectionsPrompt(companyName, companyUrl) {
  const allSpecs = {};

  for (const sectionKey of AUTOFILL_SECTION_ORDER) {
    const sectionDef = AUTOFILL_SECTIONS[sectionKey];
    if (!sectionDef) continue;

    const fields = {};
    for (const f of sectionDef.fields) {
      fields[f.key] = `${f.hint} (${f.type})`;
    }
    allSpecs[sectionKey] = fields;
  }

  return `Research the company "${companyName}"${companyUrl ? ` (${companyUrl})` : ''} and fill in ALL sections of a comprehensive VC due diligence report.

Return a JSON object structured as:
{
  "overview": { ... fields ... },
  "team": { ... fields ... },
  "product": { ... fields ... },
  ... and so on for all sections
}

Here are ALL the sections and fields to fill:
${JSON.stringify(allSpecs, null, 2)}

Return ONLY the JSON object. Every field must be present in every section. Use "" for unknown fields. Be thorough — research everything available about this company.`;
}

// ============ PARSE JSON FROM AI RESPONSE ============
// The AI might wrap JSON in code fences or add explanation text.
// This function robustly extracts the JSON object from the response.
function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  // Try 1: Direct parse (ideal case — AI returned clean JSON)
  try {
    return JSON.parse(text);
  } catch {
    // Continue to fallback strategies
  }

  // Try 2: Extract from markdown code block (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try 3: Find the first { and last } and try to parse that substring
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
async function callProvider(config, apiKey, model, prompt) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(
      config.buildBody(model || config.defaultModel, AUTOFILL_SYSTEM_PROMPT, prompt)
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
    const body = await request.json();
    const {
      companyName,
      companyUrl,
      section,         // 'overview', 'team', ..., or 'all'
      provider: requestedProvider,
      model,
      apiKeys: clientApiKeys,
    } = body;

    // ---- Validate ----
    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required for auto-fill research.' },
        { status: 400 }
      );
    }

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section is required. Use a section key (e.g., "team") or "all".' },
        { status: 400 }
      );
    }

    // ---- Resolve provider ----
    const resolved = resolveProvider(requestedProvider, clientApiKeys);
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI provider API key found. Configure at least one provider key in Settings or as an environment variable.',
        },
        { status: 401 }
      );
    }

    const { provider, config, apiKey } = resolved;

    // ---- Build prompt and call AI ----
    let resultData;

    if (section === 'all') {
      // ---- ALL SECTIONS MODE ----
      // For "all", we make a single large request covering every section.
      // This is more efficient than 15 separate calls (saves API cost + time).
      const prompt = buildAllSectionsPrompt(companyName.trim(), companyUrl?.trim());
      const rawText = await callProvider(config, apiKey, model, prompt);
      const parsed = parseJsonFromResponse(rawText);

      if (!parsed || typeof parsed !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: 'AI returned invalid JSON. Try again or try a different provider.',
            rawResponse: rawText?.substring(0, 500), // include snippet for debugging
          },
          { status: 502 }
        );
      }

      resultData = parsed;
    } else {
      // ---- SINGLE SECTION MODE ----
      if (!AUTOFILL_SECTIONS[section]) {
        return NextResponse.json(
          { success: false, error: `Unknown section: "${section}". Valid sections: ${Object.keys(AUTOFILL_SECTIONS).join(', ')}` },
          { status: 400 }
        );
      }

      const prompt = buildSectionPrompt(companyName.trim(), companyUrl?.trim(), section);
      const rawText = await callProvider(config, apiKey, model, prompt);
      const parsed = parseJsonFromResponse(rawText);

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

      resultData = parsed;
    }

    // ---- Return structured data ----
    return NextResponse.json({
      success: true,
      provider,
      section,
      data: resultData,
    });

  } catch (error) {
    console.error('[AI Autofill Route] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred during auto-fill research.',
      },
      { status: 500 }
    );
  }
}
