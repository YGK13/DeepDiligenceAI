// ============================================================================
// Supabase Middleware Helper — DueDrill
// ============================================================================
// This module provides the updateSession() function used by Next.js
// middleware (middleware.js in the project root). Its job is to:
//
//   1. Read the Supabase auth cookies from the incoming request
//   2. Check if the JWT is expired and refresh it if needed
//   3. Write the refreshed token back as cookies on the response
//
// WHY is this necessary?
// Supabase auth tokens (JWTs) expire after a configurable period (default
// 1 hour). Without middleware refreshing them, users would get logged out
// on every page navigation after the token expires — even if they have a
// valid refresh token. The middleware intercepts EVERY request and silently
// refreshes the session before the page loads.
//
// This is the critical piece that makes cookie-based auth work seamlessly
// in a Next.js app. Without it, server components would see expired tokens
// and treat the user as unauthenticated.
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// ============================================================================
// updateSession — Refresh Auth Session on Every Request
// ============================================================================
// Called by the Next.js middleware on every matching route. Creates a
// Supabase server client wired to the request/response cookie flow,
// calls getUser() to trigger a token refresh if needed, then returns
// the response with updated cookies.
//
// Parameters:
//   request — the incoming NextRequest from Next.js middleware
//
// Returns:
//   NextResponse — the response with any updated auth cookies attached
// ============================================================================

export async function updateSession(request) {
  // Start with a "pass-through" response that forwards the request
  // to the next handler. We clone the request headers so any cookies
  // set by Supabase get properly attached to the response.
  let supabaseResponse = NextResponse.next({
    request,
  })

  // =========================================================================
  // Create a Supabase client wired to request/response cookies
  // =========================================================================
  // This client reads auth cookies from the INCOMING request and writes
  // refreshed cookies to the OUTGOING response. The cookie handlers below
  // are the bridge between Supabase's auth system and Next.js middleware.
  // =========================================================================

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // ====================================================================
        // getAll — Read cookies from the incoming request
        // ====================================================================
        // The middleware receives the raw request, so we read cookies
        // from request.cookies (the NextRequest cookie API).
        // ====================================================================
        getAll() {
          return request.cookies.getAll()
        },

        // ====================================================================
        // setAll — Write refreshed cookies to the outgoing response
        // ====================================================================
        // When Supabase refreshes a token, it calls this to persist the
        // new JWT. We write cookies to BOTH the request (so downstream
        // server components see the fresh token) AND the response (so
        // the browser gets the updated cookie).
        //
        // IMPORTANT: We must also recreate the NextResponse to ensure
        // the cookie changes are properly included in the final response.
        // This is a subtle but critical detail — without it, cookie
        // writes can be lost in certain Next.js routing scenarios.
        // ====================================================================
        setAll(cookiesToSet) {
          // Write to the request so Server Components see fresh tokens
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          // Recreate the response to capture cookie changes
          supabaseResponse = NextResponse.next({
            request,
          })

          // Write to the response so the browser gets updated cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // =========================================================================
  // Trigger Session Refresh
  // =========================================================================
  // IMPORTANT: Do NOT remove this getUser() call.
  // Even though we don't use the return value here, calling getUser()
  // is what triggers the Supabase client to check if the JWT is expired
  // and refresh it. Without this call, expired tokens would never get
  // refreshed and users would be silently logged out.
  //
  // WHY getUser() instead of getSession()?
  // getUser() makes a server-side call to Supabase to validate the token,
  // while getSession() only reads the local JWT without validation.
  // getUser() is more secure because it catches revoked sessions.
  // =========================================================================

  // eslint-disable-next-line no-unused-vars
  const { data: { user } } = await supabase.auth.getUser()

  // =========================================================================
  // Optional: Add auth-based redirects here
  // =========================================================================
  // Example: Redirect unauthenticated users to a login page
  //
  //   if (!user && !request.nextUrl.pathname.startsWith('/login')) {
  //     const url = request.nextUrl.clone()
  //     url.pathname = '/login'
  //     return NextResponse.redirect(url)
  //   }
  //
  // For now, DueDrill allows unauthenticated access (localStorage
  // fallback), so we don't enforce redirects. When we add required auth,
  // uncomment and customize the redirect logic above.
  // =========================================================================

  return supabaseResponse
}
