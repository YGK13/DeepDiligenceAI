// ============================================================================
// /api/share/create — Create a Shareable Report Link
// ============================================================================
// POST /api/share/create
// Body: { companyId, companyData }
//
// Generates a unique share token (crypto.randomUUID), snapshots the full
// company data object into a JSON file at data/shares/{token}.json, and
// returns the public share URL. Auth required: only logged-in users can
// create shares. Rate limited to prevent abuse.
//
// The snapshot is immutable: once created, the data never changes even if
// the original company record is updated. This ensures LPs, co-investors
// and IC committees always see the exact version the analyst shared.
//
// Each share includes:
//   - token (UUID v4)
//   - companyData (full company object at time of share)
//   - createdAt (ISO timestamp)
//   - createdBy (user ID or email)
//   - expiresAt (30 days from creation)
// ============================================================================

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============ AUTHENTICATION ============
// Only authenticated users can create share links: DD reports contain
// sensitive investment data that should not be shareable anonymously.
import { requireAuth } from '@/lib/security/session';

// ============ RATE LIMITING ============
// Prevent abuse: creating shares writes to disk, so we cap the rate.
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ CONSTANTS ============
const SHARES_DIR = path.join(process.cwd(), 'data', 'shares');
const SHARE_TTL_DAYS = 30;

// ============ POST HANDLER ============
export async function POST(request) {
  // --- Auth gate: require a valid session ---
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  // --- Rate limit: 20 shares per minute per user ---
  const { success } = rateLimitByApiRoute(request, {
    windowMs: 60_000,
    maxRequests: 20,
  });
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before creating another share link.' },
      { status: 429 }
    );
  }

  // --- Parse and validate the request body ---
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { companyId, companyData } = body;

  if (!companyData || typeof companyData !== 'object') {
    return NextResponse.json(
      { error: 'companyData is required and must be an object' },
      { status: 400 }
    );
  }

  // --- Generate the share token ---
  const token = crypto.randomUUID();

  // --- Build the share payload ---
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const sharePayload = {
    token,
    companyId: companyId || null,
    companyData,
    createdAt: now.toISOString(),
    createdBy: user.email || user.id || 'unknown',
    expiresAt: expiresAt.toISOString(),
  };

  // --- Ensure the shares directory exists ---
  try {
    if (!existsSync(SHARES_DIR)) {
      await mkdir(SHARES_DIR, { recursive: true });
    }
  } catch (dirErr) {
    console.error('[share/create] Failed to create shares directory:', dirErr);
    return NextResponse.json(
      { error: 'Server error: could not initialize share storage' },
      { status: 500 }
    );
  }

  // --- Write the snapshot to disk ---
  const filePath = path.join(SHARES_DIR, `${token}.json`);
  try {
    await writeFile(filePath, JSON.stringify(sharePayload, null, 2), 'utf-8');
  } catch (writeErr) {
    console.error('[share/create] Failed to write share file:', writeErr);
    return NextResponse.json(
      { error: 'Server error: could not save share data' },
      { status: 500 }
    );
  }

  // --- Build the public share URL ---
  // Use the request's origin header for the base URL so it works in dev
  // and production without hardcoding a domain.
  const origin = request.headers.get('origin')
    || request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : 'https://duedrill.com';
  const shareUrl = `${origin}/share/${token}`;

  // --- Return the share URL ---
  return NextResponse.json({
    success: true,
    token,
    shareUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
