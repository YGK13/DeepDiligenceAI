'use client';

// ============================================================================
// app/pricing/page.js — DueDrill Pricing Page
// ============================================================================
// Standalone pricing page with Stripe checkout integration.
// Shows 3 tiers (Free, Solo $49/mo, Fund $199/mo) + Enterprise contact.
// Each paid plan has a "Subscribe" button that creates a Stripe Checkout
// session and redirects to Stripe's hosted payment page.
// ============================================================================

import { useState, useCallback } from 'react';

// ============ PLAN DATA ============
// Monthly and annual pricing. Annual = 20% discount (2 months free).
// Stripe Price IDs differ per billing interval — checkout route handles this.
const TIERS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Try DueDrill with basic features',
    cta: 'Get Started',
    ctaLink: '/',
    highlighted: false,
    features: [
      '1 company',
      'Manual data entry',
      'Basic scoring engine',
      'Dashboard view',
    ],
    limitations: [
      'No AI auto-fill',
      'No PDF export',
      'No comparison view',
    ],
  },
  {
    id: 'solo',
    name: 'Solo Investor',
    monthlyPrice: 49,
    annualPrice: 39, // ~20% off ($468/yr vs $588/yr)
    description: 'For individual angels and scouts',
    cta: 'Subscribe',
    highlighted: true,
    features: [
      '10 companies',
      'AI auto-fill (all 4 providers)',
      'PDF investment memos',
      'Side-by-side comparison',
      '16 DD section scoring',
      'Data export/import',
      'Email support',
    ],
    limitations: [],
  },
  {
    id: 'fund',
    name: 'Fund',
    monthlyPrice: 199,
    annualPrice: 159, // ~20% off ($1,908/yr vs $2,388/yr)
    description: 'For VC funds and family offices',
    cta: 'Subscribe',
    highlighted: false,
    features: [
      'Unlimited companies',
      'Everything in Solo, plus:',
      'Deck upload & analysis',
      'People verification',
      'Investor background checks',
      'Priority support',
      'Team access (coming soon)',
    ],
    limitations: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'For large funds and institutions',
    cta: 'Contact Sales',
    ctaLink: 'mailto:yuri@5ftview.com?subject=DueDrill Enterprise',
    highlighted: false,
    features: [
      'Everything in Fund, plus:',
      'Custom integrations',
      'SSO / SAML auth',
      'Dedicated account manager',
      'On-premise deployment',
      'Custom scoring models',
      'SLA guarantee',
    ],
    limitations: [],
  },
];

// ============ COMPONENT ============
export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');
  // ============ BILLING INTERVAL TOGGLE ============
  // 'monthly' or 'annual' — controls which price is displayed
  const [billingInterval, setBillingInterval] = useState('monthly');
  const isAnnual = billingInterval === 'annual';

  // ============ HANDLE CHECKOUT ============
  // Creates a Stripe Checkout session and redirects
  const handleCheckout = useCallback(async (planId) => {
    setError('');
    setLoadingPlan(planId);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval: billingInterval }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }, []);

  // ============ RENDER ============
  return (
    <div
      className="min-h-screen py-16 px-4"
      style={{ background: 'linear-gradient(180deg, #0f1117 0%, #1a1d2e 100%)' }}
    >
      {/* ============ HEADER ============ */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <a href="/landing" className="text-[#4a7dff] font-bold text-lg mb-4 inline-block">
          ← Back to DueDrill
        </a>
        <h1 className="text-4xl font-bold text-[#e8e9ed] mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-[#9ca0b0] text-lg">
          Start free. Upgrade when you need AI-powered research, PDF memos, and unlimited companies.
        </p>

        {/* ============ BILLING INTERVAL TOGGLE ============ */}
        {/* Monthly ↔ Annual switch. Annual = 20% off (2 months free) */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-[#e8e9ed]' : 'text-[#6b7084]'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingInterval(isAnnual ? 'monthly' : 'annual')}
            className={
              'relative w-14 h-7 rounded-full transition-all duration-300 cursor-pointer ' +
              (isAnnual ? 'bg-[#34d399]' : 'bg-[#2d3148]')
            }
            aria-label="Toggle annual billing"
          >
            <div
              className={
                'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ' +
                (isAnnual ? 'left-[30px]' : 'left-0.5')
              }
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-[#e8e9ed]' : 'text-[#6b7084]'}`}>
            Annual
          </span>
          {isAnnual && (
            <span className="px-2 py-0.5 bg-[#34d399]/20 text-[#34d399] text-xs font-bold rounded-full">
              Save 20%
            </span>
          )}
        </div>
      </div>

      {/* ============ ERROR DISPLAY ============ */}
      {error && (
        <div className="max-w-3xl mx-auto mb-6 px-4 py-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-center">
          <p className="text-[#ef4444] text-sm">{error}</p>
        </div>
      )}

      {/* ============ PRICING CARDS ============ */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={
              'relative rounded-xl p-6 flex flex-col ' +
              (tier.highlighted
                ? 'bg-[#1e2130] border-2 border-[#4a7dff] shadow-xl shadow-[#4a7dff]/10'
                : 'bg-[#1e2130] border border-[#2d3148]')
            }
          >
            {/* Popular badge */}
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#4a7dff] text-white text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
            )}

            {/* Plan name */}
            <h3 className="text-[#e8e9ed] text-lg font-bold mb-1">{tier.name}</h3>
            <p className="text-[#6b7084] text-xs mb-4">{tier.description}</p>

            {/* Price — dynamically switches between monthly and annual */}
            <div className="mb-6">
              {tier.monthlyPrice === null ? (
                // Enterprise — custom pricing
                <span className="text-[#e8e9ed] text-4xl font-bold">Custom</span>
              ) : tier.monthlyPrice === 0 ? (
                // Free tier
                <>
                  <span className="text-[#e8e9ed] text-4xl font-bold">$0</span>
                  <span className="text-[#6b7084] text-sm ml-1">forever</span>
                </>
              ) : (
                // Paid tiers — show price based on toggle
                <>
                  <span className="text-[#e8e9ed] text-4xl font-bold">
                    ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-[#6b7084] text-sm ml-1">/month</span>
                  {isAnnual && (
                    <div className="mt-1">
                      <span className="text-[#6b7084] text-xs line-through mr-2">
                        ${tier.monthlyPrice}/mo
                      </span>
                      <span className="text-[#34d399] text-xs font-semibold">
                        ${(tier.monthlyPrice - tier.annualPrice) * 12}/yr saved
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CTA Button */}
            {tier.ctaLink ? (
              <a
                href={tier.ctaLink}
                className={
                  'w-full text-center py-3 px-4 rounded-lg font-semibold text-sm ' +
                  'transition-all duration-200 block mb-6 ' +
                  (tier.highlighted
                    ? 'bg-[#4a7dff] text-white hover:bg-[#3d6be6]'
                    : 'bg-[#252836] text-[#e8e9ed] border border-[#2d3148] hover:border-[#4a7dff]')
                }
              >
                {tier.cta}
              </a>
            ) : (
              <button
                onClick={() => handleCheckout(tier.id)}
                disabled={loadingPlan === tier.id}
                className={
                  'w-full py-3 px-4 rounded-lg font-semibold text-sm ' +
                  'transition-all duration-200 cursor-pointer mb-6 ' +
                  (loadingPlan === tier.id
                    ? 'bg-[#4a7dff]/50 text-white/60 cursor-not-allowed'
                    : tier.highlighted
                      ? 'bg-[#4a7dff] text-white hover:bg-[#3d6be6] shadow-lg shadow-[#4a7dff]/20'
                      : 'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886]')
                }
              >
                {loadingPlan === tier.id ? 'Redirecting to Stripe...' : tier.cta}
              </button>
            )}

            {/* Features list */}
            <ul className="space-y-2.5 flex-1">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#34d399] mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-[#9ca0b0]">{feature}</span>
                </li>
              ))}
              {tier.limitations.map((limitation, i) => (
                <li key={`lim-${i}`} className="flex items-start gap-2 text-sm">
                  <span className="text-[#ef4444] mt-0.5 flex-shrink-0">✗</span>
                  <span className="text-[#6b7084]">{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ============ TRUST SIGNALS + LINKS ============ */}
      <div className="max-w-3xl mx-auto mt-16 text-center space-y-4">
        <p className="text-[#6b7084] text-sm">
          All plans include a 14-day money-back guarantee. Cancel anytime.
        </p>
        <p className="text-[#6b7084] text-xs">
          Payments processed securely by Stripe. We never store your card details.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <a href="/faq" className="text-[#4a7dff] text-xs hover:underline">FAQ</a>
          <span className="text-[#2d3148]">|</span>
          <a href="/trust" className="text-[#4a7dff] text-xs hover:underline">Security & Trust</a>
          <span className="text-[#2d3148]">|</span>
          <a href="/terms" className="text-[#4a7dff] text-xs hover:underline">Terms</a>
          <span className="text-[#2d3148]">|</span>
          <a href="/privacy" className="text-[#4a7dff] text-xs hover:underline">Privacy</a>
        </div>
      </div>
    </div>
  );
}
