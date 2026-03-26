'use client';

// ============================================================================
// components/ui/ThemeToggle.js — Light/Dark Theme Switcher
// ============================================================================
// Enterprise requirement: many VCs share screens in bright meeting rooms.
// Dark-only is a friction point. This toggle switches between dark (default)
// and light themes using CSS custom properties defined in globals.css.
//
// Theme state is stored in localStorage ('duedrill_theme') and applied
// as data-theme="light" on the <html> element. Default is dark.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'duedrill_theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  // ============ LOAD THEME ON MOUNT ============
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light') {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // ============ TOGGLE HANDLER ============
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);

    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border"
      style={{
        background: 'var(--bg-input)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        // Sun icon for "switch to light"
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        // Moon icon for "switch to dark"
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
