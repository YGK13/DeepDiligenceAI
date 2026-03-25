'use client';
// ============================================================================
// components/auth/UserMenu.js — User Account Menu for Top Bar
// ============================================================================
// Displays the current user's avatar and email with a dropdown menu for
// account actions (Settings, Manage Subscription, Sign Out).
//
// THREE STATES:
//   1. AUTHENTICATED  — Shows avatar (first letter of email), email,
//                       and dropdown with account actions
//   2. NOT LOGGED IN  — Shows "Sign In" button linking to /login
//   3. LOCAL MODE     — Shows "Local Mode" badge (Supabase not configured)
//
// DARK THEME:
//   All colors match the DueDrill dark theme:
//   - Background:  #1e2130, #2d3148
//   - Text:        #e8e9ed, #9ca0b0
//   - Accent:      #4a7dff
//   - Borders:     #2d3148
//
// DROPDOWN BEHAVIOR:
//   - Toggles on avatar click
//   - Closes when clicking outside (useEffect listener)
//   - Closes after any menu item is clicked
//   - Sign Out calls the signOut() prop and redirects to /landing
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';

// ============================================================================
// UserMenu Component
// ============================================================================
// Props:
//   user     — Supabase user object (or null if not authenticated)
//   signOut  — Async function to sign the user out of Supabase
// ============================================================================

export default function UserMenu({ user, signOut }) {
  // --- State: whether the dropdown is open ---
  const [isOpen, setIsOpen] = useState(false);

  // --- Ref: the entire menu container (avatar + dropdown) ---
  // Used to detect clicks outside and close the dropdown.
  const menuRef = useRef(null);

  const router = useRouter();
  const supabaseEnabled = isSupabaseConfigured();

  // =========================================================================
  // Click Outside Handler — Close dropdown when clicking anywhere else
  // =========================================================================
  // We attach a mousedown listener to the document. If the click target
  // is NOT inside our menu container, we close the dropdown.
  // Using mousedown instead of click for better UX (fires immediately).
  // =========================================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    // Only listen when the dropdown is open (performance optimization)
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // =========================================================================
  // Sign Out Handler — Sign out and redirect to landing page
  // =========================================================================

  const handleSignOut = useCallback(async () => {
    setIsOpen(false);
    if (signOut) {
      await signOut();
    }
    router.push('/landing');
  }, [signOut, router]);

  // =========================================================================
  // Menu Item Click Handler — Navigate and close dropdown
  // =========================================================================

  const handleMenuNavigate = useCallback((path) => {
    setIsOpen(false);
    router.push(path);
  }, [router]);

  // =========================================================================
  // RENDER: Local Mode — Supabase not configured
  // =========================================================================
  // Show a subtle badge indicating the app is running without auth.
  // This helps developers know they're in local-only mode.
  // =========================================================================

  if (!supabaseEnabled) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          background: '#2d3148',
          color: '#9ca0b0',
          border: '1px solid #3d4162',
        }}
      >
        {/* Offline icon */}
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12v.01"
          />
        </svg>
        Local Mode
      </div>
    );
  }

  // =========================================================================
  // RENDER: Not Authenticated — Show "Sign In" button
  // =========================================================================

  if (!user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
        style={{
          background: '#4a7dff',
          color: '#ffffff',
        }}
      >
        {/* User icon */}
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        Sign In
      </button>
    );
  }

  // =========================================================================
  // RENDER: Authenticated — Show avatar + dropdown
  // =========================================================================
  // The avatar shows the first letter of the user's email in a circular
  // badge. Clicking it toggles the dropdown menu.
  // =========================================================================

  // Extract display info from the user object
  const email = user.email || 'user@unknown.com';
  const avatarLetter = email[0]?.toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* ============ Avatar Button — Toggles Dropdown ============ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150"
        style={{
          background: isOpen ? '#2d3148' : 'transparent',
        }}
        title={email}
      >
        {/* Avatar circle — first letter of email */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: '#4a7dff20',
            border: '2px solid #4a7dff60',
            color: '#4a7dff',
          }}
        >
          {avatarLetter}
        </div>

        {/* Email — hidden on small screens */}
        <span
          className="hidden md:block text-sm max-w-[160px] truncate"
          style={{ color: '#e8e9ed' }}
        >
          {email}
        </span>

        {/* Chevron — rotates when open */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: '#6b7084' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ============ Dropdown Menu ============ */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: '#1e2130',
            border: '1px solid #2d3148',
          }}
        >
          {/* ---- User Info Header ---- */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid #2d3148' }}
          >
            <p
              className="text-sm font-medium truncate"
              style={{ color: '#e8e9ed' }}
            >
              {email}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7084' }}>
              {user.user_metadata?.full_name || 'DueDrill Account'}
            </p>
          </div>

          {/* ---- Menu Items ---- */}
          <div className="py-1">
            {/* Settings */}
            <button
              onClick={() => handleMenuNavigate('/?tab=settings')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150"
              style={{ color: '#e8e9ed' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2d3148')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Gear icon */}
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: '#9ca0b0' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </button>

            {/* Manage Subscription */}
            <button
              onClick={() => handleMenuNavigate('/pricing')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150"
              style={{ color: '#e8e9ed' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2d3148')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Credit card icon */}
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: '#9ca0b0' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Manage Subscription
            </button>
          </div>

          {/* ---- Sign Out ---- */}
          <div style={{ borderTop: '1px solid #2d3148' }} className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150"
              style={{ color: '#ef4444' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ef444410')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Logout icon */}
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
