'use client';

// ============================================================================
// components/views/PipelineView.js — Portfolio Pipeline Dashboard (Kanban)
// ============================================================================
// Critical view for VC fund managers — shows ALL companies in the investment
// pipeline across deal stages in a Kanban-style board. Think Carta meets
// Affinity CRM pipeline view.
//
// FEATURES:
//   1. Kanban columns for each deal stage (First Look → Close / Pass)
//   2. Company cards with name, sector, stage, score, days-in-stage, last activity
//   3. Summary stats row (total pipeline, active deals, avg score, closed/passed)
//   4. Quick filters: sector, funding stage, score range, sort order
//   5. Empty state for new users with no companies
//
// Props:
//   companies       — full array of company objects from useCompanies hook
//   onCompanySelect — callback(companyId) when a card is clicked
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { calculateOverallScore, getScoreVerdict } from '@/lib/scoring';

// ============================================================================
// DEAL STAGE CONFIGURATION
// ============================================================================
// Ordered pipeline stages from left to right. Each company has a dealStage
// field (defaults to 'first-look') that determines which column it appears in.
// "close" and "pass" are terminal stages — deals end here.
const DEAL_STAGES = [
  { id: 'first-look',     label: 'First Look',     emoji: '👀' },
  { id: 'initial-screen', label: 'Initial Screen',  emoji: '🔍' },
  { id: 'deep-dive',      label: 'Deep Dive',       emoji: '🏊' },
  { id: 'ic-review',      label: 'IC Review',        emoji: '👥' },
  { id: 'term-sheet',     label: 'Term Sheet',       emoji: '📝' },
  { id: 'close',          label: 'Close',            emoji: '✅' },
  { id: 'pass',           label: 'Pass',             emoji: '❌' },
];

// ============================================================================
// SCORE RANGE FILTER OPTIONS
// ============================================================================
// Quick buttons to filter by investment verdict threshold.
// Maps to the same thresholds used in getScoreVerdict from scoring.js.
const SCORE_FILTERS = [
  { id: 'all',         label: 'All',           min: 0 },
  { id: 'strong-pass', label: 'Strong Pass 8+', min: 8 },
  { id: 'pass',        label: 'Pass 7+',        min: 7 },
  { id: 'borderline',  label: 'Borderline 5+',  min: 5 },
];

// ============================================================================
// SORT OPTIONS
// ============================================================================
// Controls how cards are ordered within each column.
const SORT_OPTIONS = [
  { id: 'score',      label: 'Score' },
  { id: 'date-added', label: 'Date Added' },
  { id: 'name',       label: 'Company Name' },
  { id: 'days',       label: 'Days in Stage' },
];

// ============================================================================
// DARK THEME COLORS
// ============================================================================
// Consistent with the rest of DueDrill's dark UI.
const COLORS = {
  bgPrimary:   '#0f1117',
  bgCard:      '#1e2130',
  bgHover:     '#2d3148',
  bgColumn:    '#161822',
  textPrimary: '#e8e9ed',
  textSecondary: '#9ca0b0',
  border:      '#2d3148',
  accentBlue:  '#4a7dff',
  accentGreen: '#34d399',
  accentAmber: '#f59e0b',
  accentRed:   '#ef4444',
  accentOrange:'#f97316',
};

// ============================================================================
// SCORE → HEX COLOR
// ============================================================================
// Returns a hex color for a 0-10 score. 5-tier system matching DashboardView.
function getScoreHex(score) {
  const num = parseFloat(score) || 0;
  if (num >= 8) return COLORS.accentGreen;   // excellent — emerald
  if (num >= 7) return COLORS.accentGreen;   // good — green
  if (num >= 5) return COLORS.accentAmber;   // borderline — amber
  if (num >= 4) return COLORS.accentOrange;  // below average — orange
  return COLORS.accentRed;                   // poor — red
}

// ============================================================================
// HELPER: Extract readable sector label from company
// ============================================================================
function getSectorLabel(company) {
  const sector = company?.overview?.sector || '';
  if (!sector) return 'Unknown';
  // Capitalize and clean up slug-style values like 'ai-ml' → 'AI/ML'
  const SECTOR_MAP = {
    'saas': 'SaaS', 'fintech': 'FinTech', 'healthtech': 'HealthTech',
    'edtech': 'EdTech', 'ecommerce': 'E-Commerce', 'ai-ml': 'AI/ML',
    'cybersecurity': 'Cybersecurity', 'devtools': 'DevTools', 'biotech': 'BioTech',
    'cleantech': 'CleanTech', 'proptech': 'PropTech', 'insurtech': 'InsurTech',
    'legaltech': 'LegalTech', 'agtech': 'AgTech', 'gaming': 'Gaming',
    'web3': 'Web3', 'robotics': 'Robotics', 'defense': 'Defense', 'other': 'Other',
  };
  return SECTOR_MAP[sector] || sector;
}

// ============================================================================
// HELPER: Extract readable funding stage label from company
// ============================================================================
function getStageLabel(company) {
  const stage = company?.overview?.stage || '';
  if (!stage) return '—';
  const STAGE_MAP = {
    'pre-seed': 'Pre-Seed', 'seed': 'Seed', 'series-a': 'Series A',
    'series-b': 'Series B', 'series-c': 'Series C', 'series-d+': 'Series D+',
    'growth': 'Growth', 'pre-ipo': 'Pre-IPO', 'public': 'Public',
  };
  return STAGE_MAP[stage] || stage;
}

// ============================================================================
// HELPER: Calculate days since a date (for "days in stage" metric)
// ============================================================================
function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// HELPER: Format a date as relative "X days ago" or absolute if > 30 days
// ============================================================================
function formatLastActivity(dateStr) {
  if (!dateStr) return 'No activity';
  const days = daysSince(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 30) return `${days}d ago`;
  // Beyond 30 days, show month/day
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// COMPONENT: PipelineCard — Single company card within a Kanban column
// ============================================================================
function PipelineCard({ company, score, onClick }) {
  const name = company.overview?.companyName || company.overview?.name || 'Unnamed';
  const sector = getSectorLabel(company);
  const stage = getStageLabel(company);
  const verdict = getScoreVerdict(score);
  const scoreColor = getScoreHex(score);

  // "Days in stage" — uses dealStageDate if available, otherwise createdAt
  const daysInStage = daysSince(company.dealStageDate || company.createdAt);

  // "Last activity" — uses updatedAt timestamp
  const lastActivity = formatLastActivity(company.updatedAt);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        padding: '14px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        marginBottom: '8px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLORS.bgHover;
        e.currentTarget.style.borderColor = COLORS.accentBlue;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = COLORS.bgCard;
        e.currentTarget.style.borderColor = COLORS.border;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ---- Company Name ---- */}
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: COLORS.textPrimary,
        marginBottom: '8px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {name}
      </div>

      {/* ---- Sector + Funding Stage Row ---- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      }}>
        {/* Sector badge */}
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(74, 125, 255, 0.15)',
          color: COLORS.accentBlue,
          fontWeight: 500,
        }}>
          {sector}
        </span>
        {/* Funding stage badge */}
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(52, 211, 153, 0.15)',
          color: COLORS.accentGreen,
          fontWeight: 500,
        }}>
          {stage}
        </span>
      </div>

      {/* ---- Score + Verdict Row ---- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        {/* Numeric score with color-coded background */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: 700,
            color: scoreColor,
            lineHeight: 1,
          }}>
            {score > 0 ? score.toFixed(1) : '—'}
          </span>
          <span style={{
            fontSize: '11px',
            color: scoreColor,
            fontWeight: 500,
            opacity: 0.85,
          }}>
            {score > 0 ? verdict : 'Not Scored'}
          </span>
        </div>
      </div>

      {/* ---- Days in Stage + Last Activity Row ---- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: COLORS.textSecondary,
      }}>
        <span title="Days in current deal stage">
          {daysInStage}d in stage
        </span>
        <span title="Last activity date">
          {lastActivity}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: KanbanColumn — Single stage column in the pipeline board
// ============================================================================
function KanbanColumn({ stage, companies, scores, onCardClick }) {
  // Column header color hint — terminal stages get special colors
  const headerAccent = stage.id === 'close'
    ? COLORS.accentGreen
    : stage.id === 'pass'
      ? COLORS.accentRed
      : COLORS.accentBlue;

  return (
    <div style={{
      minWidth: '260px',
      maxWidth: '300px',
      flex: '1 1 260px',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.bgColumn,
      borderRadius: '12px',
      border: `1px solid ${COLORS.border}`,
      overflow: 'hidden',
    }}>
      {/* ---- Column Header ---- */}
      <div style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>{stage.emoji}</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: COLORS.textPrimary,
          }}>
            {stage.label}
          </span>
        </div>
        {/* Company count badge */}
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: headerAccent,
          background: `${headerAccent}20`,
          padding: '2px 8px',
          borderRadius: '10px',
          minWidth: '24px',
          textAlign: 'center',
        }}>
          {companies.length}
        </span>
      </div>

      {/* ---- Cards Container (scrollable) ---- */}
      <div style={{
        padding: '8px',
        overflowY: 'auto',
        flex: 1,
        // Max height prevents single column from dominating viewport
        maxHeight: 'calc(100vh - 320px)',
      }}>
        {companies.length === 0 ? (
          <div style={{
            padding: '20px 12px',
            textAlign: 'center',
            fontSize: '12px',
            color: COLORS.textSecondary,
            opacity: 0.6,
          }}>
            No companies
          </div>
        ) : (
          companies.map((c) => (
            <PipelineCard
              key={c.id}
              company={c}
              score={scores[c.id] || 0}
              onClick={() => onCardClick(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: PipelineView
// ============================================================================
export default function PipelineView({ companies, onCompanySelect }) {
  // ============================================================================
  // FILTER STATE
  // ============================================================================
  const [sectorFilter, setSectorFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  // ============================================================================
  // PRECOMPUTE SCORES FOR ALL COMPANIES
  // ============================================================================
  // We compute scores once and reuse them for filtering, sorting, and display.
  // This avoids recalculating inside every card render.
  const scores = useMemo(() => {
    const map = {};
    (companies || []).forEach((c) => {
      map[c.id] = calculateOverallScore(c);
    });
    return map;
  }, [companies]);

  // ============================================================================
  // EXTRACT UNIQUE SECTORS FOR FILTER DROPDOWN
  // ============================================================================
  // Dynamically built from actual company data so the filter stays relevant.
  const uniqueSectors = useMemo(() => {
    const set = new Set();
    (companies || []).forEach((c) => {
      const s = c.overview?.sector;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [companies]);

  // ============================================================================
  // EXTRACT UNIQUE FUNDING STAGES FOR FILTER DROPDOWN
  // ============================================================================
  const uniqueStages = useMemo(() => {
    const set = new Set();
    (companies || []).forEach((c) => {
      const s = c.overview?.stage;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [companies]);

  // ============================================================================
  // APPLY FILTERS
  // ============================================================================
  // Filter the full companies array down based on user selections.
  // All filters are AND-ed together (sector AND stage AND score).
  const filteredCompanies = useMemo(() => {
    let result = companies || [];

    // Sector filter
    if (sectorFilter !== 'all') {
      result = result.filter((c) => c.overview?.sector === sectorFilter);
    }

    // Funding stage filter
    if (stageFilter !== 'all') {
      result = result.filter((c) => c.overview?.stage === stageFilter);
    }

    // Score range filter — minimum score threshold
    if (scoreFilter !== 'all') {
      const minScore = SCORE_FILTERS.find((f) => f.id === scoreFilter)?.min || 0;
      result = result.filter((c) => (scores[c.id] || 0) >= minScore);
    }

    return result;
  }, [companies, sectorFilter, stageFilter, scoreFilter, scores]);

  // ============================================================================
  // SORT FILTERED COMPANIES
  // ============================================================================
  // Sorts the filtered list. Within each Kanban column, cards appear in this order.
  const sortedCompanies = useMemo(() => {
    const arr = [...filteredCompanies];

    switch (sortBy) {
      case 'score':
        // Highest score first — best deals rise to the top
        arr.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
        break;
      case 'date-added':
        // Most recent first — newest deals at top
        arr.sort((a, b) => {
          const da = new Date(b.createdAt || 0).getTime();
          const db = new Date(a.createdAt || 0).getTime();
          return da - db;
        });
        break;
      case 'name':
        // Alphabetical by company name
        arr.sort((a, b) => {
          const na = (a.overview?.companyName || a.overview?.name || '').toLowerCase();
          const nb = (b.overview?.companyName || b.overview?.name || '').toLowerCase();
          return na.localeCompare(nb);
        });
        break;
      case 'days':
        // Most days in stage first — stale deals surface for attention
        arr.sort((a, b) => {
          const da = daysSince(a.dealStageDate || a.createdAt);
          const db = daysSince(b.dealStageDate || b.createdAt);
          return db - da;
        });
        break;
      default:
        break;
    }

    return arr;
  }, [filteredCompanies, sortBy, scores]);

  // ============================================================================
  // GROUP COMPANIES BY DEAL STAGE INTO KANBAN COLUMNS
  // ============================================================================
  // Each company's dealStage field determines its column.
  // Companies without a dealStage default to 'first-look'.
  const columnData = useMemo(() => {
    const columns = {};
    DEAL_STAGES.forEach((s) => { columns[s.id] = []; });

    sortedCompanies.forEach((c) => {
      const stage = c.dealStage || 'first-look';
      if (columns[stage]) {
        columns[stage].push(c);
      } else {
        // Unknown stage → dump into first-look as fallback
        columns['first-look'].push(c);
      }
    });

    return columns;
  }, [sortedCompanies]);

  // ============================================================================
  // SUMMARY STATS
  // ============================================================================
  // Computed from the FULL companies list (not filtered) for an accurate overview.
  const stats = useMemo(() => {
    const all = companies || [];
    const total = all.length;

    // Active = everything except 'pass' stage
    const active = all.filter((c) => (c.dealStage || 'first-look') !== 'pass').length;

    // Average score across all companies (only those with scores > 0)
    const scored = all.filter((c) => (scores[c.id] || 0) > 0);
    const avgScore = scored.length > 0
      ? scored.reduce((sum, c) => sum + (scores[c.id] || 0), 0) / scored.length
      : 0;

    // Closed/passed this month — check if dealStageDate is within current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const closedThisMonth = all.filter((c) => {
      const stage = c.dealStage || 'first-look';
      if (stage !== 'close' && stage !== 'pass') return false;
      const d = new Date(c.dealStageDate || c.updatedAt || 0);
      return d >= monthStart;
    }).length;

    return { total, active, avgScore, closedThisMonth };
  }, [companies, scores]);

  // ============================================================================
  // CARD CLICK HANDLER
  // ============================================================================
  const handleCardClick = useCallback((companyId) => {
    if (onCompanySelect) onCompanySelect(companyId);
  }, [onCompanySelect]);

  // ============================================================================
  // EMPTY STATE — No companies at all
  // ============================================================================
  if (!companies || companies.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
        textAlign: 'center',
        padding: '40px',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔄</div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: COLORS.accentBlue,
          marginBottom: '8px',
        }}>
          Pipeline is Empty
        </h2>
        <p style={{
          fontSize: '14px',
          color: COLORS.textSecondary,
          maxWidth: '400px',
          lineHeight: 1.6,
        }}>
          Add your first company to start building your pipeline.
          Companies will appear here organized by deal stage as you progress them
          through your investment workflow.
        </p>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={{
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      overflow: 'hidden',
    }}>
      {/* ================================================================== */}
      {/* HEADER: Title + Description                                        */}
      {/* ================================================================== */}
      <div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: COLORS.textPrimary,
          marginBottom: '4px',
        }}>
          Portfolio Pipeline
        </h1>
        <p style={{
          fontSize: '13px',
          color: COLORS.textSecondary,
        }}>
          Track every deal from first look to close across your investment pipeline.
        </p>
      </div>

      {/* ================================================================== */}
      {/* SUMMARY STATS ROW                                                  */}
      {/* ================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {/* Total Pipeline */}
        <StatCard
          label="Total Pipeline"
          value={stats.total}
          icon="📊"
          color={COLORS.accentBlue}
        />
        {/* Active Deals */}
        <StatCard
          label="Active Deals"
          value={stats.active}
          icon="🚀"
          color={COLORS.accentGreen}
        />
        {/* Average Score */}
        <StatCard
          label="Avg. Score"
          value={stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}
          icon="⭐"
          color={COLORS.accentAmber}
        />
        {/* Closed/Passed This Month */}
        <StatCard
          label="Closed/Passed (Month)"
          value={stats.closedThisMonth}
          icon="📅"
          color={COLORS.textSecondary}
        />
      </div>

      {/* ================================================================== */}
      {/* QUICK FILTERS ROW                                                  */}
      {/* ================================================================== */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* ---- Sector Filter Dropdown ---- */}
        <FilterSelect
          label="Sector"
          value={sectorFilter}
          onChange={setSectorFilter}
          options={[
            { value: 'all', label: 'All Sectors' },
            ...uniqueSectors.map((s) => ({
              value: s,
              label: getSectorLabel({ overview: { sector: s } }),
            })),
          ]}
        />

        {/* ---- Funding Stage Filter Dropdown ---- */}
        <FilterSelect
          label="Stage"
          value={stageFilter}
          onChange={setStageFilter}
          options={[
            { value: 'all', label: 'All Stages' },
            ...uniqueStages.map((s) => ({
              value: s,
              label: getStageLabel({ overview: { stage: s } }),
            })),
          ]}
        />

        {/* ---- Score Range Filter Buttons ---- */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            fontSize: '12px',
            color: COLORS.textSecondary,
            marginRight: '4px',
          }}>
            Score:
          </span>
          {SCORE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setScoreFilter(f.id)}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${scoreFilter === f.id ? COLORS.accentBlue : COLORS.border}`,
                background: scoreFilter === f.id ? `${COLORS.accentBlue}25` : 'transparent',
                color: scoreFilter === f.id ? COLORS.accentBlue : COLORS.textSecondary,
                cursor: 'pointer',
                fontWeight: scoreFilter === f.id ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ---- Sort Dropdown ---- */}
        <FilterSelect
          label="Sort by"
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS.map((s) => ({
            value: s.id,
            label: s.label,
          }))}
        />

        {/* ---- Active filter count indicator ---- */}
        {(sectorFilter !== 'all' || stageFilter !== 'all' || scoreFilter !== 'all') && (
          <button
            onClick={() => {
              setSectorFilter('all');
              setStageFilter('all');
              setScoreFilter('all');
            }}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${COLORS.accentRed}50`,
              background: `${COLORS.accentRed}15`,
              color: COLORS.accentRed,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Clear Filters ({filteredCompanies.length} of {companies.length} shown)
          </button>
        )}
      </div>

      {/* ================================================================== */}
      {/* KANBAN BOARD                                                       */}
      {/* ================================================================== */}
      {/* Horizontal scroll container so columns don't get squished on mobile */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        flex: 1,
        paddingBottom: '8px',
        // Smooth scrollbar styling via class would be ideal, but inline works
        minHeight: 0,
      }}>
        {DEAL_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            companies={columnData[stage.id] || []}
            scores={scores}
            onCardClick={handleCardClick}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: StatCard — Summary stat box
// ============================================================================
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <div>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          color: color,
          lineHeight: 1.2,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '11px',
          color: COLORS.textSecondary,
          marginTop: '2px',
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: FilterSelect — Styled dropdown for filter controls
// ============================================================================
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      <span style={{
        fontSize: '12px',
        color: COLORS.textSecondary,
      }}>
        {label}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: '12px',
          padding: '5px 10px',
          borderRadius: '6px',
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bgCard,
          color: COLORS.textPrimary,
          cursor: 'pointer',
          outline: 'none',
          minWidth: '120px',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
