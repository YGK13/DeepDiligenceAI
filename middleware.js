// ============================================================================
// Next.js Middleware — DueDrill
// ============================================================================
// This middleware runs on EVERY matched request before the page loads.
// Its sole job right now is to refresh the Supabase auth session so that
// server components and API routes always see a valid, non-expired JWT.
//
// HOW IT WORKS:
//   1. Next.js intercepts every request matching the `config.matcher` pattern
//   2. We call updateSession() which reads the auth cookie, refreshes the
//      JWT if expired, and writes the new token back to cookies
//   3. The request continues to the actual page/API with a fresh session
//
// WHY middleware instead of doing this in each page?
//   - Centralizes session refresh in one place (DRY)
//   - Runs before any server component renders, so auth state is always fresh
//   - Required by Supabase's cookie-based auth pattern for Next.js
//   - Allows future auth-based routing (redirects to login, etc.)
//
// PERFORMANCE NOTE:
// The matcher config below excludes static files, images, and Next.js
// internals so middleware only runs on actual page/API requests. This
// avoids unnecessary Supabase calls on every CSS/JS/image request.
// ============================================================================

import { NextResponse } from 'next/server'

// ============================================================================
// Middleware Handler
// ============================================================================
// Next.js requires a default export named `middleware`. It receives the
// incoming request and must return a Response (or NextResponse).
//
// GUARD: If Supabase env vars are not configured yet, skip session refresh
// and just pass through. This allows the app to run in localStorage-only
// mode during development without Supabase credentials.
// ============================================================================

export async function middleware(request) {
  // Skip Supabase session refresh if not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  // Dynamically import to avoid module-level crash when @supabase/ssr
  // tries to initialize without valid credentials
  const { updateSession } = await import('@/lib/supabase/middleware')
  return await updateSession(request)
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
