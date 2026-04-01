// ============================================================================
// app/api/ai/autofill/route.js — AI Auto-Fill API Route
// ============================================================================
// The CORE engine of DueDrill. When given a company name (and
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

// ============ AUTHENTICATION ============
// Require a valid session before processing — this route calls external AI
// providers using server-side API keys that the app owner pays for.
// Without auth, anyone with the URL could drain AI credits.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Import the stricter AI route limiter (10 req/min per IP).
// Each autofill request burns expensive AI API credits, so we need to prevent
// abuse from bots or runaway client-side loops.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ INPUT SANITIZATION ============
// Sanitize user-provided company name and URL before passing to AI prompts.
// Prevents prompt injection and ensures clean data reaches the LLM.
import { sanitizeCompanyName, sanitizeUrl } from '@/lib/security/sanitize';

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
// SERVER-SIDE ONLY: API keys come from environment variables, never from
// the client. The user pays for DueDrill; we pay for AI tokens.
// This prevents API key leakage and simplifies the UX — no "enter your key" step.
//
// Priority: Perplexity (has web search = critical for DD) > Anthropic > OpenAI > Groq
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

// ============ SYSTEM PROMPT FOR STRUCTURED OUTPUT ============
// Updated to request confidence metadata alongside each field value.
// The AI now returns { "fieldKey": { "value": "...", "confidence": "verified"|"likely"|"inferred"|"unknown" } }
// instead of plain { "fieldKey": "value" }. This lets the UI show data quality badges.
const AUTOFILL_SYSTEM_PROMPT = `You are a world-class VC due diligence research analyst. Your job is to research a company and return STRUCTURED DATA as a JSON object WITH CONFIDENCE INDICATORS.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanation text outside the JSON.
2. Use the EXACT field keys specified in the request.
3. For EACH field, return an object with "value" and "confidence" keys:
   { "fieldKey": { "value": "the data", "confidence": "verified" } }
4. Confidence levels (pick the most accurate one):
   - "verified" — you found this data in 2 or more independent, authoritative sources (e.g., Crunchbase + company website + press release)
   - "likely" — you found this in 1 reliable source but could not cross-reference
   - "inferred" — you are making an educated guess based on indirect evidence (e.g., inferring team size from LinkedIn headcount)
   - "unknown" — you have no reliable data; set value to "" (empty string)
5. If you cannot find data for a field, use: { "value": "", "confidence": "unknown" }
6. For URLs, include the full URL with https://.
7. For dollar amounts, use short format like "$15M", "$2.5B", "€500K".
8. For percentages, include the % sign like "25%", "120%".
9. For 'long' type fields, write 2-4 sentences with specific details, names, and numbers.
10. For 'select' type fields, return EXACTLY one of the provided options as the value.
11. Be as specific and factual as possible. Cite numbers, names, dates, and data points.
12. If the company is not well-known, do your best with publicly available information.
13. Be HONEST about confidence — "verified" should only be used when you truly found corroborating sources.
14. Also provide a top-level "suggestedScore" field (integer 1-10) rating the overall quality/strength of this section based on the data you found. Be honest and calibrated — a 7 is good, 8 is strong, 9 is exceptional. Most companies should score 5-7. Use this rubric:
   - 9-10: World-class / best-in-class (top 1% of startups — prior unicorn founders, $100B+ TAM, >3x YoY growth)
   - 7-8: Strong / impressive (experienced team with exits, large growing market, solid traction)
   - 5-6: Average / acceptable (decent but unremarkable, gaps present, needs more evidence)
   - 3-4: Below average / concerning (thin backgrounds, small or saturated market, weak metrics)
   - 1-2: Poor / major red flags (no relevant experience, no product, no traction, legal issues)

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

Return a JSON object with EXACTLY these fields. Each field value MUST be an object with "value" and "confidence" keys:
{
${fieldSpecs.join(',\n')},
  "suggestedScore": <integer 1-10 rating the overall quality/strength of this section>
}

Example format for each field: { "value": "actual data here", "confidence": "verified" }
Confidence levels: "verified" (2+ sources), "likely" (1 source), "inferred" (educated guess), "unknown" (no data, value="")

The "suggestedScore" is a plain integer (not an object) — your honest assessment of how strong this section is for this company. Most companies score 5-7. Be calibrated.

Return ONLY the JSON object, nothing else. Every field must be present.`;
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
  "overview": { ... fields ..., "suggestedScore": <integer 1-10> },
  "team": { ... fields ..., "suggestedScore": <integer 1-10> },
  "product": { ... fields ..., "suggestedScore": <integer 1-10> },
  ... and so on for all sections
}

Here are ALL the sections and fields to fill:
${JSON.stringify(allSpecs, null, 2)}

Each field value MUST be an object with "value" and "confidence" keys.
Example: { "ceoName": { "value": "Patrick Collison", "confidence": "verified" } }
Confidence levels: "verified" (2+ sources), "likely" (1 source), "inferred" (educated guess), "unknown" (no data, value="")

IMPORTANT: Each section MUST also include a "suggestedScore" key — a plain integer (1-10), NOT an object — rating the overall quality/strength of that section. Most companies score 5-7. Be calibrated and honest.

Return ONLY the JSON object. Every field must be present in every section. Be thorough — research everything available about this company.`;
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

// ============ EXTRACT DATA + CONFIDENCE FROM AI RESPONSE ============
// The AI returns fields as { "fieldKey": { "value": "...", "confidence": "verified" } }.
// This function splits that into two flat objects:
//   data:       { fieldKey: "value", ... }         — for populating form fields (backward compatible)
//   confidence: { fieldKey: "verified", ... }      — for rendering ConfidenceBadge in the UI
//
// Also handles BACKWARD COMPATIBILITY: if the AI returns a plain string instead of
// { value, confidence }, we treat it as { value: thatString, confidence: "likely" }
// so older/simpler providers still work without breaking.
function extractDataAndConfidence(parsed) {
  const data = {};
  const confidence = {};

  for (const [key, val] of Object.entries(parsed)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // ---- NESTED SECTION MODE (section='all') ----
      // Check if this looks like a section object (contains sub-fields)
      // vs. a single field's { value, confidence } pair.
      // A field pair always has a "value" key and a "confidence" key.
      const hasValueKey = 'value' in val;
      const hasConfidenceKey = 'confidence' in val;
      const keyCount = Object.keys(val).length;

      if (hasValueKey && hasConfidenceKey && keyCount === 2) {
        // This is a single field: { value: "...", confidence: "..." }
        data[key] = val.value;
        confidence[key] = val.confidence;
      } else {
        // This is a nested section (e.g., { ceoName: {...}, ctoName: {...} })
        // Recursively extract from each sub-section
        const sub = extractDataAndConfidence(val);
        data[key] = sub.data;
        confidence[key] = sub.confidence;
      }
    } else {
      // Plain string value — backward compatibility fallback
      // Treat as "likely" confidence since the AI didn't provide metadata
      data[key] = val;
      if (val !== '' && val !== null && val !== undefined) {
        confidence[key] = 'likely';
      } else {
        confidence[key] = 'unknown';
      }
    }
  }

  return { data, confidence };
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
    // ---- Authentication Check ----
    // FIRST: verify the user is logged in before doing anything else.
    // This route burns expensive AI credits — unauthenticated access = credit theft.
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    // ---- Rate Limit Check ----
    // Check BEFORE parsing the body — no point wasting CPU on a rate-limited request.
    // Returns 429 Too Many Requests with retry info if the client has exceeded 10 req/min.
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
      companyName: rawCompanyName,
      companyUrl: rawCompanyUrl,
      section,         // 'overview', 'team', ..., or 'all'
      provider: requestedProvider,
      model,
      apiKeys: clientApiKeys,
    } = body;

    // ---- Sanitize user inputs ----
    // Clean company name and URL before they reach AI prompts or logs.
    // Prevents prompt injection and XSS via stored data.
    const companyName = sanitizeCompanyName(rawCompanyName);
    const companyUrl = sanitizeUrl(rawCompanyUrl);

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

    // ---- Split AI response into data (plain values) + confidence (level metadata) ----
    // extractDataAndConfidence handles the { value, confidence } object format
    // from the AI, and also provides backward compatibility for plain string values.
    const { data: plainData, confidence } = extractDataAndConfidence(resultData);

    // ---- Return structured data + confidence metadata ----
    // data:       plain key→value for form field population (same shape consumers expect)
    // confidence: key→confidence_level for rendering ConfidenceBadge in the UI
    return NextResponse.json({
      success: true,
      provider,
      section,
      data: plainData,
      confidence,
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
