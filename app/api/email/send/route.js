// ============================================================================
// /api/email/send — Send a Single Email from the Welcome Sequence
// ============================================================================
// POST endpoint that sends one email from the WELCOME_SEQUENCE by templateId.
// Personalizes with the recipient's name and dispatches via the send utility.
//
// REQUEST:
//   POST /api/email/send
//   { to: string, templateId: number (0-4), userName: string }
//
// RESPONSE:
//   { success: true, messageId: string }
//   or
//   { error: string } with appropriate HTTP status
//
// SECURITY:
//   - Email format validation
//   - Rate limiting (simple in-memory, per-IP)
//   - Template ID bounds checking
// ============================================================================

import { NextResponse } from 'next/server';
import { WELCOME_SEQUENCE, personalizeEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

// ============================================================================
// EMAIL VALIDATION
// ============================================================================
// Standard regex — catches most malformed addresses without being overly strict.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// RATE LIMITING — IN-MEMORY
// ============================================================================
// Simple sliding-window rate limiter. Prevents abuse without external deps.
// In production, swap this for Redis-based rate limiting via Vercel KV.
//
// Config:
//   WINDOW_MS  — time window in milliseconds (default: 60 seconds)
//   MAX_SENDS  — max send requests per IP within the window (default: 10)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_SENDS = 10;

// Map<string, number[]> — IP → array of timestamps within the current window
const rateLimitMap = new Map();

// ============ Rate limit check ============
// Returns true if the request should be BLOCKED (over limit).
// Cleans up expired entries on each call to prevent memory leaks.
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Remove entries outside the current window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX_SENDS) {
    return true;
  }

  // Record this request
  recent.push(now);
  return false;
}

// ============ Periodic cleanup — prevent unbounded memory growth ============
// Every 5 minutes, purge IPs that have no recent activity.
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ============================================================================
// POST HANDLER
// ============================================================================
export async function POST(request) {
  try {
    // ============ Rate limit check ============
    // x-forwarded-for is set by Vercel's edge network; fall back for local dev.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // ============ Parse request body ============
    const body = await request.json();
    const { to, templateId, userName } = body;

    // ============ Validate required fields ============
    if (!to || templateId === undefined || templateId === null) {
      return NextResponse.json(
        { error: 'Missing required fields: "to" and "templateId" are required.' },
        { status: 400 }
      );
    }

    // ============ Validate email format ============
    if (!EMAIL_REGEX.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // ============ Validate templateId bounds ============
    const index = Number(templateId);
    if (!Number.isInteger(index) || index < 0 || index >= WELCOME_SEQUENCE.length) {
      return NextResponse.json(
        { error: `Invalid templateId. Must be 0-${WELCOME_SEQUENCE.length - 1}.` },
        { status: 400 }
      );
    }

    // ============ Personalize the template ============
    const template = WELCOME_SEQUENCE[index];
    const personalized = personalizeEmail(template, {
      userName: userName || 'there',
      // In production, generate a real per-user unsubscribe link here
      unsubscribeUrl: `https://duedrill.com/unsubscribe?email=${encodeURIComponent(to)}`,
    });

    // ============ Send the email ============
    const result = await sendEmail({
      to,
      subject: personalized.subject,
      html: personalized.htmlBody,
      text: personalized.textBody,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email.' },
        { status: 500 }
      );
    }

    // ============ Success response ============
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      templateId: index,
    });
  } catch (err) {
    console.error('[API /email/send] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
