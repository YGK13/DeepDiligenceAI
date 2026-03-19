'use client';

// ============================================================================
// components/views/ComparisonView.js — Side-by-Side Company Comparison
// ============================================================================
// Lets investors compare multiple portfolio companies at a glance.
// Displays a score comparison table (all 12 SCORE_WEIGHTS categories) and
// a key metrics comparison table (stage, sector, revenue, burn, team size, etc.)
// side by side for 2-5 selected companies.
//
// WHY this view exists:
// When an investor has 5-20 companies in their pipeline, they need a fast way
// to stack-rank and compare. Viewing one dashboard at a time is slow. This view
// puts the critical numbers in a single scrollable grid so you can spot the
// strongest deal in seconds.
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
// This ordering matches the intuition that Team > Product > Market > ... > Deal Terms.
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
// SCORE COLOR UTILITY
// ============================================================================
// Returns hex color for a 0-10 score using the 3-tier system specified:
//   green (>=7), amber (>=4), red (<4)
// This simplified 3-tier approach (vs. DashboardView's 5-tier) makes the
// comparison table scannable — you want quick red/amber/green signals, not nuance.
function getScoreHex(score) {
  const num = parseFloat(score) || 0;
  if (num >= 7) return '#34d399'; // green — strong
  if (num >= 4) return '#f59e0b'; // amber — borderline
  return '#ef4444';               // red — weak
}

// ============================================================================
// HELPER: Extract company display name
// ============================================================================
// Companies store their name in overview.companyName or overview.name.
// Falls back to "Unnamed" if neither exists. Used everywhere in this component.
function getCompanyName(company) {
  return company?.overview?.companyName || company?.overview?.name || 'Unnamed';
}

// ============================================================================
// HELPER: Format currency values for display
// ============================================================================
// Converts numeric values to human-readable currency strings.
// e.g., 1500000 -> "$1.5M", 250000 -> "$250K", 0 -> "—"
function formatCurrency(value) {
  const num = parseFloat(value);
  if (!num || isNaN(num)) return '\u2014'; // em dash for missing data
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

// ============================================================================
// HELPER: Format generic values for the metrics table
// ============================================================================
// Returns a display-ready string for any metric value.
// Missing/empty values show an em dash so the table stays visually clean.
function formatMetric(value) {
  if (value === null || value === undefined || value === '') return '\u2014';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

// ============================================================================
// MAX / MIN SELECTION CONSTANTS
// ============================================================================
const MIN_COMPARE = 2;  // Need at least 2 companies to compare
const MAX_COMPARE = 5;  // Cap at 5 to keep the table readable

// ============================================================================
// COMPONENT
// ============================================================================
export default function ComparisonView({ companies = [] }) {
  // ==========================================================================
  // STATE: Which companies are selected for comparison
  // ==========================================================================
  // Initialize with first 2 company IDs (if available).
  // Using a lazy initializer so we only compute this once on mount.
  const [selectedIds, setSelectedIds] = useState(() => {
    if (companies.length >= 2) return [companies[0].id, companies[1].id];
    if (companies.length === 1) return [companies[0].id];
    return [];
  });

  // ==========================================================================
  // DERIVED: The actual company objects for selected IDs
  // ==========================================================================
  // Filter + preserve selection order so columns stay consistent.
  const selectedCompanies = useMemo(() => {
    return selectedIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean); // Remove any IDs that no longer exist in the companies array
  }, [selectedIds, companies]);

  // ==========================================================================
  // HANDLER: Toggle a company's selection on/off
  // ==========================================================================
  const handleToggle = useCallback(
    (companyId) => {
      setSelectedIds((prev) => {
        // If already selected, remove it
        if (prev.includes(companyId)) {
          return prev.filter((id) => id !== companyId);
        }
        // If at max, don't add more
        if (prev.length >= MAX_COMPARE) return prev;
        // Add it
        return [...prev, companyId];
      });
    },
    []
  );

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
      {/* Users pick 2-5 companies to compare. Checkbox UI with company names. */}
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
          Select Companies to Compare (min {MIN_COMPARE}, max {MAX_COMPARE})
        </h2>

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
                  (isSelected
                    ? 'ring-2 ring-[#4a7dff] '
                    : 'hover:bg-[#252836] ')
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

        {/* Selection count indicator */}
        <p className="text-xs mt-3" style={{ color: '#6b7084' }}>
          {selectedIds.length} of {companies.length} selected
          {selectedIds.length < MIN_COMPARE && (
            <span style={{ color: '#ef4444' }}>
              {' '}&mdash; Select at least {MIN_COMPARE} to compare
            </span>
          )}
        </p>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: SCORE COMPARISON TABLE                                  */}
      {/* ================================================================== */}
      {/* Only render when we have the minimum selection */}
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
              Score Comparison (0-10)
            </h2>
          </div>

          {/* Scrollable table wrapper for mobile responsiveness */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>
              {/* ---- Table Header: Company Names ---- */}
              <thead>
                <tr style={{ borderBottom: '1px solid #2d3148' }}>
                  {/* Row label column */}
                  <th
                    className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: '#6b7084', width: '180px', minWidth: '140px' }}
                  >
                    Category
                  </th>
                  {/* One column per selected company */}
                  {selectedCompanies.map((company) => (
                    <th
                      key={company.id}
                      className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                      style={{ color: '#e8e9ed', minWidth: '100px' }}
                    >
                      {getCompanyName(company)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ---- Score rows: one per SCORE_WEIGHTS category ---- */}
                {Object.entries(SCORE_WEIGHTS).map(([sectionKey, config], idx) => (
                  <tr
                    key={sectionKey}
                    style={{
                      borderBottom: '1px solid #2d314830',
                      // Alternate row background for readability in dark theme
                      background: idx % 2 === 0 ? 'transparent' : '#252836',
                    }}
                  >
                    {/* Category label */}
                    <td
                      className="px-5 py-2.5 font-medium"
                      style={{ color: '#9ca0b0' }}
                    >
                      {SCORE_LABELS[sectionKey] || sectionKey}
                      {/* Show weight as subtle percentage */}
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: '#6b7084' }}
                      >
                        ({Math.round(config.weight * 100)}%)
                      </span>
                    </td>

                    {/* Score cells — one per selected company */}
                    {selectedCompanies.map((company) => {
                      const sectionData = company?.[sectionKey] || {};
                      const scoreValue = parseFloat(sectionData[config.field]) || 0;
                      const color = getScoreHex(scoreValue);

                      return (
                        <td
                          key={company.id}
                          className="text-center px-4 py-2.5 font-bold"
                          style={{ color }}
                        >
                          {scoreValue.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* ---- Bottom row: Overall Weighted Score ---- */}
                <tr
                  style={{
                    borderTop: '2px solid #4a7dff',
                    background: '#4a7dff10',
                  }}
                >
                  <td
                    className="px-5 py-3 font-bold text-xs uppercase tracking-wider"
                    style={{ color: '#4a7dff' }}
                  >
                    Overall Score
                  </td>
                  {selectedCompanies.map((company) => {
                    const overall = calculateOverallScore(company);
                    const color = getScoreHex(overall);

                    return (
                      <td
                        key={company.id}
                        className="text-center px-4 py-3 font-bold text-lg"
                        style={{ color }}
                      >
                        {overall.toFixed(1)}
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
      {/* Non-score data points that investors use for quick filtering:       */}
      {/* stage, sector, founding year, revenue, burn, team size, funding.    */}
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

          {/* Scrollable table wrapper for mobile responsiveness */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>
              {/* ---- Table Header: Company Names (same as scores table) ---- */}
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
                      style={{ color: '#e8e9ed', minWidth: '100px' }}
                    >
                      {getCompanyName(company)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ---- Stage ---- */}
                <MetricRow
                  label="Stage"
                  companies={selectedCompanies}
                  getValue={(c) => formatMetric(c?.overview?.stage)}
                  rowIndex={0}
                />

                {/* ---- Sector ---- */}
                <MetricRow
                  label="Sector"
                  companies={selectedCompanies}
                  getValue={(c) => formatMetric(c?.overview?.sector)}
                  rowIndex={1}
                />

                {/* ---- Year Founded ---- */}
                <MetricRow
                  label="Year Founded"
                  companies={selectedCompanies}
                  getValue={(c) => formatMetric(c?.overview?.yearFounded)}
                  rowIndex={2}
                />

                {/* ---- Monthly Revenue ---- */}
                <MetricRow
                  label="Monthly Revenue"
                  companies={selectedCompanies}
                  getValue={(c) => formatCurrency(c?.traction?.monthlyRevenue)}
                  rowIndex={3}
                />

                {/* ---- Monthly Burn Rate ---- */}
                <MetricRow
                  label="Monthly Burn Rate"
                  companies={selectedCompanies}
                  getValue={(c) => formatCurrency(c?.financial?.monthlyBurnRate)}
                  rowIndex={4}
                />

                {/* ---- Team Size ---- */}
                <MetricRow
                  label="Team Size"
                  companies={selectedCompanies}
                  getValue={(c) => formatMetric(c?.team?.totalTeamSize)}
                  rowIndex={5}
                />

                {/* ---- Funding Raised ---- */}
                {/* Check both financial.totalRaised and deal.totalRaised */}
                {/* because different companies may store this in different places */}
                <MetricRow
                  label="Funding Raised"
                  companies={selectedCompanies}
                  getValue={(c) => {
                    const fromFinancial = c?.financial?.totalRaised;
                    const fromDeal = c?.deal?.totalRaised;
                    // Prefer financial.totalRaised, fall back to deal.totalRaised
                    return formatCurrency(fromFinancial || fromDeal);
                  }}
                  rowIndex={6}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MetricRow — Reusable table row for the key metrics section
// ============================================================================
// WHY a separate component? Keeps the JSX in the main component clean and
// avoids repeating the same <tr>/<td> pattern 7 times. Each row has:
//   - A label cell on the left
//   - One value cell per selected company
//   - Alternating row backgrounds for readability
//
// Props:
//   label      — string displayed in the first column
//   companies  — array of selected company objects
//   getValue   — function(company) => display string for that company
//   rowIndex   — numeric index for alternating row backgrounds
function MetricRow({ label, companies, getValue, rowIndex }) {
  return (
    <tr
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
        {label}
      </td>

      {/* Value cells — one per company */}
      {companies.map((company) => (
        <td
          key={company.id}
          className="text-center px-4 py-2.5"
          style={{ color: '#e8e9ed' }}
        >
          {getValue(company)}
        </td>
      ))}
    </tr>
  );
}
