'use client';

// ============================================================
// KeyboardShortcutsHelp.js — Keyboard Shortcuts Help Overlay
// ============================================================
// A full-screen modal overlay that displays all available
// keyboard shortcuts organized by category. Triggered by
// pressing "?" when no input/textarea is focused.
//
// Uses createPortal to render above all other content.
// Closes on Escape key or clicking outside the modal card.
//
// THEME: Matches DueDrill dark theme
//   bg-primary: #0f1117
//   bg-card:    #1e2130
//   border:     #2d3148
//   text:       #e8e9ed
//   accent:     #4a7dff
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ============================================================
// SHORTCUT DATA — organized by section
// Each section has a title and an array of shortcut entries.
// Each entry: { keys: string[], description: string }
//   - keys: array of key labels to render as badges
//   - description: human-readable explanation of what it does
// ============================================================
const SHORTCUT_SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
      { keys: ['1', '-', '9'], description: 'Quick nav to sections' },
      { keys: ['Esc'], description: 'Close modal / palette' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['R'], description: 'Research this company (AI auto-fill)' },
      { keys: ['E'], description: 'Export data as CSV / JSON' },
      { keys: ['N'], description: 'New company' },
      { keys: ['D'], description: 'Load demo company' },
    ],
  },
  {
    title: 'Views',
    shortcuts: [
      { keys: ['\u2190'], description: 'Previous section' },
      { keys: ['\u2192'], description: 'Next section' },
      { keys: ['?'], description: 'Show this help overlay' },
    ],
  },
];

// ============================================================
// KeyBadge — renders a single key as a styled monospace badge
// ============================================================
function KeyBadge({ label }) {
  // Separator characters ("-", "+") render without badge styling
  if (label === '-' || label === '+') {
    return (
      <span
        className="text-xs mx-0.5"
        style={{ color: '#6b7084' }}
      >
        {label === '-' ? ' \u2013 ' : ' + '}
      </span>
    );
  }

  return (
    <kbd
      className="
        inline-flex items-center justify-center
        px-2 py-1 min-w-[28px]
        text-xs font-mono font-medium
        rounded-md
        border
        select-none
      "
      style={{
        backgroundColor: '#2d3148',
        borderColor: '#3d4260',
        color: '#e8e9ed',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
      }}
    >
      {label}
    </kbd>
  );
}

// ============================================================
// ShortcutRow — renders one shortcut: key badges + description
// ============================================================
function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      {/* Description text — left side */}
      <span
        className="text-sm"
        style={{ color: '#b0b3bf' }}
      >
        {description}
      </span>

      {/* Key badges — right side */}
      <div className="flex items-center gap-1 ml-4 shrink-0">
        {keys.map((key, idx) => (
          <KeyBadge key={idx} label={key} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// KeyboardShortcutsHelp — Main Modal Component
// ============================================================
// Props:
//   isOpen  — boolean controlling visibility
//   onClose — callback to close the modal
// ============================================================
export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  // ----------------------------------------------------------
  // Portal mount state — wait for client-side mount before
  // using createPortal (avoids SSR hydration mismatch)
  // ----------------------------------------------------------
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ----------------------------------------------------------
  // Escape key handler — close the modal when Escape is pressed
  // ----------------------------------------------------------
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // ----------------------------------------------------------
  // Prevent background scrolling while overlay is open
  // ----------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ----------------------------------------------------------
  // Don't render if closed or not yet mounted on client
  // ----------------------------------------------------------
  if (!isOpen || !mounted) {
    return null;
  }

  // ----------------------------------------------------------
  // Overlay click handler — close when clicking the backdrop
  // ----------------------------------------------------------
  const handleOverlayClick = () => {
    onClose?.();
  };

  // Prevent clicks inside the modal card from closing it
  const handleCardClick = (e) => {
    e.stopPropagation();
  };

  // ----------------------------------------------------------
  // Modal JSX — rendered via portal at document.body
  // ----------------------------------------------------------
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={handleOverlayClick}
    >
      {/* ======================================================
          Modal Card — centered, max-w-lg, dark themed
          ====================================================== */}
      <div
        className="
          w-full max-w-lg
          rounded-lg
          shadow-2xl
          flex flex-col
          max-h-[85vh]
        "
        style={{
          backgroundColor: '#1e2130',
          border: '1px solid #2d3148',
        }}
        onClick={handleCardClick}
      >
        {/* ----------------------------------------------------
            Header — title + close button
            ---------------------------------------------------- */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #2d3148' }}
        >
          {/* Title with keyboard icon */}
          <div className="flex items-center gap-2.5">
            {/* Keyboard SVG icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4a7dff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
              <line x1="6" y1="8" x2="6" y2="8" />
              <line x1="10" y1="8" x2="10" y2="8" />
              <line x1="14" y1="8" x2="14" y2="8" />
              <line x1="18" y1="8" x2="18" y2="8" />
              <line x1="6" y1="12" x2="6" y2="12" />
              <line x1="10" y1="12" x2="10" y2="12" />
              <line x1="14" y1="12" x2="14" y2="12" />
              <line x1="18" y1="12" x2="18" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
            </svg>

            <h2
              className="text-base font-semibold"
              style={{ color: '#e8e9ed' }}
            >
              Keyboard Shortcuts
            </h2>
          </div>

          {/* Close button (X) */}
          <button
            onClick={onClose}
            className="
              p-1 rounded-md
              transition-colors duration-150
              cursor-pointer
            "
            style={{ color: '#6b7084' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e8e9ed';
              e.currentTarget.style.backgroundColor = '#252836';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7084';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close keyboard shortcuts help"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ----------------------------------------------------
            Body — scrollable shortcut sections
            ---------------------------------------------------- */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {SHORTCUT_SECTIONS.map((section, sIdx) => (
            <div key={section.title} className={sIdx > 0 ? 'mt-5' : ''}>
              {/* Section title */}
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#4a7dff' }}
              >
                {section.title}
              </h3>

              {/* Divider line under section title */}
              <div
                className="mb-2"
                style={{
                  height: '1px',
                  backgroundColor: '#2d3148',
                }}
              />

              {/* Shortcut rows */}
              {section.shortcuts.map((shortcut, idx) => (
                <ShortcutRow
                  key={idx}
                  keys={shortcut.keys}
                  description={shortcut.description}
                />
              ))}
            </div>
          ))}

          {/* Footer hint */}
          <div
            className="mt-6 pt-4 text-center text-xs"
            style={{
              borderTop: '1px solid #2d3148',
              color: '#6b7084',
            }}
          >
            Press <KeyBadge label="?" /> anywhere to toggle this help
          </div>
        </div>
      </div>
    </div>
  );

  // Render via portal so it sits above everything
  // Guard: only use createPortal after client-side mount (SSR safety)
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
