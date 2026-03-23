-- ============================================================================
-- DueDrill — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================================
-- This migration sets up the core tables for DueDrill's Supabase
-- backend, replacing the current localStorage persistence layer.
--
-- Tables created:
--   1. profiles      — User profile data (linked to Supabase Auth)
--   2. companies     — Saved company due diligence data + AI research
--   3. user_settings — Per-user AI provider config and API keys
--
-- Security:
--   - Row Level Security (RLS) enabled on ALL tables
--   - Users can only read/write their OWN rows
--   - API keys stored in user_settings are protected by RLS
--
-- Auto-provisioning:
--   - A trigger auto-creates a profile row when a user signs up
--   - This ensures every auth.users entry has a matching profile
-- ============================================================================


-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Stores user profile information. The id column is a foreign key to
-- auth.users, which is Supabase's built-in auth table. This means:
--   - Every profile maps 1:1 to an auth user
--   - The profile is created automatically via trigger (see below)
--   - Deleting the auth user cascades to delete the profile
--
-- WHY a separate profiles table instead of using auth.users directly?
-- Supabase's auth.users table is in the auth schema and has restricted
-- access. The profiles table lives in the public schema where our app
-- can freely query it with RLS protection. It also lets us store
-- app-specific fields (display_name, avatar) without touching auth.
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  display_name text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS — no one can access rows without a matching policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (used by the trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);


-- ============================================================================
-- 2. COMPANIES TABLE
-- ============================================================================
-- Stores saved company due diligence data. Each row represents one company
-- that a user has researched. The core data structure mirrors what's
-- currently stored in localStorage:
--
--   data        — The company's structured due diligence data (financials,
--                 team, market, etc.) stored as a JSONB blob. This keeps
--                 the schema flexible as we add new data fields.
--
--   ai_research — Results from AI-powered research (Perplexity, Claude,
--                 GPT-4o, Llama). Stored separately from core data so we
--                 can track which research has been done and cache results.
--
-- WHY JSONB instead of normalized columns?
-- The due diligence data structure is complex and evolving. JSONB gives us:
--   - Flexibility to add fields without migrations
--   - Ability to store nested objects (team members, funding rounds, etc.)
--   - Fast querying with GIN indexes if needed later
--   - Direct compatibility with the existing JS object structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name         text,
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_research  jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS — lock down access to own rows only
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own companies
CREATE POLICY "Users can view own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert companies under their own user_id
CREATE POLICY "Users can insert own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own companies
CREATE POLICY "Users can update own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own companies
CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- Index: Speed up lookups by user_id (most queries filter by this)
CREATE INDEX idx_companies_user_id ON companies(user_id);


-- ============================================================================
-- 3. USER SETTINGS TABLE
-- ============================================================================
-- Stores per-user configuration for AI providers and API keys.
-- This replaces the localStorage-based settings in the current app.
--
--   provider  — The user's preferred AI provider ('perplexity', 'anthropic',
--               'openai', 'groq'). Defaults to 'perplexity' since it
--               includes web search, which is best for due diligence.
--
--   api_keys  — JSONB object mapping provider names to API keys, e.g.:
--               { "perplexity": "pplx-...", "anthropic": "sk-ant-..." }
--               Stored encrypted at rest by Supabase (if column encryption
--               is enabled). Protected by RLS so only the owner can read.
--
--   models    — JSONB object for per-provider model preferences, e.g.:
--               { "perplexity": "sonar-pro", "anthropic": "claude-sonnet-4-20250514" }
--
-- UNIQUE constraint on user_id ensures one settings row per user.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  provider    text DEFAULT 'perplexity',
  api_keys    jsonb DEFAULT '{}'::jsonb,
  models      jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS — API keys are sensitive, lock it down
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own settings
CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Index: Speed up lookups by user_id (UNIQUE already creates an index,
-- but we're explicit here for clarity and consistency)
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);


-- ============================================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ============================================================================
-- When a new user signs up via Supabase Auth, we want to automatically
-- create a row in the profiles table. This ensures:
--   - Every authenticated user has a profile without extra client-side code
--   - The profile is available immediately after signup
--   - We capture the email from auth.users into our profiles table
--
-- HOW IT WORKS:
--   1. User signs up → Supabase inserts a row into auth.users
--   2. The INSERT trigger fires this function
--   3. The function creates a matching row in public.profiles
--   4. Email is copied from the auth metadata (raw_user_meta_data)
--      or from the auth.users email field
--
-- The function uses NEW.id (the new auth user's UUID) as the profile id,
-- maintaining the 1:1 relationship between auth.users and profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    -- Try to get display name from auth metadata (Google, GitHub, etc.)
    -- Falls back to NULL if not provided
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NULL
    ),
    -- Try to get avatar URL from auth metadata (OAuth providers)
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      NULL
    )
  );
  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users so it fires on every new signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 5. UPDATED_AT AUTO-UPDATE TRIGGER
-- ============================================================================
-- Automatically sets the updated_at column to now() whenever a row is
-- modified. Applied to all three tables so we always know when data
-- was last changed without relying on client-side timestamps.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply the updated_at trigger to all tables
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
