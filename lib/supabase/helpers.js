// ============================================================================
// lib/supabase/helpers.js — Supabase Configuration Utility
// ============================================================================
// Provides a single helper function to check whether Supabase environment
// variables are present. This is the gatekeeper used by every data hook
// (useCompanies, useSettings, useSupabaseAuth) to decide whether to use
// Supabase queries or fall back to localStorage.
//
// WHY this check exists:
// DueDrill must work in two modes:
//   1. LOCAL MODE  — No Supabase env vars set. App runs entirely on
//                    localStorage, zero backend required. Great for demos,
//                    local dev, and offline usage.
//   2. CLOUD MODE  — Supabase env vars are set. App uses Supabase for
//                    auth, persistence, and cross-device sync.
//
// The hooks call isSupabaseConfigured() on every render cycle to decide
// which persistence backend to use. This means you can switch modes just
// by adding or removing env vars — no code changes needed.
// ============================================================================


// ============================================================================
// isSupabaseConfigured()
// ============================================================================
// Returns true ONLY if both required Supabase environment variables are
// present AND non-empty. Both are needed:
//   - NEXT_PUBLIC_SUPABASE_URL  — The Supabase project URL (e.g., https://xyz.supabase.co)
//   - NEXT_PUBLIC_SUPABASE_ANON_KEY — The anon/public API key for client-side access
//
// If either is missing or empty string, we treat Supabase as unconfigured
// and the hooks will gracefully fall back to localStorage.
// ============================================================================
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Both must be truthy (non-null, non-undefined, non-empty-string)
  return Boolean(url && url.length > 0 && key && key.length > 0);
}
