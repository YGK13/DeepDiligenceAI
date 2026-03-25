// ============================================================================
// app/api/integrations/import/route.js — Integration Import API Route
// ============================================================================
// Accepts a POST request with { integration, companyId, apiKey } and returns
// the full company profile mapped to the DueDrill schema.
//
// This is the second step after search: the user found a company in the
// search results, clicked "Import", and now we fetch the full profile
// and transform it into DueDrill's field format.
//
// The returned data is structured identically to what /api/ai/autofill
// returns — the client can merge it directly into the company object
// using the same onAutoFill callback. This means the integration import
// and the AI auto-fill produce the SAME output shape, making the UI
// integration seamless.
//
// REQUEST: POST { integration: 'crunchbase', companyId: 'stripe', apiKey: 'xxx' }
// RESPONSE: { success: true, data: { overview: {...}, team: {...}, ... } }
//           { success: false, error: 'Error message' }
// ============================================================================

import { NextResponse } from 'next/server';
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';
import { getCompanyFromIntegration, INTEGRATIONS } from '@/lib/integrations';

// ============ POST HANDLER ============
export async function POST(request) {
  // ---- Rate Limiting ----
  // Same stricter limiter as the search route. Import requests are more
  // expensive (full profile fetch) so rate limiting is even more important.
  const { success: rateLimitOk, remaining } = rateLimitByApiRoute(request);
  if (!rateLimitOk) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before importing again.',
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
          error: 'Invalid JSON in request body. Expected { integration, companyId, apiKey }.',
        },
        { status: 400 }
      );
    }

    const { integration, companyId, apiKey } = body;

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

    if (!companyId || typeof companyId !== 'string' || companyId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "companyId" field. This should come from the search results.',
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

    // ---- PitchBook is file-upload only ----
    if (integration === 'pitchbook') {
      return NextResponse.json(
        {
          success: false,
          error: 'PitchBook does not support API import. Use the CSV/PDF upload feature instead.',
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

    // ---- Fetch and Map Company Data ----
    // getCompanyFromIntegration handles:
    //   1. Dispatching to the correct integration module
    //   2. Fetching the full company profile from the API
    //   3. Mapping the raw data to the DueDrill schema
    //   4. Attaching source metadata (_source object)
    const mappedData = await getCompanyFromIntegration(
      integration,
      companyId.trim(),
      apiKey || ''
    );

    // ---- Count populated fields for the UI status message ----
    // Walk the mapped data and count non-empty values across all sections.
    // This lets the UI show "Imported 15 fields from Crunchbase" etc.
    let populatedFields = 0;
    let totalFields = 0;
    for (const [sectionKey, sectionData] of Object.entries(mappedData)) {
      // Skip metadata fields (prefixed with _)
      if (sectionKey.startsWith('_')) continue;
      if (typeof sectionData !== 'object' || sectionData === null) continue;

      for (const [fieldKey, fieldValue] of Object.entries(sectionData)) {
        if (fieldKey.startsWith('_')) continue;
        totalFields++;
        if (fieldValue !== '' && fieldValue !== null && fieldValue !== undefined && fieldValue !== 0) {
          populatedFields++;
        }
      }
    }

    // ---- Return Success Response ----
    return NextResponse.json(
      {
        success: true,
        data: mappedData,
        integration,
        companyId: companyId.trim(),
        stats: {
          populatedFields,
          totalFields,
          source: meta.name,
          importedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    );
  } catch (err) {
    // ---- Categorize errors for appropriate HTTP status codes ----
    const message = err.message || 'An unexpected error occurred during import.';

    let status = 500;
    if (message.includes('API key') || message.includes('invalid') || message.includes('expired') || message.includes('401')) {
      status = 401;
    } else if (message.includes('rate limit') || message.includes('429')) {
      status = 429;
    } else if (message.includes('not found') || message.includes('404')) {
      status = 404;
    } else if (message.includes('timed out') || message.includes('timeout')) {
      status = 504;
    } else if (message.includes('required') || message.includes('Missing') || message.includes('format')) {
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
