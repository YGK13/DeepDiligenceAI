'use client';

// ============================================================================
// app/landing/page.js — DeepDiligence AI Marketing Landing Page
// ============================================================================
// Public-facing marketing page for the DeepDiligence AI platform.
// Designed to convert visitors into users/customers.
// ============================================================================

import { useState, useCallback } from 'react';

// ============ FEATURE DATA ============
const FEATURES = [
  {
    icon: '🔍',
    title: 'AI-Powered Research',
    desc: 'One-click deep research on any company using Perplexity, Claude, GPT-4, or Groq. Get instant analysis of team, market, product, financials, and more.',
  },
  {
    icon: '📊',
    title: '16 DD Categories',
    desc: 'Comprehensive framework covering Team, Product, Market, Business Model, Traction, Financial, Competitive, IP, Customers, Investors, Regulatory, Legal, Israel-specific, Risks, and Deal Terms.',
  },
  {
    icon: '⚖️',
    title: 'Weighted Scoring',
    desc: 'Proprietary scoring engine with customizable weights. Team at 18%, Product at 14%, Market at 13% — because great teams matter most in early-stage VC.',
  },
  {
    icon: '📄',
    title: 'Investment Memo Reports',
    desc: 'Generate Goldman Sachs-quality investment memos with one click. Print-ready, professional formatting with score matrices and section-by-section analysis.',
  },
  {
    icon: '🏢',
    title: 'Multi-Company Portfolio',
    desc: 'Track unlimited companies through your pipeline. Switch between deals instantly with persistent data, completion tracking, and side-by-side comparison.',
  },
  {
    icon: '🇮🇱',
    title: 'Israel-Specific DD',
    desc: 'Built-in support for Israeli startup diligence: dual-entity structures, IIA grants, Section 102 options, transfer pricing, US market entry strategy.',
  },
];

// ============ PRICING DATA ============
const PRICING = [
  {
    name: 'Solo Investor',
    price: '$49',
    period: '/month',
    desc: 'For individual angel investors and scouts',
    features: [
      'Up to 10 active companies',
      '4 AI providers (Perplexity, Claude, GPT-4, Groq)',
      'Full 16-section DD framework',
      'Investment memo generation',
      'JSON data export/import',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Fund',
    price: '$199',
    period: '/month',
    desc: 'For VC funds and family offices',
    features: [
      'Unlimited companies',
      'All AI providers + priority API',
      'Team collaboration (5 seats)',
      'Custom scoring weights',
      'Supabase cloud sync',
      'White-label reports',
      'Priority support',
      'API access',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large funds and institutions',
    features: [
      'Everything in Fund',
      'Unlimited seats',
      'SSO / SAML authentication',
      'Custom DD frameworks',
      'CRM integrations (Salesforce, HubSpot)',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise deployment option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

// ============ TESTIMONIAL DATA ============
const TESTIMONIALS = [
  {
    quote: 'DeepDiligence AI cut our DD process from 3 weeks to 3 days. The AI research feature alone is worth 10x the price.',
    name: 'Managing Partner',
    role: 'Series A Fund, NYC',
  },
  {
    quote: 'Finally, a tool built by someone who actually understands VC due diligence. The Israel section is a game-changer for cross-border deals.',
    name: 'Principal',
    role: 'Growth Equity Fund, Tel Aviv',
  },
  {
    quote: 'The scoring engine gives our IC exactly what they need — a data-driven framework that removes bias from investment decisions.',
    name: 'Partner',
    role: 'Seed Fund, San Francisco',
  },
];

// ============ COMPONENT ============
export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | success | error
  const [submitError, setSubmitError] = useState('');

  // ============ WAITLIST SUBMIT HANDLER ============
  const handleWaitlistSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitState('loading');
    setSubmitError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Submission failed');
      }

      setSubmitState('success');
      setEmail('');
    } catch (err) {
      setSubmitState('error');
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    }
  }, [email]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e8e9ed]">
      {/* ============ NAV BAR ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1117]/90 backdrop-blur-md border-b border-[#2d3148]/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#4a7dff] font-bold text-xl">DeepDiligence</span>
            <span className="text-[#6b7084] font-light text-xl">AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors hidden sm:block">Pricing</a>
            <a
              href="/"
              className="px-4 py-2 bg-[#4a7dff] text-white text-sm font-semibold rounded-lg hover:bg-[#3d6be6] transition-colors"
            >
              Launch App
            </a>
          </div>
        </div>
      </nav>

      {/* ============ HERO SECTION ============ */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4a7dff]/10 border border-[#4a7dff]/30 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[#9ca0b0] text-xs font-medium">AI-Powered Due Diligence Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            <span className="text-[#e8e9ed]">Startup Due Diligence,</span>
            <br />
            <span className="bg-gradient-to-r from-[#4a7dff] to-[#a78bfa] bg-clip-text text-transparent">
              Supercharged by AI
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[#9ca0b0] max-w-2xl mx-auto mb-10 leading-relaxed">
            The only due diligence platform built for VC investors who want comprehensive,
            data-driven analysis in hours — not weeks.
            16 DD categories. 4 AI providers. One powerful dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="/"
              className="px-8 py-3.5 bg-[#4a7dff] text-white font-bold rounded-xl text-base hover:bg-[#3d6be6] transition-all shadow-lg shadow-[#4a7dff]/25 hover:shadow-[#4a7dff]/40"
            >
              Start Free — No Card Required
            </a>
            <a
              href="#features"
              className="px-8 py-3.5 bg-transparent text-[#9ca0b0] font-semibold rounded-xl text-base border border-[#2d3148] hover:border-[#4a7dff] hover:text-[#e8e9ed] transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { num: '16', label: 'DD Categories' },
              { num: '4', label: 'AI Providers' },
              { num: '214', label: 'Data Points' },
              { num: '12', label: 'Scored Dimensions' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-[#4a7dff]">{stat.num}</div>
                <div className="text-[#6b7084] text-xs font-medium mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section id="features" className="py-20 px-6 bg-[#1a1d27]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Everything You Need for{' '}
              <span className="text-[#4a7dff]">World-Class DD</span>
            </h2>
            <p className="text-[#9ca0b0] text-base max-w-xl mx-auto">
              Built by investors, for investors. Every feature designed to make your
              diligence process faster, deeper, and more consistent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 hover:border-[#4a7dff]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#4a7dff]/5"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-[#e8e9ed] font-bold text-base mb-2">{f.title}</h3>
                <p className="text-[#9ca0b0] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              From Deal Source to Investment Memo in{' '}
              <span className="text-[#34d399]">3 Steps</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Add a Company',
                desc: 'Enter the company name and basic details. The platform creates a comprehensive DD workspace with 16 pre-structured sections and 214 data points ready to fill.',
                color: '#4a7dff',
              },
              {
                step: '02',
                title: 'Run AI Research',
                desc: 'Click "Auto-Research" on any section. Choose from Perplexity (real-time web search), Claude (deep analysis), GPT-4, or Groq (speed). Get instant, structured findings.',
                color: '#a78bfa',
              },
              {
                step: '03',
                title: 'Score, Decide, Report',
                desc: 'Rate each category 0-10, review the weighted overall score, and generate a print-ready investment memo. Share with your IC or LP with confidence.',
                color: '#34d399',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-6 items-start bg-[#1e2130] border border-[#2d3148] rounded-xl p-6"
              >
                <div
                  className="text-3xl font-extrabold shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ color: item.color, backgroundColor: `${item.color}15` }}
                >
                  {item.step}
                </div>
                <div>
                  <h3 className="text-[#e8e9ed] font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-[#9ca0b0] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 px-6 bg-[#1a1d27]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Trusted by <span className="text-[#4a7dff]">Smart Money</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6"
              >
                <p className="text-[#9ca0b0] text-sm leading-relaxed mb-4 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-[#2d3148] pt-3">
                  <p className="text-[#e8e9ed] text-sm font-semibold">{t.name}</p>
                  <p className="text-[#6b7084] text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Simple, Transparent <span className="text-[#4a7dff]">Pricing</span>
            </h2>
            <p className="text-[#9ca0b0] text-base max-w-xl mx-auto">
              Start free. Upgrade when you need more. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan, i) => (
              <div
                key={i}
                className={
                  'rounded-xl p-6 flex flex-col ' +
                  (plan.highlighted
                    ? 'bg-[#1e2130] border-2 border-[#4a7dff] shadow-lg shadow-[#4a7dff]/10 relative'
                    : 'bg-[#1e2130] border border-[#2d3148]')
                }
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#4a7dff] text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-[#e8e9ed] font-bold text-lg mb-1">{plan.name}</h3>
                <p className="text-[#6b7084] text-xs mb-4">{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-[#e8e9ed]">{plan.price}</span>
                  {plan.period && <span className="text-[#6b7084] text-sm">{plan.period}</span>}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#9ca0b0]">
                      <span className="text-[#34d399] mt-0.5 shrink-0">&#10003;</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  className={
                    'w-full py-3 rounded-lg font-semibold text-sm transition-all ' +
                    (plan.highlighted
                      ? 'bg-[#4a7dff] text-white hover:bg-[#3d6be6]'
                      : 'bg-[#252836] text-[#e8e9ed] border border-[#2d3148] hover:border-[#4a7dff]')
                  }
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA / EMAIL CAPTURE ============ */}
      <section className="py-20 px-6 bg-[#1a1d27]/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Ready to Transform Your{' '}
            <span className="text-[#4a7dff]">DD Process</span>?
          </h2>
          <p className="text-[#9ca0b0] text-base mb-8">
            Join the waitlist for early access and a 30-day free trial.
          </p>

          {submitState === 'success' ? (
            <div className="px-6 py-4 bg-[#34d399]/10 border border-[#34d399]/30 rounded-xl max-w-md mx-auto">
              <p className="text-[#34d399] font-semibold text-sm">
                You&apos;re on the list! We&apos;ll notify you when early access opens.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 bg-[#252836] border border-[#2d3148] rounded-lg text-[#e8e9ed] text-sm placeholder:text-[#6b7084] focus:border-[#4a7dff] outline-none"
              />
              <button
                type="submit"
                disabled={submitState === 'loading'}
                className={
                  'px-6 py-3 font-bold rounded-lg transition-colors whitespace-nowrap text-sm ' +
                  (submitState === 'loading'
                    ? 'bg-[#4a7dff]/50 text-white/70 cursor-not-allowed'
                    : 'bg-[#4a7dff] text-white hover:bg-[#3d6be6] cursor-pointer')
                }
              >
                {submitState === 'loading' ? 'Joining...' : 'Get Early Access'}
              </button>
            </form>
          )}
          {submitState === 'error' && (
            <p className="text-[#ef4444] text-xs mt-2">{submitError}</p>
          )}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-10 px-6 border-t border-[#2d3148]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#4a7dff] font-bold">DeepDiligence</span>
            <span className="text-[#6b7084] font-light">AI</span>
          </div>
          <p className="text-[#6b7084] text-xs">
            &copy; {new Date().getFullYear()} DeepDiligence AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Privacy</a>
            <a href="#" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Terms</a>
            <a href="#" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
