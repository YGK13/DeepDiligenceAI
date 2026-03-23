// ============================================================================
// /api/waitlist — Email Capture Endpoint for Landing Page
// ============================================================================
// Receives email submissions from the landing page CTA.
//
// STORAGE STRATEGY:
//   - When Supabase is configured: inserts into `waitlist` table
//   - Fallback: logs to server console (visible in Vercel Logs)
//
// POST /api/waitlist  { email: string }
// GET  /api/waitlist  → { count: number }
// ============================================================================

import { NextResponse } from 'next/server';

// ============ EMAIL VALIDATION ============
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============ SUPABASE CHECK ============
// Only attempt Supabase if env vars are configured
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // Dynamic import to avoid breaking when Supabase isn't installed
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key);
  } catch {
    return null;
  }
}

// ============ IN-MEMORY FALLBACK ============
// For when Supabase isn't configured. Entries persist until function cold-starts.
// All entries are also logged to console (visible in Vercel Logs dashboard).
const memoryStore = [];

// ============ POST HANDLER ============
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    // ============ VALIDATION ============
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // ============ STORE THE EMAIL ============
    const entry = {
      email: normalizedEmail,
      joined_at: new Date().toISOString(),
      source: 'landing_page',
    };

    const supabase = getSupabaseClient();

    if (supabase) {
      // Supabase mode — insert into waitlist table
      // Upsert to handle duplicates gracefully (email is unique)
      const { error } = await supabase
        .from('waitlist')
        .upsert(entry, { onConflict: 'email', ignoreDuplicates: true });

      if (error) {
        console.error('[WAITLIST] Supabase insert error:', error);
        // Fall through to memory store as backup
        memoryStore.push(entry);
      }
    } else {
      // No Supabase — use memory store + console log
      // Console logs are visible in Vercel Logs dashboard
      const isDuplicate = memoryStore.some((e) => e.email === normalizedEmail);
      if (!isDuplicate) {
        memoryStore.push(entry);
      }
    }

    // Always log to console for Vercel Logs visibility
    console.log('[WAITLIST] New signup:', normalizedEmail);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[WAITLIST] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// ============ GET HANDLER ============
// Returns waitlist count (for admin use)
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    if (supabase) {
      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      if (!error) {
        return NextResponse.json({ success: true, count: count || 0 });
      }
    }

    // Fallback to memory store count
    return NextResponse.json({
      success: true,
      count: memoryStore.length,
    });
  } catch (err) {
    console.error('[WAITLIST] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to read waitlist.' },
      { status: 500 }
    );
  }
}
