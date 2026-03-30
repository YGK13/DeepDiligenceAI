'use client';

// ============================================================================
// components/layout/AppShell.js — Main layout wrapper for DueDrill
// ============================================================================
// Composes Sidebar + TopBar + scrollable content area into the full-viewport
// application shell. This is the outermost layout component that every page
// view renders inside.
//
// Layout structure:
//   ┌──────────┬────────────────────────────────────────┐
//   │          │  TopBar (company selector, score, etc) │
//   │ Sidebar  ├────────────────────────────────────────┤
//   │ (fixed   │                                        │
//   │  width)  │  Content area (scrollable, padded)     │
//   │          │  {children}                            │
//   │          │                                        │
//   └──────────┴────────────────────────────────────────┘
//
// Props:
//   children         — React node(s) to render in the main content area
//   activeTab        — forwarded to Sidebar
//   onTabChange      — forwarded to Sidebar
//   companies        — forwarded to TopBar
//   activeCompanyId  — forwarded to TopBar
//   onCompanyChange  — forwarded to TopBar
//   onNewCompany     — forwarded to TopBar
//   onDeleteCompany  — forwarded to TopBar
//   overallScore     — forwarded to TopBar
//   completionBadges — forwarded to Sidebar
// ============================================================================

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

// ============ COMPONENT ============
export default function AppShell({
  children,
  activeTab,
  onTabChange,
  companies,
  activeCompanyId,
  onCompanyChange,
  onNewCompany,
  onDeleteCompany,
  overallScore,
  completionBadges,
  user,
  onSignOut,
  onOpenSearch,
}) {
  return (
    // ---------- Root container ----------
    // Full viewport height, flex row so Sidebar and main area sit side by side.
    // bg-primary (#0f1117) fills any gaps and acts as the base page color.
    <div className="flex h-screen w-screen bg-[#0f1117] overflow-hidden">

      {/* ============ SIDEBAR (left column) ============ */}
      {/* Fixed width, full height. Sidebar component handles its own responsive
          width (260px desktop, 60px mobile). shrink-0 prevents it from
          compressing when the content area has overflow. */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        completionBadges={completionBadges}
      />

      {/* ============ MAIN AREA (right column) ============ */}
      {/* Takes remaining horizontal space. Stacks TopBar on top and scrollable
          content below using flex-col. */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ---------- Top bar ---------- */}
        {/* Sits at the top of the main area, does not scroll with content. */}
        <TopBar
          companies={companies}
          activeCompanyId={activeCompanyId}
          onCompanyChange={onCompanyChange}
          onNewCompany={onNewCompany}
          onDeleteCompany={onDeleteCompany}
          overallScore={overallScore}
          user={user}
          onSignOut={onSignOut}
          onOpenSearch={onOpenSearch}
        />

        {/* ---------- Scrollable content area ---------- */}
        {/* flex-1 absorbs all remaining vertical space below the TopBar.
            overflow-y-auto enables vertical scrolling when content exceeds
            the viewport. p-6 provides consistent inner padding. */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
