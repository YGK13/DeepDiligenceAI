// ============================================================================
// /api/email/schedule — Schedule the Full Welcome Drip Sequence
// ============================================================================
// Called once after user signup. Creates schedule records for all 5 emails
// in the welcome sequence, each with the appropriate delay.
//
// REQUEST:
//   POST /api/email/schedule
//   { email: string, userName: string }
//
// RESPONSE:
//   { success: true, scheduled: 5, scheduleId: string, emails: [...] }
//
// STORAGE:
//   In-memory for now (Map). Each entry stores the full schedule so a
//   background worker (or cron job) can pick them up and send at the right time.
//
// PRODUCTION UPGRADE PATH:
//   Replace the in-memory Map with a Supabase `email_schedules` table:
//     id          uuid PK
//     email       text NOT NULL
//     user_name   text
//     template_id int NOT NULL
//     send_at     timestamptz NOT NULL
//     sent_at     timestamptz NULL
//     status      text DEFAULT 'pending' -- pending | sent | failed | cancelled
//     created_at  timestamptz DEFAULT now()
// ============================================================================

import { NextResponse } from 'next/server';
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';
import { WELCOME_SEQUENCE } from '@/lib/email/templates';

// ============================================================================
// EMAIL VALIDATION
// ============================================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// IN-MEMORY SCHEDULE STORE
// ============================================================================
// Map<string, ScheduleRecord> — scheduleId → full schedule record.
// Persists until the serverless function cold-starts (fine for dev/preview).
//
// Each record:
//   {
//     scheduleId: string,
//     email: string,
//     userName: string,
//     createdAt: string (ISO),
//     emails: [
//       { templateId: 0, sendAt: string (ISO), status: 'pending' },
//       { templateId: 1, sendAt: string (ISO), status: 'pending' },
//       ...
//     ]
//   }
const scheduleStore = new Map();

// ============ Export for use by worker/cron processes ============
// In a real setup, the cron job would query Supabase. For now, it can
// import this Map directly if running in the same process.
export { scheduleStore };

// ============================================================================
// DUPLICATE CHECK
// ============================================================================
// Prevents scheduling the same email address twice within 24 hours.
// Returns the existing scheduleId if found, or null.
function findRecentSchedule(email) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, record] of scheduleStore.entries()) {
    if (
      record.email.toLowerCase() === email.toLowerCase() &&
      new Date(record.createdAt).getTime() > oneDayAgo
    ) {
      return id;
    }
  }
  return null;
}

// ============================================================================
// GENERATE SCHEDULE ID
// ============================================================================
// Simple unique ID. In production, use crypto.randomUUID() or Supabase's uuid.
function generateScheduleId() {
  return `sched_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================================
// POST HANDLER
// ============================================================================
export async function POST(request) {
  try {
    // ============ Parse request body ============
    const body = await request.json();
    const { email, userName } = body;

    // ============ Validate required fields ============
    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: "email".' },
        { status: 400 }
      );
    }

    // ============ Validate email format ============
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // ============ Duplicate check ============
    const existingId = findRecentSchedule(email);
    if (existingId) {
      return NextResponse.json(
        {
          error: 'Welcome sequence already scheduled for this email.',
          existingScheduleId: existingId,
        },
        { status: 409 }
      );
    }

    // ============ Build the schedule ============
    // For each email in the sequence, calculate the exact send time
    // based on delayDays from now.
    const now = new Date();
    const scheduleId = generateScheduleId();

    const emails = WELCOME_SEQUENCE.map((template) => {
      const sendAt = new Date(now);
      sendAt.setDate(sendAt.getDate() + template.delayDays);

      // For Day 0, send at a reasonable time (not midnight).
      // If it's a future day, schedule for 10:00 AM UTC.
      if (template.delayDays > 0) {
        sendAt.setUTCHours(10, 0, 0, 0);
      }

      return {
        templateId: template.templateId,
        subject: template.subject,
        delayDays: template.delayDays,
        sendAt: sendAt.toISOString(),
        status: 'pending', // pending | sent | failed | cancelled
      };
    });

    // ============ Store the schedule ============
    const record = {
      scheduleId,
      email: email.toLowerCase().trim(),
      userName: userName || 'there',
      createdAt: now.toISOString(),
      emails,
    };

    scheduleStore.set(scheduleId, record);

    console.log(`[EMAIL SCHEDULE] Created ${scheduleId} for ${email} — ${emails.length} emails queued`);

    // ============ Send Day 0 email immediately ============
    // The welcome email (templateId 0) should go out right away.
    // We fire-and-forget the send request to our own send API.
    // In production, this would be a direct call to the send utility.
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
        || 'http://localhost:3000';

      // Fire-and-forget — don't block the schedule response
      fetch(`${baseUrl}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          templateId: 0,
          userName: userName || 'there',
        }),
      }).then((res) => {
        if (res.ok) {
          // Update the schedule record to reflect Day 0 was sent
          const updated = scheduleStore.get(scheduleId);
          if (updated) {
            updated.emails[0].status = 'sent';
            updated.emails[0].sentAt = new Date().toISOString();
          }
          console.log(`[EMAIL SCHEDULE] Day 0 welcome email sent for ${scheduleId}`);
        } else {
          console.error(`[EMAIL SCHEDULE] Day 0 send failed for ${scheduleId}:`, res.status);
        }
      }).catch((err) => {
        console.error(`[EMAIL SCHEDULE] Day 0 send error for ${scheduleId}:`, err.message);
      });
    } catch (sendErr) {
      // Non-fatal — the schedule is still created even if immediate send fails.
      console.error(`[EMAIL SCHEDULE] Day 0 fire-and-forget error:`, sendErr.message);
    }

    // ============ Success response ============
    return NextResponse.json({
      success: true,
      scheduleId,
      scheduled: emails.length,
      emails,
    });
  } catch (err) {
    console.error('[API /email/schedule] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER — Check schedule status (useful for debugging)
// ============================================================================
// GET /api/email/schedule?email=user@example.com
// Returns the schedule record for the given email, or a count of all schedules.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  // ============ Lookup by email ============
  if (email) {
    for (const record of scheduleStore.values()) {
      if (record.email === email.toLowerCase().trim()) {
        return NextResponse.json({ success: true, schedule: record });
      }
    }
    return NextResponse.json(
      { error: 'No schedule found for this email.' },
      { status: 404 }
    );
  }

  // ============ Return total count ============
  return NextResponse.json({
    success: true,
    totalSchedules: scheduleStore.size,
  });
}
