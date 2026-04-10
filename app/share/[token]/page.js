'use client';

// ============================================================================
// app/share/[token]/page.js — Public Shared Report Page
// ============================================================================
// Renders a read-only version of a DD report that anyone can view without
// logging in. This is the page LPs, co-investors and IC committees see
// when they open a shared report link.
//
// Flow:
//   1. Extract the token from the URL params
//   2. Fetch the share data from /api/share/{token}
//   3. Render a read-only ReportView with DueDrill branding
//   4. Show creation date, expiry notice and a signup CTA
//
// Error states:
//   - Token not found: clean 404-style error page
//   - Token expired: expiration notice with request-new-link messaging
//   - Server error: generic error page with retry suggestion
// ============================================================================

import React, { useState, useEffect, use } from 'react';
import ReportView from '@/components/views/ReportView';

// ============ SCORE COLOR UTILITY ============
// Matches the same function in ReportView for consistent badge rendering
function getScoreHex(score) {
  const num = parseFloat(score) || 0;
  if (num >= 8) return '#34d399';
  if (num >= 7) return '#22c55e';
  if (num >= 5) return '#f59e0b';
  if (num >= 4) return '#f97316';
  return '#ef4444';
}

// ============ LOADING SKELETON ============
// Professional loading state while the share data fetches
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#1e2130] border border-[#2d3148] rounded-xl">
          <span className="w-5 h-5 rounded-full border-2 border-[#4a7dff] border-t-transparent animate-spin" />
          <span className="text-[#9ca0b0] text-sm font-medium">Loading shared report...</span>
        </div>
      </div>
    </div>
  );
}

// ============ ERROR PAGE ============
// Clean error display for not-found, expired and server error states
function ErrorPage({ title, message, isExpired }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* DueDrill logo mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1e2130] border border-[#2d3148] mb-6">
          <svg className="w-8 h-8 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>

        {/* Error icon */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 mb-4">
          {isExpired ? (
            <svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
        </div>

        <h1 className="text-[#e8e9ed] text-xl font-bold mb-2">{title}</h1>
        <p className="text-[#9ca0b0] text-sm leading-relaxed mb-8">{message}</p>

        {/* CTA */}
        <a
          href="/landing"
          className={
            'inline-flex items-center justify-center gap-2 ' +
            'font-semibold rounded-lg py-2.5 px-6 text-sm transition-all duration-200 ' +
            'bg-[#4a7dff] text-white hover:bg-[#3d6be6] active:bg-[#3560d4] ' +
            'shadow-lg shadow-[#4a7dff]/20'
          }
        >
          Learn More About DueDrill
        </a>
      </div>
    </div>
  );
}

// ============ MAIN SHARE PAGE COMPONENT ============
export default function SharePage({ params }) {
  // Unwrap the params promise (Next.js 15+ async params in client components)
  const resolvedParams = use(params);
  const { token } = resolvedParams;

  const [shareData, setShareData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============ FETCH SHARE DATA ============
  useEffect(() => {
    if (!token) {
      setError({ title: 'Invalid Link', message: 'This share link is malformed. Please check the URL and try again.' });
      setLoading(false);
      return;
    }

    async function fetchShare() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();

        if (!res.ok) {
          // Determine the error type for appropriate messaging
          if (res.status === 404) {
            setError({
              title: 'Report Not Found',
              message: 'This shared report could not be found. It may have been removed or the link may be incorrect.',
            });
          } else if (res.status === 410) {
            setError({
              title: 'Link Expired',
              message: data.error || 'This share link has expired. Please request a new link from the report owner.',
              isExpired: true,
            });
          } else {
            setError({
              title: 'Something Went Wrong',
              message: data.error || 'An unexpected error occurred. Please try again later.',
            });
          }
          return;
        }

        setShareData(data);
      } catch (fetchErr) {
        console.error('[SharePage] Fetch error:', fetchErr);
        setError({
          title: 'Connection Error',
          message: 'Could not load the shared report. Please check your internet connection and try again.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchShare();
  }, [token]);

  // ============ RENDER: LOADING ============
  if (loading) return <LoadingSkeleton />;

  // ============ RENDER: ERROR ============
  if (error) return <ErrorPage title={error.title} message={error.message} isExpired={error.isExpired} />;

  // ============ RENDER: SHARED REPORT ============
  const { companyData, createdAt, expiresAt } = shareData;
  const createdDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const companyName = companyData?.overview?.companyName || companyData?.name || 'Company Report';

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* ============ SHARED REPORT HEADER ============ */}
      {/* DueDrill branding bar: visible on all shared reports so LPs know
          where this came from and can find us. */}
      <header className="sticky top-0 z-50 bg-[#0f1117]/95 backdrop-blur-sm border-b border-[#2d3148]">
        <div className="max-w-[960px] mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: DueDrill brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4a7dff]/10 border border-[#4a7dff]/20">
              <svg className="w-4 h-4 text-[#4a7dff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <p className="text-[#e8e9ed] text-sm font-semibold tracking-tight">Shared via DueDrill</p>
              <p className="text-[#6b7084] text-[10px]">AI-Powered Due Diligence Platform</p>
            </div>
          </div>

          {/* Right: Share metadata */}
          <div className="text-right">
            <p className="text-[#9ca0b0] text-[10px]">
              Shared {createdDate}
            </p>
            <p className="text-[#6b7084] text-[10px]">
              Expires {expiresDate}
            </p>
          </div>
        </div>
      </header>

      {/* ============ SHARED REPORT BADGE ============ */}
      {/* Visual indicator that this is a read-only shared view */}
      <div className="max-w-[960px] mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#4a7dff]/8 border border-[#4a7dff]/20 rounded-lg mb-4">
          <svg className="w-4 h-4 text-[#4a7dff] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.439a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.81" />
          </svg>
          <p className="text-[#9ca0b0] text-xs">
            <span className="text-[#4a7dff] font-semibold">Read-only shared report</span>
            {' '}for {companyName}
          </p>
        </div>
      </div>

      {/* ============ REPORT CONTENT ============ */}
      {/* Reuse the existing ReportView component in read-only mode */}
      <div className="px-6 pb-6">
        <ReportView company={companyData} />
      </div>

      {/* ============ SIGNUP CTA ============ */}
      {/* Bottom banner encouraging LPs and viewers to try DueDrill */}
      <div className="border-t border-[#2d3148] bg-[#1e2130]">
        <div className="max-w-[960px] mx-auto px-6 py-10 text-center">
          {/* Decorative rule */}
          <div className="h-px w-16 mx-auto bg-[#4a7dff] mb-6" />

          <h2 className="text-[#e8e9ed] text-xl font-bold mb-2">
            Run Your Own Due Diligence with DueDrill
          </h2>
          <p className="text-[#9ca0b0] text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            AI-powered due diligence reports, automated scoring, real-time monitoring
            and collaboration tools built for VCs, angels and fund managers.
          </p>

          <div className="flex items-center justify-center gap-3">
            <a
              href="/signup"
              className={
                'inline-flex items-center justify-center gap-2 ' +
                'font-semibold rounded-lg py-3 px-8 text-sm transition-all duration-200 ' +
                'bg-[#4a7dff] text-white hover:bg-[#3d6be6] active:bg-[#3560d4] ' +
                'shadow-lg shadow-[#4a7dff]/20'
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
              Sign Up Free
            </a>
            <a
              href="/landing"
              className={
                'inline-flex items-center justify-center gap-2 ' +
                'font-semibold rounded-lg py-3 px-8 text-sm transition-all duration-200 ' +
                'border border-[#2d3148] text-[#9ca0b0] ' +
                'hover:bg-[#252836] hover:text-[#e8e9ed] hover:border-[#4a7dff]/30'
              }
            >
              Learn More
            </a>
          </div>

          {/* Trust line */}
          <p className="text-[#6b7084] text-[10px] mt-6">
            Trusted by venture capital firms and angel investors worldwide
          </p>
        </div>
      </div>
    </div>
  );
}
