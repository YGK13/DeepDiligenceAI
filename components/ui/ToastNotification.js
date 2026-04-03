'use client';

// ============================================================================
// components/ui/ToastNotification.js — Toast popup for real-time alerts
// ============================================================================
// Renders a stack of up to 3 toast notifications in the top-right corner.
// Each toast slides in, auto-dismisses after 5 seconds, and can be manually
// closed via the X button. Color-coded by severity (info/success/warning/error).
//
// Uses a React portal to render into document.body so toasts always sit
// above all other content regardless of stacking context. Includes a
// mounted guard to prevent SSR hydration mismatches (portals need the DOM).
//
// Props:
//   toasts      — array of { id, title, message, severity, type }
//   onDismiss   — callback(toastId) to remove a toast from state
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NOTIFICATION_ICONS, SEVERITY_COLORS } from '@/lib/notifications';

// ============ CONSTANTS ============
const MAX_TOASTS = 3;            // Max visible toasts at any time
const AUTO_DISMISS_MS = 5000;    // 5 seconds before auto-dismiss

// ============ SEVERITY STYLES ============
// Background colors (semi-transparent) + border for each severity level.
// These overlay the dark theme without being too garish.
const SEVERITY_STYLES = {
  info: {
    bg: 'rgba(74, 125, 255, 0.12)',
    border: 'rgba(74, 125, 255, 0.35)',
    accent: '#4a7dff',
  },
  success: {
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.35)',
    accent: '#34d399',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    accent: '#f59e0b',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    accent: '#ef4444',
  },
};

// ============ SINGLE TOAST COMPONENT ============
function Toast({ toast, onDismiss }) {
  const style = SEVERITY_STYLES[toast.severity] || SEVERITY_STYLES.info;
  const icon = NOTIFICATION_ICONS[toast.type] || '📌';

  // ---- Auto-dismiss timer ----
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss(toast.id);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="animate-slide-in-right flex items-start gap-3 w-[360px] px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        // Left accent bar via box-shadow inset
        boxShadow: `inset 3px 0 0 ${style.accent}, 0 8px 32px rgba(0,0,0,0.4)`,
      }}
    >
      {/* ---- Icon ---- */}
      <span className="text-lg mt-0.5 shrink-0">{icon}</span>

      {/* ---- Content ---- */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#e8e9ed] truncate">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-[#9ca0b0] mt-0.5 line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>

      {/* ---- Dismiss X button ---- */}
      <button
        onClick={() => onDismiss && onDismiss(toast.id)}
        className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg
          className="w-3.5 h-3.5 text-[#6b7084]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// ============ TOAST CONTAINER (PORTAL) ============
export default function ToastNotification({ toasts = [], onDismiss }) {
  // ---- SSR safety: only render portal after component mounts in browser ----
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on the server or before hydration
  if (!mounted) return null;

  // Only show the most recent MAX_TOASTS toasts
  const visibleToasts = toasts.slice(-MAX_TOASTS);

  // Portal renders into document.body so toasts always float above everything
  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}
