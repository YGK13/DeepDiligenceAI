// ============================================================================
// lib/email/send.js — DueDrill: Email Sending Utility
// ============================================================================
// Abstraction layer for sending transactional emails.
//
// PROVIDER STRATEGY:
//   - If RESEND_API_KEY is set → sends via Resend API (https://api.resend.com)
//   - If not set → logs to console (development mode, visible in Vercel Logs)
//
// This design means local dev and preview deploys work without email config,
// while production just needs the RESEND_API_KEY env var to go live.
//
// USAGE:
//   import { sendEmail, isEmailConfigured } from '@/lib/email/send';
//   await sendEmail({ to: 'user@example.com', subject: '...', html: '...', text: '...' });
// ============================================================================

import { FROM_ADDRESS } from './templates';

// ============================================================================
// CONFIGURATION CHECK
// ============================================================================
// Returns true if the Resend API key is configured.
// Used by API routes to decide whether to actually send or just log.
export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// ============================================================================
// SEND EMAIL
// ============================================================================
// Core send function. Dispatches to Resend or console based on config.
//
// Parameters:
//   to      — recipient email address (string)
//   subject — email subject line (string)
//   html    — full HTML email body with inline CSS (string)
//   text    — plain text fallback body (string)
//   from    — sender address (optional, defaults to FROM_ADDRESS constant)
//
// Returns:
//   { success: boolean, messageId: string|null, provider: 'resend'|'console' }
export async function sendEmail({ to, subject, html, text, from = FROM_ADDRESS }) {
  // ============ VALIDATE INPUTS ============
  if (!to || !subject) {
    throw new Error('sendEmail requires "to" and "subject" parameters');
  }

  // ============ RESEND API PATH ============
  // If RESEND_API_KEY is set, we send for real via Resend's REST API.
  // Docs: https://resend.com/docs/api-reference/emails/send-email
  if (isEmailConfigured()) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      // ============ HANDLE RESEND RESPONSE ============
      const data = await response.json();

      if (!response.ok) {
        console.error('[EMAIL] Resend API error:', data);
        return {
          success: false,
          messageId: null,
          provider: 'resend',
          error: data.message || 'Resend API returned an error',
        };
      }

      console.log(`[EMAIL] Sent via Resend to ${to} | messageId: ${data.id}`);
      return {
        success: true,
        messageId: data.id,
        provider: 'resend',
      };
    } catch (err) {
      // Network error, timeout, etc.
      console.error('[EMAIL] Resend API fetch failed:', err.message);
      return {
        success: false,
        messageId: null,
        provider: 'resend',
        error: err.message,
      };
    }
  }

  // ============ CONSOLE FALLBACK (DEV MODE) ============
  // No API key configured — log the email to console instead.
  // This makes development and testing painless while keeping the
  // send pipeline fully exercised.
  const messageId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log('═'.repeat(60));
  console.log('[EMAIL] Development mode — email logged to console');
  console.log(`  To:      ${to}`);
  console.log(`  From:    ${from}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  ID:      ${messageId}`);
  console.log('─'.repeat(60));
  console.log('  Text body preview (first 200 chars):');
  console.log(`  ${(text || '').slice(0, 200)}`);
  console.log('═'.repeat(60));

  return {
    success: true,
    messageId,
    provider: 'console',
  };
}
