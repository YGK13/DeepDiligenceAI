'use client';

// ============================================================================
// components/ui/RetryPanel.js — Retry Panel for Failed Research Sections
// ============================================================================
// Shown on the dashboard after "Research This Company" completes with partial
// failures. Displays a yellow/amber warning box listing which sections failed,
// with a "Retry Failed Sections" button and a "Dismiss" link.
//
// Props:
//   failedSections — array of { sectionKey, sectionLabel, error }
//   onRetry(sectionKeys) — called with array of section keys to retry
//   onDismiss — called when user clicks "Dismiss" link
//   isRetrying — boolean, true while retries are in progress
//   retryProgress — optional { current, total } for "Retrying X of Y..." text
//
// Behavior:
//   - Shows truncated error messages per section
//   - Shows progress during retry ("Retrying 2 of 5...")
//   - Auto-dismisses when all retries succeed (parent handles this)
//
// Dark theme: #1e2130 bg, #f59e0b amber for warnings, #e8e9ed text
// ============================================================================

import React from 'react';

// ============ HELPER: Truncate error message for display ============
function truncateError(msg, maxLen = 80) {
  if (!msg) return 'Unknown error';
  if (msg.length <= maxLen) return msg;
  return msg.slice(0, maxLen) + '...';
}

// ============ COMPONENT ============
export default function RetryPanel({
  failedSections = [],
  onRetry,
  onDismiss,
  isRetrying = false,
  retryProgress = null,
}) {
  // ============ GUARD: Don't render if no failures ============
  if (!failedSections || failedSections.length === 0) {
    return null;
  }

  // ============ HANDLERS ============
  // Collect all failed section keys and pass to parent's retry handler
  const handleRetryClick = () => {
    if (onRetry && !isRetrying) {
      const keys = failedSections.map((s) => s.sectionKey);
      onRetry(keys);
    }
  };

  return (
    <div
      className="border rounded-lg p-4 mt-4"
      style={{
        backgroundColor: '#1e2130',
        borderColor: '#f59e0b40', // amber border at 25% opacity
      }}
    >
      {/* ============ HEADER: Warning icon + title ============ */}
      <div className="flex items-center gap-2 mb-3">
        {/* Amber warning triangle icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h4
          className="text-sm font-semibold"
          style={{ color: '#f59e0b' }}
        >
          {failedSections.length} section{failedSections.length !== 1 ? 's' : ''} failed to research
        </h4>
      </div>

      {/* ============ FAILED SECTION LIST ============ */}
      {/* Each row shows the section name and a truncated error message */}
      <div className="space-y-2 mb-4">
        {failedSections.map((section) => (
          <div
            key={section.sectionKey}
            className="flex items-start gap-2 px-3 py-2 rounded"
            style={{ backgroundColor: '#252836' }}
          >
            {/* Red X indicator */}
            <span
              className="text-xs font-bold mt-0.5 shrink-0"
              style={{ color: '#ef4444' }}
            >
              ✗
            </span>

            {/* Section name + error */}
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-medium"
                style={{ color: '#e8e9ed' }}
              >
                {section.sectionLabel}
              </p>
              <p
                className="text-[10px] mt-0.5 leading-relaxed"
                style={{ color: '#6b7084' }}
              >
                {truncateError(section.error)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ============ ACTION BAR: Retry button + Dismiss link ============ */}
      <div className="flex items-center gap-3">
        {/* Retry button — amber themed */}
        <button
          onClick={handleRetryClick}
          disabled={isRetrying}
          className={
            'inline-flex items-center justify-center gap-2 ' +
            'font-bold rounded-lg border border-transparent ' +
            'py-2 px-4 text-xs transition-all duration-200 cursor-pointer ' +
            (isRetrying
              ? 'bg-[#f59e0b]/20 text-[#f59e0b]/50 cursor-not-allowed'
              : 'bg-[#f59e0b] text-[#0f1117] hover:bg-[#d97706] active:bg-[#b45309]')
          }
        >
          {isRetrying ? (
            <>
              {/* Pulsing dot during retry */}
              <span className="w-2 h-2 rounded-full bg-[#0f1117] animate-pulse" />
              {retryProgress
                ? `Retrying ${retryProgress.current} of ${retryProgress.total}...`
                : 'Retrying...'}
            </>
          ) : (
            <>
              {/* Refresh icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Retry Failed Sections
            </>
          )}
        </button>

        {/* Dismiss link — muted, small */}
        {!isRetrying && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[11px] font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: '#6b7084' }}
            onMouseEnter={(e) => (e.target.style.color = '#9ca0b0')}
            onMouseLeave={(e) => (e.target.style.color = '#6b7084')}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
