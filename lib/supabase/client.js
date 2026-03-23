// ============================================================================
// Supabase Browser Client — DueDrill
// ============================================================================
// This module creates a Supabase client for use in BROWSER (client-side) code.
// It uses @supabase/ssr's createBrowserClient, which is the recommended
// approach for Next.js apps. The browser client automatically handles:
//   - Auth token storage in cookies (not localStorage)
//   - Automatic token refresh on the client side
//   - PKCE auth flow support
//
// Usage:
//   import { createClient } from '@/lib/supabase/client'
//   const supabase = createClient()
//   const { data } = await supabase.from('companies').select('*')
// ============================================================================

import { createBrowserClient } from '@supabase/ssr'
import { isSupabaseConfigured } from './helpers'

// ============================================================================
// Environment Variables
// ============================================================================
// These MUST be prefixed with NEXT_PUBLIC_ so Next.js exposes them to the
// browser bundle. Without the prefix, they'd only be available server-side
// and this client would silently fail with undefined values.
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ============================================================================
// createClient — Browser Supabase Client Factory
// ============================================================================
// Returns a Supabase client configured for browser-side usage, or null if
// Supabase is not configured (no env vars set). Callers MUST check for null.
//
// WHY null instead of throwing?
// - The app must work without Supabase (localStorage-only mode)
// - During build/SSG, env vars may not be set and that's OK
// - Login/signup pages check for null and show "not configured" message
// ============================================================================

export function createClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
}
