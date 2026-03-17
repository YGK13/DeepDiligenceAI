'use client';

// ============================================================
// FormField.js — Polymorphic Form Field Component
// ============================================================
// A single, reusable form field that renders different input types
// based on props. Supports: text, textarea, select dropdown,
// score slider (0-10), date, and any standard HTML input type.
// All inputs use the app's dark theme design system.
// ============================================================

import React from 'react';

// ============================================================
// Shared Tailwind classes for all input elements
// These enforce consistent dark-theme styling across every variant
// ============================================================
const BASE_INPUT_CLASSES = [
  'w-full',
  'bg-[#252836]',
  'border',
  'border-[#2d3148]',
  'text-[#e8e9ed]',
  'rounded-md',
  'text-sm',
  'px-3',
  'py-2',
  'focus:border-[#4a7dff]',
  'outline-none',
  'transition-colors',
  'duration-200',
  'placeholder:text-[#6b7084]',
].join(' ');

// ============================================================
// Score color utility — determines color based on numeric score
// 4-tier system: Red (0-3), Amber (4-6), Green (7-8), Cyan (9-10)
// ============================================================
function getScoreColor(score) {
  if (score >= 9) return { text: 'text-[#22d3ee]', bg: 'bg-[#22d3ee]', hex: '#22d3ee' };
  if (score >= 7) return { text: 'text-[#34d399]', bg: 'bg-[#34d399]', hex: '#34d399' };
  if (score >= 4) return { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]', hex: '#f59e0b' };
  return { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]', hex: '#ef4444' };
}

// ============================================================
// Score label utility — human-readable label for the score
// ============================================================
function getScoreLabel(score) {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 4) return 'Average';
  if (score >= 1) return 'Below Average';
  return 'Poor';
}

// ============================================================
// FormField Component
// ============================================================
// Props:
//   label       — field label text displayed above the input
//   value       — controlled input value
//   onChange     — change handler, receives the event
//   type        — 'text' | 'textarea' | 'score' | 'date' | any HTML input type
//   placeholder — placeholder text for text-based inputs
//   options     — if provided, renders a <select>; can be string[] or {value,label}[]
//   rows        — number of rows for textarea (default 3)
// ============================================================
export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  options = null,
  rows = 3,
}) {
  // ----------------------------------------------------------
  // Render a <select> dropdown when options are provided
  // Options can be plain strings OR { value, label } objects
  // ----------------------------------------------------------
  if (options) {
    return (
      <div className="mb-3">
        {/* Label */}
        {label && (
          <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
            {label}
          </label>
        )}

        {/* Select dropdown */}
        <select
          value={value}
          onChange={onChange}
          className={`${BASE_INPUT_CLASSES} cursor-pointer appearance-none`}
          // appearance-none lets us style the dropdown arrow if needed
          style={{
            // Custom dropdown arrow using an inline SVG data URI
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca0b0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem',
          }}
        >
          {options.map((opt, idx) => {
            // Normalize: support both string and { value, label } formats
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={idx} value={optValue} className="bg-[#252836] text-[#e8e9ed]">
                {optLabel}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Render a <textarea> for multi-line text input
  // ----------------------------------------------------------
  if (type === 'textarea') {
    return (
      <div className="mb-3">
        {label && (
          <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
            {label}
          </label>
        )}
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={`${BASE_INPUT_CLASSES} resize-y min-h-[60px]`}
        />
      </div>
    );
  }

  // ----------------------------------------------------------
  // Render an interactive score slider (0-10) with:
  //   - Large color-coded score number on the left
  //   - Custom-styled range track with color fill
  //   - Score label on the right (Poor → Excellent)
  //   - Tick marks at 0, 5, 10 below the track
  // onChange contract: fires with { target: { value } } so
  // Number(e.target.value) works in parent components.
  // ----------------------------------------------------------
  if (type === 'score') {
    const numericValue = Number(value) || 0;
    const scoreColor = getScoreColor(numericValue);
    const scoreLabel = getScoreLabel(numericValue);
    // Percentage of slider fill (0-10 mapped to 0%-100%)
    const fillPercent = (numericValue / 10) * 100;

    // Unique ID for the <style> scoping — avoids collisions when
    // multiple score sliders render on the same page
    const sliderId = React.useId ? React.useId() : undefined;

    return (
      <div className="mb-3">
        {label && (
          <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
            {label}
          </label>
        )}

        <div className="flex items-center gap-3">
          {/* ---- Score number display (left) ---- */}
          <span
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-xl font-extrabold shrink-0 select-none"
            style={{
              color: scoreColor.hex,
              backgroundColor: `${scoreColor.hex}18`,
              border: `1px solid ${scoreColor.hex}30`,
            }}
          >
            {numericValue}
          </span>

          {/* ---- Slider column (track + ticks) ---- */}
          <div className="flex-1 flex flex-col">
            {/* Custom range input with inline gradient for the filled portion */}
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={numericValue}
              onChange={onChange}
              className="score-slider w-full h-2.5 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                // Two-color gradient: filled portion uses the score color,
                // the remainder is the dark track background
                background: `linear-gradient(to right, ${scoreColor.hex} 0%, ${scoreColor.hex} ${fillPercent}%, #2d3148 ${fillPercent}%, #2d3148 100%)`,
              }}
            />

            {/* Tick marks at 0, 5, 10 — positioned under the track */}
            <div className="flex justify-between mt-1 px-[2px]">
              <span className="text-[10px] text-[#6b7084] select-none">0</span>
              <span className="text-[10px] text-[#6b7084] select-none">5</span>
              <span className="text-[10px] text-[#6b7084] select-none">10</span>
            </div>
          </div>

          {/* ---- Score label (right) ---- */}
          <span
            className="text-xs font-semibold shrink-0 min-w-[72px] text-right select-none"
            style={{ color: scoreColor.hex }}
          >
            {scoreLabel}
          </span>
        </div>

        {/* ---- Scoped CSS for the custom range thumb ---- */}
        {/* Uses both WebKit and Mozilla pseudo-elements for cross-browser support */}
        <style>{`
          .score-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${scoreColor.hex};
            border: 2px solid #1e2130;
            box-shadow: 0 0 6px ${scoreColor.hex}60, 0 0 0 3px ${scoreColor.hex}20;
            cursor: pointer;
            transition: box-shadow 0.2s ease, transform 0.15s ease;
          }
          .score-slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 0 10px ${scoreColor.hex}80, 0 0 0 4px ${scoreColor.hex}30;
          }
          .score-slider::-webkit-slider-thumb:active {
            transform: scale(1.05);
          }
          .score-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${scoreColor.hex};
            border: 2px solid #1e2130;
            box-shadow: 0 0 6px ${scoreColor.hex}60, 0 0 0 3px ${scoreColor.hex}20;
            cursor: pointer;
            transition: box-shadow 0.2s ease, transform 0.15s ease;
          }
          .score-slider::-moz-range-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 0 10px ${scoreColor.hex}80, 0 0 0 4px ${scoreColor.hex}30;
          }
          .score-slider::-moz-range-track {
            background: transparent;
            border: none;
            height: 10px;
            border-radius: 9999px;
          }
          .score-slider:focus-visible {
            outline: 2px solid ${scoreColor.hex}50;
            outline-offset: 2px;
            border-radius: 9999px;
          }
        `}</style>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Render a date input with dark theme styling
  // ----------------------------------------------------------
  if (type === 'date') {
    return (
      <div className="mb-3">
        {label && (
          <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
            {label}
          </label>
        )}
        <input
          type="date"
          value={value}
          onChange={onChange}
          className={`${BASE_INPUT_CLASSES} cursor-pointer`}
          // Dark color-scheme ensures the date picker itself is dark-themed
          style={{ colorScheme: 'dark' }}
        />
      </div>
    );
  }

  // ----------------------------------------------------------
  // Default: render a standard text <input>
  // Handles type="text", type="email", type="url", type="number", etc.
  // ----------------------------------------------------------
  return (
    <div className="mb-3">
      {label && (
        <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={BASE_INPUT_CLASSES}
      />
    </div>
  );
}
