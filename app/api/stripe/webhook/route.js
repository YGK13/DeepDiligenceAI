// ============================================================================
// /api/stripe/webhook — Stripe Webhook Handler
// ============================================================================
// Receives webhook events from Stripe and syncs subscription status to
// Supabase. This is the critical link between payment and access control.
//
// EVENTS HANDLED:
//   - checkout.session.completed → link Stripe customer to Supabase user
//   - customer.subscription.created/updated → sync plan + status
//   - customer.subscription.deleted → downgrade to free
//   - invoice.payment_failed → track failed payments, downgrade after 3
//
// SECURITY: Stripe signature verification (no auth middleware needed —
// Stripe sends webhooks directly, not through user sessions).
//
// SETUP:
//   1. Stripe Dashboard → Webhooks → Add endpoint
//   2. URL: https://duedrill.com/api/stripe/webhook
//   3. Events: checkout.session.completed, customer.subscription.*,
//      invoice.payment_succeeded, invoice.payment_failed
//   4. Copy signing secret to STRIPE_WEBHOOK_SECRET env var
// ============================================================================

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

// ============ FORCE DYNAMIC — no caching for webhooks ============
export const dynamic = 'force-dynamic';

// ============ SUPABASE ADMIN HELPER ============
// Creates a Supabase client with the service role key for admin operations.
// Webhook handlers need to update ANY user's profile (not just the current
// session user), so we use the service role which bypasses RLS.
async function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[STRIPE WEBHOOK] Supabase not configured — subscription sync disabled');
    return null;
  }

  // Dynamic import to avoid bundling issues when Supabase isn't configured
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, serviceKey);
}

// ============ UPDATE USER SUBSCRIPTION IN SUPABASE ============
// Central function that writes subscription data to the profiles table.
// Called by multiple event handlers with different data payloads.
async function updateUserSubscription(supabase, { email, userId, customerId, subscriptionId, plan, status, currentPeriodEnd, cancelAtPeriodEnd }) {
  if (!supabase) return;

  // Build the update payload — only include fields that have values
  const updates = {};
  if (customerId) updates.stripe_customer_id = customerId;
  if (subscriptionId) updates.stripe_subscription_id = subscriptionId;
  if (plan) updates.plan = plan;
  if (status) updates.subscription_status = status;
  if (currentPeriodEnd) updates.subscription_period_end = currentPeriodEnd;
  if (cancelAtPeriodEnd !== undefined) updates.cancel_at_period_end = cancelAtPeriodEnd;
  updates.updated_at = new Date().toISOString();

  // Try to find the user by multiple identifiers (in priority order)
  let result;

  // Strategy 1: Match by Supabase user ID (from checkout metadata)
  if (userId && userId !== 'local') {
    result = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, email')
      .single();

    if (result.data) {
      console.log(`[STRIPE WEBHOOK] Updated subscription for user ${userId}: plan=${plan}, status=${status}`);
      return result.data;
    }
  }

  // Strategy 2: Match by Stripe customer ID (for recurring events)
  if (customerId) {
    result = await supabase
      .from('profiles')
      .update(updates)
      .eq('stripe_customer_id', customerId)
      .select('id, email')
      .single();

    if (result.data) {
      console.log(`[STRIPE WEBHOOK] Updated subscription for customer ${customerId}: plan=${plan}, status=${status}`);
      return result.data;
    }
  }

  // Strategy 3: Match by email (fallback for first-time checkout)
  if (email) {
    result = await supabase
      .from('profiles')
      .update(updates)
      .eq('email', email)
      .select('id, email')
      .single();

    if (result.data) {
      console.log(`[STRIPE WEBHOOK] Updated subscription for email ${email}: plan=${plan}, status=${status}`);
      return result.data;
    }
  }

  console.error('[STRIPE WEBHOOK] Could not find user to update:', { email, userId, customerId });
  return null;
}

// ============ MAIN HANDLER ============
export async function POST(request) {
  try {
    const stripe = getStripe();

    // ============ VERIFY WEBHOOK SIGNATURE ============
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Get Supabase admin client (may be null if not configured)
    const supabase = await getSupabaseAdmin();

    console.log(`[STRIPE WEBHOOK] Received: ${event.type}`);

    switch (event.type) {
      // ============ CHECKOUT COMPLETED ============
      // User finished Stripe Checkout and paid. This is the FIRST event
      // we receive — links the Stripe customer to our Supabase user.
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Extract plan from subscription metadata (set during checkout creation)
        const plan = session.metadata?.plan
          || session.subscription_data?.metadata?.plan
          || 'solo';

        await updateUserSubscription(supabase, {
          email: session.customer_details?.email,
          userId: session.client_reference_id, // Supabase user ID from checkout
          customerId: session.customer,
          subscriptionId: session.subscription,
          plan,
          status: 'active',
        });

        console.log('[STRIPE WEBHOOK] Checkout completed:', {
          customer: session.customer,
          email: session.customer_details?.email,
          plan,
        });
        break;
      }

      // ============ SUBSCRIPTION CREATED/UPDATED ============
      // Fires when subscription status changes (active, past_due, etc.)
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        await updateUserSubscription(supabase, {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          plan: subscription.metadata?.plan || 'solo',
          status: subscription.status, // active, past_due, canceled, unpaid
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        console.log(`[STRIPE WEBHOOK] Subscription ${event.type}:`, {
          id: subscription.id,
          status: subscription.status,
          plan: subscription.metadata?.plan,
        });
        break;
      }

      // ============ SUBSCRIPTION DELETED (CANCELLED) ============
      // Subscription has ended — downgrade user to free plan
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await updateUserSubscription(supabase, {
          customerId: subscription.customer,
          plan: 'free',
          status: 'canceled',
          subscriptionId: null, // Clear the subscription ID
        });

        console.log('[STRIPE WEBHOOK] Subscription cancelled:', {
          id: subscription.id,
          customer: subscription.customer,
        });
        break;
      }

      // ============ PAYMENT SUCCEEDED ============
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('[STRIPE WEBHOOK] Payment succeeded:', {
          customer: invoice.customer,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
        });

        // Ensure subscription is marked active on successful payment
        // (handles recovery from past_due state)
        if (invoice.subscription) {
          await updateUserSubscription(supabase, {
            customerId: invoice.customer,
            status: 'active',
          });
        }
        break;
      }

      // ============ PAYMENT FAILED ============
      // Stripe retries failed payments automatically (typically 3 attempts
      // over ~3 weeks). After all retries fail, Stripe sends
      // customer.subscription.deleted which triggers the downgrade above.
      // Here we just mark the subscription as past_due so the UI can
      // show a warning banner.
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.error('[STRIPE WEBHOOK] Payment FAILED:', {
          customer: invoice.customer,
          amount: invoice.amount_due / 100,
          attempt: invoice.attempt_count,
        });

        // Mark as past_due (not canceled — Stripe may still retry)
        await updateUserSubscription(supabase, {
          customerId: invoice.customer,
          status: 'past_due',
        });

        // After 3 failures, subscription.deleted event will fire
        // and the handler above will downgrade to free automatically
        break;
      }

      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }

    // ============ ALWAYS RETURN 200 ============
    // Stripe retries on non-2xx responses. Always acknowledge receipt.
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
