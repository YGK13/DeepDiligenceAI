'use client';

// ============================================================================
// components/ui/FreshnessIndicator.js — Data Freshness Indicator
// ============================================================================
// A tiny inline component that shows when a section was last researched.
// Displays a colored dot + label based on how stale the data is:
//   - Green  dot + "Fresh"           = within 7 days
//   - Yellow dot + "Xd ago"          = 7–30 days old
//   - Red    dot + "Stale (Xd)"      = 30+ days old
//   - Gray   dot + "Not researched"  = null / no timestamp
//
// Props:
//   timestamp — ISO 8601 date string (or null/undefined)
//
// The full date is shown on hover via the title attribute.
// ============================================================================

import React, { useMemo } from 'react';

// ============ FRESHNESS THRESHOLDS (in days) ============
const FRESH_THRESHOLD = 7;   // 0–7 days = fresh (green)
const STALE_THRESHOLD = 30;  // 7–30 days = aging (yellow), 30+ = stale (red)

// ============ FRESHNESS CONFIG ============
// Maps each freshness state to its dot color, label function, and text color.
// Using the app's dark-theme hex palette for consistency.
const FRESHNESS_STATES = {
  fresh: {
    dotColor: '#34d399',   // emerald green — data is current
    textColor: '#34d399',
    label: () => 'Fresh',
  },
  aging: {
    dotColor: '#f59e0b',   // amber — data is getting old
    textColor: '#f59e0b',
    label: (days) => `${days}d ago`,
  },
  stale: {
    dotColor: '#ef4444',   // red — data is outdated
    textColor: '#ef4444',
    label: (days) => `Stale (${days}d)`,
  },
  unknown: {
    dotColor: '#6b7084',   // gray — no data available
    textColor: '#6b7084',
    label: () => 'Not researched',
  },
};

// ============ HELPER: Calculate days between two dates ============
function daysBetween(dateA, dateB) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(Math.abs(dateB - dateA) / msPerDay);
}

// ============ COMPONENT ============
export default function FreshnessIndicator({ timestamp }) {
  // ============ COMPUTE FRESHNESS STATE ============
  // Memoize so we don't recalculate on every parent re-render
  const { state, days, fullDate } = useMemo(() => {
    // No timestamp provided — show "Not researched"
    if (!timestamp) {
      return { state: FRESHNESS_STATES.unknown, days: null, fullDate: null };
    }

    const parsed = new Date(timestamp);

    // Guard against invalid date strings
    if (isNaN(parsed.getTime())) {
      return { state: FRESHNESS_STATES.unknown, days: null, fullDate: null };
    }

    const now = new Date();
    const daysAgo = daysBetween(parsed, now);

    // Format the full date for the hover tooltip
    const formatted = parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Determine which freshness bucket this falls into
    if (daysAgo <= FRESH_THRESHOLD) {
      return { state: FRESHNESS_STATES.fresh, days: daysAgo, fullDate: formatted };
    }
    if (daysAgo <= STALE_THRESHOLD) {
      return { state: FRESHNESS_STATES.aging, days: daysAgo, fullDate: formatted };
    }
    return { state: FRESHNESS_STATES.stale, days: daysAgo, fullDate: formatted };
  }, [timestamp]);

  // ============ RENDER ============
  return (
    <span
      className="inline-flex items-center gap-1 select-none"
      title={fullDate ? `Last researched: ${fullDate}` : 'No research data available'}
    >
      {/* Colored status dot — 6px circle */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: state.dotColor }}
      />

      {/* Label text — very small to avoid visual clutter */}
      <span
        className="text-[10px] font-medium leading-none whitespace-nowrap"
        style={{ color: state.textColor }}
      >
        {state.label(days)}
      </span>
    </span>
  );
}
