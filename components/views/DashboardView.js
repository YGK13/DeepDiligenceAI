'use client';

// ============================================================================
// components/views/DashboardView.js — Dashboard Overview Panel
// ============================================================================
// Displays a high-level overview of the due diligence analysis:
//   1. Overall Score badge with verdict text
//   2. Score Grid — card for each SCORE_WEIGHTS category
//   3. Completion Stats — per-section field counts
//   4. Overall Verdict text (read-only)
//
// Props:
//   company — full company data object containing section sub-objects
//             e.g., company.team, company.product, company.market, etc.
// ============================================================================

import React, { useMemo } from 'react';
import {
  calculateOverallScore,
  getScoreColor,
  getScoreVerdict,
  calculateCompletionStats,
} from '@/lib/scoring';
import { SCORE_WEIGHTS, NAV_ITEMS } from '@/lib/constants';

// ============ SCORE CATEGORY LABELS ============
// Human-readable labels for each SCORE_WEIGHTS key.
// Used for display in the score grid cards.
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

// ============ HEX COLORS FOR DARK THEME ============
// Since getScoreColor() returns Tailwind class names designed for light themes,
// we use our own hex-based color function for the dark-themed dashboard.
// This keeps the cards consistent with the app's dark color palette.
function getScoreHex(score) {
  const num = parseFloat(score) || 0;
  if (num >= 8)  return '#34d399';  // emerald/green — excellent
  if (num >= 7)  return '#34d399';  // green — good
  if (num >= 5)  return '#f59e0b';  // amber — average
  if (num >= 4)  return '#f97316';  // orange — below average
  return '#ef4444';                 // red — poor
}

// ============ COMPONENT ============
export default function DashboardView({ company }) {
  // ============ CALCULATE OVERALL SCORE ============
  // The scoring function reads from company[sectionKey][field] per SCORE_WEIGHTS
  const overallScore = useMemo(
    () => calculateOverallScore(company),
    [company]
  );

  // Determine verdict text and color based on overall score
  const verdict = getScoreVerdict(overallScore);
  const scoreColor = getScoreHex(overallScore);

  // ============ COMPLETION STATS ============
  // Use the centralized calculateCompletionStats utility
  const completionStats = useMemo(
    () => calculateCompletionStats(company),
    [company]
  );

  // ============ BUILD SECTION COMPLETION LIST ============
  // Convert completionStats into an ordered array aligned with NAV_ITEMS
  const sectionCompletionList = useMemo(() => {
    const skipIds = new Set(['dashboard', 'report', 'settings']);
    const list = [];

    for (const navItem of NAV_ITEMS) {
      if (skipIds.has(navItem.id)) continue;
      const stat = completionStats[navItem.id];
      if (stat && stat.total > 0) {
        list.push({
          id: navItem.id,
          label: navItem.label,
          icon: navItem.icon,
          filled: stat.filled,
          total: stat.total,
          pct: stat.percentage,
        });
      }
    }
    return list;
  }, [completionStats]);

  // ============ KEY METRICS ============
  // Pull headline metrics from the company data for the quick-glance card
  const keyMetrics = useMemo(() => {
    if (!company) return [];
    const ov = company.overview || {};
    const tm = company.team || {};
    const tr = company.traction || {};
    const fi = company.financial || {};
    const dl = company.deal || {};

    return [
      { label: 'Stage', value: ov.stage || '—' },
      { label: 'Sector', value: ov.sector || '—' },
      { label: 'Founded', value: ov.yearFounded || '—' },
      { label: 'Team Size', value: tm.totalTeamSize || '—' },
      { label: 'Monthly Revenue', value: tr.monthlyRevenue ? `$${Number(tr.monthlyRevenue).toLocaleString()}` : '—' },
      { label: 'Burn Rate', value: fi.monthlyBurnRate ? `$${Number(fi.monthlyBurnRate).toLocaleString()}/mo` : '—' },
      { label: 'Total Raised', value: fi.totalRaised ? `$${Number(fi.totalRaised).toLocaleString()}` : '—' },
      { label: 'Ask', value: dl.roundSize ? `$${Number(dl.roundSize).toLocaleString()}` : '—' },
    ];
  }, [company]);

  return (
    <div className="space-y-6">
      {/* ============ SECTION 0: KEY METRICS ROW ============ */}
      {/* Quick-glance metrics strip — the most important numbers at a glance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {keyMetrics.map((m) => (
          <div
            key={m.label}
            className="bg-[#1e2130] border border-[#2d3148] rounded-lg px-4 py-3"
          >
            <p className="text-[#6b7084] text-[10px] uppercase tracking-wider font-medium mb-1">
              {m.label}
            </p>
            <p className="text-[#e8e9ed] text-sm font-semibold truncate">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* ============ SECTION 1: OVERALL SCORE ============ */}
      {/* Large centered score badge with verdict text */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-6 text-center">
        <h2 className="text-[#9ca0b0] text-xs font-semibold uppercase tracking-wider mb-4">
          Overall Due Diligence Score
        </h2>

        {/* Large circular score badge — 64x64 */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full border-2 ring-2 inline-flex items-center justify-center font-bold text-2xl"
            style={{
              borderColor: scoreColor,
              color: scoreColor,
              backgroundColor: `${scoreColor}15`,   // 15% opacity fill
              boxShadow: `0 0 20px ${scoreColor}20`, // subtle glow
            }}
            aria-label={`Overall score: ${overallScore} out of 10`}
            title={`Overall score: ${overallScore}/10`}
          >
            {overallScore}
          </div>
        </div>

        {/* Verdict text — colored to match score */}
        <p
          className="text-lg font-bold mb-1"
          style={{ color: scoreColor }}
        >
          {verdict}
        </p>
        <p className="text-[#6b7084] text-xs">
          Weighted average across {Object.keys(SCORE_WEIGHTS).length} categories
        </p>

        {/* Overall completion percentage */}
        {completionStats.overall && (
          <p className="text-[#9ca0b0] text-xs mt-2">
            {completionStats.overall.percentage}% complete ({completionStats.overall.filled}/{completionStats.overall.total} fields)
          </p>
        )}
      </div>

      {/* ============ SECTION 2: SCORE GRID ============ */}
      {/* Grid of score cards for each weighted category */}
      <div>
        <h2 className="text-[#9ca0b0] text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          Category Scores
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(SCORE_WEIGHTS).map(([sectionKey, config]) => {
            // Look up the actual score from company[sectionKey][field]
            const sectionData = company?.[sectionKey] || {};
            const scoreValue = parseFloat(sectionData[config.field]) || 0;
            const color = getScoreHex(scoreValue);
            const weightPct = Math.round(config.weight * 100);
            const label = SCORE_LABELS[sectionKey] || sectionKey;

            return (
              <div
                key={sectionKey}
                className="bg-[#252836] border border-[#2d3148] rounded-lg p-3.5 text-center"
              >
                {/* Category label — uppercase, muted, small */}
                <p className="text-[#6b7084] text-[10px] uppercase tracking-wider font-medium mb-2 truncate">
                  {label}
                </p>

                {/* Score value — large, color-coded */}
                <p
                  className="text-2xl font-bold mb-1"
                  style={{ color }}
                >
                  {scoreValue}
                </p>

                {/* Weight percentage */}
                <p className="text-[#6b7084] text-[10px] mb-2">
                  {weightPct}% weight
                </p>

                {/* Completion bar — shows score as percentage of 10 */}
                <div className="w-full h-1.5 bg-[#1a1d27] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${scoreValue * 10}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ SECTION 3: COMPLETION STATS ============ */}
      {/* Per-section field completion counts */}
      <div>
        <h2 className="text-[#9ca0b0] text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          Section Completion
        </h2>
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-4">
          {sectionCompletionList.length === 0 ? (
            <p className="text-[#6b7084] text-sm text-center py-4">
              No section data entered yet. Start filling in sections to track progress.
            </p>
          ) : (
            <div className="space-y-2.5">
              {sectionCompletionList.map((stat) => (
                <div key={stat.id} className="flex items-center gap-3">
                  {/* Section icon */}
                  <span className="text-sm w-6 text-center shrink-0">{stat.icon}</span>

                  {/* Label and counts */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[#e8e9ed] text-xs font-medium truncate">
                        {stat.label}
                      </p>
                      <p className="text-[#6b7084] text-[10px] shrink-0 ml-2">
                        {stat.filled}/{stat.total} fields
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1 bg-[#252836] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${stat.pct}%`,
                          backgroundColor: stat.pct >= 70
                            ? '#34d399'   // green — mostly complete
                            : stat.pct >= 30
                              ? '#f59e0b' // amber — partially complete
                              : '#ef4444', // red — barely started
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 4: OVERALL VERDICT ============ */}
      {/* Read-only display of the overall verdict/notes if set */}
      {company?.verdictNotes && (
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-4">
          <h2 className="text-[#9ca0b0] text-xs font-semibold uppercase tracking-wider mb-3">
            Overall Verdict Notes
          </h2>
          <div className="bg-[#252836] border border-[#2d3148] rounded-md p-4 text-[#e8e9ed] text-sm leading-relaxed whitespace-pre-wrap">
            {company.verdictNotes}
          </div>
        </div>
      )}
    </div>
  );
}
