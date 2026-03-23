'use client'

// ============================================================================
// Signup Page — DueDrill
// ============================================================================
// Provides email/password registration and Google OAuth sign-up.
// After email signup, displays a confirmation message instructing the user
// to check their inbox. Google OAuth redirects through /auth/callback.
//
// Design: Identical card layout to the login page for visual consistency.
// ============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ============================================================================
// Google Icon SVG — Same as login page for consistency
// ============================================================================
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

// ============================================================================
// SignupPage Component
// ============================================================================
export default function SignupPage() {
  // --- State ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient() // Returns null if Supabase is not configured

  // ============================================================================
  // Guard: If Supabase is not configured, show a helpful message
  // ============================================================================
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Deep<span className="text-[var(--accent-blue)]">Diligence</span> AI
          </h1>
          <div className="rounded-xl p-8 border border-[var(--border)]" style={{ background: 'var(--bg-card)' }}>
            <p className="text-[var(--text-secondary)] mb-4">
              Authentication is not configured yet. The app is running in <strong className="text-[var(--text-primary)]">local mode</strong>.
            </p>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              To enable signup, set <code className="text-[var(--accent-blue)]">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-[var(--accent-blue)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your <code>.env.local</code> file.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg font-medium hover:brightness-110 transition-all">
              Go to App (Local Mode)
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // handleEmailSignup — Create account with email/password
  // ============================================================================
  // Uses Supabase's signUp which sends a confirmation email by default.
  // The emailRedirectTo option tells Supabase where to send the user after
  // they click the confirmation link in their email. This should point to
  // the /auth/confirm route which verifies the token.
  // ============================================================================
  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // After clicking the email confirmation link, Supabase redirects here
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Show success message — user must confirm their email before signing in
      setSuccess(true)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // handleGoogleSignup — OAuth sign-up via Google
  // ============================================================================
  // Identical to login — Google OAuth doesn't distinguish between sign-in
  // and sign-up. If the user doesn't exist, Supabase creates the account
  // automatically on first OAuth login.
  // ============================================================================
  const handleGoogleSignup = async () => {
    setError(null)
    setLoading(true)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
      // Supabase is redirecting — don't clear loading state
    } catch (err) {
      setError('Failed to initiate Google sign-up. Please try again.')
      setLoading(false)
    }
  }

  // ============================================================================
  // Shared input styles
  // ============================================================================
  const inputClasses =
    'w-full px-4 py-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] ' +
    'text-[var(--text-primary)] placeholder-[var(--text-muted)] ' +
    'focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] ' +
    'transition-colors duration-200'

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md">
        {/* --- Logo / Brand --- */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Deep<span className="text-[var(--accent-blue)]">Diligence</span> AI
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Create your account
          </p>
        </div>

        {/* --- Card container --- */}
        <div
          className="rounded-xl p-8 border border-[var(--border)]"
          style={{
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* --- Success banner — shown after successful signup --- */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-sm">
              <p className="font-medium mb-1">Check your email for confirmation</p>
              <p className="text-[var(--text-secondary)]">
                We sent a verification link to <strong className="text-[var(--text-primary)]">{email}</strong>.
                Click it to activate your account.
              </p>
            </div>
          )}

          {/* --- Error banner --- */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-sm">
              {error}
            </div>
          )}

          {/* --- Only show the form if signup hasn't succeeded yet --- */}
          {!success && (
            <>
              {/* --- Google OAuth button --- */}
              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className={
                  'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg ' +
                  'bg-white text-gray-800 font-medium ' +
                  'hover:bg-gray-100 transition-colors duration-200 ' +
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                }
              >
                <GoogleIcon />
                Sign up with Google
              </button>

              {/* --- Divider --- */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[var(--text-muted)] text-sm">or</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* --- Email/password form --- */}
              <form onSubmit={handleEmailSignup} className="space-y-4">
                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={inputClasses}
                  />
                </div>

                {/* Password field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={inputClasses}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Minimum 6 characters
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={
                    'w-full py-3 rounded-lg font-medium text-white ' +
                    'bg-[var(--accent-blue)] hover:brightness-110 ' +
                    'transition-all duration-200 ' +
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  }
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* --- Footer link to login --- */}
        <p className="text-center mt-6 text-[var(--text-secondary)] text-sm">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-[var(--accent-blue)] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
