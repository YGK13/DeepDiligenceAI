'use client';

// ============================================================================
// components/views/TimelineView.js — Deal Activity Timeline & Stage Tracker
// ============================================================================
// P1 feature: Due diligence isn't a snapshot — it's a process spanning 20+ hours
// and 83 days on average. This view gives DueDrill a concept of time and deal
// progression, tracking every significant action through the DD lifecycle.
//
// THREE MAJOR SECTIONS:
//   1. Deal Stage Tracker — horizontal progress bar showing pipeline stages
//   2. Stage Summary Stats — time-in-stage, total DD duration, fields completed
//   3. Activity Log — timestamped entries for every significant action with
//      data freshness indicators and an "Add Note" form
//
// Props:
//   company  — full company data object (needs dealStage, activityLog, lastResearched, createdAt)
//   onChange — function(sectionKey, updatedData) to persist changes back to the company
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { calculateCompletionStats } from '@/lib/scoring';
import { NAV_ITEMS } from '@/lib/constants';

// ============================================================================
// DEAL PIPELINE STAGES
// ============================================================================
// Ordered list of stages a deal moves through during due diligence.
// "pass" is a terminal state — the deal was killed at some point.
// Each stage has a machine-readable id, display label, and description
// explaining what happens at this stage (shown as tooltip/subtitle).
const DEAL_STAGES = [
  { id: 'first-look',     label: 'First Look',     description: 'Initial review of the opportunity' },
  { id: 'initial-screen', label: 'Initial Screen',  description: 'Preliminary screening and quick assessment' },
  { id: 'deep-dive',      label: 'Deep Dive',       description: 'Full due diligence research in progress' },
  { id: 'ic-memo',        label: 'IC Memo',         description: 'Investment committee memo drafted' },
  { id: 'term-sheet',     label: 'Term Sheet',      description: 'Term sheet issued or under negotiation' },
  { id: 'close',          label: 'Close',           description: 'Deal closed — investment complete' },
  { id: 'pass',           label: 'Pass',            description: 'Deal passed — not pursuing' },
];

// ============================================================================
// ACTIVITY ENTRY TYPE CONFIGURATION
// ============================================================================
// Maps activity log entry types to their display properties.
// Each type gets an icon and a label for rendering in the timeline.
const ACTIVITY_TYPES = {
  'auto-fill':    { icon: '🤖', label: 'Auto-Fill',     color: '#8b5cf6' },  // purple — AI action
  'manual-edit':  { icon: '✏️', label: 'Manual Edit',   color: '#4a7dff' },  // blue — user action
  'stage-change': { icon: '📊', label: 'Stage Change',  color: '#34d399' },  // green — progression
  'note':         { icon: '📝', label: 'Note',          color: '#f59e0b' },  // yellow — annotation
  'research':     { icon: '🔍', label: 'Research',      color: '#06b6d4' },  // cyan — investigation
  'score-change': { icon: '⭐', label: 'Score Change',  color: '#ec4899' },  // pink — evaluation
};

// ============================================================================
// DATA FRESHNESS THRESHOLDS (in days)
// ============================================================================
// Sections researched within 30 days are "fresh" (green).
// 30-60 days is "aging" (yellow warning).
// 60+ days is "stale" (red warning — data may be outdated).
const FRESHNESS_WARN_DAYS = 30;
const FRESHNESS_DANGER_DAYS = 60;

// ============================================================================
// SECTION LABELS
// ============================================================================
// Human-readable labels for each DD section, used in the data freshness panel.
// Derived from NAV_ITEMS to stay in sync with the sidebar.
const SECTION_LABELS = {};
NAV_ITEMS.forEach((item) => {
  SECTION_LABELS[item.id] = item.label;
});

// ============================================================================
// HELPER: Calculate days between two dates
// ============================================================================
function daysBetween(dateA, dateB) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor(Math.abs(b - a) / msPerDay);
}

// ============================================================================
// HELPER: Format a timestamp into a human-readable relative string
// ============================================================================
function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// HELPER: Format ISO timestamp into readable date/time
// ============================================================================
function formatTimestamp(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// MAIN COMPONENT: TimelineView
// ============================================================================
export default function TimelineView({ company, onChange }) {
  // --- Local state for the "Add Note" form ---
  const [noteText, setNoteText] = useState('');

  // --- Safely read company timeline data with defaults ---
  const dealStage = company?.dealStage || 'first-look';
  const activityLog = company?.activityLog || [];
  const lastResearched = company?.lastResearched || {};
  const createdAt = company?.createdAt || new Date().toISOString();

  // ============================================================================
  // COMPUTED: Current stage index in the pipeline
  // ============================================================================
  const currentStageIndex = useMemo(() => {
    return DEAL_STAGES.findIndex((s) => s.id === dealStage);
  }, [dealStage]);

  // ============================================================================
  // COMPUTED: Total fields completed across all sections
  // ============================================================================
  const completionStats = useMemo(() => {
    if (!company) return { filled: 0, total: 0 };
    const stats = calculateCompletionStats(company);
    let totalFilled = 0;
    let totalFields = 0;
    for (const sectionStats of Object.values(stats)) {
      totalFilled += sectionStats.filled;
      totalFields += sectionStats.total;
    }
    return { filled: totalFilled, total: totalFields };
  }, [company]);

  // ============================================================================
  // COMPUTED: Time in current stage (days)
  // ============================================================================
  const timeInCurrentStage = useMemo(() => {
    // Find the most recent stage-change entry in the activity log,
    // or fall back to createdAt if no stage changes recorded yet.
    const stageChanges = activityLog
      .filter((entry) => entry.type === 'stage-change')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const lastChange = stageChanges[0]?.timestamp || createdAt;
    return daysBetween(lastChange, new Date().toISOString());
  }, [activityLog, createdAt]);

  // ============================================================================
  // COMPUTED: Total DD duration (days since company was created)
  // ============================================================================
  const totalDuration = useMemo(() => {
    return daysBetween(createdAt, new Date().toISOString());
  }, [createdAt]);

  // ============================================================================
  // COMPUTED: Activity log sorted newest-first for display
  // ============================================================================
  const sortedLog = useMemo(() => {
    return [...activityLog].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [activityLog]);

  // ============================================================================
  // COMPUTED: Data freshness for each DD section
  // ============================================================================
  // Sections that have been researched via AI get a lastResearched timestamp.
  // We show a freshness indicator so the analyst knows when data might be stale.
  const sectionFreshness = useMemo(() => {
    // Only show freshness for actual DD sections (not dashboard, settings, etc.)
    const ddSections = [
      'overview', 'team', 'product', 'market', 'business', 'traction',
      'financial', 'competitive', 'ip', 'customers', 'investors',
      'regulatory', 'legal', 'israel', 'risks', 'deal',
    ];

    return ddSections.map((sectionId) => {
      const timestamp = lastResearched[sectionId];
      const daysAgo = timestamp ? daysBetween(timestamp, new Date().toISOString()) : null;

      let status = 'never'; // never researched
      let color = '#6b7280'; // gray
      if (daysAgo !== null) {
        if (daysAgo < FRESHNESS_WARN_DAYS) {
          status = 'fresh';
          color = '#34d399'; // green
        } else if (daysAgo < FRESHNESS_DANGER_DAYS) {
          status = 'aging';
          color = '#f59e0b'; // yellow
        } else {
          status = 'stale';
          color = '#ef4444'; // red
        }
      }

      return {
        sectionId,
        label: SECTION_LABELS[sectionId] || sectionId,
        timestamp,
        daysAgo,
        status,
        color,
      };
    });
  }, [lastResearched]);

  // ============================================================================
  // HANDLER: Change the deal stage
  // ============================================================================
  // When the user clicks a stage in the progress bar, we:
  //   1. Update dealStage on the company
  //   2. Add a "stage-change" entry to the activity log
  const handleStageChange = useCallback(
    (newStageId) => {
      if (!onChange || newStageId === dealStage) return;

      const oldLabel = DEAL_STAGES.find((s) => s.id === dealStage)?.label || dealStage;
      const newLabel = DEAL_STAGES.find((s) => s.id === newStageId)?.label || newStageId;

      // Create a new activity log entry for the stage change
      const newEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'stage-change',
        description: `Stage changed from "${oldLabel}" to "${newLabel}"`,
      };

      // Persist both changes — dealStage and the updated activityLog
      onChange('dealStage', newStageId);
      onChange('activityLog', [...activityLog, newEntry]);
    },
    [onChange, dealStage, activityLog]
  );

  // ============================================================================
  // HANDLER: Add a note to the activity log
  // ============================================================================
  // Notes are for meeting summaries, call notes, back-channel intel, etc.
  const handleAddNote = useCallback(() => {
    if (!noteText.trim() || !onChange) return;

    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'note',
      description: noteText.trim(),
    };

    onChange('activityLog', [...activityLog, newEntry]);
    setNoteText(''); // clear the input after adding
  }, [noteText, onChange, activityLog]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">

      {/* ================================================================== */}
      {/* HEADER                                                              */}
      {/* ================================================================== */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#e8e9ed' }}>
          Deal Timeline
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9ca0b0' }}>
          Track deal progression, activity history, and data freshness across all DD sections.
        </p>
      </div>

      {/* ================================================================== */}
      {/* DEAL STAGE TRACKER — Horizontal Progress Bar                        */}
      {/* ================================================================== */}
      {/* Shows all 7 stages as a clickable horizontal pipeline.              */}
      {/* Completed = green, Current = blue, Future = gray, Pass = red.       */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#1e2130', border: '1px solid #2d3148' }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: '#e8e9ed' }}>
          Deal Stage
        </h2>

        {/* --- Stage pills row --- */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {DEAL_STAGES.map((stage, idx) => {
            // Determine the visual state of this stage pill
            const isCurrent = stage.id === dealStage;
            const isPass = stage.id === 'pass';
            const isCompleted =
              !isPass &&
              dealStage !== 'pass' &&
              idx < currentStageIndex;

            // Color logic:
            //   - Completed stages: green background
            //   - Current stage: blue background (or red if current is "pass")
            //   - "Pass" when not current: red outline only
            //   - Future stages: gray outline only
            let bgColor = 'transparent';
            let borderColor = '#2d3148';
            let textColor = '#9ca0b0';

            if (isCompleted) {
              bgColor = '#34d399';
              borderColor = '#34d399';
              textColor = '#0f1117';
            } else if (isCurrent && isPass) {
              bgColor = '#ef4444';
              borderColor = '#ef4444';
              textColor = '#ffffff';
            } else if (isCurrent) {
              bgColor = '#4a7dff';
              borderColor = '#4a7dff';
              textColor = '#ffffff';
            } else if (isPass) {
              borderColor = '#ef4444';
              textColor = '#ef4444';
            }

            return (
              <React.Fragment key={stage.id}>
                {/* Connector line between stages (not before first) */}
                {idx > 0 && idx < DEAL_STAGES.length - 1 && (
                  <div
                    className="flex-shrink-0 h-0.5 w-4 sm:w-8"
                    style={{
                      background: isCompleted ? '#34d399' : '#2d3148',
                    }}
                  />
                )}
                {/* Separator before "Pass" — it's a branch, not a sequence */}
                {idx === DEAL_STAGES.length - 1 && (
                  <div className="flex-shrink-0 flex items-center mx-2">
                    <span style={{ color: '#9ca0b0', fontSize: '12px' }}>or</span>
                  </div>
                )}

                {/* Stage pill button */}
                <button
                  onClick={() => handleStageChange(stage.id)}
                  className="flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    color: textColor,
                    minWidth: '80px',
                    textAlign: 'center',
                  }}
                  title={stage.description}
                >
                  {/* Checkmark for completed stages */}
                  {isCompleted && <span className="mr-1">✓</span>}
                  {stage.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* --- Current stage description --- */}
        <p className="text-xs mt-3" style={{ color: '#9ca0b0' }}>
          {DEAL_STAGES.find((s) => s.id === dealStage)?.description || ''}
        </p>
      </div>

      {/* ================================================================== */}
      {/* STAGE SUMMARY STATS — Key metrics at a glance                       */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Time in current stage */}
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: '#1e2130', border: '1px solid #2d3148' }}
        >
          <div className="text-3xl font-bold" style={{ color: '#4a7dff' }}>
            {timeInCurrentStage}
          </div>
          <div className="text-xs mt-1" style={{ color: '#9ca0b0' }}>
            days in current stage
          </div>
        </div>

        {/* Total DD duration */}
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: '#1e2130', border: '1px solid #2d3148' }}
        >
          <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
            {totalDuration}
          </div>
          <div className="text-xs mt-1" style={{ color: '#9ca0b0' }}>
            total DD duration (days)
          </div>
        </div>

        {/* Fields completed */}
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: '#1e2130', border: '1px solid #2d3148' }}
        >
          <div className="text-3xl font-bold" style={{ color: '#34d399' }}>
            {completionStats.filled}/{completionStats.total}
          </div>
          <div className="text-xs mt-1" style={{ color: '#9ca0b0' }}>
            fields completed
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* DATA FRESHNESS INDICATORS                                           */}
      {/* ================================================================== */}
      {/* Shows how recently each DD section was researched via AI.           */}
      {/* Helps analysts know when data might be outdated and needs refresh.  */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#1e2130', border: '1px solid #2d3148' }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: '#e8e9ed' }}>
          Data Freshness
        </h2>
        <p className="text-xs mb-4" style={{ color: '#9ca0b0' }}>
          Last researched timestamps per section. Yellow = 30+ days old. Red = 60+ days old.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sectionFreshness.map((section) => (
            <div
              key={section.sectionId}
              className="rounded-lg p-3 flex flex-col items-start"
              style={{
                background: '#0f1117',
                border: `1px solid ${section.status === 'never' ? '#2d3148' : section.color}33`,
              }}
            >
              <div className="text-xs font-medium mb-1" style={{ color: '#e8e9ed' }}>
                {section.label}
              </div>
              <div className="text-xs" style={{ color: section.color }}>
                {section.status === 'never' ? (
                  'Not yet researched'
                ) : (
                  <>
                    {section.daysAgo}d ago
                    {section.status === 'aging' && ' ⚠️'}
                    {section.status === 'stale' && ' 🔴'}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* ADD NOTE FORM                                                       */}
      {/* ================================================================== */}
      {/* Quick input for meeting notes, call summaries, back-channel intel.  */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#1e2130', border: '1px solid #2d3148' }}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: '#e8e9ed' }}>
          Add Note
        </h2>
        <div className="flex gap-3">
          <textarea
            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
            style={{
              background: '#0f1117',
              border: '1px solid #2d3148',
              color: '#e8e9ed',
              minHeight: '60px',
            }}
            placeholder="Meeting notes, call summary, back-channel intel..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl+Enter or Cmd+Enter to submit
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleAddNote();
              }
            }}
          />
          <button
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 self-end"
            style={{
              background: noteText.trim() ? '#4a7dff' : '#2d3148',
              cursor: noteText.trim() ? 'pointer' : 'not-allowed',
            }}
            onClick={handleAddNote}
            disabled={!noteText.trim()}
          >
            Add Note
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#9ca0b0' }}>
          Press Ctrl+Enter to submit quickly.
        </p>
      </div>

      {/* ================================================================== */}
      {/* ACTIVITY LOG — Vertical Timeline                                    */}
      {/* ================================================================== */}
      {/* Chronological (newest-first) log of all deal activity.             */}
      <div
        className="rounded-xl p-6"
        style={{ background: '#1e2130', border: '1px solid #2d3148' }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: '#e8e9ed' }}>
          Activity Log
        </h2>
        <p className="text-xs mb-4" style={{ color: '#9ca0b0' }}>
          {sortedLog.length} {sortedLog.length === 1 ? 'entry' : 'entries'} recorded
        </p>

        {sortedLog.length === 0 ? (
          // --- Empty state ---
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm" style={{ color: '#9ca0b0' }}>
              No activity yet. Changes to stages, scores, and AI research will appear here.
            </p>
          </div>
        ) : (
          // --- Timeline entries ---
          <div className="relative">
            {/* Vertical connector line running down the left side */}
            <div
              className="absolute left-4 top-0 bottom-0 w-0.5"
              style={{ background: '#2d3148' }}
            />

            <div className="space-y-4">
              {sortedLog.map((entry) => {
                const typeConfig = ACTIVITY_TYPES[entry.type] || {
                  icon: '📌',
                  label: entry.type,
                  color: '#9ca0b0',
                };

                return (
                  <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                    {/* Timeline dot — colored by entry type */}
                    <div
                      className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{
                        background: `${typeConfig.color}22`,
                        border: `2px solid ${typeConfig.color}`,
                      }}
                      title={typeConfig.label}
                    >
                      {typeConfig.icon}
                    </div>

                    {/* Entry content */}
                    <div className="flex-1 min-w-0 pb-2">
                      {/* Type label + timestamp */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${typeConfig.color}22`,
                            color: typeConfig.color,
                          }}
                        >
                          {typeConfig.label}
                        </span>
                        <span className="text-xs" style={{ color: '#9ca0b0' }}>
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                        <span
                          className="text-xs hidden sm:inline"
                          style={{ color: '#6b7280' }}
                          title={entry.timestamp}
                        >
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>

                      {/* Description */}
                      <p
                        className="text-sm mt-1 whitespace-pre-wrap break-words"
                        style={{ color: '#e8e9ed' }}
                      >
                        {entry.description}
                      </p>

                      {/* User attribution placeholder for future multi-user */}
                      {entry.user && (
                        <span className="text-xs mt-1 inline-block" style={{ color: '#9ca0b0' }}>
                          by {entry.user}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
