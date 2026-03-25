// ============================================================================
// app/api/ai/research/route.js — Server-Side AI Research Proxy Route
// ============================================================================
// Next.js Route Handler that proxies AI research requests to the configured
// provider (Perplexity, Anthropic, OpenAI, or Groq). This eliminates CORS
// issues by making all external API calls from the server, not the browser.
//
// Accepts POST with body:
//   { provider, model, companyContext, sectionLabel, customPrompt }
//
// Returns JSON:
//   Success: { success: true, text: "..." }
//   Failure: { success: false, error: "..." }
// ============================================================================

import { NextResponse } from 'next/server';

// ============ RATE LIMITING ============
// Import the stricter AI route limiter (10 req/min per IP).
// Each research request burns expensive AI API credits, so we need to prevent
// abuse from bots or runaway client-side loops.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ PROVIDER CONFIGURATIONS ============
// Each provider has its own endpoint URL, auth header format, request body
// builder, and response text extractor. This keeps the main handler clean.
const PROVIDER_CONFIGS = {
  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    envKey: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar-pro',
    // Perplexity uses OpenAI-compatible format with Bearer token
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    // OpenAI-compatible chat completion body
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3, // low temperature for factual, analytical output
    }),
    // Extract response text from OpenAI-compatible response shape
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },

  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    // Anthropic uses x-api-key header and requires anthropic-version
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    // Anthropic Messages API body format (system is top-level, not in messages)
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
    // Anthropic returns content as an array of blocks
    extractText: (data) => data?.content?.[0]?.text || '',
  },

  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    // Standard OpenAI Bearer token auth
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },

  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    // Groq uses OpenAI-compatible format with Bearer token
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content || '',
  },
};

// ============ SYSTEM PROMPT ============
// This establishes the AI's role and output expectations for all providers.
const SYSTEM_PROMPT =
  'You are a world-class VC analyst performing deep due diligence research. ' +
  'Be thorough, data-driven, and flag any red flags or risks. ' +
  'Structure your analysis with clear headers and bullet points. ' +
  "If you don't have data, say so — never hallucinate.";

// ============ USER PROMPT BUILDER ============
// Constructs the user-facing prompt from company context and section info.
// Includes all available company metadata for richer, more targeted analysis.
function buildUserPrompt(companyContext, sectionLabel, customPrompt) {
  // Start with structured company context
  const contextLines = [];
  if (companyContext?.name)      contextLines.push(`Company: ${companyContext.name}`);
  if (companyContext?.url)       contextLines.push(`Website: ${companyContext.url}`);
  if (companyContext?.sector)    contextLines.push(`Sector: ${companyContext.sector}`);
  if (companyContext?.stage)     contextLines.push(`Stage: ${companyContext.stage}`);
  if (companyContext?.founded)   contextLines.push(`Founded: ${companyContext.founded}`);
  if (companyContext?.hqCity)    contextLines.push(`HQ City: ${companyContext.hqCity}`);
  if (companyContext?.hqCountry) contextLines.push(`HQ Country: ${companyContext.hqCountry}`);

  const contextBlock = contextLines.length > 0
    ? `Company Context:\n${contextLines.join('\n')}\n\n`
    : '';

  // If there's a custom prompt, use that as the primary instruction
  if (customPrompt && customPrompt.trim()) {
    return (
      `${contextBlock}` +
      `Section: ${sectionLabel}\n\n` +
      `Custom Research Request:\n${customPrompt.trim()}`
    );
  }

  // Default: ask for a comprehensive analysis of the section
  return (
    `${contextBlock}` +
    `Please provide a comprehensive due diligence analysis for the "${sectionLabel}" section.\n\n` +
    'Include:\n' +
    '- Key findings and data points\n' +
    '- Strengths and competitive advantages\n' +
    '- Weaknesses and red flags\n' +
    '- Risks and mitigation strategies\n' +
    '- Overall assessment with a recommended score rationale (1-10 scale)\n\n' +
    'Be specific, use data where available, and clearly flag any assumptions or areas where data is lacking.'
  );
}

// ============ POST HANDLER ============
// Main entry point for the API route. Validates input, selects provider,
// builds the request, calls the external API, and returns the result.
export async function POST(request) {
  try {
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

    // ---- Parse and validate request body ----
    const body = await request.json();
    const { provider, model, companyContext, sectionLabel, customPrompt } = body;

    // Validate that we have a supported provider
    if (!provider || !PROVIDER_CONFIGS[provider]) {
      return NextResponse.json(
        { success: false, error: `Unsupported provider: "${provider}". Supported: ${Object.keys(PROVIDER_CONFIGS).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate section label is present
    if (!sectionLabel) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: sectionLabel' },
        { status: 400 }
      );
    }

    // ---- Resolve provider configuration ----
    const config = PROVIDER_CONFIGS[provider];

    // API Key: SERVER-SIDE ONLY. Users pay for DueDrill; we pay for AI tokens.
    // Keys live in environment variables, never exposed to the client.
    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: `AI provider not configured. Contact support@duedrill.com.`,
        },
        { status: 503 }
      );
    }

    // Use the specified model or fall back to the provider's default
    const resolvedModel = model || config.defaultModel;

    // ---- Build the prompts ----
    const userPrompt = buildUserPrompt(companyContext, sectionLabel, customPrompt);

    // ---- Make the external API call ----
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify(config.buildBody(resolvedModel, SYSTEM_PROMPT, userPrompt)),
    });

    // ---- Handle non-OK responses from the provider ----
    if (!response.ok) {
      // Try to extract a meaningful error message from the response body
      let errorMessage = `Provider "${provider}" returned HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        // Different providers structure errors differently; try common patterns
        const detail =
          errorData?.error?.message ||
          errorData?.error?.type ||
          errorData?.message ||
          JSON.stringify(errorData);
        errorMessage += `: ${detail}`;
      } catch {
        // Response body wasn't valid JSON — include status text instead
        errorMessage += `: ${response.statusText}`;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    // ---- Parse successful response and extract text ----
    const data = await response.json();
    const text = config.extractText(data);

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Provider returned an empty response. The model may not have generated any output.' },
        { status: 502 }
      );
    }

    // ---- Return the extracted research text ----
    return NextResponse.json({ success: true, text });

  } catch (error) {
    // ---- Catch-all for unexpected server errors ----
    console.error('[AI Research Route] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred while processing the AI research request.',
      },
      { status: 500 }
    );
  }
}
