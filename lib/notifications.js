// ============================================================================
// lib/notifications.js — Notification management utility for DueDrill
// ============================================================================
// Provides factory functions for creating typed, severity-coded notifications
// used across the app (bell dropdown + toast system). All notifications
// follow a consistent shape: { id, type, title, message, severity, actionUrl,
// read, createdAt }.
//
// Types map to specific DueDrill events:
//   research-complete  — AI research finished for a company/section
//   score-change       — A company's overall score changed significantly
//   monitoring-alert   — Post-DD monitoring detected something noteworthy
//   team-invite        — A teammate was invited or accepted
//   export-ready       — A data export or report finished generating
//   data-stale         — Company data hasn't been refreshed in N days
//   system             — Generic system messages (maintenance, updates, etc.)
// ============================================================================

// ============ NOTIFICATION TYPE → EMOJI ICON MAPPING ============
// Used by NotificationBell and ToastNotification to render a visual
// indicator for each notification type.
export const NOTIFICATION_ICONS = {
  'research-complete': '🔬',
  'score-change':      '📊',
  'monitoring-alert':  '🚨',
  'team-invite':       '👥',
  'export-ready':      '📦',
  'data-stale':        '⏰',
  'system':            '⚙️',
};

// ============ SEVERITY → COLOR MAPPING ============
// Hex colors matching the DueDrill dark theme palette.
// Used by ToastNotification for the left-border / icon color.
export const SEVERITY_COLORS = {
  info:    '#4a7dff',  // accent blue
  success: '#34d399',  // accent green
  warning: '#f59e0b',  // accent amber
  error:   '#ef4444',  // accent red
};

// ============ VALID TYPES & SEVERITIES ============
const VALID_TYPES = new Set([
  'research-complete',
  'score-change',
  'monitoring-alert',
  'team-invite',
  'export-ready',
  'data-stale',
  'system',
]);

const VALID_SEVERITIES = new Set(['info', 'success', 'warning', 'error']);

// ============ ID GENERATOR ============
// Simple unique-enough ID for client-side use (timestamp + random suffix).
// No crypto dependency needed — these are ephemeral UI identifiers.
let _counter = 0;
function generateId() {
  _counter += 1;
  return `notif_${Date.now()}_${_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============ FACTORY FUNCTION ============
/**
 * Creates a fully-formed notification object.
 *
 * @param {Object} params
 * @param {string} params.type      — One of the VALID_TYPES (required)
 * @param {string} params.title     — Short headline, e.g. "Research Complete" (required)
 * @param {string} params.message   — Longer description (required)
 * @param {string} [params.actionUrl] — Optional in-app route or anchor to navigate on click
 * @param {string} [params.severity]  — 'info' | 'success' | 'warning' | 'error' (default: 'info')
 *
 * @returns {{ id: string, type: string, title: string, message: string,
 *             severity: string, actionUrl: string|null, read: boolean, createdAt: string }}
 */
export function createNotification({ type, title, message, actionUrl, severity }) {
  // ---- Validate type ----
  if (!type || !VALID_TYPES.has(type)) {
    console.warn(`[notifications] Invalid type "${type}", falling back to "system".`);
    type = 'system';
  }

  // ---- Validate severity ----
  if (!severity || !VALID_SEVERITIES.has(severity)) {
    severity = 'info';
  }

  return {
    id:        generateId(),
    type,
    title:     title || 'Notification',
    message:   message || '',
    severity,
    actionUrl: actionUrl || null,
    read:      false,
    createdAt: new Date().toISOString(),
  };
}

// ============ RELATIVE TIME HELPER ============
/**
 * Returns a human-friendly relative timestamp like "2m ago", "1h ago", "3d ago".
 * Used by NotificationBell to show when each notification was created.
 *
 * @param {string} isoDate — ISO 8601 date string
 * @returns {string}
 */
export function relativeTime(isoDate) {
  if (!isoDate) return '';

  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 5)     return 'just now';
  if (diffSec < 60)    return `${diffSec}s ago`;
  if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  // Older than a week — show short date
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
