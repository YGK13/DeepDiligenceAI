'use client';

// ============================================================
// ScoreBadge.js — Circular Score Indicator Component
// ============================================================
// Displays a numeric score (0-10) inside a color-coded circle.
// Color is determined by score threshold:
//   Green (>=7)  — strong/positive
//   Amber (4-6)  — moderate/caution
//   Red   (<4)   — weak/risk
// Used throughout the app for deal scores, due diligence ratings,
// and risk assessments.
// ============================================================

import React from 'react';

// ============================================================
// Size configuration map
// Maps size prop to pixel dimensions and font size classes
// ============================================================
const SIZE_MAP = {
  sm: {
    container: 'w-8 h-8',       // 32x32px
    text: 'text-xs',
  },
  md: {
    container: 'w-11 h-11',     // 44x44px — default
    text: 'text-base',
  },
  lg: {
    container: 'w-14 h-14',     // 56x56px
    text: 'text-lg',
  },
};

// ============================================================
// Color configuration based on score thresholds
// Each threshold returns Tailwind classes for border, text, and bg
// ============================================================
function getScoreStyles(score) {
  const numScore = Number(score) || 0;

  if (numScore >= 7) {
    // Green — strong rating
    return {
      border: 'border-[#34d399]',
      text: 'text-[#34d399]',
      ring: 'ring-[#34d399]/20',  // 20% opacity ring for glow effect
      bg: 'bg-[#34d399]/10',      // subtle background fill
    };
  }

  if (numScore >= 4) {
    // Amber — moderate rating
    return {
      border: 'border-[#f59e0b]',
      text: 'text-[#f59e0b]',
      ring: 'ring-[#f59e0b]/20',
      bg: 'bg-[#f59e0b]/10',
    };
  }

  // Red — weak/risk rating
  return {
    border: 'border-[#ef4444]',
    text: 'text-[#ef4444]',
    ring: 'ring-[#ef4444]/20',
    bg: 'bg-[#ef4444]/10',
  };
}

// ============================================================
// ScoreBadge Component
// ============================================================
// Props:
//   score — numeric score value (0-10), displayed inside the circle
//   size  — 'sm' | 'md' | 'lg' (default 'md', 44x44px)
// ============================================================
export default function ScoreBadge({ score, size = 'md' }) {
  const numScore = Number(score) || 0;
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const colorStyles = getScoreStyles(numScore);

  return (
    <div
      className={`
        ${sizeConfig.container}
        ${colorStyles.border}
        ${colorStyles.text}
        ${colorStyles.bg}
        ${colorStyles.ring}
        inline-flex items-center justify-center
        rounded-full
        border-2
        ring-2
        font-bold
        ${sizeConfig.text}
        flex-shrink-0
      `}
      // Accessible label so screen readers announce the score
      aria-label={`Score: ${numScore} out of 10`}
      title={`Score: ${numScore}/10`}
    >
      {numScore}
    </div>
  );
}
