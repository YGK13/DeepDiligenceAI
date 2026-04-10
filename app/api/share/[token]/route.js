// ============================================================================
// /api/share/[token] — Public Share Data Endpoint
// ============================================================================
// GET /api/share/{token}
//
// Returns the company data snapshot for a given share token. This is the
// PUBLIC endpoint: no authentication required. Anyone with the link can
// view the report, which is the whole point of sharing with LPs,
// co-investors and IC committees.
//
// Validates:
//   1. Token exists as a JSON file in data/shares/
//   2. Token has not expired (30-day TTL)
//
// Returns the full share object including companyData, creation date
// and expiry date so the share page can render metadata.
// ============================================================================

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ============ CONSTANTS ============
const SHARES_DIR = path.join(process.cwd(), 'data', 'shares');

// ============ GET HANDLER ============
export async function GET(request, { params }) {
  const { token } = await params;

  // --- Validate token format: must be a valid UUID to prevent path traversal ---
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!token || !UUID_REGEX.test(token)) {
    return NextResponse.json(
      { error: 'Invalid share token' },
      { status: 400 }
    );
  }

  // --- Read the share file ---
  const filePath = path.join(SHARES_DIR, `${token}.json`);

  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: 'Share not found. It may have been removed or never existed.' },
      { status: 404 }
    );
  }

  let shareData;
  try {
    const raw = await readFile(filePath, 'utf-8');
    shareData = JSON.parse(raw);
  } catch (readErr) {
    console.error(`[share/${token}] Failed to read share file:`, readErr);
    return NextResponse.json(
      { error: 'Server error: could not read share data' },
      { status: 500 }
    );
  }

  // --- Check expiration ---
  const expiresAt = new Date(shareData.expiresAt);
  if (expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'This share link has expired. Please request a new link from the report owner.' },
      { status: 410 }
    );
  }

  // --- Return the share data ---
  // Include everything the share page needs to render the report
  return NextResponse.json({
    success: true,
    token: shareData.token,
    companyData: shareData.companyData,
    createdAt: shareData.createdAt,
    createdBy: shareData.createdBy,
    expiresAt: shareData.expiresAt,
  });
}
