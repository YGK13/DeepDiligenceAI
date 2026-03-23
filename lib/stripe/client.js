// ============================================================================
// lib/stripe/client.js — Server-Side Stripe Client
// ============================================================================
// Initializes the Stripe SDK for server-side use (API routes, webhooks).
// NEVER import this in client components — it uses the secret key.
// ============================================================================

import Stripe from 'stripe';

// ============ SINGLETON STRIPE CLIENT ============
// Lazy-initialized to avoid errors when STRIPE_SECRET_KEY isn't set
let stripeInstance = null;

export function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. Add it to your .env.local or Vercel environment variables.'
      );
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
      appInfo: {
        name: 'DueDrill',
        version: '1.0.0',
        url: 'https://duedrill.com',
      },
    });
  }
  return stripeInstance;
}
