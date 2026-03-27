'use client';

// ============================================================================
// components/layout/Sidebar.js — Collapsible Sidebar Navigation for DueDrill
// ============================================================================
// Renders the full-height sidebar with:
//   - App branding header
//   - COLLAPSIBLE accordion groups — each section can expand/collapse
//   - Only first 2 groups (Core Analysis, Financial) expanded by default
//   - Active tab's group auto-expands when navigated to
//   - Collapsed state persists in localStorage (key: 'duedrill_sidebar_state')
//   - Smooth CSS max-height transition on expand/collapse
//   - Chevron icon rotates on expand/collapse
//   - Completion badges (e.g., "3/14") still visible per nav item
//   - Responsive: collapses to 60px icon-only mode on mobile (<768px)
// ============================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { NAV_ITEMS, SECTION_LABELS } from '@/lib/constants';

// ============ CONSTANTS ============

// localStorage key for persisting which groups are expanded/collapsed
const STORAGE_KEY = 'duedrill_sidebar_state';

// Section keys that should be expanded on very first load (no saved state)
const DEFAULT_EXPANDED = ['core', 'financial'];

// ============ CHEVRON SVG COMPONENT ============
// Small inline SVG chevron — rotates 0deg (collapsed, pointing right)
// to 90deg (expanded, pointing down) via CSS transition
function Chevron({ expanded }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={
        'shrink-0 transition-transform duration-200 ease-in-out ' +
        (expanded ? 'rotate-90' : 'rotate-0')
      }
    >
      <path
        d="M4.5 2.5L8 6L4.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============ HELPER: LOAD SAVED STATE ============
// Reads persisted expanded/collapsed state from localStorage.
// Returns a Set of expanded section keys, or null if nothing saved.
function loadSavedState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate: must be an array of strings
    if (Array.isArray(parsed) && parsed.every((k) => typeof k === 'string')) {
      return new Set(parsed);
    }
    return null;
  } catch {
    return null;
  }
}

// ============ HELPER: SAVE STATE ============
// Persists the current expanded section keys to localStorage.
function saveState(expandedSet) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedSet]));
  } catch {
    // Silent fail — localStorage might be full or disabled
  }
}

// ============ HELPER: FIND SECTION FOR A TAB ============
// Given a tab id, returns the section key it belongs to.
function findSectionForTab(tabId) {
  const item = NAV_ITEMS.find((n) => n.id === tabId);
  return item ? item.section : null;
}

// ============ COLLAPSIBLE SECTION GROUP COMPONENT ============
// Renders a single accordion section: header (clickable) + animated item list.
function SectionGroup({
  sectionKey,
  label,
  items,
  expanded,
  onToggle,
  activeTab,
  onTabChange,
  completionBadges,
}) {
  // Ref for the inner content div — used to measure actual height for animation
  const contentRef = useRef(null);
  // We track the measured height to drive the max-height animation
  const [contentHeight, setContentHeight] = useState(0);

  // ---------- Measure content height whenever items change or expand toggles ----------
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, items.length]);

  // ---------- Count how many items in this group have badges ----------
  // Used to show a summary count on the collapsed section header
  const groupBadgeCount = useMemo(() => {
    let completed = 0;
    let total = 0;
    for (const item of items) {
      const badge = completionBadges[item.id];
      if (badge) {
        // Badge format is "3/14" — parse both numbers
        const parts = badge.split('/');
        if (parts.length === 2) {
          completed += parseInt(parts[0], 10) || 0;
          total += parseInt(parts[1], 10) || 0;
        }
      }
    }
    if (total > 0) return `${completed}/${total}`;
    return null;
  }, [items, completionBadges]);

  return (
    <div>
      {/* ---------- Section header — clickable to toggle expand/collapse ---------- */}
      <button
        onClick={() => onToggle(sectionKey)}
        className={
          'hidden md:flex w-full items-center gap-1.5 px-2 py-1.5 rounded-md ' +
          'text-[#6b7084] hover:text-[#9ca0b0] hover:bg-[#252836] ' +
          'transition-colors duration-150 cursor-pointer select-none ' +
          'focus:outline-none focus:ring-1 focus:ring-[#4a7dff]/40'
        }
        aria-expanded={expanded}
        aria-controls={`sidebar-section-${sectionKey}`}
        title={expanded ? `Collapse ${label}` : `Expand ${label}`}
      >
        {/* Chevron indicator — rotates when expanded */}
        <Chevron expanded={expanded} />

        {/* Section label text */}
        <span className="text-[10px] font-semibold uppercase tracking-wider flex-1 text-left">
          {label}
        </span>

        {/* Aggregated badge for collapsed sections — shows total progress */}
        {!expanded && groupBadgeCount && (
          <span className="text-[9px] font-medium text-[#34d399]/70 mr-1">
            {groupBadgeCount}
          </span>
        )}

        {/* Item count indicator */}
        <span className="text-[9px] text-[#6b7084]/60">
          {items.length}
        </span>
      </button>

      {/* ---------- Mobile: always show section label (non-collapsible) ---------- */}
      <p className="md:hidden text-[#6b7084] text-[8px] font-semibold uppercase tracking-wider px-2 mb-1 mt-2">
        {label.charAt(0)}
      </p>

      {/* ---------- Collapsible content wrapper — animated via max-height ---------- */}
      {/* On desktop: animated expand/collapse. On mobile: always visible (icon-only mode) */}
      <div
        id={`sidebar-section-${sectionKey}`}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out md:block"
        style={{
          // On mobile (< md), we don't restrict height — CSS handles via md: prefix
          // On desktop, we use inline max-height for smooth animation
          maxHeight: expanded ? `${contentHeight + 8}px` : '0px',
        }}
      >
        <ul ref={contentRef} className="space-y-0.5 pt-1">
          {items.map((item) => {
            const isActive = activeTab === item.id;
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
    </div>
  );
}

// ============ MAIN SIDEBAR COMPONENT ============
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

  // ---------- Expanded state: Set of section keys currently expanded ----------
  // Initialize from localStorage if available, otherwise use defaults
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = loadSavedState();
    if (saved) return saved;
    return new Set(DEFAULT_EXPANDED);
  });

  // ---------- Auto-expand the group containing the active tab ----------
  // When activeTab changes (e.g., user clicks a link or navigates),
  // make sure its parent section is expanded so the user can see it
  useEffect(() => {
    if (!activeTab) return;
    const section = findSectionForTab(activeTab);
    if (section && !expandedSections.has(section)) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.add(section);
        saveState(next);
        return next;
      });
    }
    // We intentionally only react to activeTab changes, not expandedSections,
    // to avoid infinite loops. The expanded state is "one-way ratchet" here:
    // navigating to a tab opens its group, but doesn't close others.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ---------- Toggle handler for section headers ----------
  const handleToggle = useCallback((sectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      saveState(next);
      return next;
    });
  }, []);

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

      {/* ============ NAVIGATION — COLLAPSIBLE ACCORDION GROUPS ============ */}
      <nav className="flex-1 py-3 px-2 md:px-3 space-y-2">
        {sectionKeys.map((sectionKey) => {
          const items = groupedItems[sectionKey];
          if (!items || items.length === 0) return null;

          return (
            <SectionGroup
              key={sectionKey}
              sectionKey={sectionKey}
              label={SECTION_LABELS[sectionKey]}
              items={items}
              expanded={expandedSections.has(sectionKey)}
              onToggle={handleToggle}
              activeTab={activeTab}
              onTabChange={onTabChange}
              completionBadges={completionBadges}
            />
          );
        })}
      </nav>

      {/* ============ FOOTER ============ */}
      <div className="px-3 md:px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="hidden md:flex items-center justify-between">
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            v1.0.0
          </p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
