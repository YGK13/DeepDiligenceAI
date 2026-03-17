'use client';

// ============================================================
// Button.js — Reusable Button Component
// ============================================================
// Flexible button with multiple visual variants and sizes.
// Supports: primary (blue), success (green), danger (red),
// outline (bordered), and ghost (minimal) styles.
// All variants use the app's dark theme color palette.
// ============================================================

import React from 'react';

// ============================================================
// Variant style map — defines bg, text, border, and hover states
// Each variant is a string of Tailwind classes
// ============================================================
const VARIANT_CLASSES = {
  // Primary — solid blue background, white text
  primary: [
    'bg-[#4a7dff]',
    'text-white',
    'border-transparent',
    'hover:bg-[#3d6be6]',    // slightly darker blue on hover
    'active:bg-[#3560d4]',   // even darker on active press
  ].join(' '),

  // Success — solid green background
  success: [
    'bg-[#34d399]',
    'text-[#0f1117]',        // dark text on bright green for contrast
    'border-transparent',
    'hover:bg-[#2db886]',
    'active:bg-[#27a377]',
  ].join(' '),

  // Danger — solid red background
  danger: [
    'bg-[#ef4444]',
    'text-white',
    'border-transparent',
    'hover:bg-[#dc2626]',
    'active:bg-[#c42020]',
  ].join(' '),

  // Outline — transparent bg with visible border
  outline: [
    'bg-transparent',
    'text-[#e8e9ed]',
    'border-[#2d3148]',
    'hover:bg-[#252836]',    // subtle fill on hover
    'hover:border-[#4a7dff]',
    'active:bg-[#2d3148]',
  ].join(' '),

  // Ghost — no border, no background, just text
  ghost: [
    'bg-transparent',
    'text-[#9ca0b0]',
    'border-transparent',
    'hover:bg-[#252836]',
    'hover:text-[#e8e9ed]',
    'active:bg-[#2d3148]',
  ].join(' '),
};

// ============================================================
// Size style map — controls padding and font size
// ============================================================
const SIZE_CLASSES = {
  sm: 'py-1 px-2.5 text-xs',
  md: 'py-2 px-4 text-sm',
  icon: 'p-2',               // square button for icon-only usage
};

// ============================================================
// Button Component
// ============================================================
// Props:
//   children  — button content (text, icons, etc.)
//   variant   — 'primary' | 'success' | 'danger' | 'outline' | 'ghost'
//   size      — 'sm' | 'md' | 'icon'
//   onClick   — click handler function
//   disabled  — disables the button with reduced opacity
//   className — additional CSS classes to merge
//   type      — HTML button type ('button' | 'submit' | 'reset')
//   ...rest   — any additional HTML button attributes (id, aria-*, data-*, etc.)
// ============================================================
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  // Resolve variant and size classes with fallbacks
  const variantStyles = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeStyles = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-1.5
        font-semibold
        rounded-lg
        border
        transition-all duration-200
        cursor-pointer
        ${variantStyles}
        ${sizeStyles}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
