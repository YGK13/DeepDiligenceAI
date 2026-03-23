// ============================================================================
// /api/stripe/portal — Stripe Customer Portal Session
// ============================================================================
// Creates a Stripe Customer Portal session so users can manage their
// subscription (upgrade, downgrade, cancel, update payment method).
//
// POST /api/stripe/portal
// Body: { customerId: string }
// Returns: { url: string } — the portal URL to redirect to
// ============================================================================

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = request.headers.get('origin') || 'https://duedrill.com';

    // Create a portal session — Stripe handles the entire UI
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (err) {
    console.error('[STRIPE PORTAL] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create portal session.' },
      { status: 500 }
    );
  }
}
