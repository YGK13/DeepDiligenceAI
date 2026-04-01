// ============================================================================
// app/api/integrations/search/route.js — Integration Search API Route
// ============================================================================
// Accepts a POST request with { integration, query, apiKey } and returns
// matching companies from the specified third-party database.
//
// This is the backend for the IntegrationPanel search bar. When a user
// types a company name and hits search, the UI calls this route, which
// dispatches to the correct integration's searchCompanies() function.
//
// WHY a server-side route instead of calling APIs directly from the client?
//   1. API keys stay server-side (even client-provided keys are only in memory)
//   2. Rate limiting protects against abuse
//   3. Consistent error handling across all integrations
//   4. CORS issues are avoided (some APIs don't allow browser requests)
//
// REQUEST: POST { integration: 'crunchbase', query: 'Stripe', apiKey: 'xxx' }
// RESPONSE: { success: true, results: [...] }
//           { success: false, error: 'Error message' }
// ============================================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/session';
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';
import { importFromIntegration, INTEGRATIONS } from '@/lib/integrations';

// ============ POST HANDLER ============
export async function POST(request) {
  // ---- Authentication Check ----
  // Verify the user is logged in before hitting third-party APIs.
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  // ---- Rate Limiting ----
  // Use the stricter AI route limiter (10 req/min per IP) because each
  // search hits a third-party API that may have its own rate limits.
  // We don't want one user's rapid searches to burn through our quota.
  const { success: rateLimitOk, remaining } = rateLimitByApiRoute(request);
  if (!rateLimitOk) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before searching again.',
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

  try {
    // ---- Parse Request Body ----
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body. Expected { integration, query, apiKey }.',
        },
        { status: 400 }
      );
    }

    const { integration, query, apiKey } = body;

    // ---- Validate Required Fields ----
    if (!integration || typeof integration !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: `Missing "integration" field. Valid options: ${Object.keys(INTEGRATIONS).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "query" field. Provide a company name to search for.',
        },
        { status: 400 }
      );
    }

    // ---- Validate Integration ID ----
    if (!INTEGRATIONS[integration]) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown integration: "${integration}". Valid options: ${Object.keys(INTEGRATIONS).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // ---- Check if integration supports search ----
    // PitchBook is file-upload only — no search capability.
    if (integration === 'pitchbook') {
      return NextResponse.json(
        {
          success: false,
          error: 'PitchBook does not support search. Use the CSV upload feature instead.',
        },
        { status: 400 }
      );
    }

    // ---- Check API Key if Required ----
    const meta = INTEGRATIONS[integration];
    if (meta.requiresApiKey && (!apiKey || typeof apiKey !== 'string' || !apiKey.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: `${meta.name} requires an API key. Add it in Settings or provide it in the request.`,
        },
        { status: 400 }
      );
    }

    // ---- Execute Search ----
    // importFromIntegration dispatches to the correct module's searchCompanies().
    // It handles all the API communication and returns normalized results.
    const results = await importFromIntegration(integration, query.trim(), apiKey || '');

    // ---- Return Success Response ----
    return NextResponse.json(
      {
        success: true,
        results,
        integration,
        query: query.trim(),
        count: results.length,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    );
  } catch (err) {
    // ---- Categorize errors for the client ----
    // We parse the error message to return appropriate HTTP status codes.
    // This helps the UI show the right error state (auth error vs. not found
    // vs. rate limit vs. server error).
    const message = err.message || 'An unexpected error occurred during search.';

    let status = 500;
    if (message.includes('API key') || message.includes('invalid') || message.includes('expired') || message.includes('401')) {
      status = 401;
    } else if (message.includes('rate limit') || message.includes('429')) {
      status = 429;
    } else if (message.includes('not found') || message.includes('404')) {
      status = 404;
    } else if (message.includes('timed out') || message.includes('timeout')) {
      status = 504;
    } else if (message.includes('required') || message.includes('Missing')) {
      status = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
