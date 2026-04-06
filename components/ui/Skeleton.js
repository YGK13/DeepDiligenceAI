'use client';

// ============================================================
// components/ui/Skeleton.js — Reusable Skeleton Loading Primitives
// ============================================================
// Provides shimmer-animated placeholder components for DueDrill's
// dark theme. Used to show layout structure while real data loads.
//
// COMPONENTS:
//   SkeletonLine  — single animated bar (width/height configurable)
//   SkeletonCard  — card with header + body lines
//   SkeletonGrid  — grid of SkeletonCards (for dashboard)
//   SkeletonForm  — form layout (label + input pairs in 2 cols)
//
// COLORS (dark theme):
//   Base:      #252836 — the skeleton element resting color
//   Shimmer:   #2d3148 — the highlight that slides across
//   Card BG:   #1e2130 — card container background
//   Border:    #2d3148 — card border color
//
// ANIMATION: CSS-only @keyframes shimmer — a linear-gradient
// that slides left-to-right over 1.5s, creating the "loading" effect.
// No JS timers involved.
// ============================================================

// ============================================================
// THEME COLORS — all skeleton colors in one place
// ============================================================
const SKELETON_COLORS = {
  base: '#252836',       // resting skeleton bar color
  shimmer: '#2d3148',    // the lighter highlight that sweeps across
  cardBg: '#1e2130',     // card container background
  border: '#2d3148',     // card border
  pageBg: '#0f1117',     // full-page background
};

// ============================================================
// SHIMMER KEYFRAMES — injected once as a <style> tag
// ============================================================
// The gradient is 200% wide so we can animate background-position
// from -200% to 200%, creating the sweep effect.
// ============================================================
const shimmerCSS = `
@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// ============================================================
// SHARED SHIMMER STYLE — applied to every skeleton element
// ============================================================
// Uses a linear-gradient with the base color on the edges and
// the shimmer highlight in the center. The gradient is 200% wide
// and animates via background-position to slide left-to-right.
// ============================================================
const shimmerStyle = {
  background: `linear-gradient(
    90deg,
    ${SKELETON_COLORS.base} 25%,
    ${SKELETON_COLORS.shimmer} 50%,
    ${SKELETON_COLORS.base} 75%
  )`,
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  borderRadius: '4px',
};

// ============================================================
// SkeletonLine — Single animated shimmer bar
// ============================================================
// Props:
//   width  — CSS width string (default '100%')
//   height — CSS height string (default '14px')
//   style  — optional additional inline styles
// ============================================================
export function SkeletonLine({ width = '100%', height = '14px', style = {} }) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================
// SkeletonCard — Card-shaped skeleton with header + body lines
// ============================================================
// Renders a dark card container with:
//   - 1 wide "header" line (60% width, taller)
//   - 3-4 "body" lines at varying widths for realism
// ============================================================
export function SkeletonCard({ lines = 4, style = {} }) {
  // Vary line widths to look more natural
  const lineWidths = ['100%', '85%', '70%', '90%'];

  return (
    <div
      style={{
        background: SKELETON_COLORS.cardBg,
        border: `1px solid ${SKELETON_COLORS.border}`,
        borderRadius: '12px',
        padding: '20px',
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Card header line — wider and taller */}
      <SkeletonLine width="60%" height="18px" style={{ marginBottom: '16px' }} />

      {/* Body lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={lineWidths[i % lineWidths.length]}
          height="12px"
          style={{ marginBottom: i < lines - 1 ? '10px' : '0' }}
        />
      ))}
    </div>
  );
}

// ============================================================
// SkeletonGrid — Grid of SkeletonCards (for dashboard view)
// ============================================================
// Props:
//   count   — number of cards to render (default 6)
//   columns — CSS grid column count (default 3)
// ============================================================
export function SkeletonGrid({ count = 6, columns = 3 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={i % 2 === 0 ? 4 : 3} />
      ))}
    </div>
  );
}

// ============================================================
// SkeletonForm — Form layout skeleton (label + input pairs)
// ============================================================
// Renders 6 rows in a 2-column grid. Each row has a short
// "label" line and a taller "input" bar beneath it.
// ============================================================
export function SkeletonForm({ rows = 6 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px 24px',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          {/* Label placeholder */}
          <SkeletonLine
            width={i % 2 === 0 ? '40%' : '55%'}
            height="12px"
            style={{ marginBottom: '8px' }}
          />
          {/* Input placeholder */}
          <SkeletonLine width="100%" height="38px" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ShimmerStyles — Injects the @keyframes CSS into the DOM
// ============================================================
// Must be rendered once (usually by LoadingView or wherever
// skeletons are used) so the animation keyframes are available.
// ============================================================
export function ShimmerStyles() {
  return <style dangerouslySetInnerHTML={{ __html: shimmerCSS }} />;
}

// ============================================================
// NAMED EXPORTS SUMMARY
// ============================================================
// { SkeletonLine, SkeletonCard, SkeletonGrid, SkeletonForm, ShimmerStyles }
// Also export colors for use in LoadingView
export { SKELETON_COLORS };
