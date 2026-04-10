// ============================================================
// app/not-found.js — Custom 404 Page
// ============================================================
// Branded 404 page matching DueDrill's dark theme.
// Shows when a user navigates to a non-existent route.
// Server component: no 'use client' needed.
// ============================================================

import Link from 'next/link';

// ============================================================
// METADATA — Browser tab title for the 404 page
// ============================================================
export const metadata = {
  title: '404 — Page Not Found | DueDrill',
};

// ============================================================
// NOT FOUND — Renders automatically for unmatched routes
// ============================================================
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0f1117' }}
    >
      {/* ============ LARGE 404 NUMBER WITH BLUE GLOW ============ */}
      <h1
        className="text-[144px] leading-none font-extrabold mb-2"
        style={{
          color: '#4a7dff',
          textShadow: '0 0 60px rgba(74, 125, 255, 0.3)',
        }}
      >
        404
      </h1>

      {/* ============ ERROR MESSAGE ============ */}
      <p className="text-2xl font-medium text-[#e0e0e0] mb-2">
        Page not found
      </p>

      {/* ============ SUBTEXT ============ */}
      <p className="text-base text-[#667788] mb-12 max-w-[420px] text-center">
        The page you are looking for does not exist or has been moved.
      </p>

      {/* ============ ACTION BUTTONS ============ */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {/* Primary CTA: back to dashboard */}
        <Link
          href="/"
          className="px-8 py-3.5 bg-[#4a7dff] text-white rounded-lg font-semibold text-base hover:bg-[#3d6be6] transition-colors"
        >
          Back to Dashboard
        </Link>

        {/* Secondary CTA: landing page */}
        <Link
          href="/landing"
          className="px-8 py-3.5 bg-[#1e2130] text-[#4a7dff] border border-[#2a3045] rounded-lg font-semibold text-base hover:border-[#4a7dff] hover:text-white transition-colors"
        >
          Visit Landing Page
        </Link>
      </div>

      {/* ============ BRAND FOOTER ============ */}
      <p className="mt-16 text-xs text-[#556677]">
        Due<span className="text-[#4a7dff]">Drill</span> — AI-Powered Due
        Diligence
      </p>
    </div>
  );
}
