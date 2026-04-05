'use client';

// ============================================================================
// app/landing/page.js — DueDrill Marketing Landing Page
// ============================================================================
// Public-facing marketing page for the DueDrill platform.
// Designed to convert angel investors, VC fund managers, and family offices.
// Brand: Grand Kru Ventures | Dark theme (#0f1117, #1e2130, #4a7dff, #34d399)
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

// ============ FEATURE DATA ============
const FEATURES = [
  {
    icon: '🔍',
    title: 'AI Auto-Fill',
    desc: 'Enter a company name and let AI research and populate 214 data fields across 16 due diligence sections automatically. Choose from Perplexity, Claude, GPT-4, or Groq for each query.',
  },
  {
    icon: '⚖️',
    title: 'Weighted Scoring',
    desc: '12 scored categories with fully customizable weights. Team at 18%, Product at 14%, Market at 13% — calibrate the model to match your fund thesis and stage focus.',
  },
  {
    icon: '📄',
    title: 'Investment Memos',
    desc: 'Generate Goldman-style PDF investment memos with one click. Section-by-section analysis, score matrices, risk flags, and deal terms — ready for your IC or LP meeting.',
  },
  {
    icon: '📊',
    title: 'Deck Cross-Check',
    desc: 'Upload a pitch deck and verify founder claims against live web data. Revenue figures, team backgrounds, market sizing, competitive landscape — every claim fact-checked by AI.',
  },
  {
    icon: '🏢',
    title: 'Pipeline Management',
    desc: 'Kanban board with customizable deal stages. Track unlimited companies through your pipeline with persistent data, completion tracking, and side-by-side comparison views.',
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    desc: 'Share deal rooms with partners and associates. Assign sections, leave comments, track who reviewed what. Cloud sync keeps everyone on the same page in real time.',
  },
];

// ============ TESTIMONIAL DATA ============
// Placeholder quotes from realistic VC personas — replace with real testimonials
const TESTIMONIALS = [
  {
    quote: 'We used to spend 3 weeks per deal on diligence. DueDrill gets us to an IC-ready memo in 2 days. The AI auto-fill alone saved our associate team 400+ hours last quarter.',
    name: 'Sarah Chen',
    role: 'Managing Partner, Series A Fund — NYC',
    note: '[Placeholder — replace with real testimonial]',
  },
  {
    quote: 'The weighted scoring engine gives our investment committee exactly what they need — a consistent, data-driven framework that removes bias and forces rigor on every deal.',
    name: 'David Aronson',
    role: 'General Partner, Seed Fund — San Francisco',
    note: '[Placeholder — replace with real testimonial]',
  },
  {
    quote: 'As a family office evaluating 50+ deals a year, we needed a system that scales. DueDrill turned our DD process from an art into a repeatable science. The PDF memos are LP-ready.',
    name: 'Michael Torres',
    role: 'CIO, Multi-Family Office — Miami',
    note: '[Placeholder — replace with real testimonial]',
  },
];

// ============ HOW IT WORKS DATA ============
const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Enter a Company Name',
    desc: 'Type any startup name and DueDrill\'s AI verifies the company identity, pulls basic firmographics, and creates a full DD workspace with 16 sections and 214 data fields ready to populate.',
    color: '#4a7dff',
  },
  {
    step: '02',
    title: 'AI Researches Everything',
    desc: 'Hit "Auto-Research" and watch AI fill in team backgrounds, product analysis, market sizing, traction metrics, financials, competitive landscape, IP, regulatory, and more — across all 16 categories simultaneously.',
    color: '#a78bfa',
  },
  {
    step: '03',
    title: 'Score, Export, Decide',
    desc: 'Review the AI findings, adjust scores across 12 weighted dimensions, generate a print-ready investment memo PDF, and make your investment decision with full conviction.',
    color: '#34d399',
  },
];

// ============ COMPONENT ============
export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | success | error
  const [submitError, setSubmitError] = useState('');

  // ============ COOKIE CONSENT STATE ============
  // Shows a fixed banner at the bottom of the page on first visit.
  // Checks localStorage for 'duedrill_cookie_consent' to determine visibility.
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    // Only show banner if user hasn't already made a choice
    const consent = localStorage.getItem('duedrill_cookie_consent');
    if (!consent) {
      setShowCookieBanner(true);
    }
  }, []);

  // ============ COOKIE CONSENT HANDLERS ============
  const handleCookieAccept = useCallback(() => {
    localStorage.setItem('duedrill_cookie_consent', 'accepted');
    setShowCookieBanner(false);
  }, []);

  const handleCookieDecline = useCallback(() => {
    localStorage.setItem('duedrill_cookie_consent', 'declined');
    setShowCookieBanner(false);
  }, []);

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
            <span className="text-[#4a7dff] font-bold text-xl">DueDrill</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors hidden sm:block">Features</a>
            <a href="#how-it-works" className="text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors hidden sm:block">How It Works</a>
            <a href="/pricing" className="text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors hidden sm:block">Pricing</a>
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
            <span className="text-[#9ca0b0] text-xs font-medium">AI-Powered Due Diligence for VCs, Angels &amp; Family Offices</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            <span className="text-[#e8e9ed]">Research Any Startup</span>
            <br />
            <span className="bg-gradient-to-r from-[#4a7dff] to-[#a78bfa] bg-clip-text text-transparent">
              in 60 Seconds
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[#9ca0b0] max-w-2xl mx-auto mb-10 leading-relaxed">
            16 due diligence categories. 214 data fields. 4 AI providers.
            DueDrill auto-fills your entire DD workbook, scores every deal with weighted
            precision, and exports IC-ready investment memos — so you can move from
            deal source to investment decision in hours, not weeks.
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
              href="#demo"
              className="px-8 py-3.5 bg-transparent text-[#9ca0b0] font-semibold rounded-xl text-base border border-[#2d3148] hover:border-[#4a7dff] hover:text-[#e8e9ed] transition-all"
            >
              Watch Demo
            </a>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { num: '16', label: 'DD Categories' },
              { num: '214', label: 'Data Fields' },
              { num: '4', label: 'AI Providers' },
              { num: '60s', label: 'Research Time' },
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
              diligence process faster, deeper, and more consistent across every deal.
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
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              From Deal Source to Investment Memo in{' '}
              <span className="text-[#34d399]">3 Steps</span>
            </h2>
            <p className="text-[#9ca0b0] text-base max-w-xl mx-auto">
              No onboarding calls. No data entry. Just enter a company name and let AI do the heavy lifting.
            </p>
          </div>

          <div className="space-y-8">
            {HOW_IT_WORKS.map((item, i) => (
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

      {/* ============ SOCIAL PROOF / TESTIMONIALS ============ */}
      <section className="py-20 px-6 bg-[#1a1d27]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Trusted by <span className="text-[#4a7dff]">Smart Money</span>
            </h2>
            <p className="text-[#9ca0b0] text-sm">
              What investors are saying about DueDrill
            </p>
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
                  {t.note && <p className="text-[#4a7dff]/40 text-[10px] mt-1">{t.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING CTA SECTION ============ */}
      {/* Links to dedicated /pricing page to avoid content duplication */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Simple, Transparent <span className="text-[#4a7dff]">Pricing</span>
          </h2>
          <p className="text-[#9ca0b0] text-base max-w-xl mx-auto mb-8">
            Plans for solo angels, VC funds, and enterprise. Start free, upgrade when you need more, cancel anytime.
          </p>
          <a
            href="/pricing"
            className="inline-block px-8 py-3.5 bg-[#4a7dff] text-white font-bold rounded-xl text-base hover:bg-[#3d6be6] transition-all shadow-lg shadow-[#4a7dff]/25 hover:shadow-[#4a7dff]/40"
          >
            View Pricing Plans
          </a>
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
            <span className="text-[#4a7dff] font-bold">DueDrill</span>
          </div>
          <p className="text-[#6b7084] text-xs">
            &copy; {new Date().getFullYear()} DueDrill by Grand Kru Ventures. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a href="/trust" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Security</a>
            <a href="/faq" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">FAQ</a>
            <a href="/changelog" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Changelog</a>
            <a href="/privacy" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Privacy</a>
            <a href="/terms" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Terms</a>
            <a href="mailto:yuri@grandkruventures.com" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* ============ COOKIE CONSENT BANNER ============ */}
      {/* Fixed to bottom of screen. Shows only on first visit (no localStorage flag). */}
      {/* Sets 'duedrill_cookie_consent' in localStorage on accept/decline. */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1e2130] border-t border-[#2d3148] shadow-2xl shadow-black/50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Banner text with link to privacy policy */}
            <p className="text-[#9ca0b0] text-sm text-center sm:text-left">
              We use essential cookies to keep you signed in and provide the service.
              No tracking or advertising cookies. See our{' '}
              <a href="/privacy" className="text-[#4a7dff] hover:underline">Privacy Policy</a>.
            </p>

            {/* Accept / Decline buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleCookieDecline}
                className="px-4 py-2 text-[#9ca0b0] text-sm font-medium rounded-lg border border-[#2d3148] hover:border-[#4a7dff] hover:text-[#e8e9ed] transition-all cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={handleCookieAccept}
                className="px-4 py-2 bg-[#4a7dff] text-white text-sm font-semibold rounded-lg hover:bg-[#3d6be6] transition-colors cursor-pointer"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
