'use client';
// ============================================================================
// lib/hooks/useSupabaseAuth.js — Supabase Authentication State Hook
// ============================================================================
// Manages the current user's authentication state by subscribing to
// Supabase's onAuthStateChange listener. This is the single source of
// truth for "who is logged in" throughout the app.
//
// HOW THE AUTH FLOW WORKS:
//   1. On mount, we call supabase.auth.getSession() to check if there's
//      an existing session (cookie-based, managed by @supabase/ssr).
//   2. We subscribe to onAuthStateChange, which fires whenever:
//      - The user signs in (SIGNED_IN event)
//      - The user signs out (SIGNED_OUT event)
//      - The token is refreshed (TOKEN_REFRESHED event)
//      - The user's data changes (USER_UPDATED event)
//   3. On every auth event, we update the `user` state.
//   4. On unmount, we unsubscribe to prevent memory leaks.
//
// WHEN SUPABASE IS NOT CONFIGURED:
//   If the env vars are missing (local dev mode), this hook returns
//   { user: null, loading: false, signOut: no-op }. The downstream hooks
//   (useCompanies, useSettings) see user=null and fall back to localStorage.
//
// USAGE:
//   const { user, loading, signOut } = useSupabaseAuth();
//   if (loading) return <Spinner />;
//   if (!user) return <LoginPage />;
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';


// ============================================================================
// useSupabaseAuth Hook
// ============================================================================
export function useSupabaseAuth() {
  // --- State: the currently authenticated user (null = not logged in) ---
  const [user, setUser] = useState(null);

  // --- State: whether we're still checking the initial session ---
  // Starts as true so the app can show a loading state until we know
  // for sure whether the user is logged in or not. Without this,
  // the app would flash the "not logged in" UI for a frame before
  // the session check completes.
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // Effect: Subscribe to auth state changes
  // ============================================================================
  // This runs once on mount. It:
  //   1. Checks if Supabase is configured at all
  //   2. Gets the current session (if any)
  //   3. Sets up a real-time listener for auth changes
  //   4. Returns a cleanup function to unsubscribe
  // ============================================================================
  useEffect(() => {
    // --- GUARD: If Supabase isn't configured, skip everything ---
    // In local-only mode, there's no auth backend. We immediately set
    // loading=false and user=null, which tells the rest of the app
    // to use localStorage for persistence.
    if (!isSupabaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }

    // --- Create the Supabase browser client ---
    // This is a lightweight operation — the client is created fresh
    // but shares the same cookie-based session under the hood.
    const supabase = createClient();

    // --- Check the current session ---
    // getSession() reads the session from cookies (set by @supabase/ssr).
    // If the user previously logged in and their session hasn't expired,
    // this returns the active session. Otherwise it returns null.
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Extract the user object from the session (or null if no session)
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // --- Subscribe to auth state changes ---
    // onAuthStateChange returns a subscription object with an unsubscribe
    // method. The callback fires on EVERY auth event (sign in, sign out,
    // token refresh, etc.) with the updated session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Update our local state whenever auth changes.
      // _event is the event type (SIGNED_IN, SIGNED_OUT, etc.) —
      // we don't need it here, we just care about the session.
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // --- Cleanup: unsubscribe when the component unmounts ---
    // Without this, the listener would keep firing after the component
    // is gone, causing state updates on an unmounted component (memory leak).
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty deps — only run on mount

  // ============================================================================
  // signOut — Logs the user out of Supabase
  // ============================================================================
  // Wrapped in useCallback so it has a stable reference and won't cause
  // unnecessary re-renders in child components that receive it as a prop.
  //
  // If Supabase isn't configured, this is a no-op (you can't sign out
  // of something you never signed into).
  // ============================================================================
  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[useSupabaseAuth] Sign out error:', error.message);
      }
      // The onAuthStateChange listener will fire SIGNED_OUT and clear the user
    } catch (err) {
      console.error('[useSupabaseAuth] Sign out exception:', err);
    }
  }, []);

  // ============================================================================
  // Return value
  // ============================================================================
  // - user:    The Supabase user object (or null if not authenticated)
  // - loading: True while we're checking the initial session
  // - signOut: Function to log the user out
  // ============================================================================
  return { user, loading, signOut };
}
