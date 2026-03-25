'use client';

// ============================================================================
// components/ui/SectionHelp.js — Contextual Help Popover for DD Sections
// ============================================================================
// Renders a small "?" button that, when clicked, shows a slide-out panel
// with the section's description, scoring rubric (color-coded), red flags,
// and green flags. Helps users understand what they're evaluating and
// what "good" looks like.
//
// Props:
//   sectionId — one of the 16 section IDs (e.g., 'team', 'product', 'market')
//
// The help content comes from lib/section-help.js (SECTION_HELP object).
// Dark theme: bg #252836, border #2d3148, text #e8e9ed.
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SECTION_HELP } from '@/lib/section-help';

// ============================================================================
// THEME — matches DueDrill dark palette
// ============================================================================
const THEME = {
  bg: '#252836',
  bgDarker: '#1a1d2b',
  border: '#2d3148',
  text: '#e8e9ed',
  secondary: '#9ca0b0',
  muted: '#6b7084',
  accent: '#4a7dff',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
};

// ============================================================================
// SectionHelp Component
// ============================================================================
export default function SectionHelp({ sectionId }) {
  // --- State: whether the popover is open ---
  const [isOpen, setIsOpen] = useState(false);

  // --- Ref for click-outside detection ---
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // --- Look up the help content for this section ---
  const help = SECTION_HELP[sectionId];

  // ============================================================================
  // CLICK OUTSIDE HANDLER — closes the panel when clicking outside
  // ============================================================================
  const handleClickOutside = useCallback((e) => {
    if (
      panelRef.current &&
      !panelRef.current.contains(e.target) &&
      buttonRef.current &&
      !buttonRef.current.contains(e.target)
    ) {
      setIsOpen(false);
    }
  }, []);

  // --- Attach/detach click-outside listener ---
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  // --- If no help content exists for this section, don't render ---
  if (!help) return null;

  return (
    <div className="relative inline-block">
      {/* ================================================================
          TRIGGER BUTTON — small "?" circle
          ================================================================ */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-full transition-all hover:opacity-80"
        style={{
          width: 22,
          height: 22,
          fontSize: 12,
          fontWeight: 700,
          background: isOpen ? THEME.accent : THEME.border,
          color: isOpen ? '#fff' : THEME.secondary,
          border: 'none',
          cursor: 'pointer',
          lineHeight: 1,
        }}
        title={`Help: ${help.title}`}
        aria-label={`Help for ${help.title}`}
      >
        ?
      </button>

      {/* ================================================================
          POPOVER PANEL — slides in from the right side
          ================================================================ */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute z-50 rounded-xl shadow-2xl overflow-y-auto"
          style={{
            top: -8,
            right: 32,
            width: 380,
            maxHeight: 520,
            background: THEME.bg,
            border: `1px solid ${THEME.border}`,
            animation: 'sectionHelpSlideIn 0.2s ease-out',
          }}
        >
          {/* ---- Inline animation keyframes ---- */}
          <style>{`
            @keyframes sectionHelpSlideIn {
              from { opacity: 0; transform: translateX(8px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>

          {/* ============================================================
              HEADER — section title + close button
              ============================================================ */}
          <div
            className="flex items-center justify-between p-4 sticky top-0"
            style={{
              background: THEME.bg,
              borderBottom: `1px solid ${THEME.border}`,
            }}
          >
            <h4
              className="text-sm font-bold"
              style={{ color: THEME.text }}
            >
              {help.title}
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center rounded transition-all hover:opacity-70"
              style={{
                width: 24,
                height: 24,
                background: THEME.border,
                color: THEME.secondary,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
              }}
              aria-label="Close help panel"
            >
              x
            </button>
          </div>

          {/* ============================================================
              BODY — description, rubric, flags
              ============================================================ */}
          <div className="p-4 flex flex-col gap-4">

            {/* ---- Section Description ---- */}
            <p
              className="text-xs leading-relaxed"
              style={{ color: THEME.secondary }}
            >
              {help.description}
            </p>

            {/* ============================================================
                SCORING RUBRIC — color-coded by range
                ============================================================ */}
            <div>
              <h5
                className="text-xs font-bold mb-2 uppercase tracking-wider"
                style={{ color: THEME.muted }}
              >
                Scoring Guide
              </h5>

              {/* 8-10 range — green */}
              <div
                className="rounded-lg p-3 mb-2"
                style={{
                  background: THEME.bgDarker,
                  borderLeft: `3px solid ${THEME.green}`,
                }}
              >
                <div
                  className="text-xs font-bold mb-1"
                  style={{ color: THEME.green }}
                >
                  {help.rubric.high.split(':')[0]}:
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: THEME.secondary }}
                >
                  {help.rubric.high.split(':').slice(1).join(':').trim()}
                </p>
              </div>

              {/* 5-7 range — amber */}
              <div
                className="rounded-lg p-3 mb-2"
                style={{
                  background: THEME.bgDarker,
                  borderLeft: `3px solid ${THEME.amber}`,
                }}
              >
                <div
                  className="text-xs font-bold mb-1"
                  style={{ color: THEME.amber }}
                >
                  {help.rubric.mid.split(':')[0]}:
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: THEME.secondary }}
                >
                  {help.rubric.mid.split(':').slice(1).join(':').trim()}
                </p>
              </div>

              {/* 1-4 range — red */}
              <div
                className="rounded-lg p-3"
                style={{
                  background: THEME.bgDarker,
                  borderLeft: `3px solid ${THEME.red}`,
                }}
              >
                <div
                  className="text-xs font-bold mb-1"
                  style={{ color: THEME.red }}
                >
                  {help.rubric.low.split(':')[0]}:
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: THEME.secondary }}
                >
                  {help.rubric.low.split(':').slice(1).join(':').trim()}
                </p>
              </div>
            </div>

            {/* ============================================================
                RED FLAGS — warning signs
                ============================================================ */}
            <div>
              <h5
                className="text-xs font-bold mb-2 uppercase tracking-wider"
                style={{ color: THEME.muted }}
              >
                Red Flags
              </h5>
              <ul className="flex flex-col gap-1.5">
                {help.redFlags.map((flag, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed"
                    style={{ color: THEME.secondary }}
                  >
                    {/* Red dot indicator */}
                    <span
                      className="flex-shrink-0 mt-1 rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: THEME.red,
                      }}
                    />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>

            {/* ============================================================
                GREEN FLAGS — positive signals
                ============================================================ */}
            <div>
              <h5
                className="text-xs font-bold mb-2 uppercase tracking-wider"
                style={{ color: THEME.muted }}
              >
                Green Flags
              </h5>
              <ul className="flex flex-col gap-1.5">
                {help.greenFlags.map((flag, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed"
                    style={{ color: THEME.secondary }}
                  >
                    {/* Green dot indicator */}
                    <span
                      className="flex-shrink-0 mt-1 rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: THEME.green,
                      }}
                    />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
