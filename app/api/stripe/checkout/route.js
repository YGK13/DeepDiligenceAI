// ============================================================================
// /api/stripe/checkout — Create Stripe Checkout Session
// ============================================================================
// Creates a Stripe Checkout Session for the selected plan.
// Redirects the user to Stripe's hosted checkout page.
//
// AUTHENTICATION: Requires a valid Supabase session. The checkout session
// is associated with the authenticated user via:
//   - client_reference_id: Supabase user ID (for webhook reconciliation)
//   - customer_email: pre-filled from Supabase auth
//   - metadata.user_id: stored on the subscription for easy lookups
//
// This ensures that when the Stripe webhook fires (checkout.session.completed),
// we can link the subscription back to the correct Supabase user.
//
// POST /api/stripe/checkout
// Body: { planId: 'solo' | 'fund', successUrl?: string, cancelUrl?: string }
// Returns: { url: string } — the Stripe Checkout URL to redirect to
// ============================================================================

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { PLANS } from '@/lib/stripe/config';
import { requireAuth } from '@/lib/security/session';

export async function POST(request) {
  try {
    // ============ AUTH CHECK ============
    // Validate the user's session. In local mode (no Supabase), this
    // returns a mock user and the route continues to work.
    // If not authenticated, requireAuth returns a 401 NextResponse.
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const body = await request.json();
    const { planId, successUrl, cancelUrl } = body;

    // ============ VALIDATE PLAN ============
    const plan = PLANS[planId];
    if (!plan || !plan.priceId) {
      return NextResponse.json(
        { success: false, error: `Invalid plan: ${planId}. Use 'solo' or 'fund'.` },
        { status: 400 }
      );
    }

    // ============ CREATE CHECKOUT SESSION ============
    const stripe = getStripe();

    // Build the base URL from the request origin
    const origin = request.headers.get('origin') || 'https://duedrill.com';

    // --- Build checkout session config ---
    // We associate the session with the authenticated user so the
    // webhook can link the Stripe subscription to the Supabase user.
    const sessionConfig = {
      // Payment mode for one-time, subscription for recurring
      mode: 'subscription',

      // The Stripe Price ID for the selected plan
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],

      // Where to redirect after payment
      success_url: successUrl || `${origin}/?checkout=success&plan=${planId}`,
      cancel_url: cancelUrl || `${origin}/landing?checkout=cancelled`,

      // Allow promotion codes for early-bird discounts
      allow_promotion_codes: true,

      // Collect billing address (required for invoices)
      billing_address_collection: 'required',

      // Subscription-specific settings
      subscription_data: {
        // Store the plan name AND user ID in subscription metadata
        // so webhooks can reconcile the subscription with the user
        metadata: {
          plan: planId,
          source: 'duedrill_checkout',
          user_id: user.id,
        },
      },

      // Custom branding
      custom_text: {
        submit: {
          message: `Subscribe to DueDrill ${plan.name} — AI-powered due diligence`,
        },
      },
    };

    // --- Associate with authenticated user (when not in local mode) ---
    // client_reference_id links the Stripe session to our Supabase user ID.
    // customer_email pre-fills the email field on the Stripe checkout page.
    // Both make webhook reconciliation reliable and UX smooth.
    if (user.id !== 'local') {
      sessionConfig.client_reference_id = user.id;

      if (user.email) {
        sessionConfig.customer_email = user.email;
      }

      // If the user already has a Stripe customer ID, reuse it
      // so their subscriptions are grouped under one Stripe customer.
      if (user.stripe_customer_id) {
        sessionConfig.customer = user.stripe_customer_id;
        // Can't set customer_email when customer is provided
        delete sessionConfig.customer_email;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Return the checkout URL for client-side redirect
    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('[STRIPE CHECKOUT] Error:', err);

    // Handle specific Stripe errors
    if (err.message?.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured. Contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create checkout session.' },
      { status: 500 }
    );
  }
}
