// ============================================================================
// Supabase Browser Client — DeepDiligence AI
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
// Returns a Supabase client configured for browser-side usage.
// The @supabase/ssr library handles cookie-based session management
// automatically, which is more secure than the older localStorage approach.
//
// WHY a factory function instead of a raw export?
// - Ensures the client is created lazily (not at import time)
// - Allows Next.js to properly resolve env vars at runtime
// - Matches the pattern recommended by Supabase for Next.js 13+
// ============================================================================

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
}
