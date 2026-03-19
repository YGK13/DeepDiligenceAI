// ============================================================================
// /api/waitlist — Email Capture Endpoint for Landing Page
// ============================================================================
// Receives email submissions from the landing page CTA and stores them.
// Currently stores in a JSON file (no external DB dependency for MVP).
// Will migrate to Supabase `waitlist` table once auth is integrated.
//
// POST /api/waitlist
// Body: { email: string }
// Returns: { success: true } or { success: false, error: string }
// ============================================================================

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// ============ STORAGE CONFIG ============
// In production, this will be a Supabase table.
// For now, we use a simple JSON file in the project root.
// This file is gitignored to protect subscriber data.
const WAITLIST_FILE = path.join(process.cwd(), 'data', 'waitlist.json');

// ============ HELPERS ============

// Simple email validation regex — catches most obvious typos
// Not RFC 5322 compliant but good enough for a waitlist
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Read existing waitlist entries from disk
async function readWaitlist() {
  try {
    const raw = await fs.readFile(WAITLIST_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // File doesn't exist yet or is corrupted — start fresh
    return [];
  }
}

// Write waitlist entries to disk (creates data/ dir if needed)
async function writeWaitlist(entries) {
  const dir = path.dirname(WAITLIST_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

// ============ POST HANDLER ============
export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { email } = body;

    // ============ VALIDATION ============

    // Email is required
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Trim and lowercase for consistency
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // ============ STORE THE EMAIL ============

    // Read existing entries
    const entries = await readWaitlist();

    // Check for duplicates — don't add the same email twice
    const alreadyExists = entries.some((e) => e.email === normalizedEmail);
    if (alreadyExists) {
      // Return success anyway — don't reveal whether email is already registered
      // This prevents email enumeration attacks
      return NextResponse.json({ success: true });
    }

    // Add the new entry with timestamp and source metadata
    entries.push({
      email: normalizedEmail,
      joinedAt: new Date().toISOString(),
      source: 'landing_page',
      // IP and user-agent for analytics (not stored in production without consent)
    });

    // Persist to disk
    await writeWaitlist(entries);

    // ============ SUCCESS RESPONSE ============
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Waitlist API error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// ============ GET HANDLER ============
// Returns waitlist count (not emails) for admin dashboard
// In production, this would be behind auth middleware
export async function GET() {
  try {
    const entries = await readWaitlist();
    return NextResponse.json({
      success: true,
      count: entries.length,
    });
  } catch (err) {
    console.error('Waitlist GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to read waitlist.' },
      { status: 500 }
    );
  }
}
