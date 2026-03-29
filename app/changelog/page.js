// ============================================================================
// app/changelog/page.js — DueDrill Changelog
// ============================================================================
// Server component — no 'use client' directive.
// Reverse-chronological product changelog with tagged entries (New, Improved,
// Fixed). Designed to show momentum and build confidence for prospective users.
// ============================================================================

// ============ PAGE METADATA ============
export const metadata = {
  title: 'Changelog | DueDrill',
  description:
    'See what\'s new in DueDrill — the latest features, improvements, and fixes for AI-powered startup due diligence.',
};

// ============ TAG STYLES ============
const TAG_STYLES = {
  New: { bg: 'bg-[#34d399]/10', border: 'border-[#34d399]/30', text: 'text-[#34d399]' },
  Improved: { bg: 'bg-[#4a7dff]/10', border: 'border-[#4a7dff]/30', text: 'text-[#4a7dff]' },
  Fixed: { bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/30', text: 'text-[#f59e0b]' },
};

// ============ CHANGELOG DATA ============
const CHANGELOG = [
  {
    date: 'March 2026',
    title: 'Launch',
    entries: [
      {
        tag: 'New',
        text: 'AI Auto-Fill engine — one click to research and populate 15 DD sections using real-time web data from your chosen AI provider.',
      },
      {
        tag: 'New',
        text: 'Company verification step — confirm the correct company entity before spending API credits on AI research.',
      },
      {
        tag: 'New',
        text: 'Confidence indicators on all AI-generated data points, showing how certain the model is about each finding.',
      },
      {
        tag: 'New',
        text: '4 AI provider support: Perplexity (web search), Anthropic Claude (deep analysis), OpenAI GPT-4 (general reasoning), and Groq (fast inference).',
      },
      {
        tag: 'New',
        text: 'Goldman Sachs-style PDF investment memos with score matrices, section-by-section analysis, and professional formatting.',
      },
      {
        tag: 'New',
        text: 'Pitch deck upload (PDF/PPTX) with AI cross-check — automatically extracts claims and flags discrepancies against DD findings.',
      },
      {
        tag: 'New',
        text: 'Data integrations: Crunchbase company profiles, Dealroom European startup data, OpenCorporates registry lookups, and PitchBook CSV import.',
      },
      {
        tag: 'New',
        text: 'Deal pipeline with Kanban board — 7 stages from Sourced through IC Review, DD In Progress, Term Sheet, Closing, Portfolio, and Passed.',
      },
      {
        tag: 'New',
        text: 'Custom scoring models — adjust category weights to match your fund\'s investment thesis. Team default: 18%, Product: 14%, Market: 13%.',
      },
      {
        tag: 'New',
        text: 'Reference check tracking — log reference conversations, rate responses, and link them to specific DD sections.',
      },
      {
        tag: 'New',
        text: 'Activity timeline with timestamped notes — track every interaction, status change, and research action per company.',
      },
      {
        tag: 'New',
        text: 'Company comparison view — side-by-side score grids, key metrics, and DD completion status across multiple companies.',
      },
      {
        tag: 'New',
        text: 'Stripe billing with four tiers: Free (1 company, manual only), Solo ($49/mo), Fund ($199/mo), and Enterprise (custom).',
      },
      {
        tag: 'New',
        text: 'Supabase authentication with email/password and Google OAuth. Session-based auth with automatic token refresh.',
      },
      {
        tag: 'New',
        text: 'Security hardening: AES-256-GCM encryption at rest, TLS 1.3 in transit, rate limiting (10 req/min on AI routes), CSP/HSTS/X-Frame-Options headers.',
      },
      {
        tag: 'New',
        text: 'Privacy Policy and Terms of Service — GDPR and CCPA compliant. Full data export and deletion support.',
      },
    ],
  },
];

// ============ COMPONENT ============
export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e8e9ed]">
      {/* ============ TOP NAVIGATION ============ */}
      <nav className="sticky top-0 z-50 bg-[#0f1117]/90 backdrop-blur-md border-b border-[#2d3148]/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/landing" className="flex items-center gap-2 text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Home
          </a>
          <span className="text-[#4a7dff] font-bold text-lg">DueDrill</span>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            <span className="bg-gradient-to-r from-[#4a7dff] to-[#34d399] bg-clip-text text-transparent">
              Changelog
            </span>
          </h1>
          <p className="text-lg text-[#9ca0b0] max-w-2xl mx-auto leading-relaxed">
            Every feature, improvement, and fix shipped to DueDrill. We build in public
            and ship fast — here is the full record.
          </p>
        </div>
      </section>

      {/* ============ CHANGELOG ENTRIES ============ */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {CHANGELOG.map((release, releaseIdx) => (
            <div key={releaseIdx} className="relative">
              {/* ============ RELEASE HEADER ============ */}
              <div className="flex items-center gap-4 mb-6">
                {/* Timeline dot */}
                <div className="w-4 h-4 rounded-full bg-[#4a7dff] border-4 border-[#0f1117] shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-[#e8e9ed]">{release.title}</h2>
                  <p className="text-[#9ca0b0] text-sm">{release.date}</p>
                </div>
              </div>

              {/* ============ ENTRIES LIST ============ */}
              <div className="ml-2 pl-6 border-l-2 border-[#2d3148] space-y-3 pb-10">
                {release.entries.map((entry, entryIdx) => {
                  const style = TAG_STYLES[entry.tag] || TAG_STYLES.New;
                  return (
                    <div
                      key={entryIdx}
                      className="flex items-start gap-3 bg-[#1e2130] border border-[#2d3148] rounded-lg px-5 py-4"
                    >
                      {/* Tag Badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold shrink-0 mt-0.5 border ${style.bg} ${style.border} ${style.text}`}
                      >
                        {entry.tag}
                      </span>
                      {/* Entry Text */}
                      <p className="text-[#9ca0b0] text-sm leading-relaxed">{entry.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SUBSCRIBE CTA ============ */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-[#e8e9ed] mb-3">Stay in the Loop</h2>
            <p className="text-[#9ca0b0] text-sm mb-5 max-w-md mx-auto leading-relaxed">
              Want to know when we ship new features? Follow our updates or reach out with feature requests.
            </p>
            <a
              href="mailto:yuri@grandkruventures.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4a7dff]/10 border border-[#4a7dff]/30 rounded-lg text-[#4a7dff] font-semibold text-sm hover:bg-[#4a7dff]/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Request a Feature
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-8 px-6 border-t border-[#2d3148]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[#4a7dff] font-bold">DueDrill</span>
          <p className="text-[#6b7084] text-xs">
            &copy; {new Date().getFullYear()} DueDrill by Grand Kru Ventures. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Privacy</a>
            <a href="/terms" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Terms</a>
            <a href="mailto:yuri@grandkruventures.com" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
