'use client';

// ============================================================================
// components/views/ComparisonView.js — Side-by-Side Company Comparison Matrix
// ============================================================================
// Enhanced comparison tool for VC IC (Investment Committee) meetings.
// Features:
//   1. Visual score heatmap with gradient-colored cells (red → amber → green)
//   2. Key metrics comparison with best-in-class highlighting
//   3. Verdict summary row (Strong Pass / Pass / Borderline / Weak / Fail)
//   4. CSV export button for offline analysis
//   5. Click-to-sort on any score category header
//
// Props:
//   companies — full array of company objects from useCompanies hook
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { SCORE_WEIGHTS } from '@/lib/constants';
import { calculateOverallScore } from '@/lib/scoring';

// ============================================================================
// SCORE SECTION LABELS
// ============================================================================
// Human-readable labels for each scored category, ordered by weight (heaviest first).
const SCORE_LABELS = {
  team:        'Team',
  product:     'Product',
  market:      'Market',
  traction:    'Traction',
  business:    'Business Model',
  competitive: 'Competitive',
  financial:   'Financial',
  ip:          'IP & Tech',
  regulatory:  'Regulatory',
  israel:      'Israel',
  legal:       'Legal',
  deal:        'Deal Terms',
};

// ============================================================================
// HEATMAP COLOR UTILITY
// ============================================================================
// Returns a background color for heatmap cells on a smooth 1-10 gradient:
//   1-3  = deep red  (#dc2626 → #ef4444)
//   4-6  = amber     (#f59e0b → #eab308)
//   7-10 = green     (#22c55e → #15803d)
// Uses interpolation within each band for a smooth visual gradient rather
// than hard 3-tier jumps. The returned object includes bg color and text color
// (white for dark backgrounds, dark for light backgrounds).
function getHeatmapStyle(score) {
  const num = parseFloat(score) || 0;

  // Clamp to 0-10
  const clamped = Math.max(0, Math.min(10, num));

  // Deep red (#991b1b) → Red (#dc2626) → Orange (#ea580c) → Amber (#d97706)
  // → Yellow-green (#65a30d) → Green (#16a34a) → Deep green (#15803d)
  // We use a stepped gradient with smooth transitions within each step.
  let bg, text;

  if (clamped <= 1) {
    bg = '#991b1b'; // deep red
    text = '#fecaca';
  } else if (clamped <= 2) {
    bg = '#b91c1c'; // red-800
    text = '#fecaca';
  } else if (clamped <= 3) {
    bg = '#dc2626'; // red-600
    text = '#fef2f2';
  } else if (clamped <= 4) {
    bg = '#ea580c'; // orange-600
    text = '#fff7ed';
  } else if (clamped <= 5) {
    bg = '#d97706'; // amber-600
    text = '#fffbeb';
  } else if (clamped <= 6) {
    bg = '#ca8a04'; // yellow-600
    text = '#fefce8';
  } else if (clamped <= 7) {
    bg = '#65a30d'; // lime-600
    text = '#f7fee7';
  } else if (clamped <= 8) {
    bg = '#16a34a'; // green-600
    text = '#f0fdf4';
  } else if (clamped <= 9) {
    bg = '#15803d'; // green-700
    text = '#dcfce7';
  } else {
    bg = '#166534'; // green-800
    text = '#dcfce7';
  }

  return { backgroundColor: bg, color: text };
}

// ============================================================================
// VERDICT UTILITY
// ============================================================================
// Maps an overall 0-10 score to an IC-ready verdict label and color.
// These match the language VCs actually use in investment memos:
//   9-10 = Strong Pass  (rare — exceptional deal)
//   7-8.9 = Pass        (investable, proceed to term sheet)
//   5-6.9 = Borderline  (needs more diligence or pass with reservations)
//   3-4.9 = Weak        (significant concerns, likely pass)
//   0-2.9 = Fail        (hard pass)
function getVerdict(score) {
  const num = parseFloat(score) || 0;
  if (num >= 9) return { label: 'Strong Pass', bg: '#166534', text: '#dcfce7', border: '#15803d' };
  if (num >= 7) return { label: 'Pass', bg: '#16a34a', text: '#f0fdf4', border: '#22c55e' };
  if (num >= 5) return { label: 'Borderline', bg: '#d97706', text: '#fffbeb', border: '#f59e0b' };
  if (num >= 3) return { label: 'Weak', bg: '#ea580c', text: '#fff7ed', border: '#f97316' };
  return { label: 'Fail', bg: '#991b1b', text: '#fecaca', border: '#dc2626' };
}

// ============================================================================
// HELPER: Extract company display name
// ============================================================================
function getCompanyName(company) {
  return company?.overview?.companyName || company?.overview?.name || 'Unnamed';
}

// ============================================================================
// HELPER: Format currency values for display
// ============================================================================
function formatCurrency(value) {
  const num = parseFloat(value);
  if (!num || isNaN(num)) return '\u2014';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

// ============================================================================
// HELPER: Format generic metric values
// ============================================================================
function formatMetric(value) {
  if (value === null || value === undefined || value === '') return '\u2014';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

// ============================================================================
// HELPER: Parse a numeric value from a company metric (for best-value detection)
// ============================================================================
// Tries to extract a raw number from a potentially formatted value.
// Returns NaN if the value cannot be parsed as a number.
function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return value;
  // Strip currency symbols, commas, letters for parsing
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned);
}

// ============================================================================
// KEY METRICS DEFINITION
// ============================================================================
// Defines the rows for the key metrics comparison section.
// Each entry specifies:
//   label       — displayed in the first column
//   getValue    — function to extract raw value from a company
//   format      — function to format value for display
//   higherBetter — true if a higher number is "better" (green highlight)
//                  false if lower is better (e.g., burn rate)
//                  null if not comparable (e.g., year founded, stage)
const KEY_METRICS = [
  {
    key: 'revenue',
    label: 'Revenue (ARR / Monthly)',
    getValue: (c) => {
      // Check multiple possible locations for revenue data
      const monthly = parseFloat(c?.traction?.monthlyRevenue) || 0;
      const arr = parseFloat(c?.traction?.arr || c?.financial?.arr) || 0;
      // Prefer ARR if available, otherwise annualize monthly
      return arr || (monthly * 12);
    },
    format: (v) => formatCurrency(v),
    higherBetter: true,
  },
  {
    key: 'teamSize',
    label: 'Team Size',
    getValue: (c) => parseFloat(c?.team?.totalTeamSize) || 0,
    format: (v) => (v ? v.toLocaleString() : '\u2014'),
    higherBetter: true,
  },
  {
    key: 'totalRaised',
    label: 'Total Raised',
    getValue: (c) => {
      const fromFinancial = parseFloat(c?.financial?.totalRaised) || 0;
      const fromDeal = parseFloat(c?.deal?.totalRaised) || 0;
      return fromFinancial || fromDeal;
    },
    format: (v) => formatCurrency(v),
    higherBetter: true,
  },
  {
    key: 'burnRate',
    label: 'Burn Rate (Monthly)',
    getValue: (c) => parseFloat(c?.financial?.monthlyBurnRate) || 0,
    format: (v) => formatCurrency(v),
    higherBetter: false, // lower burn = better
  },
  {
    key: 'runway',
    label: 'Runway (Months)',
    getValue: (c) => {
      // Calculate runway: cash / monthly burn
      const cash = parseFloat(c?.financial?.cashOnHand || c?.financial?.currentCash) || 0;
      const burn = parseFloat(c?.financial?.monthlyBurnRate) || 0;
      if (burn <= 0) return 0;
      return Math.round(cash / burn);
    },
    format: (v) => (v ? `${v} mo` : '\u2014'),
    higherBetter: true,
  },
  {
    key: 'yearFounded',
    label: 'Founded Year',
    getValue: (c) => parseFloat(c?.overview?.yearFounded) || 0,
    format: (v) => (v ? String(v) : '\u2014'),
    higherBetter: null, // not comparable
  },
];

// ============================================================================
// MAX / MIN SELECTION CONSTANTS
// ============================================================================
const MIN_COMPARE = 2;
const MAX_COMPARE = 5;

// ============================================================================
// CSV EXPORT UTILITY
// ============================================================================
// Builds a CSV string from the comparison data and triggers a browser download.
// Includes: score heatmap data, key metrics, overall score and verdict.
function exportComparisonCSV(selectedCompanies) {
  const rows = [];

  // Header row: Category, Company1, Company2, ...
  const names = selectedCompanies.map(getCompanyName);
  rows.push(['Category', ...names].join(','));

  // Score rows
  for (const [sectionKey, config] of Object.entries(SCORE_WEIGHTS)) {
    const label = SCORE_LABELS[sectionKey] || sectionKey;
    const scores = selectedCompanies.map((c) => {
      const section = c?.[sectionKey] || {};
      return (parseFloat(section[config.field]) || 0).toFixed(1);
    });
    rows.push([label, ...scores].join(','));
  }

  // Overall score row
  const overalls = selectedCompanies.map((c) => calculateOverallScore(c).toFixed(1));
  rows.push(['Overall Score', ...overalls].join(','));

  // Verdict row
  const verdicts = selectedCompanies.map((c) => {
    const score = calculateOverallScore(c);
    return getVerdict(score).label;
  });
  rows.push(['Verdict', ...verdicts].join(','));

  // Blank separator
  rows.push('');
  rows.push(['Key Metrics', ...names].join(','));

  // Key metrics rows
  for (const metric of KEY_METRICS) {
    const values = selectedCompanies.map((c) => {
      const raw = metric.getValue(c);
      return metric.format(raw);
    });
    // Escape values that might contain commas
    const escaped = values.map((v) => `"${v}"`);
    rows.push([metric.label, ...escaped].join(','));
  }

  // Build CSV blob and trigger download
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `duedrill-comparison-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function ComparisonView({ companies = [] }) {

  // ==========================================================================
  // STATE: Which companies are selected for comparison
  // ==========================================================================
  const [selectedIds, setSelectedIds] = useState(() => {
    if (companies.length >= 2) return [companies[0].id, companies[1].id];
    if (companies.length === 1) return [companies[0].id];
    return [];
  });

  // ==========================================================================
  // STATE: Sort configuration for the score table
  // ==========================================================================
  // sortKey = null means no custom sort (show in selection order)
  // sortKey = 'team' | 'product' | ... | 'overall' means sort by that score desc
  const [sortKey, setSortKey] = useState(null);

  // ==========================================================================
  // DERIVED: The actual company objects for selected IDs
  // ==========================================================================
  const selectedCompanies = useMemo(() => {
    const mapped = selectedIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean);

    // If a sort key is active, sort the companies by that score descending
    if (!sortKey) return mapped;

    return [...mapped].sort((a, b) => {
      if (sortKey === 'overall') {
        return calculateOverallScore(b) - calculateOverallScore(a);
      }
      const config = SCORE_WEIGHTS[sortKey];
      if (!config) return 0;
      const scoreA = parseFloat(a?.[sortKey]?.[config.field]) || 0;
      const scoreB = parseFloat(b?.[sortKey]?.[config.field]) || 0;
      return scoreB - scoreA;
    });
  }, [selectedIds, companies, sortKey]);

  // ==========================================================================
  // HANDLER: Toggle a company's selection on/off
  // ==========================================================================
  const handleToggle = useCallback((companyId) => {
    setSelectedIds((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId);
      }
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, companyId];
    });
  }, []);

  // ==========================================================================
  // HANDLER: Sort by a score category (toggle: click once = sort, click again = unsort)
  // ==========================================================================
  const handleSort = useCallback((key) => {
    setSortKey((prev) => (prev === key ? null : key));
  }, []);

  // ==========================================================================
  // DERIVED: Find "best" value index for each key metric row
  // ==========================================================================
  // Returns a Map<metricKey, Set<companyIndex>> where the set contains indices
  // of companies that have the best (highest or lowest) value for that metric.
  const bestMetricIndices = useMemo(() => {
    const result = new Map();

    for (const metric of KEY_METRICS) {
      // Skip metrics that aren't comparable (like year founded)
      if (metric.higherBetter === null) {
        result.set(metric.key, new Set());
        continue;
      }

      const values = selectedCompanies.map((c) => metric.getValue(c));
      const validValues = values.filter((v) => v > 0);

      if (validValues.length === 0) {
        result.set(metric.key, new Set());
        continue;
      }

      const bestValue = metric.higherBetter
        ? Math.max(...validValues)
        : Math.min(...validValues);

      const bestSet = new Set();
      values.forEach((v, idx) => {
        if (v === bestValue && v > 0) bestSet.add(idx);
      });

      result.set(metric.key, bestSet);
    }

    return result;
  }, [selectedCompanies]);

  // ==========================================================================
  // EMPTY STATE: Not enough companies in portfolio to compare
  // ==========================================================================
  if (companies.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-4">{'\uD83D\uDCCA'}</div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: '#4a7dff' }}
        >
          Not Enough Companies to Compare
        </h2>
        <p className="text-sm max-w-md" style={{ color: '#9ca0b0' }}>
          You need at least 2 companies in your portfolio to use the comparison view.
          Currently you have {companies.length} company{companies.length === 1 ? '' : 'ies'}.
          Create more companies from the sidebar to start comparing.
        </p>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">

      {/* ================================================================== */}
      {/* SECTION 1: COMPANY SELECTION CHECKBOXES                            */}
      {/* ================================================================== */}
      <div
        className="rounded-lg p-5"
        style={{
          background: '#1e2130',
          border: '1px solid #2d3148',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#9ca0b0' }}
          >
            Select Companies to Compare (min {MIN_COMPARE}, max {MAX_COMPARE})
          </h2>

          {/* Export CSV button — only show when comparison is active */}
          {selectedCompanies.length >= MIN_COMPARE && (
            <button
              onClick={() => exportComparisonCSV(selectedCompanies)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-150 hover:brightness-110"
              style={{
                background: '#4a7dff',
                color: '#e8e9ed',
                border: '1px solid #5a8aff',
              }}
            >
              {/* Download icon (SVG) */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Comparison
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {companies.map((company) => {
            const isSelected = selectedIds.includes(company.id);
            const isDisabled = !isSelected && selectedIds.length >= MAX_COMPARE;

            return (
              <label
                key={company.id}
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer ' +
                  'transition-all duration-150 select-none ' +
                  (isDisabled ? 'opacity-40 cursor-not-allowed ' : '') +
                  (isSelected ? 'ring-2 ring-[#4a7dff] ' : 'hover:bg-[#252836] ')
                }
                style={{
                  background: isSelected ? '#4a7dff20' : '#252836',
                  border: '1px solid ' + (isSelected ? '#4a7dff' : '#2d3148'),
                  color: isSelected ? '#e8e9ed' : '#9ca0b0',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => handleToggle(company.id)}
                  className="accent-[#4a7dff] w-4 h-4"
                />
                {getCompanyName(company)}
              </label>
            );
          })}
        </div>

        {/* Selection count + sort indicator */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs" style={{ color: '#6b7084' }}>
            {selectedIds.length} of {companies.length} selected
            {selectedIds.length < MIN_COMPARE && (
              <span style={{ color: '#ef4444' }}>
                {' '}&mdash; Select at least {MIN_COMPARE} to compare
              </span>
            )}
          </p>
          {sortKey && (
            <p className="text-xs" style={{ color: '#4a7dff' }}>
              Sorted by: {sortKey === 'overall' ? 'Overall Score' : (SCORE_LABELS[sortKey] || sortKey)}
              <button
                onClick={() => setSortKey(null)}
                className="ml-2 underline hover:no-underline"
                style={{ color: '#9ca0b0' }}
              >
                clear
              </button>
            </p>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: SCORE HEATMAP TABLE                                     */}
      {/* ================================================================== */}
      {/* Color-coded cells: deep red (1-3) → amber (4-6) → deep green (7-10) */}
      {/* Click any category header to sort companies by that score (desc)    */}
      {selectedCompanies.length >= MIN_COMPARE && (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: '#1e2130',
            border: '1px solid #2d3148',
          }}
        >
          <div className="p-5 pb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#9ca0b0' }}
            >
              Score Heatmap (0-10) &mdash; Click headers to sort
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>

              {/* ---- Table Header: Company Names ---- */}
              <thead>
                <tr style={{ borderBottom: '2px solid #2d3148' }}>
                  <th
                    className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: '#6b7084', width: '180px', minWidth: '140px' }}
                  >
                    Category
                  </th>
                  {selectedCompanies.map((company) => (
                    <th
                      key={company.id}
                      className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                      style={{ color: '#e8e9ed', minWidth: '110px' }}
                    >
                      {getCompanyName(company)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ---- Score rows: one per SCORE_WEIGHTS category ---- */}
                {Object.entries(SCORE_WEIGHTS).map(([sectionKey, config]) => {
                  const isActive = sortKey === sectionKey;

                  return (
                    <tr
                      key={sectionKey}
                      style={{
                        borderBottom: '1px solid #2d314830',
                      }}
                    >
                      {/* Category label — clickable to sort */}
                      <td
                        className="px-5 py-2.5 font-medium cursor-pointer select-none transition-colors duration-100"
                        style={{
                          color: isActive ? '#4a7dff' : '#9ca0b0',
                          background: isActive ? '#4a7dff10' : 'transparent',
                        }}
                        onClick={() => handleSort(sectionKey)}
                        title={`Click to sort by ${SCORE_LABELS[sectionKey] || sectionKey}`}
                      >
                        {/* Sort arrow indicator */}
                        <span className="inline-block w-4 text-center mr-1" style={{ fontSize: '10px' }}>
                          {isActive ? '\u25BC' : '\u25B8'}
                        </span>
                        {SCORE_LABELS[sectionKey] || sectionKey}
                        {/* Weight percentage */}
                        <span
                          className="ml-2 text-[10px]"
                          style={{ color: '#6b7084' }}
                        >
                          ({Math.round(config.weight * 100)}%)
                        </span>
                      </td>

                      {/* Heatmap score cells */}
                      {selectedCompanies.map((company) => {
                        const sectionData = company?.[sectionKey] || {};
                        const scoreValue = parseFloat(sectionData[config.field]) || 0;
                        const heatStyle = getHeatmapStyle(scoreValue);

                        return (
                          <td
                            key={company.id}
                            className="text-center px-2 py-2"
                          >
                            {/* Score chip with heatmap background */}
                            <div
                              className="inline-flex items-center justify-center rounded-md font-bold text-sm"
                              style={{
                                ...heatStyle,
                                width: '52px',
                                height: '32px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            >
                              {scoreValue.toFixed(1)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* ---- Overall Score row ---- */}
                <tr
                  style={{
                    borderTop: '2px solid #4a7dff',
                    background: '#4a7dff10',
                  }}
                >
                  <td
                    className="px-5 py-3 font-bold text-xs uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: sortKey === 'overall' ? '#4a7dff' : '#4a7dff' }}
                    onClick={() => handleSort('overall')}
                    title="Click to sort by Overall Score"
                  >
                    <span className="inline-block w-4 text-center mr-1" style={{ fontSize: '10px' }}>
                      {sortKey === 'overall' ? '\u25BC' : '\u25B8'}
                    </span>
                    Overall Score
                  </td>
                  {selectedCompanies.map((company) => {
                    const overall = calculateOverallScore(company);
                    const heatStyle = getHeatmapStyle(overall);

                    return (
                      <td
                        key={company.id}
                        className="text-center px-2 py-3"
                      >
                        <div
                          className="inline-flex items-center justify-center rounded-md font-bold text-lg"
                          style={{
                            ...heatStyle,
                            width: '60px',
                            height: '38px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          }}
                        >
                          {overall.toFixed(1)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 3: KEY METRICS COMPARISON                                  */}
      {/* ================================================================== */}
      {/* Non-score data: revenue, team size, raised, burn, runway, founded. */}
      {/* Best value in each row is highlighted with a green border/glow.    */}
      {selectedCompanies.length >= MIN_COMPARE && (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: '#1e2130',
            border: '1px solid #2d3148',
          }}
        >
          <div className="p-5 pb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#9ca0b0' }}
            >
              Key Metrics Comparison
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2d3148' }}>
                  <th
                    className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: '#6b7084', width: '180px', minWidth: '140px' }}
                  >
                    Metric
                  </th>
                  {selectedCompanies.map((company) => (
                    <th
                      key={company.id}
                      className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                      style={{ color: '#e8e9ed', minWidth: '110px' }}
                    >
                      {getCompanyName(company)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {KEY_METRICS.map((metric, rowIndex) => {
                  const bestSet = bestMetricIndices.get(metric.key) || new Set();

                  return (
                    <tr
                      key={metric.key}
                      style={{
                        borderBottom: '1px solid #2d314830',
                        background: rowIndex % 2 === 0 ? 'transparent' : '#252836',
                      }}
                    >
                      {/* Metric label */}
                      <td
                        className="px-5 py-2.5 font-medium"
                        style={{ color: '#9ca0b0' }}
                      >
                        {metric.label}
                      </td>

                      {/* Value cells — best value gets green highlight */}
                      {selectedCompanies.map((company, idx) => {
                        const rawValue = metric.getValue(company);
                        const displayValue = metric.format(rawValue);
                        const isBest = bestSet.has(idx);

                        return (
                          <td
                            key={company.id}
                            className="text-center px-4 py-2.5"
                          >
                            <span
                              className="inline-block px-3 py-1 rounded-md font-medium text-sm"
                              style={{
                                color: isBest ? '#dcfce7' : '#e8e9ed',
                                background: isBest ? '#16a34a20' : 'transparent',
                                border: isBest ? '1px solid #16a34a' : '1px solid transparent',
                                boxShadow: isBest ? '0 0 8px rgba(34, 197, 94, 0.2)' : 'none',
                              }}
                            >
                              {displayValue}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 4: VERDICT SUMMARY ROW                                     */}
      {/* ================================================================== */}
      {/* Large verdict badges for each company: Strong Pass / Pass / etc.   */}
      {/* Color-coded to match the IC decision language.                     */}
      {selectedCompanies.length >= MIN_COMPARE && (
        <div
          className="rounded-lg p-5"
          style={{
            background: '#1e2130',
            border: '1px solid #2d3148',
          }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: '#9ca0b0' }}
          >
            IC Verdict Summary
          </h2>

          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompanies.length}, 1fr)` }}>
            {selectedCompanies.map((company) => {
              const overall = calculateOverallScore(company);
              const verdict = getVerdict(overall);

              return (
                <div
                  key={company.id}
                  className="rounded-lg p-4 text-center transition-all duration-200"
                  style={{
                    background: verdict.bg + '18', // 18 = ~10% alpha hex
                    border: `2px solid ${verdict.border}`,
                  }}
                >
                  {/* Company name */}
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2 truncate"
                    style={{ color: '#9ca0b0' }}
                    title={getCompanyName(company)}
                  >
                    {getCompanyName(company)}
                  </p>

                  {/* Overall score */}
                  <p
                    className="text-3xl font-bold mb-1"
                    style={{ color: verdict.text }}
                  >
                    {overall.toFixed(1)}
                  </p>

                  {/* Verdict label badge */}
                  <div
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{
                      background: verdict.bg,
                      color: verdict.text,
                      boxShadow: `0 2px 8px ${verdict.border}40`,
                    }}
                  >
                    {verdict.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
