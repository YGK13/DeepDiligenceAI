// ============================================================================
// Supabase Server Client — DeepDiligence AI
// ============================================================================
// This module creates a Supabase client for use in SERVER-SIDE code:
//   - Route Handlers (app/api/...)
//   - Server Components
//   - Server Actions
//
// WHY a separate server client?
// The server doesn't have access to browser APIs (document.cookie, etc.).
// Instead, we use Next.js's cookies() from 'next/headers' to read/write
// the auth session cookies. This keeps the user authenticated across
// client and server without exposing tokens to JavaScript.
//
// Usage:
//   import { createClient } from '@/lib/supabase/server'
//   const supabase = await createClient()
//   const { data } = await supabase.from('profiles').select('*')
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ============================================================================
// createClient — Server-Side Supabase Client Factory
// ============================================================================
// This is an ASYNC function because cookies() in Next.js 13+ returns a
// promise (as of Next.js 15+). We await it to get the cookie store, then
// wire it into the Supabase client so it can read/write auth cookies.
//
// The cookie handlers below tell @supabase/ssr how to interact with
// Next.js's cookie API. Supabase stores its auth tokens in cookies
// (sb-<ref>-auth-token) and needs these handlers to:
//   1. getAll() — read existing cookies to check auth state
//   2. setAll() — write updated cookies when tokens refresh
//
// WHY try/catch in setAll?
// In Server Components, cookies are READ-ONLY. Attempting to set cookies
// there throws an error. We catch it silently because the middleware
// (middleware.js) handles cookie writes for session refresh instead.
// This is the officially recommended pattern from Supabase docs.
// ============================================================================

export async function createClient() {
  // Await the cookie store — Next.js 15+ made cookies() async
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // ====================================================================
        // getAll — Read all cookies from the incoming request
        // ====================================================================
        // Supabase needs to read its auth token cookies to determine
        // if the user is logged in and if the token needs refreshing.
        // ====================================================================
        getAll() {
          return cookieStore.getAll()
        },

        // ====================================================================
        // setAll — Write cookies back to the response
        // ====================================================================
        // When Supabase refreshes an expired JWT, it needs to write the
        // new token back as a cookie. This handler does that.
        //
        // The try/catch is intentional: Server Components can't set cookies
        // (they're read-only in that context). The middleware handles
        // cookie writes for those cases, so we safely ignore the error.
        // ====================================================================
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silent catch: This is expected when called from a Server
            // Component. The middleware.js will handle the session refresh
            // and cookie write instead. This is the Supabase-recommended
            // pattern for Next.js — not a bug.
          }
        },
      },
    }
  )
}
