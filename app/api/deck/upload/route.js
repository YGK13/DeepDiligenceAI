// ============================================================================
// app/api/deck/upload/route.js — Pitch Deck PDF Upload & Text Extraction
// ============================================================================
// Server-side API route that accepts a multipart/form-data POST with a PDF
// pitch deck file, extracts all text content using pdf-parse, and returns
// the raw text plus metadata. This is the first step in the deck analysis
// pipeline: Upload → Extract → Analyze → Compare.
//
// Flow:
//   1. Client uploads PDF via FormData (field name: "file")
//   2. Server validates file type and size (max 20MB)
//   3. pdf-parse extracts text from all pages
//   4. Returns { success: true, text: "...", pageCount: N, fileName: "..." }
//
// Error handling:
//   - No file attached → 400
//   - File too large (>20MB) → 413
//   - Not a PDF → 415
//   - Corrupted/unreadable PDF → 422
//   - Unexpected server error → 500
// ============================================================================

import { NextResponse } from 'next/server';

// ============ AUTHENTICATION ============
// Require a valid session — only logged-in users can upload decks.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Prevent abuse — file uploads are resource-intensive.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ CONSTANTS ============
// 20MB max — pitch decks rarely exceed 10MB, but some image-heavy decks
// can get large. 20MB is generous while still preventing abuse.
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

// ============ NEXT.JS ROUTE SEGMENT CONFIG ============
// Disable the default body parser so we can handle multipart/form-data
// ourselves via request.formData(). Next.js App Router handles this natively.
export const runtime = 'nodejs';

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

    // ---- Step 1: Parse the multipart form data ----
    // Next.js App Router supports request.formData() natively — no need for
    // external libraries like multer or busboy.
    let formData;
    try {
      formData = await request.formData();
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data. Send a multipart/form-data POST with a "file" field.' },
        { status: 400 }
      );
    }

    // ---- Step 2: Extract and validate the file ----
    const file = formData.get('file');

    // Check that a file was actually provided
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Include a PDF file in the "file" form field.' },
        { status: 400 }
      );
    }

    // Check file name — must end in .pdf
    const fileName = file.name || 'unknown';
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: "${fileName}". Only PDF files are accepted.` },
        { status: 415 }
      );
    }

    // Check MIME type as secondary validation
    // Some clients send application/octet-stream, so we check both
    const mimeType = file.type || '';
    if (mimeType && mimeType !== 'application/pdf' && mimeType !== 'application/octet-stream') {
      return NextResponse.json(
        { success: false, error: `Invalid MIME type: "${mimeType}". Expected application/pdf.` },
        { status: 415 }
      );
    }

    // Check file size — enforce 20MB limit
    const fileSize = file.size || 0;
    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { success: false, error: `File too large (${sizeMB}MB). Maximum allowed size is 20MB.` },
        { status: 413 }
      );
    }

    // ---- Step 3: Read file into Buffer for pdf-parse ----
    // file.arrayBuffer() gives us the raw bytes; we convert to Node.js Buffer
    // because pdf-parse expects a Buffer input.
    let buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Failed to read file data. The file may be corrupted.' },
        { status: 422 }
      );
    }

    // Quick sanity check: PDF files start with "%PDF"
    if (buffer.length < 4 || buffer.toString('utf8', 0, 4) !== '%PDF') {
      return NextResponse.json(
        { success: false, error: 'File does not appear to be a valid PDF (missing %PDF header).' },
        { status: 422 }
      );
    }

    // ---- Step 4: Extract text using pdf-parse ----
    // Dynamic import to avoid issues with pdf-parse's module loading.
    // pdf-parse wraps Mozilla's pdf.js and extracts all text content
    // from every page of the PDF.
    let pdfData;
    try {
      const pdfParse = (await import('pdf-parse')).default;
      pdfData = await pdfParse(buffer, {
        // Maximum pages to parse — safety valve against extremely long docs
        max: 200,
      });
    } catch (err) {
      console.error('[Deck Upload] pdf-parse error:', err);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse PDF. The file may be corrupted, password-protected, or contain only images (no extractable text).',
        },
        { status: 422 }
      );
    }

    // ---- Step 5: Validate extracted text ----
    const extractedText = (pdfData.text || '').trim();
    const pageCount = pdfData.numpages || 0;

    // Warn if very little text was extracted — likely a scanned/image-only deck
    if (extractedText.length < 50) {
      return NextResponse.json({
        success: true,
        warning: 'Very little text was extracted. This PDF may contain mostly images or scanned pages. For best results, use a text-based PDF.',
        text: extractedText,
        pageCount,
        fileName,
        fileSize,
        charCount: extractedText.length,
      });
    }

    // ---- Step 6: Return extracted text ----
    return NextResponse.json({
      success: true,
      text: extractedText,
      pageCount,
      fileName,
      fileSize,
      charCount: extractedText.length,
    });

  } catch (error) {
    // Catch-all for unexpected errors
    console.error('[Deck Upload] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred while processing the PDF upload.',
      },
      { status: 500 }
    );
  }
}
