'use client';
// ============================================================================
// components/views/ActivityLogView.js — DueDrill: Global Activity / Audit Log
// ============================================================================
// Shows ALL activities across ALL companies in a single, filterable timeline.
// This is the "what happened and when" view — critical for audit trails,
// team accountability, and understanding the sequence of DD operations.
//
// Features:
//   - Filter by activity type (dropdown)
//   - Filter by date range (last 7d / 30d / all)
//   - Filter by company (dropdown)
//   - Entries grouped by date (Today, Yesterday, This Week, Older)
//   - Colored icons per activity type
//   - Relative timestamps ("3 min ago") with full timestamp on hover
//   - Scrollable list, capped at 500 entries for performance
//   - Empty state when no activities exist
// ============================================================================

import { useState, useMemo } from 'react';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  formatActivityMessage,
} from '@/lib/activity';

// ============================================================================
// DATE RANGE OPTIONS — predefined filters for quick time-based filtering
// ============================================================================
const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

// ============================================================================
// HELPER: getRelativeTime(timestamp)
// ============================================================================
// Converts an ISO timestamp into a human-friendly relative string.
// e.g., "Just now", "3 min ago", "2 hours ago", "Yesterday at 3:42 PM"
// ============================================================================
function getRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================================================
// HELPER: getDateGroup(timestamp)
// ============================================================================
// Returns a grouping label for the given timestamp:
// "Today", "Yesterday", "This Week", or "Older"
// ============================================================================
function getDateGroup(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);

  // Strip time for day-level comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  if (date >= todayStart) return 'Today';
  if (date >= yesterdayStart) return 'Yesterday';
  if (date >= weekStart) return 'This Week';
  return 'Older';
}

// ============================================================================
// MAIN COMPONENT: ActivityLogView
// ============================================================================
// Props:
//   activityLog (array) — the full activity log array from page.js state
//   companies (array) — all company objects (for the company filter dropdown)
// ============================================================================
export default function ActivityLogView({ activityLog = [], companies = [] }) {
  // ============================================================
  // FILTER STATE
  // ============================================================
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  // ============================================================
  // UNIQUE COMPANIES — derive from activity log for the filter dropdown
  // We use the companies prop to map IDs to names, and also check
  // activity details for company names in case a company was deleted.
  // ============================================================
  const companyOptions = useMemo(() => {
    const seen = new Map();

    // First, build from actual companies array
    companies.forEach((c) => {
      const name = c.overview?.companyName || c.overview?.name || c.name || 'Unnamed';
      seen.set(c.id, name);
    });

    // Also capture company names from activities (covers deleted companies)
    activityLog.forEach((a) => {
      if (a.details?.companyId && a.details?.companyName && !seen.has(a.details.companyId)) {
        seen.set(a.details.companyId, a.details.companyName);
      }
    });

    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [activityLog, companies]);

  // ============================================================
  // FILTERED + SORTED ACTIVITIES
  // Apply all three filters, sort newest-first, cap at 500
  // ============================================================
  const filteredActivities = useMemo(() => {
    const now = new Date();
    let filtered = [...activityLog];

    // --- Type filter ---
    if (typeFilter !== 'all') {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    // --- Date range filter ---
    if (dateRange === '7d') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      filtered = filtered.filter((a) => new Date(a.timestamp) >= cutoff);
    } else if (dateRange === '30d') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      filtered = filtered.filter((a) => new Date(a.timestamp) >= cutoff);
    }

    // --- Company filter ---
    if (companyFilter !== 'all') {
      filtered = filtered.filter((a) => a.details?.companyId === companyFilter);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Cap at 500 entries for performance
    return filtered.slice(0, 500);
  }, [activityLog, typeFilter, dateRange, companyFilter]);

  // ============================================================
  // GROUP BY DATE — organize filtered activities into date buckets
  // ============================================================
  const groupedActivities = useMemo(() => {
    const groups = {};
    const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

    // Initialize all groups so they appear in order even if empty
    groupOrder.forEach((g) => { groups[g] = []; });

    filteredActivities.forEach((activity) => {
      const group = getDateGroup(activity.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(activity);
    });

    // Return only non-empty groups, preserving order
    return groupOrder
      .filter((g) => groups[g].length > 0)
      .map((g) => ({ label: g, activities: groups[g] }));
  }, [filteredActivities]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* HEADER — title + filter controls                             */}
      {/* ============================================================ */}
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Activity Log
        </h1>
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          Full audit trail of all actions across every company.
          {filteredActivities.length > 0 && (
            <span className="ml-2" style={{ color: 'var(--accent-blue)' }}>
              {filteredActivities.length} {filteredActivities.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </p>

        {/* ============================================================ */}
        {/* FILTER BAR — type, date range, company dropdowns             */}
        {/* ============================================================ */}
        <div className="flex flex-wrap gap-3">
          {/* --- Activity type filter --- */}
          <select
            className="px-3 py-2 rounded-md text-sm outline-none cursor-pointer"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACTIVITY_TYPE_ICONS[type]} {ACTIVITY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          {/* --- Date range filter --- */}
          <select
            className="px-3 py-2 rounded-md text-sm outline-none cursor-pointer"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* --- Company filter --- */}
          <select
            className="px-3 py-2 rounded-md text-sm outline-none cursor-pointer"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="all">All Companies</option>
            {companyOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* --- Clear filters button (only shown when filters are active) --- */}
          {(typeFilter !== 'all' || dateRange !== 'all' || companyFilter !== 'all') && (
            <button
              className="px-3 py-2 rounded-md text-sm font-medium transition-all hover:opacity-80"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
              onClick={() => {
                setTypeFilter('all');
                setDateRange('all');
                setCompanyFilter('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ACTIVITY LIST — grouped by date                              */}
      {/* ============================================================ */}
      {groupedActivities.length === 0 ? (
        // ============================================================
        // EMPTY STATE — no activities match the current filters
        // ============================================================
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="text-5xl mb-4">📋</div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {activityLog.length === 0
              ? 'No Activity Yet'
              : 'No Matching Activities'}
          </h3>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {activityLog.length === 0
              ? 'Actions like creating companies, running AI research, and editing sections will appear here.'
              : 'Try adjusting your filters to see more results.'}
          </p>
        </div>
      ) : (
        // ============================================================
        // SCROLLABLE GROUPED LIST
        // ============================================================
        <div
          className="space-y-6 overflow-y-auto pr-1"
          style={{ maxHeight: 'calc(100vh - 260px)' }}
        >
          {groupedActivities.map((group) => (
            <div key={group.label}>
              {/* ============================================================ */}
              {/* DATE GROUP HEADER — "Today", "Yesterday", "This Week", etc.  */}
              {/* ============================================================ */}
              <div className="flex items-center gap-3 mb-3">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {group.label}
                </h3>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--border)' }}
                />
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
                >
                  {group.activities.length} {group.activities.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {/* ============================================================ */}
              {/* ACTIVITY ENTRIES — one row per activity in this date group    */}
              {/* ============================================================ */}
              <div className="space-y-1">
                {group.activities.map((activity) => (
                  <ActivityEntry key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ActivityEntry — Single activity row
// ============================================================================
// Renders: colored icon badge | message text | company name | relative time
// Full ISO timestamp shown on hover via title attribute.
// ============================================================================
function ActivityEntry({ activity }) {
  const icon = ACTIVITY_TYPE_ICONS[activity.type] || '📌';
  const color = ACTIVITY_TYPE_COLORS[activity.type] || '#4a7dff';
  const message = formatActivityMessage(activity);
  const relativeTime = getRelativeTime(activity.timestamp);
  const fullTimestamp = new Date(activity.timestamp).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:brightness-110"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* ============================================================ */}
      {/* ICON BADGE — colored circle with emoji                       */}
      {/* ============================================================ */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
        style={{
          background: `${color}20`,
          border: `1px solid ${color}40`,
        }}
      >
        {icon}
      </div>

      {/* ============================================================ */}
      {/* MESSAGE + METADATA                                           */}
      {/* ============================================================ */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {message}
        </p>
        {/* Show the activity type label as a small tag */}
        <span
          className="text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block"
          style={{
            background: `${color}15`,
            color: color,
            border: `1px solid ${color}30`,
          }}
        >
          {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
        </span>
      </div>

      {/* ============================================================ */}
      {/* TIMESTAMP — relative text, full timestamp on hover           */}
      {/* ============================================================ */}
      <span
        className="text-xs flex-shrink-0 cursor-default"
        style={{ color: 'var(--text-secondary)' }}
        title={fullTimestamp}
      >
        {relativeTime}
      </span>
    </div>
  );
}
