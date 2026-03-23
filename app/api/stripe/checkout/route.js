// ============================================================================
// /api/stripe/checkout — Create Stripe Checkout Session
// ============================================================================
// Creates a Stripe Checkout Session for the selected plan.
// Redirects the user to Stripe's hosted checkout page.
//
// POST /api/stripe/checkout
// Body: { planId: 'solo' | 'fund', successUrl?: string, cancelUrl?: string }
// Returns: { url: string } — the Stripe Checkout URL to redirect to
// ============================================================================

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { PLANS } from '@/lib/stripe/config';

export async function POST(request) {
  try {
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

    const session = await stripe.checkout.sessions.create({
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
        // Store the plan name in subscription metadata for easy lookups
        metadata: {
          plan: planId,
          source: 'duedrill_checkout',
        },
      },

      // Custom branding
      custom_text: {
        submit: {
          message: `Subscribe to DueDrill ${plan.name} — AI-powered due diligence`,
        },
      },
    });

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
