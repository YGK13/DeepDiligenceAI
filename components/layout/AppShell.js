'use client';

// ============================================================================
// components/layout/AppShell.js — Main layout wrapper for DueDrill
// ============================================================================
// Composes Sidebar + TopBar + scrollable content area into the full-viewport
// application shell. This is the outermost layout component that every page
// view renders inside.
//
// MOBILE BEHAVIOR (< 768px):
//   - Sidebar is hidden by default, rendered as a slide-out drawer
//   - A hamburger menu button appears in the top-left corner
//   - Main content takes full width
//   - overflow-x-hidden prevents any horizontal scroll bleed
//
// DESKTOP BEHAVIOR (>= 768px):
//   - Sidebar is always visible in its fixed-width column
//   - Hamburger button is hidden
//   - Layout is a standard side-by-side flex row
//
// Layout structure (desktop):
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

import { useState, useCallback } from 'react';
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
  // ---- Notification props (forwarded to TopBar → NotificationBell) ----
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearAllNotifications,
  onNotificationNavigate,
}) {
  // ============ MOBILE DRAWER STATE ============
  // Controls whether the sidebar drawer is open on mobile screens.
  // On desktop (md+), the sidebar is always visible regardless of this state.
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Open the mobile sidebar drawer
  const openDrawer = useCallback(() => setMobileDrawerOpen(true), []);

  // Close the mobile sidebar drawer
  const closeDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  // When a nav item is clicked on mobile, close the drawer and forward the tab change
  const handleMobileTabChange = useCallback(
    (tabId) => {
      setMobileDrawerOpen(false);
      if (onTabChange) onTabChange(tabId);
    },
    [onTabChange]
  );

  return (
    // ---------- Root container ----------
    // Full viewport height, flex row so Sidebar and main area sit side by side.
    // bg-primary (#0f1117) fills any gaps and acts as the base page color.
    // overflow-x-hidden prevents horizontal scroll bleed from mobile transitions.
    <div className="flex h-screen w-screen bg-[#0f1117] overflow-hidden overflow-x-hidden">

      {/* ============ SIDEBAR (left column) ============ */}
      {/* On desktop: Fixed width, full height. Sidebar component handles its own
          width (260px desktop).
          On mobile: Rendered as a slide-out drawer controlled by mobileDrawerOpen state.
          The Sidebar component receives isDrawerOpen and onClose to manage its
          mobile drawer overlay and positioning. */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleMobileTabChange}
        completionBadges={completionBadges}
        isDrawerOpen={mobileDrawerOpen}
        onCloseDrawer={closeDrawer}
      />

      {/* ============ MAIN AREA (right column) ============ */}
      {/* Takes remaining horizontal space. Stacks TopBar on top and scrollable
          content below using flex-col. On mobile, takes full width since sidebar
          is an overlay drawer. */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ---------- Top bar ---------- */}
        {/* Sits at the top of the main area, does not scroll with content.
            Receives onOpenMobileDrawer so it can render the hamburger button
            on mobile screens. */}
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
          onOpenMobileDrawer={openDrawer}
          notifications={notifications}
          onMarkNotificationRead={onMarkNotificationRead}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
          onClearAllNotifications={onClearAllNotifications}
          onNotificationNavigate={onNotificationNavigate}
        />

        {/* ---------- Scrollable content area ---------- */}
        {/* flex-1 absorbs all remaining vertical space below the TopBar.
            overflow-y-auto enables vertical scrolling when content exceeds
            the viewport. Padding is responsive: p-3 on mobile, p-6 on md+. */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
