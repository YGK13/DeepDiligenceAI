// ============================================================================
// lib/activity.js — DueDrill: Activity Logging Utility
// ============================================================================
// Creates structured activity objects for the global audit log.
// Every user action that mutates data (create, delete, edit, AI operations,
// exports, uploads) gets recorded as an activity entry.
//
// Two exports:
//   createActivity(type, details) — builds an activity object with UUID + timestamp
//   formatActivityMessage(activity) — returns a human-readable string for display
// ============================================================================

// ============================================================================
// VALID ACTIVITY TYPES
// ============================================================================
// Exhaustive list of every trackable action in the app.
// Used for validation and for populating filter dropdowns.
export const ACTIVITY_TYPES = [
  'company-created',
  'company-deleted',
  'section-edited',
  'ai-autofill',
  'ai-research',
  'score-changed',
  'deal-stage-changed',
  'export-pdf',
  'export-csv',
  'deck-uploaded',
  'member-invited',
  'note-added',
  'reference-added',
];

// ============================================================================
// ACTIVITY TYPE LABELS
// ============================================================================
// Human-readable labels for each activity type.
// Used in filter dropdowns and as fallback display text.
export const ACTIVITY_TYPE_LABELS = {
  'company-created': 'Company Created',
  'company-deleted': 'Company Deleted',
  'section-edited': 'Section Edited',
  'ai-autofill': 'AI Auto-Fill',
  'ai-research': 'AI Research',
  'score-changed': 'Score Changed',
  'deal-stage-changed': 'Deal Stage Changed',
  'export-pdf': 'PDF Export',
  'export-csv': 'CSV Export',
  'deck-uploaded': 'Deck Uploaded',
  'member-invited': 'Member Invited',
  'note-added': 'Note Added',
  'reference-added': 'Reference Added',
};

// ============================================================================
// ACTIVITY TYPE ICONS
// ============================================================================
// Emoji icons for each activity type, used in the ActivityLogView.
// Each type gets a visually distinct icon so users can scan the log quickly.
export const ACTIVITY_TYPE_ICONS = {
  'company-created': '🏢',
  'company-deleted': '🗑️',
  'section-edited': '✏️',
  'ai-autofill': '🤖',
  'ai-research': '🔬',
  'score-changed': '📊',
  'deal-stage-changed': '🔄',
  'export-pdf': '📄',
  'export-csv': '📊',
  'deck-uploaded': '📎',
  'member-invited': '👥',
  'note-added': '📝',
  'reference-added': '📞',
};

// ============================================================================
// ACTIVITY TYPE COLORS
// ============================================================================
// Accent colors for each activity type's icon badge in the log view.
// Maps to the app's dark theme palette for visual consistency.
export const ACTIVITY_TYPE_COLORS = {
  'company-created': '#34d399',   // green — positive action
  'company-deleted': '#ef4444',   // red — destructive action
  'section-edited': '#4a7dff',    // accent blue — standard edit
  'ai-autofill': '#a78bfa',      // purple — AI operation
  'ai-research': '#a78bfa',      // purple — AI operation
  'score-changed': '#f59e0b',    // amber — evaluation change
  'deal-stage-changed': '#f59e0b', // amber — evaluation change
  'export-pdf': '#60a5fa',       // light blue — export action
  'export-csv': '#60a5fa',       // light blue — export action
  'deck-uploaded': '#34d399',    // green — data added
  'member-invited': '#4a7dff',   // accent blue — collaboration
  'note-added': '#4a7dff',       // accent blue — content added
  'reference-added': '#4a7dff',  // accent blue — content added
};

// ============================================================================
// createActivity(type, details)
// ============================================================================
// Builds a structured activity object ready to be stored in the log.
//
// Arguments:
//   type (string) — one of ACTIVITY_TYPES (e.g., 'company-created')
//   details (object) — context-specific data about the action:
//     - companyName: name of the affected company
//     - companyId: ID of the affected company
//     - sectionKey: which DD section was edited (for section-edited, ai-autofill)
//     - oldValue / newValue: for score-changed, deal-stage-changed
//     - userId: optional, for multi-user audit trails
//     - any other relevant metadata
//
// Returns: { id, type, details, timestamp, userId }
// ============================================================================
export function createActivity(type, details = {}) {
  // Validate the activity type to catch typos during development
  if (!ACTIVITY_TYPES.includes(type)) {
    console.warn(`[Activity] Unknown activity type: "${type}". Valid types:`, ACTIVITY_TYPES);
  }

  return {
    // Unique identifier for this activity entry
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,

    // The action type (e.g., 'ai-autofill', 'company-created')
    type,

    // Context-specific details about the action
    details: { ...details },

    // ISO 8601 timestamp for precise ordering and date grouping
    timestamp: new Date().toISOString(),

    // Optional user ID for multi-user environments (Supabase auth)
    userId: details.userId || null,
  };
}

// ============================================================================
// formatActivityMessage(activity)
// ============================================================================
// Converts a structured activity object into a human-readable message string.
// Used in the ActivityLogView to describe what happened in plain English.
//
// Examples:
//   "Created company NovaTech AI"
//   "AI auto-filled the Team section for NovaTech AI"
//   "Edited the Market section for NovaTech AI"
// ============================================================================
export function formatActivityMessage(activity) {
  if (!activity || !activity.type) return 'Unknown activity';

  const { type, details = {} } = activity;
  const companyName = details.companyName || 'Unknown Company';
  const sectionKey = details.sectionKey || '';

  // Capitalize section key for display (e.g., 'team' → 'Team', 'ip' → 'IP')
  const sectionLabel = sectionKey === 'ip'
    ? 'IP & Tech'
    : sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);

  switch (type) {
    case 'company-created':
      return `Created company "${companyName}"`;

    case 'company-deleted':
      return `Deleted company "${companyName}"`;

    case 'section-edited':
      return `Edited the ${sectionLabel} section for "${companyName}"`;

    case 'ai-autofill':
      return `AI auto-filled the ${sectionLabel} section for "${companyName}"`;

    case 'ai-research':
      return `Ran AI research across all sections for "${companyName}"`;

    case 'score-changed':
      return `Score changed${details.oldValue != null ? ` from ${details.oldValue}` : ''} to ${details.newValue || '?'} for "${companyName}"`;

    case 'deal-stage-changed':
      return `Deal stage changed${details.oldValue ? ` from "${details.oldValue}"` : ''} to "${details.newValue || '?'}" for "${companyName}"`;

    case 'export-pdf':
      return `Exported PDF report for "${companyName}"`;

    case 'export-csv':
      return `Exported CSV data for "${companyName}"`;

    case 'deck-uploaded':
      return `Uploaded pitch deck for "${companyName}"`;

    case 'member-invited':
      return `Invited ${details.memberEmail || 'a team member'} to "${companyName}"`;

    case 'note-added':
      return `Added a note to "${companyName}"`;

    case 'reference-added':
      return `Added a reference check for "${companyName}"`;

    default:
      return `${ACTIVITY_TYPE_LABELS[type] || type} — "${companyName}"`;
  }
}
