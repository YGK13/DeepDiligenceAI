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
  openGraph: {
    title: 'DueDrill — AI-Powered Due Diligence',
    description: 'Research any startup in 60 seconds. AI auto-fills 214 data fields across 16 due diligence categories with real data from the web.',
    url: 'https://duedrill.com',
    siteName: 'DueDrill',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DueDrill — AI-Powered Due Diligence',
    description: 'Research any startup in 60 seconds. 16 DD categories, weighted scoring, PDF memos.',
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
