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

import React, { useMemo, useState, useCallback } from 'react';

// ============ INLINE CSV EXPORT HELPER ============
// Quick single-company export function used by the dashboard "Export CSV" button.
// Calls the same API route as ExportPanel but skips the full panel UI for speed.
async function exportSingleCompanyCSV(company) {
  const response = await fetch('/api/export/spreadsheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companies: [company],
      format: 'csv',
      mode: 'single',
    }),
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // Extract filename from header
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch?.[1] || `DueDrill-Export.csv`;

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
import {
  calculateOverallScore,
  getScoreColor,
  getScoreVerdict,
  calculateCompletionStats,
} from '@/lib/scoring';
import { SCORE_WEIGHTS, NAV_ITEMS } from '@/lib/constants';
import RetryPanel from '@/components/ui/RetryPanel';
import SuggestionsCard from '@/components/ui/SuggestionsCard';
import { generateSuggestions } from '@/lib/suggestions';

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
export default function DashboardView({ company, onResearchAll, onRetrySections, onNavigate }) {
  // ============ CSV EXPORT STATE ============
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [csvExportMsg, setCsvExportMsg] = useState(''); // success or error message

  // ============ CSV EXPORT HANDLER ============
  // Quick single-company export — no modal, no panel, just download
  const handleExportCSV = useCallback(async () => {
    if (!company) return;
    setIsExportingCSV(true);
    setCsvExportMsg('');
    try {
      const filename = await exportSingleCompanyCSV(company);
      setCsvExportMsg(`Exported: ${filename}`);
      setTimeout(() => setCsvExportMsg(''), 4000);
    } catch (err) {
      setCsvExportMsg('Export failed');
      setTimeout(() => setCsvExportMsg(''), 4000);
    } finally {
      setIsExportingCSV(false);
    }
  }, [company]);

  // ============ RESEARCH ALL STATE ============
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  // Per-section progress tracker: { overview: 'done', team: 'researching', ... }
  const [sectionProgress, setSectionProgress] = useState({});

  const handleResearchAll = useCallback(async () => {
    if (!onResearchAll) return;
    setIsResearching(true);
    setResearchResult(null);
    setSectionProgress({});

    try {
      // Pass a progress callback that updates per-section status
      const result = await onResearchAll((progress) => {
        setSectionProgress((prev) => ({
          ...prev,
          [progress.section]: {
            status: progress.status,
            filled: progress.filled || 0,
            error: progress.error || '',
          },
        }));
      });
      setResearchResult(result);
    } catch (err) {
      setResearchResult({ success: false, error: err.message });
    } finally {
      setIsResearching(false);
    }
  }, [onResearchAll]);

  // ============ RETRY PANEL STATE ============
  // Tracks failed sections after research completes, plus retry-in-progress state.
  // failedSections: [{ sectionKey, sectionLabel, error }]
  const [failedSections, setFailedSections] = useState([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState(null);

  // ---- Section key → human-readable label lookup ----
  // Uses NAV_ITEMS to map e.g. "team" → "Team & Founders"
  const sectionLabelMap = useMemo(() => {
    const map = {};
    for (const item of NAV_ITEMS) {
      map[item.id] = item.label;
    }
    return map;
  }, []);

  // ---- Build failedSections whenever sectionProgress changes and research is done ----
  // We populate failedSections only after research completes (isResearching goes false)
  // and there are errors in sectionProgress.
  React.useEffect(() => {
    if (isResearching) return; // Still running, wait

    // Check if we have any progress data at all (means research was run)
    const progressEntries = Object.entries(sectionProgress);
    if (progressEntries.length === 0) return;

    // Collect sections that ended in error
    const failures = progressEntries
      .filter(([, info]) => info.status === 'error')
      .map(([key, info]) => ({
        sectionKey: key,
        sectionLabel: sectionLabelMap[key] || key.charAt(0).toUpperCase() + key.slice(1),
        error: info.error || 'Unknown error',
      }));

    setFailedSections(failures);
  }, [isResearching, sectionProgress, sectionLabelMap]);

  // ============ RETRY HANDLER ============
  // Called by RetryPanel when user clicks "Retry Failed Sections".
  // Calls onRetrySections with the failed keys and a progress callback.
  const handleRetryFailed = useCallback(async (sectionKeys) => {
    if (!onRetrySections || !sectionKeys?.length) return;

    setIsRetrying(true);
    setRetryProgress({ current: 0, total: sectionKeys.length });

    try {
      const result = await onRetrySections(sectionKeys, (progress) => {
        // Update the main sectionProgress so the checklist reflects retry status
        setSectionProgress((prev) => ({
          ...prev,
          [progress.section]: {
            status: progress.status,
            filled: progress.filled || 0,
            error: progress.error || '',
          },
        }));
        // Update retry progress counter
        if (progress.status === 'done' || progress.status === 'error') {
          setRetryProgress((prev) => ({
            ...prev,
            current: (prev?.current || 0) + 1,
          }));
        }
      });

      // If all retries succeeded, auto-dismiss by clearing failedSections
      if (result?.success) {
        setFailedSections([]);
      }
      // Otherwise the useEffect above will rebuild failedSections from
      // the updated sectionProgress on next render cycle.
    } catch (err) {
      // Retry itself crashed — keep failedSections as-is
    } finally {
      setIsRetrying(false);
      setRetryProgress(null);
    }
  }, [onRetrySections]);

  // ============ DISMISS HANDLER ============
  // User clicks "Dismiss" on RetryPanel — just hide it
  const handleDismissRetry = useCallback(() => {
    setFailedSections([]);
  }, []);

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

  // ============ SMART SUGGESTIONS ============
  // Generate actionable next-step suggestions based on the company's data
  // completeness, scores, freshness and deal stage. Recalculates whenever
  // the company object changes (field edits, score updates, stage changes).
  const suggestions = useMemo(
    () => generateSuggestions(company),
    [company]
  );

  return (
    <div className="space-y-6">
      {/* ============ SECTION 0: AI RESEARCH BANNER ============ */}
      {/* The primary CTA — one click to research and fill ALL sections */}
      {onResearchAll && (
        <div className="bg-gradient-to-r from-[#4a7dff]/10 to-[#34d399]/10 border border-[#4a7dff]/30 rounded-lg p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#e8e9ed] text-base font-bold flex items-center gap-2">
                <span>🤖</span> AI-Powered Due Diligence
              </h3>
              <p className="text-[#9ca0b0] text-xs mt-1">
                One click to research this company and auto-fill all 15 sections with real data from the web.
              </p>
            </div>
            <button
              onClick={handleResearchAll}
              disabled={isResearching}
              className={
                'inline-flex items-center justify-center gap-2 ' +
                'font-bold rounded-lg border border-transparent ' +
                'py-3 px-6 text-sm transition-all duration-200 cursor-pointer ' +
                (isResearching
                  ? 'bg-[#34d399]/30 text-white/50 cursor-not-allowed'
                  : 'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886] active:bg-[#27a377] shadow-lg shadow-[#34d399]/20')
              }
            >
              {isResearching ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f1117] animate-pulse" />
                  Researching All Sections...
                </>
              ) : (
                <>⚡ Research This Company</>
              )}
            </button>
          </div>

          {/* ============ SECTION-BY-SECTION PROGRESS ============ */}
          {/* Shows live progress as each section completes — much better UX
              than a single pulsing bar that gives zero feedback for 60+ seconds */}
          {isResearching && (
            <div className="mt-3">
              {/* Overall progress bar */}
              {(() => {
                const total = 15;
                const done = Object.values(sectionProgress).filter(s => s.status === 'done').length;
                const pct = Math.round((done / total) * 100);
                return (
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-[#6b7084] mb-1">
                      <span>{done}/{total} sections</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#252836] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4a7dff] to-[#34d399] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Per-section checklist */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 mt-2">
                {['overview','team','product','market','business','traction',
                  'financial','competitive','ip','customers','investors',
                  'regulatory','legal','israel','risks'].map((sec) => {
                  const p = sectionProgress[sec];
                  const status = p?.status || 'pending';
                  return (
                    <div
                      key={sec}
                      className={
                        'px-2 py-1.5 rounded text-[10px] font-medium text-center truncate ' +
                        (status === 'done'
                          ? 'bg-[#34d399]/15 text-[#34d399]'
                          : status === 'researching'
                            ? 'bg-[#4a7dff]/15 text-[#4a7dff] animate-pulse'
                            : status === 'error'
                              ? 'bg-[#ef4444]/15 text-[#ef4444]'
                              : 'bg-[#252836] text-[#6b7084]')
                      }
                    >
                      {status === 'done' ? '✓ ' : status === 'researching' ? '◌ ' : status === 'error' ? '✗ ' : ''}
                      {sec.charAt(0).toUpperCase() + sec.slice(1)}
                      {p?.filled ? ` (${p.filled})` : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Research result feedback */}
          {researchResult && (
            <div className={`mt-3 px-3 py-2 rounded-md border ${
              researchResult.success
                ? 'bg-[#34d399]/10 border-[#34d399]/30'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30'
            }`}>
              <p className={`text-xs font-medium ${
                researchResult.success ? 'text-[#34d399]' : 'text-[#ef4444]'
              }`}>
                {researchResult.success
                  ? `✅ Auto-filled ${researchResult.totalFilled} fields across all sections. Review each section to adjust scores.`
                  : `❌ ${researchResult.error}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============ RETRY PANEL — shown after research with partial failures ============ */}
      {/* Only visible when failedSections is non-empty and research is done */}
      {!isResearching && failedSections.length > 0 && onRetrySections && (
        <RetryPanel
          failedSections={failedSections}
          onRetry={handleRetryFailed}
          onDismiss={handleDismissRetry}
          isRetrying={isRetrying}
          retryProgress={retryProgress}
        />
      )}

      {/* ============ SECTION 0B: KEY METRICS ROW ============ */}
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

      {/* ============ SECTION 0C: QUICK EXPORT BAR ============ */}
      {/* Small export button for single-company CSV — positioned between metrics and score */}
      <div className="flex items-center justify-end gap-2">
        {csvExportMsg && (
          <span className="text-[#34d399] text-[11px] font-medium animate-pulse">
            {csvExportMsg}
          </span>
        )}
        <button
          onClick={handleExportCSV}
          disabled={isExportingCSV || !company}
          className={
            'inline-flex items-center gap-1.5 ' +
            'font-semibold rounded-lg border ' +
            'py-1.5 px-3 text-xs transition-all duration-200 cursor-pointer ' +
            (isExportingCSV
              ? 'bg-[#34d399]/10 text-[#34d399]/50 border-[#34d399]/20 cursor-not-allowed'
              : 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/30 hover:bg-[#34d399]/20 active:bg-[#34d399]/30')
          }
        >
          {isExportingCSV ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full border-2 border-[#34d399]/30 border-t-[#34d399] animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </>
          )}
        </button>
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

      {/* ============ SECTION 4: RECENT ALERTS ============ */}
      {/* Shows the last 5 monitoring alerts for the active company.
          Each alert displays a severity dot, title, category badge, and
          a relative timestamp. Empty state shown when no alerts exist. */}
      <div>
        <h2 className="text-[#9ca0b0] text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          Recent Alerts
        </h2>
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-4">
          {(!company?.alerts || company.alerts.length === 0) ? (
            /* ---- Empty state — no alerts yet ---- */
            <div className="text-center py-6">
              <div className="text-[#6b7084] text-2xl mb-2">🔔</div>
              <p className="text-[#6b7084] text-sm">
                No alerts yet — monitoring will check for changes automatically
              </p>
            </div>
          ) : (
            /* ---- Alert list — show last 5 entries ---- */
            <div className="space-y-2.5">
              {company.alerts.slice(-5).reverse().map((alert, idx) => {
                // ---- Severity color mapping ----
                // high = red, medium = amber, low = blue (informational)
                const severityColors = {
                  high:   '#ef4444',
                  medium: '#f59e0b',
                  low:    '#4a7dff',
                };
                const dotColor = severityColors[alert.severity] || '#6b7084';

                // ---- Relative timestamp calculation ----
                // Shows "Xm ago", "Xh ago", "Xd ago" based on elapsed time
                let relativeTime = '';
                if (alert.timestamp) {
                  const elapsed = Date.now() - new Date(alert.timestamp).getTime();
                  const mins  = Math.floor(elapsed / 60000);
                  const hours = Math.floor(elapsed / 3600000);
                  const days  = Math.floor(elapsed / 86400000);

                  if (days > 0)       relativeTime = `${days}d ago`;
                  else if (hours > 0) relativeTime = `${hours}h ago`;
                  else if (mins > 0)  relativeTime = `${mins}m ago`;
                  else                relativeTime = 'Just now';
                }

                return (
                  <div
                    key={alert.id || idx}
                    className="flex items-center gap-3 px-3 py-2.5 bg-[#252836] border border-[#2d3148] rounded-md"
                  >
                    {/* Severity dot — colored circle indicating urgency */}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                      title={`Severity: ${alert.severity || 'unknown'}`}
                    />

                    {/* Alert title — truncated if too long */}
                    <p className="text-[#e8e9ed] text-xs font-medium flex-1 min-w-0 truncate">
                      {alert.title || 'Untitled alert'}
                    </p>

                    {/* Category badge — small pill-shaped label */}
                    {alert.category && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4a7dff]/15 text-[#4a7dff] shrink-0 whitespace-nowrap">
                        {alert.category}
                      </span>
                    )}

                    {/* Relative timestamp — muted, right-aligned */}
                    {relativeTime && (
                      <span
                        className="text-[10px] text-[#6b7084] shrink-0 whitespace-nowrap"
                        title={new Date(alert.timestamp).toLocaleString()}
                      >
                        {relativeTime}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* ---- "View All" link — navigates to the monitoring tab ---- */}
              {company.alerts.length > 5 && (
                <div className="text-center pt-1">
                  <button
                    className="text-[#4a7dff] text-[11px] font-medium hover:text-[#6b9aff] transition-colors cursor-pointer"
                    title="View all alerts in the monitoring tab"
                  >
                    View All ({company.alerts.length} alerts) →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 5: OVERALL VERDICT ============ */}
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
