// ============================================================================
// app/trust/page.js — DueDrill Trust & Security Page
// ============================================================================
// Server component — no 'use client' directive.
// Communicates DueDrill's security posture, data handling practices,
// compliance status, and responsible AI policies to VC investors who need
// assurance before entering sensitive deal data.
// ============================================================================

// ============ PAGE METADATA ============
export const metadata = {
  title: 'Trust & Security | DueDrill',
  description:
    'Learn how DueDrill protects your deal data with AES-256 encryption, SOC 2 certified infrastructure, GDPR/CCPA compliance, and responsible AI practices.',
};

// ============ SECURITY SECTIONS DATA ============
const SECTIONS = [
  {
    id: 'encryption',
    icon: (
      <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Data Encryption',
    items: [
      {
        label: 'At Rest',
        detail: 'AES-256-GCM encryption for all stored data, including company records, scores, notes, and uploaded documents.',
      },
      {
        label: 'In Transit',
        detail: 'TLS 1.3 enforced on every connection. All API calls, webhooks, and file transfers are encrypted end-to-end.',
      },
      {
        label: 'Per-User Isolation',
        detail: 'Each user\'s data is cryptographically isolated. There is no shared data space between accounts.',
      },
    ],
  },
  {
    id: 'infrastructure',
    icon: (
      <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: 'Infrastructure',
    items: [
      {
        label: 'Vercel',
        detail: 'Application hosted on Vercel\'s edge network. SOC 2 Type 2 certified. Automatic DDoS protection and global CDN.',
      },
      {
        label: 'Supabase',
        detail: 'Database and authentication powered by Supabase. SOC 2 Type 2 certified. Built on top of AWS with managed backups.',
      },
      {
        label: 'AWS',
        detail: 'Underlying cloud infrastructure runs on Amazon Web Services, with data stored in US-based regions with enterprise-grade physical security.',
      },
    ],
  },
  {
    id: 'access-control',
    icon: (
      <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    title: 'Access Control',
    items: [
      {
        label: 'Row-Level Security',
        detail: 'Supabase RLS policies enforce that every database query is scoped to the authenticated user. No user can access another user\'s data at the database level.',
      },
      {
        label: 'Session-Based Auth',
        detail: 'Secure session tokens with automatic expiration. Support for Google OAuth via Supabase Auth with PKCE flow.',
      },
      {
        label: 'API Key Encryption',
        detail: 'Your AI provider API keys (OpenAI, Anthropic, etc.) are encrypted at rest and never logged or exposed in client-side code.',
      },
    ],
  },
  {
    id: 'api-security',
    icon: (
      <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'API Security',
    items: [
      {
        label: 'Rate Limiting',
        detail: '10 requests per minute on AI research routes to prevent abuse and runaway API costs. Generous limits for standard CRUD operations.',
      },
      {
        label: 'Input Sanitization',
        detail: 'All user inputs are validated and sanitized server-side before processing. Parameterized queries prevent SQL injection.',
      },
      {
        label: 'CSRF Protection',
        detail: 'Cross-site request forgery tokens on all state-changing operations. SameSite cookie attributes enforced.',
      },
      {
        label: 'Security Headers',
        detail: 'Content-Security-Policy, Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers on all responses.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: (
      <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
    title: 'Privacy',
    items: [
      {
        label: 'GDPR Compliant',
        detail: 'Full compliance with the EU General Data Protection Regulation. Lawful basis for processing, data minimization, and right to erasure.',
      },
      {
        label: 'CCPA Compliant',
        detail: 'Compliance with the California Consumer Privacy Act. Right to know, right to delete, and right to opt-out of data sale.',
      },
      {
        label: 'No Data Selling',
        detail: 'We never sell, rent, or share your data with third parties for marketing or advertising purposes. Period.',
      },
      {
        label: 'You Own Your Data',
        detail: 'All data you enter into DueDrill belongs to you. Export everything as JSON or PDF at any time.',
      },
      {
        label: 'Delete Anytime',
        detail: 'Delete individual companies, specific data points, or your entire account and all associated data with one action.',
      },
    ],
  },
];

// ============ COMPLIANCE BADGES ============
const BADGES = [
  { label: 'SOC 2 Type 2 In Progress', color: '#4a7dff', bg: '#4a7dff' },
  { label: 'GDPR Ready', color: '#34d399', bg: '#34d399' },
  { label: 'CCPA Compliant', color: '#34d399', bg: '#34d399' },
];

// ============ RESPONSIBLE AI ITEMS ============
const AI_ITEMS = [
  {
    title: 'Confidence Indicators',
    detail: 'Every AI-generated data point includes a confidence score so you know exactly how certain the model is about each finding.',
  },
  {
    title: 'Human Review Required',
    detail: 'AI fills in research data, but every score and investment decision requires human review and explicit confirmation.',
  },
  {
    title: 'No Automated Investment Decisions',
    detail: 'DueDrill is a decision-support tool, not a decision-making tool. The platform never makes buy/pass recommendations autonomously.',
  },
];

// ============ COMPONENT ============
export default function TrustPage() {
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
          {/* Shield Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#4a7dff]/10 border border-[#4a7dff]/30 mb-8">
            <svg className="w-10 h-10 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Your Data Security Is{' '}
            <span className="bg-gradient-to-r from-[#4a7dff] to-[#34d399] bg-clip-text text-transparent">
              Our Priority
            </span>
          </h1>
          <p className="text-lg text-[#9ca0b0] max-w-2xl mx-auto leading-relaxed">
            DueDrill handles sensitive deal data for venture capital investors. We built our
            security architecture with the same rigor you apply to your diligence process —
            because trust is earned, not assumed.
          </p>
        </div>
      </section>

      {/* ============ SECURITY SECTIONS ============ */}
      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8"
            >
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-6">
                {section.icon}
                <h2 className="text-xl font-bold text-[#e8e9ed]">{section.title}</h2>
              </div>

              {/* Items Grid */}
              <div className="space-y-5">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#34d399]" />
                    </div>
                    <div>
                      <h3 className="text-[#e8e9ed] font-semibold text-sm mb-1">{item.label}</h3>
                      <p className="text-[#9ca0b0] text-sm leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COMPLIANCE ROADMAP ============ */}
      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              <h2 className="text-xl font-bold text-[#e8e9ed]">Compliance Roadmap</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {BADGES.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: `${badge.bg}12`,
                    border: `1px solid ${badge.bg}40`,
                    color: badge.color,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                  </svg>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ RESPONSIBLE AI ============ */}
      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <svg className="w-7 h-7 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              <h2 className="text-xl font-bold text-[#e8e9ed]">Responsible AI</h2>
            </div>

            <div className="space-y-5">
              {AI_ITEMS.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="mt-1.5 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                  </div>
                  <div>
                    <h3 className="text-[#e8e9ed] font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-[#9ca0b0] text-sm leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-[#e8e9ed] mb-3">Security Questions?</h2>
            <p className="text-[#9ca0b0] text-sm mb-5 max-w-lg mx-auto leading-relaxed">
              If you have questions about our security practices, need a security assessment for
              your compliance team, or want to report a vulnerability, reach out directly.
            </p>
            <a
              href="mailto:security@duedrill.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4a7dff]/10 border border-[#4a7dff]/30 rounded-lg text-[#4a7dff] font-semibold text-sm hover:bg-[#4a7dff]/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              security@duedrill.com
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-8 px-6 border-t border-[#2d3148]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[#4a7dff] font-bold">DueDrill</span>
          <p className="text-[#6b7084] text-xs">
            &copy; {new Date().getFullYear()} DueDrill by 5FT View Consulting. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Privacy</a>
            <a href="/terms" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Terms</a>
            <a href="mailto:yuri@5ftview.com" className="text-[#6b7084] text-xs hover:text-[#e8e9ed] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
