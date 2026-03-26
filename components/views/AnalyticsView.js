'use client';

// ============================================================================
// components/views/AnalyticsView.js — Fund-Level Analytics Dashboard
// ============================================================================
// Aggregate portfolio/pipeline analytics for fund managers. This is the view
// you show LPs and discuss in partner meetings — not per-company data, but
// fund-wide metrics: pipeline health, score distributions, sector breakdowns,
// conversion funnels, and top-scoring companies.
//
// PROPS:
//   companies — full array of all company objects from useCompanies hook
//
// ALL CHARTS ARE PURE CSS — no external chart libraries (recharts, chart.js, etc.)
// Every visualization uses colored divs with percentage widths for bars,
// CSS grid for layout, and inline styles for the dark theme palette.
// ============================================================================

import React, { useMemo } from 'react';
import { calculateOverallScore } from '@/lib/scoring';

// ============================================================================
// DARK THEME COLOR PALETTE
// ============================================================================
// Consistent with the rest of DueDrill's dark UI. Every component in this
// file references these constants — no magic hex strings scattered around.
const COLORS = {
  bgPrimary:     '#0f1117',
  bgCard:        '#1e2130',
  bgCardHover:   '#2d3148',
  textPrimary:   '#e8e9ed',
  textSecondary: '#9ca0b0',
  border:        '#2d3148',
  accentBlue:    '#4a7dff',
  accentGreen:   '#34d399',
  accentAmber:   '#f59e0b',
  accentRed:     '#ef4444',
  accentOrange:  '#f97316',
  accentPurple:  '#a78bfa',
  accentCyan:    '#22d3ee',
};

// ============================================================================
// DEAL STAGE DEFINITIONS — ordered pipeline from left to right
// ============================================================================
// Matches the stages in PipelineView.js exactly. "close" and "pass" are
// terminal stages — deals end here.
const DEAL_STAGES = [
  { id: 'first-look',     label: 'First Look' },
  { id: 'initial-screen', label: 'Initial Screen' },
  { id: 'deep-dive',      label: 'Deep Dive' },
  { id: 'ic-review',      label: 'IC Review' },
  { id: 'term-sheet',     label: 'Term Sheet' },
  { id: 'close',          label: 'Close' },
];

// ============================================================================
// SCORE RANGE BUCKETS — for the score distribution chart
// ============================================================================
// Four tiers from fail to strong pass, color-coded for instant readability.
const SCORE_BUCKETS = [
  { label: '0–3 (Fail)',       min: 0,   max: 3.99, color: COLORS.accentRed },
  { label: '4–5 (Weak)',       min: 4,   max: 5.99, color: COLORS.accentOrange },
  { label: '6–7 (Borderline)', min: 6,   max: 7.99, color: COLORS.accentAmber },
  { label: '8–10 (Pass)',      min: 8,   max: 10,   color: COLORS.accentGreen },
];

// ============================================================================
// SECTOR LABEL MAP — maps value keys to display labels
// ============================================================================
// Same sector values used in SECTOR_OPTIONS from constants.js, but we only
// need the value→label mapping here for display purposes.
const SECTOR_LABELS = {
  'saas': 'SaaS',
  'fintech': 'FinTech',
  'healthtech': 'HealthTech',
  'edtech': 'EdTech',
  'ecommerce': 'E-Commerce',
  'ai-ml': 'AI / ML',
  'cybersecurity': 'Cybersecurity',
  'devtools': 'DevTools',
  'biotech': 'BioTech',
  'cleantech': 'CleanTech',
  'proptech': 'PropTech',
  'insurtech': 'InsurTech',
  'legaltech': 'LegalTech',
  'agtech': 'AgTech',
  'gaming': 'Gaming',
  'web3': 'Web3',
  'robotics': 'Robotics',
  'defense': 'Defense',
  'other': 'Other',
};

// ============================================================================
// STAGE LABEL MAP — maps funding stage value keys to display labels
// ============================================================================
const STAGE_LABELS = {
  'pre-seed': 'Pre-Seed',
  'seed': 'Seed',
  'series-a': 'Series A',
  'series-b': 'Series B',
  'series-c': 'Series C',
  'series-d+': 'Series D+',
  'growth': 'Growth',
  'pre-ipo': 'Pre-IPO',
  'public': 'Public',
};

// ============================================================================
// HELPER: parseDollarString
// ============================================================================
// Attempts to extract a numeric dollar value from messy strings like
// "$4.2M", "$8M ($4M pre-seed + $4M seed)", "4,200,000", etc.
// Returns NaN if unparseable — caller should guard with isNaN().
function parseDollarString(str) {
  if (!str || typeof str !== 'string') return NaN;

  // Strip everything except digits, dots, and multiplier letters
  const cleaned = str.replace(/[^0-9.bmkBMK]/g, '');

  // Try to extract the first numeric portion with optional multiplier
  const match = str.match(/[\$]?\s*([\d,.]+)\s*(B|M|K)?/i);
  if (!match) return NaN;

  let num = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(num)) return NaN;

  // Apply multiplier
  const multiplier = (match[2] || '').toUpperCase();
  if (multiplier === 'B') num *= 1_000_000_000;
  else if (multiplier === 'M') num *= 1_000_000;
  else if (multiplier === 'K') num *= 1_000;

  return num;
}

// ============================================================================
// HELPER: formatDollar
// ============================================================================
// Formats a number into a compact dollar string: $4.2M, $1.5B, $800K, etc.
function formatDollar(amount) {
  if (isNaN(amount) || amount === 0) return '$0';
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

// ============================================================================
// HELPER: timeAgo
// ============================================================================
// Converts an ISO timestamp to a human-friendly relative time string.
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AnalyticsView({ companies = [] }) {

  // ==========================================================================
  // COMPUTED ANALYTICS DATA
  // ==========================================================================
  // All metrics are derived from the companies array using useMemo so we
  // don't recompute on every render — only when companies change.
  const analytics = useMemo(() => {

    // --- Pre-compute scores for every company ---
    const scored = companies.map((c) => ({
      company: c,
      score: calculateOverallScore(c),
      name: c.overview?.companyName || c.overview?.name || c.name || 'Unnamed',
      sector: c.overview?.sector || '',
      fundingStage: c.overview?.stage || '',
      dealStage: c.dealStage || 'first-look',
      totalRaised: c.financial?.totalRaised || '',
      createdAt: c.createdAt || '',
    }));

    // ======================================================================
    // A. PORTFOLIO SUMMARY METRICS
    // ======================================================================

    // Total companies in the pipeline
    const totalCompanies = scored.length;

    // Active deals = everything NOT in 'pass' stage
    const activeDeals = scored.filter((s) => s.dealStage !== 'pass').length;

    // Average DD score across all companies (0 if none)
    const avgScore = totalCompanies > 0
      ? Math.round((scored.reduce((sum, s) => sum + s.score, 0) / totalCompanies) * 10) / 10
      : 0;

    // Total capital deployed — sum totalRaised for companies in 'close' stage
    const closedCompanies = scored.filter((s) => s.dealStage === 'close');
    const totalCapitalDeployed = closedCompanies.reduce((sum, s) => {
      const amount = parseDollarString(s.totalRaised);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Pass rate — % of companies in 'pass' stage
    const passCount = scored.filter((s) => s.dealStage === 'pass').length;
    const passRate = totalCompanies > 0
      ? Math.round((passCount / totalCompanies) * 100)
      : 0;

    // Companies added this month (based on createdAt timestamp)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const addedThisMonth = scored.filter((s) => {
      if (!s.createdAt) return false;
      return new Date(s.createdAt) >= thisMonthStart;
    }).length;

    // ======================================================================
    // B. SCORE DISTRIBUTION — count companies in each score bucket
    // ======================================================================
    const scoreDistribution = SCORE_BUCKETS.map((bucket) => ({
      ...bucket,
      count: scored.filter((s) => s.score >= bucket.min && s.score <= bucket.max).length,
    }));
    const maxScoreBucket = Math.max(...scoreDistribution.map((b) => b.count), 1);

    // ======================================================================
    // C. PIPELINE FUNNEL — count at each deal stage + conversion rates
    // ======================================================================
    // Count companies at each active stage (excluding 'pass')
    const funnelStages = DEAL_STAGES.map((stage) => ({
      ...stage,
      count: scored.filter((s) => s.dealStage === stage.id).length,
    }));
    const maxFunnelCount = Math.max(...funnelStages.map((s) => s.count), 1);

    // Conversion rates between adjacent stages
    // e.g., if 20 companies at First Look and 10 at Initial Screen, rate = 50%
    const funnelWithConversion = funnelStages.map((stage, i) => {
      if (i === 0) return { ...stage, conversionRate: null };
      const prevCount = funnelStages[i - 1].count;
      const rate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;
      return { ...stage, conversionRate: rate };
    });

    // ======================================================================
    // D. SECTOR BREAKDOWN — count companies per sector
    // ======================================================================
    const sectorCounts = {};
    scored.forEach((s) => {
      const key = s.sector || 'other';
      sectorCounts[key] = (sectorCounts[key] || 0) + 1;
    });
    // Sort by count descending
    const sectorBreakdown = Object.entries(sectorCounts)
      .map(([key, count]) => ({ key, label: SECTOR_LABELS[key] || key, count }))
      .sort((a, b) => b.count - a.count);
    const maxSectorCount = Math.max(...sectorBreakdown.map((s) => s.count), 1);

    // ======================================================================
    // E. FUNDING STAGE DISTRIBUTION — count companies per funding stage
    // ======================================================================
    const stageCounts = {};
    scored.forEach((s) => {
      const key = s.fundingStage || 'unknown';
      stageCounts[key] = (stageCounts[key] || 0) + 1;
    });
    const stageBreakdown = Object.entries(stageCounts)
      .map(([key, count]) => ({ key, label: STAGE_LABELS[key] || key || 'Unknown', count }))
      .sort((a, b) => b.count - a.count);
    const maxStageCount = Math.max(...stageBreakdown.map((s) => s.count), 1);

    // ======================================================================
    // F. TOP SCORING COMPANIES — top 5 by DD score
    // ======================================================================
    const topCompanies = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s, i) => ({
        rank: i + 1,
        name: s.name,
        score: s.score,
        fundingStage: STAGE_LABELS[s.fundingStage] || s.fundingStage || '—',
        sector: SECTOR_LABELS[s.sector] || s.sector || '—',
        dealStage: DEAL_STAGES.find((d) => d.id === s.dealStage)?.label || s.dealStage || '—',
      }));

    // ======================================================================
    // G. RECENT ACTIVITY — last 10 activity log entries across ALL companies
    // ======================================================================
    const allActivities = [];
    scored.forEach((s) => {
      const log = s.company.activityLog || [];
      log.forEach((entry) => {
        allActivities.push({
          companyName: s.name,
          type: entry.type || 'note',
          text: entry.text || '',
          date: entry.date || '',
        });
      });
    });
    // Sort by date descending, take top 10
    const recentActivity = allActivities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    return {
      totalCompanies,
      activeDeals,
      avgScore,
      totalCapitalDeployed,
      passRate,
      passCount,
      addedThisMonth,
      scoreDistribution,
      maxScoreBucket,
      funnelWithConversion,
      maxFunnelCount,
      sectorBreakdown,
      maxSectorCount,
      stageBreakdown,
      maxStageCount,
      topCompanies,
      recentActivity,
    };
  }, [companies]);

  // ==========================================================================
  // SHARED STYLES — reusable style objects to keep JSX clean
  // ==========================================================================
  const cardStyle = {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    padding: '20px',
  };

  const sectionTitleStyle = {
    color: COLORS.textPrimary,
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '16px',
  };

  // ==========================================================================
  // EMPTY STATE — no companies yet
  // ==========================================================================
  if (companies.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
        <h2 style={{ color: COLORS.textPrimary, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          No Analytics Data Yet
        </h2>
        <p style={{ color: COLORS.textSecondary, fontSize: '14px' }}>
          Add companies to your pipeline to see fund-level analytics here.
        </p>
      </div>
    );
  }

  // ==========================================================================
  // RENDER — Full Analytics Dashboard
  // ==========================================================================
  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: COLORS.textPrimary, fontSize: '24px', fontWeight: 700, margin: 0 }}>
          Fund Analytics
        </h1>
        <p style={{ color: COLORS.textSecondary, fontSize: '13px', marginTop: '4px' }}>
          Aggregate portfolio metrics across {analytics.totalCompanies} companies
        </p>
      </div>

      {/* ================================================================== */}
      {/* A. PORTFOLIO SUMMARY CARDS                                         */}
      {/* ================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '28px',
      }}>
        {/* Total Companies */}
        <SummaryCard
          label="Total Pipeline"
          value={analytics.totalCompanies}
          icon="🏢"
          color={COLORS.accentBlue}
        />
        {/* Active Deals */}
        <SummaryCard
          label="Active Deals"
          value={analytics.activeDeals}
          icon="🔥"
          color={COLORS.accentGreen}
        />
        {/* Average DD Score */}
        <SummaryCard
          label="Avg DD Score"
          value={analytics.avgScore.toFixed(1)}
          icon="⭐"
          color={COLORS.accentAmber}
        />
        {/* Capital Deployed */}
        <SummaryCard
          label="Capital Deployed"
          value={formatDollar(analytics.totalCapitalDeployed)}
          icon="💰"
          color={COLORS.accentGreen}
        />
        {/* Pass Rate */}
        <SummaryCard
          label="Pass Rate"
          value={`${analytics.passRate}%`}
          subtext={`${analytics.passCount} passed`}
          icon="🚫"
          color={COLORS.accentRed}
        />
        {/* Added This Month */}
        <SummaryCard
          label="Added This Month"
          value={analytics.addedThisMonth}
          icon="📥"
          color={COLORS.accentPurple}
        />
      </div>

      {/* ================================================================== */}
      {/* B. SCORE DISTRIBUTION — horizontal bar chart                       */}
      {/* ================================================================== */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={sectionTitleStyle}>Score Distribution</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {analytics.scoreDistribution.map((bucket) => (
            <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Label */}
              <div style={{
                color: COLORS.textSecondary,
                fontSize: '12px',
                width: '120px',
                flexShrink: 0,
                textAlign: 'right',
              }}>
                {bucket.label}
              </div>
              {/* Bar */}
              <div style={{
                flex: 1,
                height: '24px',
                background: '#161822',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(bucket.count / analytics.maxScoreBucket) * 100}%`,
                  background: bucket.color,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                  minWidth: bucket.count > 0 ? '4px' : '0px',
                }} />
              </div>
              {/* Count */}
              <div style={{
                color: COLORS.textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                width: '30px',
                textAlign: 'right',
              }}>
                {bucket.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* C. PIPELINE FUNNEL — visual funnel with conversion rates           */}
      {/* ================================================================== */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={sectionTitleStyle}>Pipeline Funnel</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {analytics.funnelWithConversion.map((stage, i) => {
            // Calculate a width percentage to create the funnel shape.
            // The first stage is always 100%, subsequent stages shrink based on count
            // relative to the max count. Minimum width of 15% so labels are readable.
            const widthPct = analytics.maxFunnelCount > 0
              ? Math.max(15, (stage.count / analytics.maxFunnelCount) * 100)
              : 15;

            // Color gradient from blue (top) to green (bottom/close)
            const stageColors = [
              COLORS.accentBlue,
              '#5b8af5',
              '#6c9cf0',
              COLORS.accentAmber,
              COLORS.accentOrange,
              COLORS.accentGreen,
            ];
            const barColor = stageColors[i] || COLORS.accentBlue;

            return (
              <div key={stage.id}>
                {/* Conversion rate arrow between stages */}
                {stage.conversionRate !== null && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 0',
                  }}>
                    <span style={{
                      color: COLORS.textSecondary,
                      fontSize: '10px',
                      fontWeight: 500,
                    }}>
                      ↓ {stage.conversionRate}% conversion
                    </span>
                  </div>
                )}
                {/* Funnel bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: `${widthPct}%`,
                    background: barColor,
                    borderRadius: '6px',
                    padding: '10px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'width 0.4s ease',
                  }}>
                    <span style={{
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}>
                      {stage.label}
                    </span>
                    <span style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}>
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* D & E: SECTOR + STAGE BREAKDOWN — side by side on desktop          */}
      {/* ================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}>

        {/* D. SECTOR BREAKDOWN */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Sector Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analytics.sectorBreakdown.length === 0 && (
              <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>No sector data available.</p>
            )}
            {analytics.sectorBreakdown.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  color: COLORS.textSecondary,
                  fontSize: '12px',
                  width: '100px',
                  flexShrink: 0,
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </div>
                <div style={{
                  flex: 1,
                  height: '20px',
                  background: '#161822',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(item.count / analytics.maxSectorCount) * 100}%`,
                    background: COLORS.accentBlue,
                    borderRadius: '4px',
                    transition: 'width 0.4s ease',
                    minWidth: '4px',
                  }} />
                </div>
                <div style={{
                  color: COLORS.textPrimary,
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '24px',
                  textAlign: 'right',
                }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* E. FUNDING STAGE DISTRIBUTION */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Stage Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analytics.stageBreakdown.length === 0 && (
              <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>No stage data available.</p>
            )}
            {analytics.stageBreakdown.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  color: COLORS.textSecondary,
                  fontSize: '12px',
                  width: '100px',
                  flexShrink: 0,
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </div>
                <div style={{
                  flex: 1,
                  height: '20px',
                  background: '#161822',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(item.count / analytics.maxStageCount) * 100}%`,
                    background: COLORS.accentPurple,
                    borderRadius: '4px',
                    transition: 'width 0.4s ease',
                    minWidth: '4px',
                  }} />
                </div>
                <div style={{
                  color: COLORS.textPrimary,
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '24px',
                  textAlign: 'right',
                }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* F. TOP SCORING COMPANIES — table                                   */}
      {/* ================================================================== */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={sectionTitleStyle}>Top Scoring Companies</div>
        {analytics.topCompanies.length === 0 ? (
          <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>No scored companies yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}>
              <thead>
                <tr>
                  {['#', 'Company', 'Score', 'Funding Stage', 'Sector', 'Deal Stage'].map((header) => (
                    <th key={header} style={{
                      color: COLORS.textSecondary,
                      fontWeight: 600,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.topCompanies.map((row) => (
                  <tr key={row.rank} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {/* Rank */}
                    <td style={{ padding: '10px 12px', color: COLORS.textSecondary, fontWeight: 600 }}>
                      {row.rank}
                    </td>
                    {/* Company Name */}
                    <td style={{ padding: '10px 12px', color: COLORS.textPrimary, fontWeight: 600 }}>
                      {row.name}
                    </td>
                    {/* Score — color-coded */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: '#fff',
                        background: row.score >= 8 ? COLORS.accentGreen
                          : row.score >= 6 ? COLORS.accentAmber
                          : row.score >= 4 ? COLORS.accentOrange
                          : COLORS.accentRed,
                      }}>
                        {row.score.toFixed(1)}
                      </span>
                    </td>
                    {/* Funding Stage */}
                    <td style={{ padding: '10px 12px', color: COLORS.textSecondary }}>
                      {row.fundingStage}
                    </td>
                    {/* Sector */}
                    <td style={{ padding: '10px 12px', color: COLORS.textSecondary }}>
                      {row.sector}
                    </td>
                    {/* Deal Stage */}
                    <td style={{ padding: '10px 12px', color: COLORS.textSecondary }}>
                      {row.dealStage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* G. RECENT ACTIVITY — last 10 entries across all companies          */}
      {/* ================================================================== */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>Recent Activity</div>
        {analytics.recentActivity.length === 0 ? (
          <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
            No activity logged yet. Activity entries appear here as you add notes, change stages, and research companies.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analytics.recentActivity.map((entry, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}>
                {/* Activity type badge */}
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  background: entry.type === 'stage-change' ? COLORS.accentBlue
                    : entry.type === 'research' ? COLORS.accentPurple
                    : entry.type === 'meeting' ? COLORS.accentGreen
                    : COLORS.bgCardHover,
                  color: entry.type === 'note' ? COLORS.textSecondary : '#fff',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  {entry.type}
                </span>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: COLORS.textPrimary,
                    fontSize: '13px',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.text}
                  </div>
                  <div style={{
                    color: COLORS.textSecondary,
                    fontSize: '11px',
                    marginTop: '2px',
                  }}>
                    {entry.companyName} &middot; {timeAgo(entry.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: SummaryCard
// ============================================================================
// Reusable metric card for the top summary row. Shows icon, label, and value
// with an accent-colored left border for visual hierarchy.
function SummaryCard({ label, value, subtext, icon, color }) {
  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '10px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{
          color: COLORS.textSecondary,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        color: COLORS.textPrimary,
        fontSize: '26px',
        fontWeight: 700,
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{
          color: COLORS.textSecondary,
          fontSize: '11px',
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
