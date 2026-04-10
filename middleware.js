// ============================================================================
// Next.js Middleware — DueDrill
// ============================================================================
// This middleware runs on EVERY matched request before the page loads.
// It handles TWO critical responsibilities:
//
//   1. SESSION REFRESH — Refresh the Supabase auth session so that server
//      components and API routes always see a valid, non-expired JWT.
//
//   2. ROUTE PROTECTION — Redirect unauthenticated users away from protected
//      routes and redirect authenticated users away from login/signup pages.
//
// HOW IT WORKS:
//   1. Next.js intercepts every request matching the `config.matcher` pattern
//   2. We call updateSession() which reads the auth cookie, refreshes the
//      JWT if expired, and writes the new token back to cookies
//   3. We check if the route is public or protected
//   4. If protected and no user → redirect to /login
//   5. If auth page and user exists → redirect to /
//   6. The request continues to the actual page/API with a fresh session
//
// GRACEFUL LOCAL MODE:
//   When Supabase env vars are NOT set, the middleware passes through ALL
//   requests without any auth checks. This allows the app to run in
//   localStorage-only mode during development without Supabase credentials.
//
// PERFORMANCE NOTE:
//   The matcher config below excludes static files, images, and Next.js
//   internals so middleware only runs on actual page/API requests.
// ============================================================================

import { NextResponse } from 'next/server'

// ============================================================================
// Public Routes Configuration
// ============================================================================
// These routes do NOT require authentication. Any user (logged in or not)
// can access them freely. Everything NOT on this list is protected.
//
// IMPORTANT: Paths are matched with startsWith() so /auth/callback will
// match /auth/callback?code=xxx etc. The Stripe webhook MUST be public
// because Stripe's servers won't have a user session.
// ============================================================================

const PUBLIC_ROUTES = [
  '/landing',
  '/login',
  '/signup',
  '/pricing',
  '/privacy',
  '/terms',
  '/trust',
  '/faq',
  '/changelog',
  '/auth/callback',
  '/auth/confirm',
  '/api/stripe/webhook',
  '/api/waitlist',
  '/api/og',
  '/share/',
  '/api/share/',
]

// ============================================================================
// Auth-Only Routes — Redirect authenticated users AWAY from these
// ============================================================================
// If a logged-in user tries to visit /login or /signup, we redirect them
// to the main app. No point showing login to someone already authenticated.
// ============================================================================

const AUTH_PAGES = ['/login', '/signup']

// ============================================================================
// isPublicRoute — Check if a pathname matches any public route
// ============================================================================
// Uses startsWith() so that query params and nested paths still match.
// Example: /auth/callback?code=abc → matches /auth/callback
// ============================================================================

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

// ============================================================================
// isAuthPage — Check if this is a login/signup page
// ============================================================================

function isAuthPage(pathname) {
  return AUTH_PAGES.some((route) => pathname.startsWith(route))
}

// ============================================================================
// Middleware Handler
// ============================================================================
// Next.js requires a default export named `middleware`. It receives the
// incoming request and must return a Response (or NextResponse).
//
// GUARD: If Supabase env vars are not configured yet, skip ALL auth logic
// and just pass through. This allows the app to run in localStorage-only
// mode during development without Supabase credentials.
// ============================================================================

export async function middleware(request) {
  // --- GUARD: Skip everything if Supabase is not configured ---
  // In local-only mode there's no auth backend. Let ALL requests through.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  // --- Dynamically import to avoid module-level crash when @supabase/ssr
  //     tries to initialize without valid credentials ---
  const { updateSession } = await import('@/lib/supabase/middleware')

  // --- Refresh the session first (returns response with updated cookies) ---
  const supabaseResponse = await updateSession(request)

  // =========================================================================
  // Route Protection Logic
  // =========================================================================
  // After refreshing the session, we need to check whether the user is
  // authenticated and whether they're trying to access a protected route.
  //
  // We re-create a lightweight Supabase client here to call getUser()
  // because updateSession() doesn't expose the user object to us.
  // We read the cookies from the RESPONSE (which has the refreshed tokens)
  // rather than the original request (which might have expired tokens).
  // =========================================================================

  const { createServerClient } = await import('@supabase/ssr')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Read cookies from the incoming request (updateSession already
        // wrote refreshed tokens to request.cookies in its setAll handler)
        getAll() {
          return request.cookies.getAll()
        },
        // No-op for setAll — we don't need to write cookies here,
        // updateSession already handled that. We just need to READ
        // the auth state to make routing decisions.
        setAll() {},
      },
    }
  )

  // --- Check if the user has a valid session ---
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // =========================================================================
  // RULE 1: Authenticated user hitting /login or /signup → redirect to /
  // =========================================================================
  // If a user is already logged in and tries to visit the login or signup
  // page, redirect them to the main app. This prevents the confusing UX
  // of showing a login form to someone who's already authenticated.
  // =========================================================================

  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // =========================================================================
  // RULE 2: Unauthenticated user hitting a protected route → redirect to /login
  // =========================================================================
  // If the route is NOT in our public routes list and the user is NOT
  // authenticated, redirect them to the login page. We include the original
  // URL as a `redirectTo` query param so the login page can redirect back
  // after successful authentication.
  // =========================================================================

  // =========================================================================
  // RULE 2a: Unauthenticated user hitting / → redirect to /landing
  // =========================================================================
  // The root route (/) is the app dashboard. Unauthenticated visitors should
  // see the marketing landing page instead of being bounced to /login.
  // =========================================================================

  if (!user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the original destination so login can redirect back
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // =========================================================================
  // RULE 3: All other cases — pass through with refreshed session
  // =========================================================================
  // Public routes for unauthenticated users, and protected routes for
  // authenticated users both fall through here. The supabaseResponse
  // already has the refreshed auth cookies attached.
  // =========================================================================

  return supabaseResponse
}

// ============================================================================
// Route Matcher Configuration
// ============================================================================
// This tells Next.js WHICH routes should trigger the middleware.
// We want to run on all routes EXCEPT:
//   - _next/static — Next.js bundled CSS/JS files
//   - _next/image  — Next.js optimized images
//   - favicon.ico  — Browser favicon request
//   - .svg/.png/.jpg/.jpeg/.gif/.webp — Static image assets
//
// The regex negative lookahead (?!...) excludes these patterns, so
// middleware only fires on actual page navigations and API calls.
// This is critical for performance — without it, every static asset
// request would trigger a Supabase auth check.
// ============================================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
