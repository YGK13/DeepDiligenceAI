// ============================================================================
// lib/supabase.js — DueDrill: Supabase Client
// ============================================================================
// Creates and exports a singleton Supabase client for use across the app.
// Falls back gracefully when Supabase is not configured — this enables
// a "localStorage-only" mode for local development and demo purposes.
//
// WHY a singleton?
// Supabase's createClient() sets up WebSocket connections for realtime
// subscriptions and manages auth tokens. Creating multiple clients would
// waste connections and cause auth state conflicts. One client, shared
// everywhere via import, is the correct pattern.
//
// DUAL-MODE ARCHITECTURE:
// The app supports two persistence backends:
// 1. Supabase (production) — data persists in Postgres, accessible anywhere
// 2. localStorage (development/demo) — data persists in the browser only
//
// Components use isSupabaseConfigured() to decide which backend to use.
// This means the app works immediately out of the box with zero config,
// and adding Supabase is just setting two env vars in .env.local.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================
// NEXT_PUBLIC_ prefix is required by Next.js to expose these to the browser.
// Both URL and anon key are safe to expose client-side — Supabase's Row Level
// Security (RLS) policies protect the data, not the anon key.
//
// To configure Supabase:
// 1. Create a project at https://supabase.com
// 2. Copy the URL and anon key from Settings > API
// 3. Add to .env.local:
//    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ============================================================================
// SUPABASE CLIENT SINGLETON
// ============================================================================
// Only create the client if BOTH URL and anon key are configured.
// If either is missing, supabase will be null — this is the signal to
// downstream code to use localStorage instead.
//
// WHY null instead of throwing?
// Because the app needs to work without Supabase configured. Throwing would
// crash the app on import. Returning null lets every consumer gracefully
// degrade to localStorage mode with a simple if-check.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ============================================================================
// isSupabaseConfigured()
// ============================================================================
// Convenience helper that returns true if the Supabase client was successfully
// created. Use this in data-access functions to branch between Supabase
// and localStorage:
//
//   if (isSupabaseConfigured()) {
//     // Save to Supabase
//     await supabase.from('companies').upsert(data);
//   } else {
//     // Fall back to localStorage
//     localStorage.setItem('companies', JSON.stringify(data));
//   }
//
// WHY a function instead of just checking `supabase !== null`?
// Encapsulation. If we later add more conditions for "configured" (e.g.,
// checking that the user is authenticated, or that the tables exist),
// we only change this one function instead of every call site.
export function isSupabaseConfigured() {
  return supabase !== null;
}
