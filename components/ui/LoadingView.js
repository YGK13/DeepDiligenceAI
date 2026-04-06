'use client';

// ============================================================
// components/ui/LoadingView.js — Full Page Loading State
// ============================================================
// Renders a skeleton layout that mirrors the actual DueDrill app
// structure: collapsed sidebar + top bar + main content area.
//
// Used when:
//   - The app is hydrating on first load
//   - Switching companies (re-fetching all data)
//   - Auth state is resolving
//
// This replaces the old spinning magnifying glass emoji loader
// with a polished, layout-accurate skeleton screen.
//
// LAYOUT PROPORTIONS (matches AppShell):
//   - Sidebar: 60px wide (collapsed icon-only mode)
//   - TopBar: full width, 56px tall
//   - Content: fills remaining space with skeleton grid
// ============================================================

import {
  SkeletonLine,
  SkeletonCard,
  SkeletonGrid,
  ShimmerStyles,
  SKELETON_COLORS,
} from '@/components/ui/Skeleton';

// ============================================================
// LAYOUT CONSTANTS — match the real AppShell dimensions
// ============================================================
const SIDEBAR_WIDTH = 60;   // collapsed sidebar width in px
const TOPBAR_HEIGHT = 56;   // top bar height in px

// ============================================================
// SidebarSkeleton — Collapsed sidebar placeholder
// ============================================================
// Shows a branding circle at top + 6 icon-sized squares below,
// mimicking the collapsed sidebar's icon-only navigation.
// ============================================================
function SidebarSkeleton() {
  return (
    <div
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        minWidth: `${SIDEBAR_WIDTH}px`,
        height: '100vh',
        background: SKELETON_COLORS.cardBg,
        borderRight: `1px solid ${SKELETON_COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '16px',
        gap: '12px',
      }}
      aria-hidden="true"
    >
      {/* Branding circle — logo placeholder */}
      <SkeletonLine
        width="36px"
        height="36px"
        style={{ borderRadius: '8px', marginBottom: '12px' }}
      />

      {/* Nav icon placeholders — 6 small squares */}
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonLine
          key={i}
          width="32px"
          height="32px"
          style={{ borderRadius: '6px' }}
        />
      ))}
    </div>
  );
}

// ============================================================
// TopBarSkeleton — Top navigation bar placeholder
// ============================================================
// Shows a left-side "company selector" skeleton and right-side
// action button placeholders (search, notifications, settings).
// ============================================================
function TopBarSkeleton() {
  return (
    <div
      style={{
        height: `${TOPBAR_HEIGHT}px`,
        background: SKELETON_COLORS.cardBg,
        borderBottom: `1px solid ${SKELETON_COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
      aria-hidden="true"
    >
      {/* Left: company selector placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SkeletonLine width="28px" height="28px" style={{ borderRadius: '6px' }} />
        <SkeletonLine width="160px" height="16px" />
      </div>

      {/* Right: action buttons placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <SkeletonLine width="180px" height="32px" style={{ borderRadius: '6px' }} />
        <SkeletonLine width="32px" height="32px" style={{ borderRadius: '50%' }} />
        <SkeletonLine width="32px" height="32px" style={{ borderRadius: '50%' }} />
      </div>
    </div>
  );
}

// ============================================================
// ContentSkeleton — Main content area placeholder
// ============================================================
// Shows a page title line, a subtitle line, and a grid of
// skeleton cards mimicking the dashboard layout.
// ============================================================
function ContentSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        padding: '28px 32px',
        overflowY: 'auto',
      }}
    >
      {/* Page title */}
      <SkeletonLine width="220px" height="24px" style={{ marginBottom: '8px' }} />

      {/* Subtitle / breadcrumb */}
      <SkeletonLine width="320px" height="14px" style={{ marginBottom: '28px' }} />

      {/* Score cards row — 4 small metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: SKELETON_COLORS.cardBg,
              border: `1px solid ${SKELETON_COLORS.border}`,
              borderRadius: '10px',
              padding: '16px',
            }}
            aria-hidden="true"
          >
            <SkeletonLine width="50%" height="12px" style={{ marginBottom: '10px' }} />
            <SkeletonLine width="40%" height="22px" />
          </div>
        ))}
      </div>

      {/* Main content grid — 6 larger cards */}
      <SkeletonGrid count={6} columns={3} />
    </div>
  );
}

// ============================================================
// LoadingView — Full page loading state (exported)
// ============================================================
// Assembles: sidebar + (topbar + content) to match AppShell layout.
// Includes <ShimmerStyles> to inject the @keyframes animation.
// ============================================================
export default function LoadingView() {
  return (
    <>
      {/* Inject the shimmer @keyframes CSS */}
      <ShimmerStyles />

      <div
        style={{
          display: 'flex',
          width: '100vw',
          height: '100vh',
          background: SKELETON_COLORS.pageBg,
          overflow: 'hidden',
        }}
        aria-label="Loading DueDrill..."
        role="status"
      >
        {/* Left: collapsed sidebar skeleton */}
        <SidebarSkeleton />

        {/* Right: topbar + main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBarSkeleton />
          <ContentSkeleton />
        </div>
      </div>
    </>
  );
}
