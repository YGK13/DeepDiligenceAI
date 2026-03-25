'use client';
// ============================================================================
// components/auth/AuthGuard.js — Client-Side Authentication Guard
// ============================================================================
// Wraps protected content and ensures only authenticated users can see it.
// This is a SECONDARY defense layer — the middleware handles server-side
// redirects. AuthGuard handles the client-side edge cases:
//
//   1. Shows a loading spinner while checking auth state
//   2. Redirects to /login if the user is not authenticated
//   3. In local mode (no Supabase configured), renders children immediately
//
// WHY both middleware AND client-side guard?
//   - Middleware catches most cases (direct URL access, page refresh)
//   - AuthGuard catches client-side navigation edge cases and provides
//     a smooth loading state instead of a flash of protected content
//   - Belt AND suspenders — defense in depth
//
// USAGE:
//   <AuthGuard>
//     <ProtectedDashboard />
//   </AuthGuard>
//
//   // Or with custom fallback:
//   <AuthGuard fallback={<CustomLoader />}>
//     <ProtectedDashboard />
//   </AuthGuard>
// ============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/hooks/useSupabaseAuth';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';

// ============================================================================
// AuthGuard Component
// ============================================================================
// Props:
//   children  — The protected content to render when authenticated
//   fallback  — Optional custom loading component (defaults to spinner)
// ============================================================================

export default function AuthGuard({ children, fallback = null }) {
  const { user, loading } = useSupabaseAuth();
  const router = useRouter();

  // =========================================================================
  // LOCAL MODE BYPASS
  // =========================================================================
  // If Supabase is not configured (no env vars), skip ALL auth checks.
  // The app runs in localStorage-only mode — there's no auth backend,
  // so there's nothing to guard against. Render children immediately.
  // =========================================================================

  const supabaseEnabled = isSupabaseConfigured();

  // =========================================================================
  // Redirect Effect — Push to /login if not authenticated
  // =========================================================================
  // Only fires when:
  //   1. Supabase IS configured (not local mode)
  //   2. Auth check has finished loading (loading === false)
  //   3. No user is authenticated (user === null)
  //
  // We include the current path as a redirect target so the login page
  // can send the user back after successful authentication.
  // =========================================================================

  useEffect(() => {
    // Don't redirect in local mode — no auth to enforce
    if (!supabaseEnabled) return;

    // Don't redirect while still loading — we don't know auth state yet
    if (loading) return;

    // If no user after loading completes → redirect to login
    if (!user) {
      // Encode the current path so login can redirect back after auth
      const currentPath = window.location.pathname;
      const redirectUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      router.replace(redirectUrl);
    }
  }, [supabaseEnabled, loading, user, router]);

  // =========================================================================
  // RENDER: Local mode — no auth, render children immediately
  // =========================================================================

  if (!supabaseEnabled) {
    return children;
  }

  // =========================================================================
  // RENDER: Loading state — show spinner while checking auth
  // =========================================================================
  // This prevents a flash of protected content before the auth check
  // completes. Users see a branded loading screen instead.
  // =========================================================================

  if (loading) {
    // Use custom fallback if provided, otherwise show default spinner
    if (fallback) return fallback;

    return (
      <div
        className="flex items-center justify-center h-screen w-full"
        style={{ background: '#0f1117' }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner — matches app's blue accent */}
          <div
            className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#4a7dff', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#9ca0b0' }}>
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Not authenticated — show nothing (redirect is in progress)
  // =========================================================================
  // The useEffect above is already pushing to /login. We render null
  // to avoid flashing protected content during the redirect.
  // =========================================================================

  if (!user) {
    return null;
  }

  // =========================================================================
  // RENDER: Authenticated — show the protected content
  // =========================================================================

  return children;
}
