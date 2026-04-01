// ============================================================================
// app/not-found.js — Custom 404 Page
// ============================================================================
// Branded 404 page that matches DueDrill's dark theme.
// Shows when a user navigates to a non-existent route.
// ============================================================================

import Link from 'next/link';

export const metadata = {
  title: '404 — Page Not Found | DueDrill',
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0f1117' }}
    >
      <div className="text-center max-w-md">
        {/* Large 404 indicator */}
        <div className="text-8xl font-bold text-[#2d3148] mb-4">404</div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-[#e8e9ed] mb-3">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-[#9ca0b0] text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-[#4a7dff] text-white rounded-lg font-semibold text-sm hover:bg-[#3d6be6] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/landing"
            className="px-6 py-3 bg-transparent text-[#9ca0b0] border border-[#2d3148] rounded-lg font-semibold text-sm hover:border-[#4a7dff] hover:text-[#e8e9ed] transition-colors"
          >
            Visit Homepage
          </Link>
        </div>

        {/* Brand footer */}
        <p className="mt-12 text-[#6b7084] text-xs">
          Due<span className="text-[#4a7dff]">Drill</span> — AI-Powered Due Diligence
        </p>
      </div>
    </div>
  );
}
