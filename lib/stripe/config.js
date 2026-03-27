// ============================================================================
// lib/stripe/config.js — Stripe Configuration & Plan Definitions
// ============================================================================
// Central config for Stripe pricing plans. Used by both the checkout API
// and the pricing UI. Change prices here → updates everywhere.
//
// SETUP: Create these products + prices in Stripe Dashboard first,
// then paste the price IDs below. Or use the Stripe CLI:
//   stripe products create --name="DueDrill Solo"
//   stripe prices create --product=prod_xxx --unit-amount=4900 --currency=usd --recurring[interval]=month
// ============================================================================

// ============ PLAN DEFINITIONS ============
// Each plan maps to a Stripe Price ID. The free tier has no price ID.
export const PLANS = {
  free: {
    name: 'Free',
    description: 'Try DueDrill with limited features',
    price: 0,
    interval: 'month',
    priceId: null, // No Stripe checkout needed
    features: [
      '1 company',
      'Manual data entry only',
      'Basic scoring',
      'No AI auto-fill',
      'No PDF export',
    ],
    limits: {
      maxCompanies: 1,
      aiAutoFill: false,
      pdfExport: false,
      comparison: false,
    },
  },
  solo: {
    name: 'Solo Investor',
    description: 'For individual angels and scouts',
    monthlyPrice: 49,
    annualPrice: 39, // ~20% off ($468/yr vs $588/yr)
    // REPLACE with your actual Stripe Price IDs after creating the products
    // You need TWO prices per product: one monthly, one annual
    priceId: {
      monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || 'price_solo_monthly_placeholder',
      annual: process.env.STRIPE_PRICE_SOLO_ANNUAL || 'price_solo_annual_placeholder',
    },
    features: [
      '10 companies',
      'AI auto-fill (all providers)',
      'PDF investment memos',
      'Side-by-side comparison',
      'Email support',
    ],
    limits: {
      maxCompanies: 10,
      aiAutoFill: true,
      pdfExport: true,
      comparison: true,
    },
  },
  fund: {
    name: 'Fund',
    description: 'For VC funds and family offices',
    monthlyPrice: 199,
    annualPrice: 159, // ~20% off ($1,908/yr vs $2,388/yr)
    // REPLACE with your actual Stripe Price IDs
    priceId: {
      monthly: process.env.STRIPE_PRICE_FUND_MONTHLY || 'price_fund_monthly_placeholder',
      annual: process.env.STRIPE_PRICE_FUND_ANNUAL || 'price_fund_annual_placeholder',
    },
    features: [
      'Unlimited companies',
      'AI auto-fill (all providers)',
      'PDF investment memos',
      'Side-by-side comparison',
      'Deck upload & analysis',
      'People verification',
      'Priority support',
      'Team access (coming soon)',
    ],
    limits: {
      maxCompanies: Infinity,
      aiAutoFill: true,
      pdfExport: true,
      comparison: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Custom deployment for large funds',
    price: null, // Custom pricing
    interval: 'month',
    priceId: null, // Contact sales
    features: [
      'Everything in Fund',
      'Custom integrations',
      'SSO / SAML',
      'Dedicated support',
      'On-premise option',
      'Custom scoring models',
    ],
    limits: {
      maxCompanies: Infinity,
      aiAutoFill: true,
      pdfExport: true,
      comparison: true,
    },
  },
};

// ============ HELPER: Get plan by price ID ============
// Now handles both old single-string and new { monthly, annual } formats
export function getPlanByPriceId(priceId) {
  return Object.values(PLANS).find((p) => {
    if (!p.priceId) return false;
    if (typeof p.priceId === 'string') return p.priceId === priceId;
    // New format: { monthly: '...', annual: '...' }
    return p.priceId.monthly === priceId || p.priceId.annual === priceId;
  }) || PLANS.free;
}

// ============ HELPER: Get plan by name ============
export function getPlanByName(name) {
  return PLANS[name] || PLANS.free;
}
