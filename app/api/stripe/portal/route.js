// ============================================================================
// /api/stripe/portal — Stripe Customer Portal Session
// ============================================================================
// Creates a Stripe Customer Portal session so users can manage their
// subscription (upgrade, downgrade, cancel, update payment method).
//
// AUTHENTICATION: Requires a valid Supabase session. The customer ID is
// looked up from the user's Supabase profile (profiles.stripe_customer_id)
// instead of being passed in the request body. This prevents users from
// accessing other users' billing portals by spoofing a customer ID.
//
// POST /api/stripe/portal
// Body: {} (no body required — user is identified from session)
// Returns: { url: string } — the portal URL to redirect to
//
// FALLBACK: If no stripe_customer_id is found on the profile, falls back
// to accepting customerId from the request body (for backwards compat
// and local mode where profiles may not exist).
// ============================================================================

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
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

    // ============ GET CUSTOMER ID ============
    // Strategy:
    //   1. Try to look up stripe_customer_id from the user's Supabase profile
    //   2. Fall back to customerId from request body (backwards compat)
    //   3. If neither exists, return 400 error

    let customerId = null;

    // --- Attempt 1: Look up from Supabase profile ---
    // Only possible when Supabase is configured and user is real (not mock)
    if (user.id !== 'local') {
      try {
        const { createServerClient } = await import('@supabase/ssr');
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();

        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll();
              },
              setAll(cookiesToSet) {
                try {
                  cookiesToSet.forEach(({ name, value, options }) =>
                    cookieStore.set(name, value, options)
                  );
                } catch {
                  // Silently fail — middleware handles cookie refresh
                }
              },
            },
          }
        );

        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', user.id)
          .single();

        if (profile?.stripe_customer_id) {
          customerId = profile.stripe_customer_id;
        }
      } catch (err) {
        // Profile lookup failed — fall through to body fallback
        console.warn('[STRIPE PORTAL] Profile lookup failed:', err.message);
      }
    }

    // --- Attempt 2: Fall back to request body ---
    // For backwards compatibility and local mode
    if (!customerId) {
      try {
        const body = await request.json();
        customerId = body.customerId;
      } catch {
        // No body or invalid JSON — that's fine, we'll error below
      }
    }

    // --- Validate we have a customer ID ---
    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No Stripe customer found. Please subscribe to a plan first.',
        },
        { status: 400 }
      );
    }

    // ============ CREATE PORTAL SESSION ============
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
