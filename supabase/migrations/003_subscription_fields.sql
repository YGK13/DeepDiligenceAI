-- ============================================================================
-- DueDrill — Add Subscription Fields to Profiles
-- Migration: 003_subscription_fields.sql
-- ============================================================================
-- Adds Stripe subscription tracking columns to the profiles table.
-- These are populated by the Stripe webhook handler when users subscribe.
-- ============================================================================

-- Add Stripe subscription columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- Index on stripe_customer_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Index on plan for feature gating queries
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
