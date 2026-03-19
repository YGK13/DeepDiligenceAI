// ============================================================================
// Email Confirmation Route — DeepDiligence AI
// ============================================================================
// Handles email verification links for signup confirmation and password
// recovery. Supabase sends these links with a token_hash and type parameter.
//
// URL format from Supabase:
//   /auth/confirm?token_hash=<hash>&type=signup
//   /auth/confirm?token_hash=<hash>&type=recovery
//
// HOW IT WORKS:
// 1. User clicks the confirmation link in their email
// 2. Supabase redirects to this route with token_hash and type params
// 3. We call supabase.auth.verifyOtp() to validate the token
// 4. On success: redirect to dashboard (signup) or password reset (recovery)
// 5. On failure: redirect to login with an error message
//
// WHY a separate route from /auth/callback?
// - /auth/callback handles OAuth code exchange (PKCE flow)
// - /auth/confirm handles email-based OTP token verification
// - Different Supabase methods are used (exchangeCodeForSession vs verifyOtp)
// - Keeping them separate makes debugging and logging clearer
// ============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  // ============================================================================
  // Extract token_hash and type from the confirmation URL
  // ============================================================================
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Optional redirect target after confirmation
  const next = searchParams.get('next') ?? '/'

  // ============================================================================
  // Validate required parameters
  // ============================================================================
  // Both token_hash and type are required for OTP verification.
  // Without them, the verification will fail.
  // ============================================================================
  if (!token_hash || !type) {
    console.error('Auth confirm: missing token_hash or type')
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Invalid confirmation link. Missing required parameters.')}`
    )
  }

  try {
    // Create server-side Supabase client with cookie access
    // Returns null if Supabase env vars aren't set
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Supabase is not configured.')}`
      )
    }

    // ============================================================================
    // Verify the OTP token
    // ============================================================================
    // verifyOtp validates the token_hash against Supabase's auth server.
    // Supported types:
    //   - 'signup'    — Email confirmation after registration
    //   - 'recovery'  — Password reset link
    //   - 'invite'    — Team invitation (if using Supabase invites)
    //   - 'email'     — Email change confirmation
    //
    // On success, Supabase automatically creates/updates the session
    // and sets the auth cookies via the server client's cookie handlers.
    // ============================================================================
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error('Auth confirm: OTP verification failed', error.message)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }

    // ============================================================================
    // Redirect based on confirmation type
    // ============================================================================
    // - signup: User confirmed their email → send to dashboard
    // - recovery: User clicked password reset → send to dashboard (they're now
    //   authenticated and can use the app's password change UI if one exists)
    // - All others: default to the `next` parameter or dashboard
    // ============================================================================
    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error('Auth confirm: unexpected error', err)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Email confirmation failed. Please try again.')}`
    )
  }
}
