// ============================================================================
// app/faq/page.js — DueDrill FAQ Page
// ============================================================================
// Server component — no 'use client' directive.
// Accordion-style FAQ using native HTML <details>/<summary> elements for
// zero-JS interactivity. Covers Getting Started, Data & Security, Billing,
// Integrations, and Features categories.
// ============================================================================

// ============ PAGE METADATA ============
export const metadata = {
  title: 'FAQ | DueDrill',
  description:
    'Frequently asked questions about DueDrill — AI-powered due diligence, pricing, security, integrations, and features for VC investors.',
};

// ============ FAQ DATA ============
const FAQ_CATEGORIES = [
  {
    category: 'Getting Started',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    questions: [
      {
        q: 'What is DueDrill?',
        a: 'DueDrill is an AI-powered due diligence platform built for venture capital investors. It provides a comprehensive 16-section DD framework covering Team, Product, Market, Business Model, Traction, Financial Performance, Competitive Landscape, IP & Technology, Customer Analysis, Investor History, Regulatory & Compliance, Legal, Israel-Specific DD, Risks & Mitigants, Deal Terms, and ESG. With one click, AI auto-fills sections by researching real web data — so you get structured analysis in minutes instead of weeks.',
      },
      {
        q: 'How does AI auto-fill work?',
        a: 'When you click "Auto-Research" on any DD section, DueDrill sends a targeted research query to your chosen AI provider — Perplexity (real-time web search), Anthropic Claude (deep analysis), OpenAI GPT-4 (general reasoning), or Groq (fast inference). The AI searches the web for current information about the company, then returns structured JSON that maps directly into your DD fields. You review, edit, and confirm every data point before it saves.',
      },
      {
        q: 'How accurate is the AI data?',
        a: 'Every AI-generated data point includes a confidence indicator so you can see how certain the model is about each finding. We strongly recommend treating AI-filled data as a research starting point — not a final answer. Cross-check critical claims against the company\'s pitch deck (which you can upload for automated cross-referencing), investor updates, and direct founder conversations. The platform is designed to accelerate your process, not replace your judgment.',
      },
      {
        q: 'Can I use my own AI API keys?',
        a: 'Yes. Navigate to Settings and enter your API keys for any supported provider (Perplexity, Anthropic, OpenAI, Groq). Your keys are encrypted at rest using AES-256 and are never logged, exposed in client-side code, or shared with other users. Using your own keys gives you full control over costs and rate limits.',
      },
    ],
  },
  {
    category: 'Data & Security',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    questions: [
      {
        q: 'Is my data secure?',
        a: 'Yes. All data is encrypted at rest with AES-256-GCM and in transit with TLS 1.3. The application is hosted on Vercel (SOC 2 Type 2 certified) with a Supabase database (also SOC 2 Type 2 certified) running on AWS infrastructure. Row-level security policies ensure data isolation at the database level. See our Trust & Security page for full details.',
      },
      {
        q: 'Who can see my data?',
        a: 'Only you. Supabase row-level security (RLS) policies enforce that every database query is scoped to your authenticated user ID. There is no shared data space between accounts. Our team does not access customer deal data unless you explicitly request support assistance.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes. You can export all your company data and settings as JSON at any time from the Settings page. You can also generate Goldman Sachs-style PDF investment memos for individual companies with full section-by-section analysis and score matrices.',
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes. You can delete individual companies (and all associated DD data, scores, and notes) from the dashboard. You can also delete your entire account and all associated data. Deletions are permanent and processed immediately.',
      },
    ],
  },
  {
    category: 'Billing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    questions: [
      {
        q: "What's the difference between plans?",
        a: 'Free: 1 company, manual data entry only — perfect for evaluating the platform. Solo ($49/month): Up to 10 active companies, AI auto-fill with all 4 providers, PDF investment memo generation, JSON data export, and email support. Fund ($199/month): Unlimited companies, team collaboration (5 seats), pitch deck upload with AI cross-check, custom scoring models, white-label reports, priority support, and API access. Enterprise: Custom pricing for large funds — unlimited seats, SSO/SAML, custom DD frameworks, CRM integrations, dedicated account manager, and SLA guarantee.',
      },
      {
        q: 'Do you offer refunds?',
        a: 'Yes. We offer a 14-day money-back guarantee on all paid plans. If DueDrill does not meet your expectations within the first 14 days, contact support@duedrill.com for a full refund — no questions asked.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel your subscription at any time through the Stripe customer portal accessible from your Settings page. There are no cancellation fees, lock-in periods, or hidden charges. Your access continues until the end of your current billing period.',
      },
      {
        q: 'Do you offer annual pricing?',
        a: 'Yes. Save 20% with annual billing. Solo drops to $39/month (billed $468/year) and Fund drops to $159/month (billed $1,908/year). Switch to annual billing from your Settings page at any time.',
      },
    ],
  },
  {
    category: 'Integrations',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.686-3.898a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.192 8.41" />
      </svg>
    ),
    questions: [
      {
        q: 'What data sources do you integrate with?',
        a: 'DueDrill integrates with Crunchbase (company profiles, funding history), Dealroom (European startup data), OpenCorporates (corporate registry lookups), and supports PitchBook CSV import for bulk data ingestion. AI research providers (Perplexity, Anthropic, OpenAI, Groq) pull from the live web for the most current information.',
      },
      {
        q: 'Can I upload pitch decks?',
        a: 'Yes. Upload PDF or PPTX pitch decks directly to any company profile. DueDrill\'s AI extracts key claims (revenue figures, growth metrics, market size estimates, team credentials) and cross-checks them against your DD findings, flagging discrepancies automatically.',
      },
      {
        q: 'Do you integrate with my CRM?',
        a: 'CRM integrations are on our near-term roadmap. We are building connectors for Affinity (VC-native CRM), DealCloud (institutional dealflow), and Salesforce. If your fund uses a different CRM, contact us — we prioritize integrations based on customer demand.',
      },
    ],
  },
  {
    category: 'Features',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    questions: [
      {
        q: 'What DD sections are covered?',
        a: 'DueDrill covers 16 comprehensive due diligence sections: (1) Team & Leadership, (2) Product & Technology, (3) Market Opportunity, (4) Business Model, (5) Traction & Metrics, (6) Financial Performance, (7) Competitive Landscape, (8) IP & Technology, (9) Customer Analysis, (10) Investor History & Cap Table, (11) Regulatory & Compliance, (12) Legal Structure, (13) Israel-Specific DD, (14) Risks & Mitigants, (15) Deal Terms & Valuation, and (16) ESG & Impact. Each section contains structured fields with guided prompts.',
      },
      {
        q: 'How does scoring work?',
        a: 'Each company is scored across 12 weighted categories on a 0-10 scale. The overall score is a weighted average where Team carries the heaviest weight at 18%, followed by Product (14%), Market (13%), Traction (12%), Business Model (10%), Financials (9%), Competitive Position (7%), IP (5%), Customers (4%), Legal/Regulatory (4%), ESG (2%), and Deal Terms (2%). This weighting reflects early-stage VC priorities where team quality is the strongest predictor of success.',
      },
      {
        q: 'Can I create custom scoring models?',
        a: 'Yes. Fund and Enterprise plan users can adjust the weight of every scoring category to match their fund\'s investment thesis. If your fund prioritizes market size over team, or weights IP heavily for deep-tech deals, you can customize the model accordingly. Custom weights are saved per user and applied across all companies.',
      },
      {
        q: 'Can I compare companies side-by-side?',
        a: 'Yes. The comparison view lets you select multiple companies and see their scores, key metrics, and DD completion status in a grid layout. Compare overall scores, category-level breakdowns, and specific data points to make informed portfolio decisions.',
      },
    ],
  },
];

// ============ COMPONENT ============
export default function FAQPage() {
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
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-[#4a7dff] to-[#a78bfa] bg-clip-text text-transparent">
              Questions
            </span>
          </h1>
          <p className="text-lg text-[#9ca0b0] max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about DueDrill — from getting started with AI-powered
            research to billing, security, and advanced features.
          </p>
        </div>
      </section>

      {/* ============ FAQ SECTIONS ============ */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
          {FAQ_CATEGORIES.map((cat, catIdx) => (
            <div key={catIdx}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="text-[#4a7dff]">{cat.icon}</div>
                <h2 className="text-lg font-bold text-[#e8e9ed]">{cat.category}</h2>
              </div>

              {/* Accordion Items */}
              <div className="space-y-3">
                {cat.questions.map((faq, faqIdx) => (
                  <details
                    key={faqIdx}
                    className="group bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none select-none hover:bg-[#252836] transition-colors">
                      <span className="text-[#e8e9ed] text-sm font-semibold">{faq.q}</span>
                      {/* Chevron rotates on open */}
                      <svg
                        className="w-4 h-4 text-[#9ca0b0] shrink-0 transition-transform group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-5 pt-1">
                      <p className="text-[#9ca0b0] text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-[#e8e9ed] mb-3">Still Have Questions?</h2>
            <p className="text-[#9ca0b0] text-sm mb-5 max-w-md mx-auto leading-relaxed">
              Our team is happy to help. Reach out and we will get back to you within one business day.
            </p>
            <a
              href="mailto:support@duedrill.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4a7dff]/10 border border-[#4a7dff]/30 rounded-lg text-[#4a7dff] font-semibold text-sm hover:bg-[#4a7dff]/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              support@duedrill.com
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
