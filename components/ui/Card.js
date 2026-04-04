'use client';

// ============================================================
// Card.js — Dark-Themed Card Container Component
// ============================================================
// A reusable card wrapper that provides consistent visual structure
// throughout the app. Includes optional header with title, subtitle,
// and a right-aligned action slot for buttons or controls.
// ============================================================

import React from 'react';
import SectionHelp from '@/components/ui/SectionHelp';
import FreshnessIndicator from '@/components/ui/FreshnessIndicator';

// ============================================================
// Card Component
// ============================================================
// Props:
//   children    — card body content
//   title       — optional header title (rendered as h3, 16px semibold)
//   subtitle    — optional subtitle below the title (12px muted text)
//   headerRight — optional React node rendered on the right side of the header
//                 (use for action buttons, badges, toggles, etc.)
//   className   — additional CSS classes to merge onto the outer container
//   sectionId      — optional section ID (e.g., 'team', 'product'). When provided,
//                    renders a contextual help "?" button next to the title.
//   lastResearched — optional ISO 8601 timestamp string. When provided, renders a
//                    FreshnessIndicator showing how stale the section data is.
// ============================================================
export default function Card({
  children,
  title,
  subtitle,
  headerRight,
  className = '',
  sectionId,
  lastResearched,
}) {
  // Determine if we need to render the header section at all
  // Only render when at least one header prop is provided
  const hasHeader = title || subtitle || headerRight;

  return (
    <div
      className={`
        bg-[#1e2130]
        border border-[#2d3148]
        rounded-lg
        p-4 md:p-5
        mb-4
        ${className}
      `}
    >
      {/* --------------------------------------------------------
          Card Header — only rendered when title, subtitle, or
          headerRight props are provided
          -------------------------------------------------------- */}
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Left side: title + subtitle stack + optional section help */}
          <div className="min-w-0 flex-1">
            {title && (
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-[#e8e9ed] leading-tight">
                  {title}
                </h3>
                {/* ---- Contextual help button — shown when sectionId is provided ---- */}
                {sectionId && <SectionHelp sectionId={sectionId} />}
                {/* ---- Data freshness indicator — shown when lastResearched is provided ---- */}
                {lastResearched !== undefined && (
                  <FreshnessIndicator timestamp={lastResearched} />
                )}
              </div>
            )}
            {subtitle && (
              <p className="text-[12px] text-[#6b7084] mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right side: action slot (buttons, badges, etc.) */}
          {headerRight && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {headerRight}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------
          Card Body — renders children as-is
          -------------------------------------------------------- */}
      {children}
    </div>
  );
}
