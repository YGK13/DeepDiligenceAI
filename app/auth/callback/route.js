// ============================================================================
// Auth Callback Route — DeepDiligence AI
// ============================================================================
// This server-side route handler processes OAuth redirects and email
// confirmation callbacks from Supabase. It sits at /auth/callback.
//
// HOW IT WORKS:
// 1. Supabase redirects users here after Google OAuth or email confirmation
// 2. The URL contains a `code` query parameter (PKCE authorization code)
// 3. We exchange that code for a session using supabase.auth.exchangeCodeForSession()
// 4. Supabase sets the session cookies automatically via the server client
// 5. We redirect the user to the dashboard (/) on success, or /login on failure
//
// WHY a Route Handler (not a page)?
// - We need to set cookies (session tokens) which requires server-side code
// - Route Handlers can read/write cookies via the server Supabase client
// - No UI needed — this is purely a redirect endpoint
// ============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  // ============================================================================
  // Extract the authorization code from the callback URL
  // ============================================================================
  // Supabase appends ?code=<value> after successful OAuth or email confirmation.
  // If the code is missing, something went wrong (user cancelled, link expired, etc.)
  // ============================================================================
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Optional: Supabase may include a `next` param for post-auth redirect target
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      // Create the server-side Supabase client (has cookie read/write access)
      // Returns null if Supabase env vars aren't set
      const supabase = await createClient()

      if (!supabase) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Supabase is not configured. Set environment variables.')}`
        )
      }

      // Exchange the one-time code for a persistent session
      // This validates the code with Supabase's auth server and sets
      // the session cookies (access_token + refresh_token) automatically
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Success — send user to the dashboard (or wherever `next` points)
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Code exchange failed — likely expired or already used
      console.error('Auth callback: code exchange failed', error.message)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      )
    } catch (err) {
      // Unexpected server error during code exchange
      console.error('Auth callback: unexpected error', err)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
      )
    }
  }

  // ============================================================================
  // No code present — redirect to login with an error
  // ============================================================================
  // This happens if the user navigates to /auth/callback directly, or if
  // the OAuth provider didn't return a code (e.g., user cancelled the flow).
  // ============================================================================
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('No authorization code received. Please try again.')}`
  )
}
