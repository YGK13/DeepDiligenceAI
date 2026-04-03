'use client';

// ============================================================================
// components/layout/TopBar.js — Top bar for DueDrill
// ============================================================================
// Horizontal bar sitting above the main content area. Contains:
//   - Left side:  Company selector dropdown + "New Company" button
//   - Right side: Overall score badge + Delete button
//
// Props:
//   companies        — array of { id, name } objects for the dropdown
//   activeCompanyId  — currently selected company id
//   onCompanyChange  — callback(companyId) when user picks a different company
//   onNewCompany     — callback() to create a new company
//   onDeleteCompany  — callback() to delete the active company
//   overallScore     — number (0-100) rendered as a colored score badge
// ============================================================================

import { useCallback } from 'react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/ui/NotificationBell';

// ============ HELPERS ============

/**
 * Returns a Tailwind text-color class based on the score value.
 * - 80+  → green  (strong deal)
 * - 60+  → amber  (moderate)
 * - 40+  → amber  (caution)
 * - <40  → red    (high risk)
 * - null → muted  (no data yet)
 */
function getScoreColor(score) {
  if (score == null || score === undefined) return 'text-[#6b7084]';
  if (score >= 80) return 'text-[#34d399]';   // accent-green
  if (score >= 60) return 'text-[#f59e0b]';   // accent-amber
  if (score >= 40) return 'text-[#f59e0b]';   // accent-amber (lower end)
  return 'text-[#ef4444]';                     // accent-red
}

/**
 * Returns a human-readable label for the score range.
 */
function getScoreLabel(score) {
  if (score == null || score === undefined) return 'No Score';
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Caution';
  return 'High Risk';
}

// ============ COMPONENT ============
export default function TopBar({
  companies = [],
  activeCompanyId,
  onCompanyChange,
  onNewCompany,
  onDeleteCompany,
  overallScore,
  user,
  onSignOut,
  onOpenSearch,
  // ---- Notification props ----
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearAllNotifications,
  onNotificationNavigate,
}) {
  // ---------- Handle dropdown change ----------
  // Convert the <select> string value back to the expected id type and
  // forward it to the parent via onCompanyChange.
  const handleSelectChange = useCallback(
    (e) => {
      if (onCompanyChange) {
        onCompanyChange(e.target.value);
      }
    },
    [onCompanyChange]
  );

  // ---------- Derived values ----------
  const scoreColor = getScoreColor(overallScore);
  const scoreLabel = getScoreLabel(overallScore);
  const hasCompany = companies.length > 0 && activeCompanyId;

  return (
    <header
      className={
        'w-full bg-[#1a1d27] border-b border-[#2d3148] ' +
        'flex items-center justify-between px-4 md:px-6 py-3'
      }
    >
      {/* ============ LEFT SIDE: Company Selector + New Button ============ */}
      <div className="flex items-center gap-3">
        {/* ---------- Company selector dropdown ---------- */}
        <div className="relative">
          <select
            value={activeCompanyId || ''}
            onChange={handleSelectChange}
            className={
              'appearance-none bg-[#252836] border border-[#2d3148] ' +
              'text-[#e8e9ed] text-sm rounded-lg ' +
              'px-4 py-2 pr-10 min-w-[200px] md:min-w-[280px] ' +
              'focus:outline-none focus:ring-2 focus:ring-[#4a7dff]/50 focus:border-[#4a7dff] ' +
              'cursor-pointer transition-colors duration-150'
            }
          >
            {/* Placeholder when no companies exist */}
            {companies.length === 0 && (
              <option value="" disabled>
                No companies yet
              </option>
            )}

            {/* Render each company as a dropdown option */}
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.overview?.companyName || company.overview?.name || 'Unnamed Company'}
              </option>
            ))}
          </select>

          {/* Custom dropdown chevron icon (SVG) — layered on top of the native
              select arrow which we hid via appearance-none */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="w-4 h-4 text-[#6b7084]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* ---------- New Company button ---------- */}
        <button
          onClick={onNewCompany}
          className={
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ' +
            'bg-[#4a7dff] text-white ' +
            'hover:bg-[#3a6dee] active:bg-[#2e5cd4] ' +
            'focus:outline-none focus:ring-2 focus:ring-[#4a7dff]/50 ' +
            'transition-colors duration-150 whitespace-nowrap'
          }
        >
          {/* Plus icon */}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">New Company</span>
        </button>

        {/* ---------- Global Search button ---------- */}
        {/* Opens the cross-company search & filter overlay. Also shows
            the Cmd+K / Ctrl+K shortcut hint on desktop. */}
        <button
          onClick={onOpenSearch}
          title="Search all companies (Ctrl+K)"
          className={
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ' +
            'bg-[#252836] text-[#9ca0b0] border border-[#2d3148] ' +
            'hover:bg-[#2d3148] hover:text-[#e8e9ed] ' +
            'focus:outline-none focus:ring-2 focus:ring-[#4a7dff]/50 ' +
            'transition-colors duration-150'
          }
        >
          {/* Search icon (magnifying glass) */}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden md:inline text-xs">Search</span>
          {/* Keyboard shortcut badge */}
          <kbd
            className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#1a1d27] border border-[#2d3148]"
          >
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* ============ RIGHT SIDE: Score Badge + Delete Button ============ */}
      <div className="flex items-center gap-3">
        {/* ---------- Overall score badge ---------- */}
        <div className="flex items-center gap-2">
          {/* Score number — large, colored by threshold */}
          <span className={`text-2xl font-bold ${scoreColor}`}>
            {overallScore != null ? overallScore : '--'}
          </span>

          {/* Score context — label + "Overall Score" descriptor */}
          <div className="hidden sm:flex flex-col">
            <span className={`text-xs font-semibold ${scoreColor}`}>
              {scoreLabel}
            </span>
            <span className="text-[10px] text-[#6b7084]">
              Overall Score
            </span>
          </div>
        </div>

        {/* ---------- Delete company button ---------- */}
        {/* Only shown when there is an active company to delete */}
        {hasCompany && (
          <button
            onClick={onDeleteCompany}
            title="Delete this company"
            className={
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ' +
              'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 ' +
              'hover:bg-[#ef4444]/20 active:bg-[#ef4444]/30 ' +
              'focus:outline-none focus:ring-2 focus:ring-[#ef4444]/50 ' +
              'transition-colors duration-150'
            }
          >
            {/* Trash icon */}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}

        {/* ---------- Notification Bell — shows unread count + dropdown ---------- */}
        <NotificationBell
          notifications={notifications}
          onMarkRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllNotificationsRead}
          onClearAll={onClearAllNotifications}
          onNavigate={onNotificationNavigate}
        />

        {/* ---------- User Menu — avatar, dropdown, sign out ---------- */}
        <UserMenu user={user} signOut={onSignOut} />
      </div>
    </header>
  );
}
