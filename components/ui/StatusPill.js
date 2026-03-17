'use client';

// ============================================================
// StatusPill.js — Inline Status Badge Component
// ============================================================
// A small, color-coded pill for displaying status labels, tags,
// or categories. Uses a semi-transparent background with matching
// text color for each variant. Designed for inline use alongside
// text, in table cells, card headers, etc.
// ============================================================

import React from 'react';

// ============================================================
// Variant color map
// Each variant defines a text color and a semi-transparent bg
// The bg uses Tailwind's opacity modifier (/<opacity>) for the
// 15% background fill effect
// ============================================================
const VARIANT_CLASSES = {
  green: {
    text: 'text-[#34d399]',
    bg: 'bg-[#34d399]/15',
  },
  amber: {
    text: 'text-[#f59e0b]',
    bg: 'bg-[#f59e0b]/15',
  },
  red: {
    text: 'text-[#ef4444]',
    bg: 'bg-[#ef4444]/15',
  },
  blue: {
    text: 'text-[#4a7dff]',
    bg: 'bg-[#4a7dff]/15',
  },
  purple: {
    text: 'text-[#a78bfa]',
    bg: 'bg-[#a78bfa]/15',
  },
  cyan: {
    text: 'text-[#22d3ee]',
    bg: 'bg-[#22d3ee]/15',
  },
};

// ============================================================
// StatusPill Component
// ============================================================
// Props:
//   children — the text/content displayed inside the pill
//   variant  — 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan'
//              (default: 'blue')
// ============================================================
export default function StatusPill({ children, variant = 'blue' }) {
  // Fall back to blue if an unrecognized variant is passed
  const colors = VARIANT_CLASSES[variant] || VARIANT_CLASSES.blue;

  return (
    <span
      className={`
        inline-flex items-center
        text-xs font-semibold
        px-2.5 py-0.5
        rounded-full
        ${colors.text}
        ${colors.bg}
        whitespace-nowrap
      `}
    >
      {children}
    </span>
  );
}
