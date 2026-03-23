// ============================================================================
// /api/stripe/webhook — Stripe Webhook Handler
// ============================================================================
// Receives webhook events from Stripe (subscription created, updated, deleted,
// payment succeeded, payment failed). Updates user subscription status.
//
// SETUP:
//   1. In Stripe Dashboard → Webhooks → Add endpoint
//   2. URL: https://your-domain.com/api/stripe/webhook
//   3. Events to listen for:
//      - checkout.session.completed
//      - customer.subscription.created
//      - customer.subscription.updated
//      - customer.subscription.deleted
//      - invoice.payment_succeeded
//      - invoice.payment_failed
//   4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var
// ============================================================================

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

// ============ DISABLE BODY PARSING ============
// Stripe requires the raw request body for signature verification.
// Next.js App Router gives us the raw body via request.text().
export const dynamic = 'force-dynamic';

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

    // ============ HANDLE EVENTS ============
    console.log(`[STRIPE WEBHOOK] Received: ${event.type}`);

    switch (event.type) {
      // ============ CHECKOUT COMPLETED ============
      // User finished the Stripe Checkout flow and paid
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[STRIPE WEBHOOK] Checkout completed:', {
          customer: session.customer,
          email: session.customer_details?.email,
          subscription: session.subscription,
          plan: session.metadata?.plan,
        });

        // TODO: When Supabase is configured, update the user's subscription:
        // await supabase.from('profiles').update({
        //   stripe_customer_id: session.customer,
        //   stripe_subscription_id: session.subscription,
        //   plan: session.subscription_data?.metadata?.plan || 'solo',
        //   subscription_status: 'active',
        // }).eq('email', session.customer_details?.email);
        break;
      }

      // ============ SUBSCRIPTION CREATED/UPDATED ============
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`[STRIPE WEBHOOK] Subscription ${event.type}:`, {
          id: subscription.id,
          customer: subscription.customer,
          status: subscription.status,
          plan: subscription.metadata?.plan,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        // TODO: Update subscription status in Supabase
        break;
      }

      // ============ SUBSCRIPTION DELETED (CANCELLED) ============
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('[STRIPE WEBHOOK] Subscription cancelled:', {
          id: subscription.id,
          customer: subscription.customer,
        });

        // TODO: Downgrade user to free plan in Supabase
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
        break;
      }

      // ============ PAYMENT FAILED ============
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.error('[STRIPE WEBHOOK] Payment FAILED:', {
          customer: invoice.customer,
          amount: invoice.amount_due / 100,
          attempt: invoice.attempt_count,
        });

        // TODO: Send email notification about failed payment
        // TODO: After 3 failures, downgrade to free
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
