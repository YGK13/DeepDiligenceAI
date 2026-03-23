'use client'

// ============================================================================
// Login Page — DueDrill
// ============================================================================
// Provides email/password authentication and Google OAuth sign-in.
// Uses the browser-side Supabase client for auth operations.
// On successful login, redirects to the main dashboard (/).
//
// Design: Centered card on dark background, matching the app's theme vars.
// ============================================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ============================================================================
// Google Icon SVG — Inline to avoid external dependency
// ============================================================================
// The official Google "G" logo rendered as an inline SVG so we don't need
// to pull in a font icon library or host an image file.
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
// LoginPage Component
// ============================================================================
export default function LoginPage() {
  // --- State ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
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
              Authentication is not configured yet. The app is running in <strong className="text-[var(--text-primary)]">local mode</strong> (localStorage only).
            </p>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              To enable login, set <code className="text-[var(--accent-blue)]">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-[var(--accent-blue)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your <code>.env.local</code> file.
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
  // handleEmailLogin — Email/password sign-in
  // ============================================================================
  // Uses Supabase's signInWithPassword which validates credentials server-side
  // and returns a session. On success we push to the dashboard.
  // ============================================================================
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Surface the exact Supabase error message (e.g., "Invalid login credentials")
        setError(signInError.message)
        return
      }

      // Successful login — redirect to dashboard
      router.push('/')
      router.refresh() // Force a server re-render so layout picks up the session
    } catch (err) {
      // Catch network errors or unexpected failures
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // handleGoogleLogin — OAuth sign-in via Google
  // ============================================================================
  // Initiates the OAuth PKCE flow. Supabase redirects the user to Google's
  // consent screen, then back to /auth/callback where we exchange the code
  // for a session. The redirectTo URL must match what's configured in the
  // Supabase dashboard under Authentication > URL Configuration.
  // ============================================================================
  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // The callback route handles code exchange and session creation
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
      // If no error, Supabase is redirecting to Google — don't setLoading(false)
    } catch (err) {
      setError('Failed to initiate Google sign-in. Please try again.')
      setLoading(false)
    }
  }

  // ============================================================================
  // Shared input styles — Reusable Tailwind classes for form fields
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
      {/* --- Centered auth card --- */}
      <div className="w-full max-w-md">
        {/* --- Logo / Brand --- */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Deep<span className="text-[var(--accent-blue)]">Diligence</span> AI
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Sign in to your account
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
          {/* --- Error banner --- */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-sm">
              {error}
            </div>
          )}

          {/* --- Google OAuth button --- */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={
              'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg ' +
              'bg-white text-gray-800 font-medium ' +
              'hover:bg-gray-100 transition-colors duration-200 ' +
              'disabled:opacity-50 disabled:cursor-not-allowed'
            }
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          {/* --- Divider --- */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[var(--text-muted)] text-sm">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* --- Email/password form --- */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className={inputClasses}
              />
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* --- Footer link to signup --- */}
        <p className="text-center mt-6 text-[var(--text-secondary)] text-sm">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-[var(--accent-blue)] hover:underline font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
