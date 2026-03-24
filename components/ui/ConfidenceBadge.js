'use client';

// ============================================================================
// components/ui/ConfidenceBadge.js — Data Confidence Indicator Badge
// ============================================================================
// A tiny inline badge that shows VCs how confident the AI is about each
// auto-filled field. Renders next to form field labels to communicate
// data quality at a glance — critical for trust in AI-populated DD reports.
//
// Props:
//   level — "verified" | "likely" | "inferred" | null/undefined
//
// Renders:
//   "verified"  → green dot + "Verified"    (found in 2+ sources)
//   "likely"    → yellow dot + "Likely"      (found in 1 source)
//   "inferred"  → orange dot + "AI Inferred" (AI's best guess)
//   null/undef  → nothing (no badge shown)
//
// Design decisions:
//   - 10px font so it doesn't compete with the label text
//   - inline-flex so it flows naturally next to the label
//   - Uses the app's dark theme accent colors for consistency
//   - Tiny 6px dot indicator for visual scanning
// ============================================================================

import React from 'react';

// ============ CONFIDENCE LEVEL CONFIGURATION ============
// Maps each confidence level to its display text, dot color, and text color.
// Colors match the app's dark theme palette:
//   Green  (#34d399) — verified, high confidence
//   Yellow (#f59e0b) — likely, moderate confidence
//   Orange (#f97316) — inferred, low confidence / AI guess
const CONFIDENCE_CONFIG = {
  verified: {
    label: 'Verified',
    dotColor: 'bg-[#34d399]',
    textColor: 'text-[#34d399]',
  },
  likely: {
    label: 'Likely',
    dotColor: 'bg-[#f59e0b]',
    textColor: 'text-[#f59e0b]',
  },
  inferred: {
    label: 'AI Inferred',
    dotColor: 'bg-[#f97316]',
    textColor: 'text-[#f97316]',
  },
};

// ============ CONFIDENCE BADGE COMPONENT ============
export default function ConfidenceBadge({ level }) {
  // Don't render anything for null, undefined, empty string, or "unknown"
  // "unknown" means the AI had no data — the field is left empty, no badge needed
  if (!level || level === 'unknown') return null;

  const config = CONFIDENCE_CONFIG[level];
  // Guard against unexpected values — don't crash, just don't render
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 ml-1.5 ${config.textColor}`}
      // Title attribute provides full context on hover for accessibility
      title={`AI confidence: ${config.label}`}
    >
      {/* ---- Colored dot indicator ---- */}
      {/* 6px circle — small enough to not distract, large enough to scan visually */}
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`}
      />
      {/* ---- Label text ---- */}
      {/* 10px font keeps it subordinate to the field label */}
      <span className="text-[10px] font-medium leading-none">
        {config.label}
      </span>
    </span>
  );
}
