'use client';

// ============================================================================
// lib/hooks/useSubscription.js — Subscription Status & Feature Gating
// ============================================================================
// Tracks the user's current subscription plan and provides feature-level
// access checks. This is the enforcement layer for Stripe billing.
//
// HOW IT WORKS:
//   1. On mount, checks the user's subscription status
//   2. In local mode (no Supabase), defaults to "fund" plan (all features unlocked)
//      so solo developers and demo users get the full experience
//   3. When Supabase is configured, reads subscription from user profile
//   4. Exposes `canAccess(feature)` for feature-gating in the UI
//
// USAGE:
//   const { plan, canAccess, isLoading } = useSubscription(user);
//   if (!canAccess('aiAutoFill')) { show upgrade prompt }
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';

// ============ PLAN FEATURE MATRIX ============
// Defines what each plan can access. Must stay in sync with lib/stripe/config.js
const PLAN_FEATURES = {
  free: {
    maxCompanies: 1,
    aiAutoFill: false,
    pdfExport: false,
    comparison: false,
    integrations: false,
    deckUpload: false,
    peopleVerify: false,
    customScoring: false,
    references: false,
    pipeline: false,
  },
  solo: {
    maxCompanies: 10,
    aiAutoFill: true,
    pdfExport: true,
    comparison: true,
    integrations: true,       // Crunchbase, OpenCorporates
    deckUpload: false,        // Fund+ only
    peopleVerify: false,      // Fund+ only
    customScoring: true,
    references: true,
    pipeline: true,
  },
  fund: {
    maxCompanies: Infinity,
    aiAutoFill: true,
    pdfExport: true,
    comparison: true,
    integrations: true,
    deckUpload: true,
    peopleVerify: true,
    customScoring: true,
    references: true,
    pipeline: true,
  },
  enterprise: {
    maxCompanies: Infinity,
    aiAutoFill: true,
    pdfExport: true,
    comparison: true,
    integrations: true,
    deckUpload: true,
    peopleVerify: true,
    customScoring: true,
    references: true,
    pipeline: true,
  },
};

// ============ HOOK ============
export function useSubscription(user) {
  const [plan, setPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive'); // active, past_due, cancelled
  const [isLoading, setIsLoading] = useState(true);

  // ============ LOAD SUBSCRIPTION STATUS ============
  useEffect(() => {
    // LOCAL MODE: No Supabase → give full access so the app is usable
    // This is critical for demos, development, and the free self-hosted experience
    if (!isSupabaseConfigured()) {
      setPlan('fund');
      setSubscriptionStatus('active');
      setIsLoading(false);
      return;
    }

    // NO USER: Default to free plan
    if (!user) {
      setPlan('free');
      setSubscriptionStatus('inactive');
      setIsLoading(false);
      return;
    }

    // LOGGED IN: Check subscription from Supabase profile
    let cancelled = false;

    async function loadSubscription() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('plan, subscription_status, stripe_customer_id')
          .eq('id', user.id)
          .single();

        if (cancelled) return;

        if (error) {
          console.error('[useSubscription] Profile fetch error:', error);
          // Graceful fallback: give free plan, don't crash the app
          setPlan('free');
          setSubscriptionStatus('inactive');
        } else if (profile) {
          setPlan(profile.plan || 'free');
          setSubscriptionStatus(profile.subscription_status || 'inactive');
        }
      } catch (err) {
        console.error('[useSubscription] Unexpected error:', err);
        if (!cancelled) {
          setPlan('free');
          setSubscriptionStatus('inactive');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSubscription();
    return () => { cancelled = true; };
  }, [user]);

  // ============ FEATURE ACCESS CHECK ============
  // Returns true if the current plan allows the specified feature
  const canAccess = useCallback(
    (feature) => {
      const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

      // Special case: maxCompanies is a number, not a boolean
      if (feature === 'maxCompanies') {
        return features.maxCompanies;
      }

      return features[feature] === true;
    },
    [plan]
  );

  // ============ DERIVED HELPERS ============
  const isPaid = useMemo(() => plan !== 'free', [plan]);
  const isActive = useMemo(
    () => subscriptionStatus === 'active' || subscriptionStatus === 'trialing',
    [subscriptionStatus]
  );
  const planLabel = useMemo(() => {
    const labels = { free: 'Free', solo: 'Solo Investor', fund: 'Fund', enterprise: 'Enterprise' };
    return labels[plan] || 'Free';
  }, [plan]);

  return {
    plan,
    planLabel,
    isPaid,
    isActive,
    subscriptionStatus,
    isLoading,
    canAccess,
    features: PLAN_FEATURES[plan] || PLAN_FEATURES.free,
  };
}
