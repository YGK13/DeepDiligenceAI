// ============================================================
// Root Layout — Next.js App Router entry point
// Sets up HTML shell, metadata, and global CSS
// ============================================================
import './globals.css';

// ============================================================
// METADATA — SEO, social sharing, browser tab info
// ============================================================
export const metadata = {
  title: 'DueDrill — AI-Powered Due Diligence for Smarter Investments',
  description:
    'AI-powered startup due diligence platform for angel investors, VCs, and fund managers. 16 comprehensive DD categories, weighted scoring, multi-provider AI research.',
  keywords: [
    'due diligence',
    'VC',
    'venture capital',
    'startup evaluation',
    'AI research',
    'deal scoring',
    'investment analysis',
  ],
  // ============ OPEN GRAPH — Social sharing previews (LinkedIn, Twitter, Slack) ============
  // ============ CANONICAL URL — Prevents duplicate content issues ============
  alternates: {
    canonical: 'https://duedrill.com',
  },
  openGraph: {
    title: 'DueDrill — AI-Powered Due Diligence',
    description:
      'Research any startup in 60 seconds. AI auto-fills 214 data fields across 16 due diligence categories with real data from the web.',
    url: 'https://duedrill.com',
    siteName: 'DueDrill',
    type: 'website',
    locale: 'en_US',
    // ============ OG IMAGE — Generated dynamically via /api/og ============
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'DueDrill — Research Any Startup in 60 Seconds',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DueDrill — AI-Powered Due Diligence',
    description:
      'Research any startup in 60 seconds. 16 DD categories, weighted scoring, PDF memos.',
    // ============ TWITTER IMAGE — Same OG route, works for Twitter/X cards ============
    images: ['/api/og'],
  },
  // ============ ROBOTS — Allow indexing of public pages ============
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL('https://duedrill.com'),
};

// ============================================================
// ROOT LAYOUT — Wraps every page in the app
// ============================================================
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
