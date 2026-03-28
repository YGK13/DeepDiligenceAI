'use client';

// ============================================================
// components/ui/CommandPalette.js — Cmd+K / Ctrl+K Command Palette
// ============================================================
// Full-screen modal overlay with fuzzy search, keyboard navigation,
// and quick access to navigation tabs, actions, and company switching.
//
// Props:
//   isOpen           — boolean controlling visibility
//   onClose          — callback to close the palette
//   onNavigate(tabId)        — navigate to a sidebar tab
//   onAction(actionId)       — trigger an app action
//   companies                — array of company objects
//   onCompanySelect(id)      — switch to a different company
//   activeTab                — current active tab (for highlighting)
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NAV_ITEMS, SECTION_LABELS } from '@/lib/constants';

// ============================================================
// THEME COLORS — matches DueDrill dark theme palette
// ============================================================
const COLORS = {
  bg: '#0f1117',
  card: '#1e2130',
  border: '#2d3148',
  text: '#e8e9ed',
  secondary: '#9ca0b0',
  accent: '#4a7dff',
  green: '#34d399',
  inputBg: '#161822',
  hoverBg: '#262a3e',
  backdropBg: 'rgba(0, 0, 0, 0.65)',
};

// ============================================================
// ACTION COMMANDS — static list of app-level actions
// Each has id, label, icon, shortcut (optional), and category
// ============================================================
const ACTION_COMMANDS = [
  { id: 'research-all', label: 'Research This Company', icon: '🔬', shortcut: null, category: 'Actions' },
  { id: 'export-pdf', label: 'Export PDF (Print)', icon: '📄', shortcut: 'Ctrl+P', category: 'Actions' },
  { id: 'export-data', label: 'Export Data (JSON)', icon: '📦', shortcut: null, category: 'Actions' },
  { id: 'new-company', label: 'New Company', icon: '➕', shortcut: null, category: 'Actions' },
  { id: 'delete-company', label: 'Delete Company', icon: '🗑️', shortcut: null, category: 'Actions' },
  { id: 'load-demo', label: 'Load Demo Company', icon: '🎮', shortcut: null, category: 'Actions' },
  { id: 'toggle-theme', label: 'Toggle Theme', icon: '🌓', shortcut: null, category: 'Actions' },
];

// ============================================================
// MAGNIFYING GLASS SVG — search icon for the input
// ============================================================
function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLORS.secondary}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ============================================================
// FUZZY SEARCH — simple substring match (case-insensitive)
// Returns true if every word in the query appears somewhere
// in the target string, in any order.
// ============================================================
function fuzzyMatch(query, target) {
  if (!query) return true;
  const lowerTarget = target.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((word) => lowerTarget.includes(word));
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onAction,
  companies = [],
  onCompanySelect,
  activeTab,
}) {
  // --- Local state ---
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // --- Refs ---
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // ============================================================
  // BUILD COMMAND LIST — navigation + actions + companies
  // Memoized so we only rebuild when companies or activeTab change.
  // ============================================================
  const allCommands = useMemo(() => {
    const commands = [];

    // --- Navigation commands: one entry per NAV_ITEM ---
    // Group them by their section for display, but flatten into a single list
    NAV_ITEMS.forEach((item) => {
      const sectionLabel = SECTION_LABELS[item.section] || item.section;
      commands.push({
        id: `nav-${item.id}`,
        type: 'navigation',
        label: item.label,
        icon: item.icon,
        shortcut: null,
        category: `Navigate — ${sectionLabel}`,
        tabId: item.id,
        isActive: item.id === activeTab,
      });
    });

    // --- Action commands ---
    ACTION_COMMANDS.forEach((action) => {
      commands.push({
        id: `action-${action.id}`,
        type: 'action',
        label: action.label,
        icon: action.icon,
        shortcut: action.shortcut,
        category: action.category,
        actionId: action.id,
      });
    });

    // --- Company commands: quick-switch between companies ---
    companies.forEach((c) => {
      const name = c.overview?.companyName || c.overview?.name || c.name || 'Unnamed';
      commands.push({
        id: `company-${c.id}`,
        type: 'company',
        label: name,
        icon: '🏢',
        shortcut: null,
        category: 'Companies',
        companyId: c.id,
      });
    });

    return commands;
  }, [companies, activeTab]);

  // ============================================================
  // FILTERED COMMANDS — apply fuzzy search to the full list
  // ============================================================
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    return allCommands.filter((cmd) =>
      fuzzyMatch(query, `${cmd.label} ${cmd.category}`)
    );
  }, [allCommands, query]);

  // ============================================================
  // GROUP FILTERED COMMANDS BY CATEGORY — for visual grouping
  // Returns an array of { category, items } objects, preserving
  // insertion order (navigation first, then actions, then companies).
  // ============================================================
  const groupedCommands = useMemo(() => {
    const groups = [];
    const seen = new Map();

    filteredCommands.forEach((cmd) => {
      if (!seen.has(cmd.category)) {
        const group = { category: cmd.category, items: [] };
        seen.set(cmd.category, group);
        groups.push(group);
      }
      seen.get(cmd.category).items.push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // ============================================================
  // RESET STATE WHEN PALETTE OPENS
  // Clear query, reset selection, focus input
  // ============================================================
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay ensures the DOM is painted before we focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // ============================================================
  // CLAMP SELECTED INDEX — keep it within bounds when results change
  // ============================================================
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // ============================================================
  // SCROLL SELECTED ITEM INTO VIEW
  // ============================================================
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // ============================================================
  // EXECUTE COMMAND — dispatch to the right handler
  // ============================================================
  const executeCommand = useCallback(
    (cmd) => {
      if (!cmd) return;

      switch (cmd.type) {
        case 'navigation':
          onNavigate?.(cmd.tabId);
          break;
        case 'action':
          onAction?.(cmd.actionId);
          break;
        case 'company':
          onCompanySelect?.(cmd.companyId);
          break;
        default:
          break;
      }

      // Always close the palette after executing
      onClose?.();
    },
    [onNavigate, onAction, onCompanySelect, onClose]
  );

  // ============================================================
  // KEYBOARD HANDLER — Arrow keys, Enter, Escape
  // ============================================================
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;

        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;

        default:
          break;
      }
    },
    [filteredCommands, selectedIndex, executeCommand, onClose]
  );

  // ============================================================
  // DON'T RENDER IF CLOSED
  // ============================================================
  if (!isOpen) return null;

  // ============================================================
  // RENDER — Compute a flat index counter for highlighting
  // We need a running index across all groups to match selectedIndex
  // ============================================================
  let flatIndex = 0;

  return (
    // ============ BACKDROP — full-screen overlay with blur ============
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
      style={{ background: COLORS.backdropBg, backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* ============ MODAL CONTAINER ============ */}
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          // Subtle glow effect around the modal
          boxShadow: `0 0 0 1px ${COLORS.border}, 0 25px 60px rgba(0,0,0,0.5)`,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ============ SEARCH INPUT ============ */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${COLORS.border}` }}
        >
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder-opacity-50"
            style={{ color: COLORS.text }}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0); // reset selection when query changes
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {/* --- Escape badge --- */}
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: COLORS.bg,
              color: COLORS.secondary,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* ============ COMMAND LIST ============ */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: '360px' }}
        >
          {filteredCommands.length === 0 ? (
            // --- Empty state ---
            <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.secondary }}>
              No commands found for &quot;{query}&quot;
            </div>
          ) : (
            // --- Grouped command list ---
            groupedCommands.map((group) => (
              <div key={group.category}>
                {/* ---- Category header ---- */}
                <div
                  className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: COLORS.secondary, background: COLORS.bg }}
                >
                  {group.category}
                </div>

                {/* ---- Items in this category ---- */}
                {group.items.map((cmd) => {
                  const thisIndex = flatIndex++;
                  const isSelected = thisIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      ref={(el) => { itemRefs.current[thisIndex] = el; }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-75"
                      style={{
                        background: isSelected ? COLORS.hoverBg : 'transparent',
                        color: isSelected ? COLORS.text : COLORS.secondary,
                        borderLeft: isSelected
                          ? `2px solid ${COLORS.accent}`
                          : '2px solid transparent',
                      }}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(thisIndex)}
                    >
                      {/* ---- Icon ---- */}
                      <span className="text-base w-6 text-center shrink-0">
                        {cmd.icon}
                      </span>

                      {/* ---- Label ---- */}
                      <span className="flex-1 truncate" style={{ color: COLORS.text }}>
                        {cmd.label}
                      </span>

                      {/* ---- Active indicator (for navigation items) ---- */}
                      {cmd.isActive && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: COLORS.accent + '22', color: COLORS.accent }}
                        >
                          Active
                        </span>
                      )}

                      {/* ---- Keyboard shortcut badge ---- */}
                      {cmd.shortcut && (
                        <kbd
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: COLORS.bg,
                            color: COLORS.secondary,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ============ FOOTER — hint text ============ */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[11px]"
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            color: COLORS.secondary,
            background: COLORS.bg,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>↑</kbd>
              <kbd className="font-mono px-1 py-0.5 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>↵</kbd>
              select
            </span>
          </div>
          <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
