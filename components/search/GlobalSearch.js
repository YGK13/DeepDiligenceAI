'use client';

// ============================================================================
// components/search/GlobalSearch.js — DueDrill: Global Search & Filter
// ============================================================================
// Full-featured search overlay that searches across ALL companies' data —
// names, sectors, stages, team members, financials, notes, and every other
// string field in every section. Results are grouped by company with the
// matched field highlighted. Supports keyboard navigation (arrow keys,
// Enter, Escape), debounced input (300ms), and filter chips for sector,
// stage, score range, and deal stage.
//
// PROPS:
//   companies   — array of company objects (full shape from useCompanies)
//   onNavigate  — callback(companyId, sectionId) to jump to a result
//   onClose     — callback() to dismiss the search overlay
//
// ARCHITECTURE:
//   1. Flatten all company data into searchable records (field + value + path)
//   2. On each keystroke (debounced), filter records by query match
//   3. Group results by company, show matched field name + highlighted snippet
//   4. Filter chips narrow results by sector/stage/score/deal stage
//   5. Arrow keys move a "focused index" through the flat result list
//   6. Enter navigates to the focused result; Escape closes the overlay
// ============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { calculateOverallScore } from '@/lib/scoring';
import { SECTOR_OPTIONS, STAGE_OPTIONS } from '@/lib/constants';

// ============================================================================
// SECTION DISPLAY NAMES — human-friendly labels for search result context
// ============================================================================
const SECTION_LABELS = {
  overview: 'Overview',
  team: 'Team',
  product: 'Product',
  market: 'Market',
  business: 'Business Model',
  traction: 'Traction',
  financial: 'Financial',
  competitive: 'Competitive',
  ip: 'IP & Tech',
  customers: 'Customers',
  investors: 'Investors',
  regulatory: 'Regulatory',
  legal: 'Legal',
  israel: 'Israel',
  risks: 'Risks',
  deal: 'Deal Terms',
};

// ============================================================================
// FIELD DISPLAY NAMES — more readable labels for common field keys
// ============================================================================
// Maps camelCase field keys to human-readable labels so the search results
// say "CEO Name" instead of "ceoName". Only the most common fields are listed;
// anything not in this map gets auto-formatted from camelCase.
const FIELD_LABELS = {
  companyName: 'Company Name',
  websiteUrl: 'Website',
  yearFounded: 'Year Founded',
  hqCity: 'HQ City',
  hqCountry: 'HQ Country',
  elevatorPitch: 'Elevator Pitch',
  oneLineSummary: 'One-Line Summary',
  employeeCount: 'Employee Count',
  ceoName: 'CEO Name',
  ceoBackground: 'CEO Background',
  ctoName: 'CTO Name',
  ctoBackground: 'CTO Background',
  coFounders: 'Co-Founders',
  founderMarketFit: 'Founder-Market Fit',
  previousExits: 'Previous Exits',
  totalRaised: 'Total Raised',
  monthlyBurnRate: 'Monthly Burn Rate',
  cashOnHand: 'Cash on Hand',
  currentArr: 'Current ARR',
  mrrGrowthRate: 'MRR Growth Rate',
  roundName: 'Round Name',
  leadInvestor: 'Lead Investor',
  leadInvestorCommitted: 'Lead Investor Committed',
  preMoneyValuation: 'Pre-Money Valuation',
  targetRaise: 'Target Raise',
  keyRisksTop5: 'Key Risks (Top 5)',
  productDescription: 'Product Description',
  techStack: 'Tech Stack',
  tam: 'TAM',
  sam: 'SAM',
  som: 'SOM',
  revenueModel: 'Revenue Model',
  pricingModel: 'Pricing Model',
  avgContractValue: 'Avg Contract Value',
  grossMargin: 'Gross Margin',
  netRevenueRetention: 'Net Revenue Retention',
  directCompetitors: 'Direct Competitors',
  indirectCompetitors: 'Indirect Competitors',
  keyCustomers: 'Key Customers',
  patentsFiled: 'Patents Filed',
  corporateStructure: 'Corporate Structure',
  pendingLitigation: 'Pending Litigation',
  dealSource: 'Deal Source',
  referredBy: 'Referred By',
  sector: 'Sector',
  stage: 'Stage',
  subSector: 'Sub-Sector',
};

// ============================================================================
// DEAL STAGE OPTIONS — for the deal stage filter chip
// ============================================================================
const DEAL_STAGE_OPTIONS = [
  { value: 'screening', label: 'Screening' },
  { value: 'first-meeting', label: 'First Meeting' },
  { value: 'deep-dive', label: 'Deep Dive' },
  { value: 'ic-review', label: 'IC Review' },
  { value: 'term-sheet', label: 'Term Sheet' },
  { value: 'closing', label: 'Closing' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'passed', label: 'Passed' },
];

// ============================================================================
// SCORE RANGE OPTIONS — for the score range filter chip
// ============================================================================
const SCORE_RANGES = [
  { value: '8-10', label: '8-10 (Strong)', min: 8, max: 10 },
  { value: '6-8', label: '6-8 (Good)', min: 6, max: 8 },
  { value: '4-6', label: '4-6 (Average)', min: 4, max: 6 },
  { value: '0-4', label: '0-4 (Weak)', min: 0, max: 4 },
];

// ============================================================================
// HELPER: Convert camelCase to human-readable label
// ============================================================================
// Falls back to this when a field key isn't in FIELD_LABELS.
// "founderMarketFit" → "Founder Market Fit"
function camelToLabel(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ============================================================================
// HELPER: Get display label for a field key
// ============================================================================
function getFieldLabel(fieldKey) {
  return FIELD_LABELS[fieldKey] || camelToLabel(fieldKey);
}

// ============================================================================
// HELPER: Highlight matching text with a <mark> tag
// ============================================================================
// Returns an array of React elements with matched portions wrapped in <mark>.
// Case-insensitive matching. Shows a snippet of up to 120 chars around the
// first match to keep results compact.
function highlightMatch(text, query) {
  if (!text || !query) return text;

  const str = String(text);
  const lowerStr = str.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerStr.indexOf(lowerQuery);

  if (matchIndex === -1) return str;

  // ---- Extract a snippet window around the match ----
  // Show 40 chars before and 80 chars after the match start
  const snippetStart = Math.max(0, matchIndex - 40);
  const snippetEnd = Math.min(str.length, matchIndex + query.length + 80);
  const snippet = str.slice(snippetStart, snippetEnd);
  const prefix = snippetStart > 0 ? '...' : '';
  const suffix = snippetEnd < str.length ? '...' : '';

  // ---- Build highlighted elements ----
  const relativeMatchStart = matchIndex - snippetStart;
  const before = snippet.slice(0, relativeMatchStart);
  const match = snippet.slice(relativeMatchStart, relativeMatchStart + query.length);
  const after = snippet.slice(relativeMatchStart + query.length);

  return (
    <span>
      {prefix}
      {before}
      <mark
        className="bg-[#4a7dff]/30 text-[#e8e9ed] rounded px-0.5"
        style={{ textDecoration: 'none' }}
      >
        {match}
      </mark>
      {after}
      {suffix}
    </span>
  );
}

// ============================================================================
// HELPER: Flatten a company into searchable records
// ============================================================================
// Walks every section of a company and extracts all string/number fields
// into a flat array of { companyId, companyName, sectionId, fieldKey,
// fieldLabel, value }. This is the "search index" for that company.
function flattenCompany(company) {
  const records = [];
  const companyId = company.id;
  const companyName =
    company.overview?.companyName ||
    company.overview?.name ||
    company.name ||
    'Unnamed';

  // The sections we want to make searchable
  const searchableSections = [
    'overview', 'team', 'product', 'market', 'business', 'traction',
    'financial', 'competitive', 'ip', 'customers', 'investors',
    'regulatory', 'legal', 'israel', 'risks', 'deal',
  ];

  for (const sectionId of searchableSections) {
    const section = company[sectionId];
    if (!section || typeof section !== 'object') continue;

    for (const [fieldKey, value] of Object.entries(section)) {
      // Skip score fields and non-searchable types
      if (fieldKey.endsWith('Score') || fieldKey.endsWith('Notes')) continue;
      if (typeof value === 'boolean') continue;
      if (value === null || value === undefined) continue;

      // Convert to string for searching
      const strValue = String(value).trim();
      if (!strValue || strValue === '0') continue;

      records.push({
        companyId,
        companyName,
        sectionId,
        fieldKey,
        fieldLabel: getFieldLabel(fieldKey),
        sectionLabel: SECTION_LABELS[sectionId] || sectionId,
        value: strValue,
      });
    }
  }

  return records;
}

// ============================================================================
// MAIN COMPONENT: GlobalSearch
// ============================================================================
export default function GlobalSearch({ companies = [], onNavigate, onClose }) {
  // ============================================================
  // STATE
  // ============================================================
  const [query, setQuery] = useState('');              // Raw input value
  const [debouncedQuery, setDebouncedQuery] = useState(''); // Debounced (300ms)
  const [focusedIndex, setFocusedIndex] = useState(0); // Keyboard nav index
  const [activeFilters, setActiveFilters] = useState({
    sector: '',        // Filter by sector value (e.g., 'ai-ml')
    stage: '',         // Filter by funding stage (e.g., 'series-a')
    scoreRange: '',    // Filter by score range (e.g., '8-10')
    dealStage: '',     // Filter by deal stage (e.g., 'deep-dive')
  });

  // ============================================================
  // REFS
  // ============================================================
  const inputRef = useRef(null);       // Auto-focus the search input
  const resultsRef = useRef(null);     // Scroll container for results
  const itemRefs = useRef([]);         // Refs for individual result items (scroll into view)

  // ============================================================
  // DEBOUNCE — 300ms delay before actually filtering
  // ============================================================
  // Prevents excessive re-renders while user is typing fast.
  // The debouncedQuery is what drives the actual search logic.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setFocusedIndex(0); // Reset selection when query changes
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ============================================================
  // AUTO-FOCUS — put cursor in search input on mount
  // ============================================================
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // ============================================================
  // ESCAPE KEY — close overlay on Escape from anywhere in the doc
  // ============================================================
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [onClose]);

  // ============================================================
  // BUILD SEARCH INDEX — flatten all companies into searchable records
  // ============================================================
  // Memoized so we only rebuild when companies array changes, not on
  // every keystroke. Also pre-compute overall scores for filter chips.
  const { searchIndex, companyScores } = useMemo(() => {
    const index = [];
    const scores = {};

    for (const company of companies) {
      scores[company.id] = calculateOverallScore(company);
      const records = flattenCompany(company);
      index.push(...records);
    }

    return { searchIndex: index, companyScores: scores };
  }, [companies]);

  // ============================================================
  // FILTER COMPANIES — apply filter chips BEFORE text search
  // ============================================================
  // Returns the set of company IDs that pass all active filters.
  // Text search then runs ONLY against records from these companies.
  const filteredCompanyIds = useMemo(() => {
    let filtered = companies;

    // ---- Sector filter ----
    if (activeFilters.sector) {
      filtered = filtered.filter((c) => {
        const sector = (c.overview?.sector || '').toLowerCase();
        return sector === activeFilters.sector.toLowerCase();
      });
    }

    // ---- Stage filter ----
    if (activeFilters.stage) {
      filtered = filtered.filter((c) => {
        const stage = (c.overview?.stage || '').toLowerCase();
        return stage === activeFilters.stage.toLowerCase();
      });
    }

    // ---- Score range filter ----
    if (activeFilters.scoreRange) {
      const range = SCORE_RANGES.find((r) => r.value === activeFilters.scoreRange);
      if (range) {
        filtered = filtered.filter((c) => {
          const score = companyScores[c.id] || 0;
          return score >= range.min && score < range.max;
        });
      }
    }

    // ---- Deal stage filter ----
    if (activeFilters.dealStage) {
      filtered = filtered.filter((c) => {
        return (c.dealStage || '') === activeFilters.dealStage;
      });
    }

    return new Set(filtered.map((c) => c.id));
  }, [companies, activeFilters, companyScores]);

  // ============================================================
  // SEARCH RESULTS — text match against the filtered search index
  // ============================================================
  // Groups results by company for display. Each group has:
  //   { companyId, companyName, score, matches: [{ sectionId, fieldLabel, value }] }
  // Limited to 5 matches per company and 50 total to keep the UI snappy.
  const searchResults = useMemo(() => {
    const lowerQuery = debouncedQuery.toLowerCase().trim();

    // If no query AND no filters, show nothing (empty state)
    const hasFilters = Object.values(activeFilters).some((v) => v);
    if (!lowerQuery && !hasFilters) return [];

    // Filter the search index by company filters + text match
    const matchedRecords = searchIndex.filter((record) => {
      // Must be in a company that passes the filter chips
      if (!filteredCompanyIds.has(record.companyId)) return false;

      // If there's a text query, the value must contain it
      if (lowerQuery) {
        return record.value.toLowerCase().includes(lowerQuery);
      }

      // If only filters are active (no text query), include all records
      // from matching companies — but we'll limit later
      return true;
    });

    // ---- Group by company ----
    const groupMap = new Map();
    for (const record of matchedRecords) {
      if (!groupMap.has(record.companyId)) {
        groupMap.set(record.companyId, {
          companyId: record.companyId,
          companyName: record.companyName,
          score: companyScores[record.companyId] || 0,
          matches: [],
        });
      }
      const group = groupMap.get(record.companyId);
      // Limit to 5 matches per company to avoid overwhelming results
      if (group.matches.length < 5) {
        group.matches.push({
          sectionId: record.sectionId,
          sectionLabel: record.sectionLabel,
          fieldKey: record.fieldKey,
          fieldLabel: record.fieldLabel,
          value: record.value,
        });
      }
    }

    return Array.from(groupMap.values());
  }, [debouncedQuery, searchIndex, filteredCompanyIds, activeFilters, companyScores]);

  // ============================================================
  // FLAT RESULT LIST — for keyboard navigation
  // ============================================================
  // Flattens the grouped results into a single ordered list so arrow
  // keys can move through every result sequentially.
  const flatResults = useMemo(() => {
    const flat = [];
    for (const group of searchResults) {
      for (const match of group.matches) {
        flat.push({
          companyId: group.companyId,
          companyName: group.companyName,
          score: group.score,
          ...match,
        });
      }
    }
    return flat;
  }, [searchResults]);

  // ============================================================
  // SCROLL FOCUSED ITEM INTO VIEW
  // ============================================================
  useEffect(() => {
    if (itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex]);

  // ============================================================
  // KEYBOARD HANDLER — arrow keys, enter, escape
  // ============================================================
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatResults.length > 0) {
        e.preventDefault();
        const item = flatResults[focusedIndex];
        if (item) {
          onNavigate?.(item.companyId, item.sectionId);
          onClose?.();
        }
      }
      // Escape is handled by the global listener above
    },
    [flatResults, focusedIndex, onNavigate, onClose]
  );

  // ============================================================
  // FILTER CHIP TOGGLE — set or clear a filter value
  // ============================================================
  const toggleFilter = useCallback((filterKey, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: prev[filterKey] === value ? '' : value,
    }));
    setFocusedIndex(0);
  }, []);

  // ============================================================
  // CLEAR ALL FILTERS
  // ============================================================
  const clearAllFilters = useCallback(() => {
    setActiveFilters({ sector: '', stage: '', scoreRange: '', dealStage: '' });
    setQuery('');
    setFocusedIndex(0);
    inputRef.current?.focus();
  }, []);

  // ---- Derived: are any filters active? ----
  const hasActiveFilters = Object.values(activeFilters).some((v) => v) || query.trim();

  // ---- Derived: score color for result badges ----
  const getResultScoreColor = (score) => {
    if (score >= 7) return '#34d399';   // green
    if (score >= 4) return '#f59e0b';   // amber
    return '#ef4444';                   // red
  };

  // ---- Track flat index for rendering ----
  let flatIndex = -1;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    // ---- Backdrop overlay ----
    // Clicking the backdrop (outside the search panel) closes the modal.
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the search panel
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* ============ SEARCH PANEL ============ */}
      <div
        className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: '#1e2130',
          border: '1px solid #2d3148',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ============ SEARCH INPUT BAR ============ */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid #2d3148' }}
        >
          {/* Search icon (magnifying glass) */}
          <svg
            className="w-5 h-5 shrink-0"
            style={{ color: '#9ca0b0' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search companies, people, financials, notes..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6b7084]"
            style={{ color: '#e8e9ed' }}
          />

          {/* Keyboard shortcut hint + close button */}
          <div className="flex items-center gap-2 shrink-0">
            <kbd
              className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                background: '#252836',
                color: '#6b7084',
                border: '1px solid #2d3148',
              }}
            >
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#252836] transition-colors"
              title="Close search"
            >
              <svg
                className="w-4 h-4"
                style={{ color: '#6b7084' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ============ FILTER CHIPS ============ */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: '1px solid #2d3148' }}
        >
          {/* ---- Sector filter dropdown ---- */}
          <FilterDropdown
            label="Sector"
            value={activeFilters.sector}
            options={SECTOR_OPTIONS.filter((o) => o.value)} // exclude the "Select..." placeholder
            onChange={(val) => toggleFilter('sector', val)}
          />

          {/* ---- Stage filter dropdown ---- */}
          <FilterDropdown
            label="Stage"
            value={activeFilters.stage}
            options={STAGE_OPTIONS.filter((o) => o.value)}
            onChange={(val) => toggleFilter('stage', val)}
          />

          {/* ---- Score range filter dropdown ---- */}
          <FilterDropdown
            label="Score"
            value={activeFilters.scoreRange}
            options={SCORE_RANGES.map((r) => ({ value: r.value, label: r.label }))}
            onChange={(val) => toggleFilter('scoreRange', val)}
          />

          {/* ---- Deal stage filter dropdown ---- */}
          <FilterDropdown
            label="Deal Stage"
            value={activeFilters.dealStage}
            options={DEAL_STAGE_OPTIONS}
            onChange={(val) => toggleFilter('dealStage', val)}
          />

          {/* ---- Clear all button (only shown when filters are active) ---- */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="ml-auto text-xs font-medium px-2 py-1 rounded transition-colors hover:bg-[#252836]"
              style={{ color: '#9ca0b0' }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* ============ RESULTS LIST ============ */}
        <div
          ref={resultsRef}
          className="flex-1 overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          {/* ---- Empty state: no query entered ---- */}
          {searchResults.length === 0 && !debouncedQuery && !hasActiveFilters && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <svg
                className="w-12 h-12 mb-3"
                style={{ color: '#2d3148' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm font-medium" style={{ color: '#9ca0b0' }}>
                Search across all your companies
              </p>
              <p className="text-xs mt-1" style={{ color: '#6b7084' }}>
                Type a name, keyword, or use the filters above to find anything in your due diligence data.
              </p>
              <div className="flex items-center gap-4 mt-4 text-[10px]" style={{ color: '#6b7084' }}>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-[#252836] border border-[#2d3148] font-mono mr-1">
                    &uarr;&darr;
                  </kbd>
                  Navigate
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-[#252836] border border-[#2d3148] font-mono mr-1">
                    Enter
                  </kbd>
                  Select
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-[#252836] border border-[#2d3148] font-mono mr-1">
                    Esc
                  </kbd>
                  Close
                </span>
              </div>
            </div>
          )}

          {/* ---- No results found ---- */}
          {searchResults.length === 0 && (debouncedQuery || hasActiveFilters) && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-sm font-medium" style={{ color: '#9ca0b0' }}>
                No results found
              </p>
              <p className="text-xs mt-1" style={{ color: '#6b7084' }}>
                {debouncedQuery
                  ? `No matches for "${debouncedQuery}". Try different keywords or adjust filters.`
                  : 'No companies match the selected filters. Try removing some filters.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: '#4a7dff',
                    color: '#ffffff',
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* ---- Grouped results ---- */}
          {searchResults.map((group) => (
            <div key={group.companyId} className="mb-1">
              {/* ---- Company group header ---- */}
              <div
                className="flex items-center gap-2 px-4 py-2 sticky top-0"
                style={{
                  background: '#171924',
                  borderBottom: '1px solid #2d3148',
                }}
              >
                {/* Company name */}
                <span className="text-xs font-semibold" style={{ color: '#e8e9ed' }}>
                  {group.companyName}
                </span>

                {/* Score badge */}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: getResultScoreColor(group.score),
                    background: `${getResultScoreColor(group.score)}15`,
                  }}
                >
                  {group.score > 0 ? group.score.toFixed(1) : '--'}
                </span>

                {/* Match count */}
                <span className="text-[10px] ml-auto" style={{ color: '#6b7084' }}>
                  {group.matches.length} match{group.matches.length !== 1 ? 'es' : ''}
                </span>
              </div>

              {/* ---- Individual match rows ---- */}
              {group.matches.map((match, matchIdx) => {
                flatIndex++;
                const currentFlatIndex = flatIndex;
                const isFocused = currentFlatIndex === focusedIndex;

                return (
                  <button
                    key={`${match.sectionId}-${match.fieldKey}-${matchIdx}`}
                    ref={(el) => { itemRefs.current[currentFlatIndex] = el; }}
                    onClick={() => {
                      onNavigate?.(group.companyId, match.sectionId);
                      onClose?.();
                    }}
                    onMouseEnter={() => setFocusedIndex(currentFlatIndex)}
                    className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors cursor-pointer"
                    style={{
                      background: isFocused ? '#252836' : 'transparent',
                      borderBottom: '1px solid #1a1d2a',
                    }}
                  >
                    {/* ---- Section badge ---- */}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 shrink-0"
                      style={{
                        background: '#2d3148',
                        color: '#9ca0b0',
                      }}
                    >
                      {match.sectionLabel}
                    </span>

                    {/* ---- Field name + matched value ---- */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: '#9ca0b0' }}>
                        {match.fieldLabel}
                      </div>
                      <div
                        className="text-xs mt-0.5 leading-relaxed truncate"
                        style={{ color: '#e8e9ed' }}
                      >
                        {debouncedQuery
                          ? highlightMatch(match.value, debouncedQuery)
                          : match.value.length > 120
                            ? match.value.slice(0, 120) + '...'
                            : match.value}
                      </div>
                    </div>

                    {/* ---- Arrow indicator when focused ---- */}
                    {isFocused && (
                      <svg
                        className="w-4 h-4 mt-1 shrink-0"
                        style={{ color: '#4a7dff' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* ---- Results count footer ---- */}
          {searchResults.length > 0 && (
            <div
              className="text-center py-2 text-[10px]"
              style={{ color: '#6b7084', borderTop: '1px solid #2d3148' }}
            >
              {flatResults.length} result{flatResults.length !== 1 ? 's' : ''} across{' '}
              {searchResults.length} company{searchResults.length !== 1 ? 'ies' : 'y'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: FilterDropdown
// ============================================================================
// A compact filter chip that doubles as a dropdown. When a value is selected,
// it shows as an active chip (blue background). Clicking it again or selecting
// the same value toggles it off.
//
// Props:
//   label    — display label (e.g., "Sector")
//   value    — currently selected value (empty string = not active)
//   options  — array of { value, label }
//   onChange — callback(value) when user picks an option
// ============================================================================
function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ---- Close dropdown when clicking outside ----
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // ---- Find the selected option's label for display ----
  const selectedLabel = options.find((o) => o.value === value)?.label;
  const isActive = !!value;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ---- Chip button ---- */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
        style={{
          background: isActive ? '#4a7dff' : '#252836',
          color: isActive ? '#ffffff' : '#9ca0b0',
          border: `1px solid ${isActive ? '#4a7dff' : '#2d3148'}`,
        }}
      >
        {isActive ? selectedLabel : label}

        {/* Chevron icon */}
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {/* Clear button (X) when active — stops event propagation so
            clicking X doesn't also toggle the dropdown */}
        {isActive && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(value); // toggle off by passing same value
              setOpen(false);
            }}
            className="ml-0.5 hover:text-white transition-colors cursor-pointer"
          >
            &times;
          </span>
        )}
      </button>

      {/* ---- Dropdown options list ---- */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-xl overflow-y-auto z-[110]"
          style={{
            background: '#252836',
            border: '1px solid #2d3148',
            maxHeight: '200px',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#2d3148]"
              style={{
                color: option.value === value ? '#4a7dff' : '#e8e9ed',
                fontWeight: option.value === value ? 600 : 400,
              }}
            >
              {option.label}
              {option.value === value && (
                <span className="float-right text-[#4a7dff]">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
