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
