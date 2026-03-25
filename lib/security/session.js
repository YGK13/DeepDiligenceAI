// ============================================================================
// lib/security/session.js — Server-Side Session Validation Utilities
// ============================================================================
// Provides reusable session validation functions for API routes that need
// to verify the current user is authenticated before proceeding.
//
// TWO FUNCTIONS:
//
//   validateSession(request)
//     - Checks Supabase session from cookies
//     - Returns { user, error } — never throws
//     - Use when you want to handle auth errors yourself
//
//   requireAuth(request)
//     - Calls validateSession internally
//     - Returns the user object if authenticated
//     - Throws a NextResponse 401 if NOT authenticated
//     - Use when the route absolutely requires auth
//
// GRACEFUL DEGRADATION:
//   When Supabase is NOT configured (no env vars), both functions return
//   a mock user object: { id: 'local', email: 'local@localhost' }.
//   This allows API routes to work in local dev mode without auth.
//
// USAGE IN API ROUTES:
//
//   // Option 1: Soft check (handle error yourself)
//   export async function POST(request) {
//     const { user, error } = await validateSession(request);
//     if (error) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }
//     // ... use user.id, user.email, etc.
//   }
//
//   // Option 2: Hard check (auto-returns 401 response)
//   export async function POST(request) {
//     const authResult = await requireAuth(request);
//     if (authResult instanceof Response) return authResult; // 401 response
//     const user = authResult;
//     // ... use user.id, user.email, etc.
//   }
// ============================================================================

import { NextResponse } from 'next/server';

// ============================================================================
// LOCAL MODE MOCK USER
// ============================================================================
// When Supabase isn't configured, we return this mock user so API routes
// can still function. The id 'local' is a sentinel value that downstream
// code can check to know we're in local mode.
// ============================================================================

const LOCAL_MODE_USER = {
  id: 'local',
  email: 'local@localhost',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
};

// ============================================================================
// validateSession — Soft Auth Check
// ============================================================================
// Reads the Supabase auth cookie from the incoming request, validates
// the session, and returns the user object (or an error).
//
// Parameters:
//   request — the incoming NextRequest from a Route Handler
//
// Returns:
//   { user: SupabaseUser | MockUser, error: null } — authenticated
//   { user: null, error: string }                  — not authenticated
// ============================================================================

export async function validateSession(request) {
  // --- GUARD: If Supabase is not configured, return mock user ---
  // In local dev mode there's no auth backend. All API routes
  // should work without requiring real authentication.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { user: LOCAL_MODE_USER, error: null };
  }

  try {
    // --- Dynamically import to avoid module-level crash ---
    // When @supabase/ssr is imported at the top level without valid
    // credentials, it can throw. Dynamic import sidesteps this.
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');

    const cookieStore = await cookies();

    // --- Create a server client wired to request cookies ---
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // In API routes, cookies are writable — set refreshed tokens
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Silently fail if called from a context where cookies
              // are read-only (e.g., Server Components). The middleware
              // handles cookie refresh in those cases.
            }
          },
        },
      }
    );

    // --- Validate the session by calling getUser() ---
    // getUser() makes a server-side call to Supabase to verify the JWT.
    // This is more secure than getSession() which only reads the local JWT
    // without validating it against the server (won't catch revoked sessions).
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: error?.message || 'No authenticated user found.',
      };
    }

    return { user, error: null };
  } catch (err) {
    console.error('[SESSION] Validation error:', err);
    return {
      user: null,
      error: 'Session validation failed: ' + (err.message || 'Unknown error'),
    };
  }
}

// ============================================================================
// requireAuth — Hard Auth Check (Returns 401 Response if Unauthorized)
// ============================================================================
// Convenience wrapper around validateSession(). If the user is NOT
// authenticated, it returns a ready-made NextResponse with 401 status
// that the API route can return directly.
//
// Parameters:
//   request — the incoming NextRequest from a Route Handler
//
// Returns:
//   SupabaseUser | MockUser — if authenticated
//   NextResponse (401)       — if NOT authenticated
//
// USAGE:
//   const authResult = await requireAuth(request);
//   if (authResult instanceof Response) return authResult;
//   const user = authResult;
// ============================================================================

export async function requireAuth(request) {
  const { user, error } = await validateSession(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required.',
        details: error || 'No valid session found.',
      },
      { status: 401 }
    );
  }

  return user;
}
