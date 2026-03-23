'use client';

// ============================================================================
// components/layout/Sidebar.js — Left sidebar navigation for DueDrill
// ============================================================================
// Renders the full-height sidebar with:
//   - App branding header
//   - Nav items grouped by section with uppercase section labels
//   - Active state highlighting (accent-blue bg)
//   - Completion badges (e.g., "3/14") per section tab
//   - CSS tooltips on hover (especially useful on mobile icon-only mode)
//   - Responsive: collapses to 60px icon-only mode on mobile (<768px)
// ============================================================================

import { useMemo } from 'react';
import { NAV_ITEMS, SECTION_LABELS } from '@/lib/constants';

// ============ COMPONENT ============
export default function Sidebar({ activeTab, onTabChange, completionBadges = {} }) {
  // ---------- Group nav items by their section key ----------
  const groupedItems = useMemo(() => {
    const groups = {};
    for (const item of NAV_ITEMS) {
      if (!groups[item.section]) {
        groups[item.section] = [];
      }
      groups[item.section].push(item);
    }
    return groups;
  }, []);

  // ---------- Ordered section keys ----------
  const sectionKeys = useMemo(() => Object.keys(SECTION_LABELS), []);

  return (
    <aside
      className={
        'h-full bg-[#1a1d27] border-r border-[#2d3148] flex flex-col ' +
        'w-[60px] md:w-[260px] ' +
        'shrink-0 overflow-y-auto overflow-x-hidden'
      }
    >
      {/* ============ HEADER / BRANDING ============ */}
      <div className="px-3 md:px-5 pt-5 pb-4 border-b border-[#2d3148]">
        <h1 className="hidden md:block text-[#4a7dff] font-bold text-lg leading-tight">
          DueDrill
        </h1>
        <span className="block md:hidden text-[#4a7dff] font-bold text-lg text-center">
          DD
        </span>
        <p className="hidden md:block text-[#6b7084] text-xs mt-1">
          AI-Powered Due Diligence for Smarter Investments
        </p>
      </div>

      {/* ============ NAVIGATION ============ */}
      <nav className="flex-1 py-3 px-2 md:px-3 space-y-4">
        {sectionKeys.map((sectionKey) => {
          const items = groupedItems[sectionKey];
          if (!items || items.length === 0) return null;

          return (
            <div key={sectionKey}>
              {/* ---------- Section label ---------- */}
              <p
                className={
                  'hidden md:block text-[#6b7084] text-[10px] font-semibold ' +
                  'uppercase tracking-wider px-2 mb-2'
                }
              >
                {SECTION_LABELS[sectionKey]}
              </p>

              {/* ---------- Nav items ---------- */}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive = activeTab === item.id;
                  // completionBadges values are strings like "3/14"
                  const badge = completionBadges[item.id];

                  return (
                    <li key={item.id} className="relative group">
                      <button
                        onClick={() => onTabChange(item.id)}
                        className={
                          'w-full flex items-center gap-2 px-2 md:px-3 py-2 rounded-md ' +
                          'text-sm font-medium transition-all duration-150 ' +
                          'focus:outline-none focus:ring-2 focus:ring-[#4a7dff]/50 ' +
                          (isActive
                            ? 'bg-[#4a7dff] text-white shadow-lg shadow-[#4a7dff]/20'
                            : 'text-[#9ca0b0] hover:bg-[#252836] hover:text-[#e8e9ed]')
                        }
                      >
                        {/* Icon — always visible, centered on mobile */}
                        <span className="text-base shrink-0 md:text-left text-center w-6">
                          {item.icon}
                        </span>

                        {/* Label — hidden on mobile */}
                        <span className="hidden md:inline truncate flex-1 text-left">
                          {item.label}
                        </span>

                        {/* Completion badge — shows "3/14" style counts */}
                        {badge && (
                          <span
                            className={
                              'hidden md:inline-flex items-center justify-center ' +
                              'min-w-[32px] h-5 px-1.5 rounded-full text-[10px] font-semibold ' +
                              (isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#34d399]/15 text-[#34d399]')
                            }
                          >
                            {badge}
                          </span>
                        )}
                      </button>

                      {/* ============ CSS TOOLTIP (mobile icon-only mode) ============ */}
                      {/* Shows label + badge on hover when in collapsed sidebar mode */}
                      <div
                        className={
                          'md:hidden absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 ' +
                          'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ' +
                          'bg-[#252836] text-[#e8e9ed] border border-[#2d3148] ' +
                          'shadow-xl shadow-black/30 ' +
                          'opacity-0 pointer-events-none group-hover:opacity-100 ' +
                          'transition-opacity duration-150'
                        }
                      >
                        {item.label}
                        {badge && (
                          <span className="ml-2 text-[#34d399]">({badge})</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ============ FOOTER ============ */}
      <div className="px-3 md:px-5 py-3 border-t border-[#2d3148]">
        <p className="hidden md:block text-[#6b7084] text-[10px] text-center">
          v1.0.0 — DueDrill
        </p>
      </div>
    </aside>
  );
}
