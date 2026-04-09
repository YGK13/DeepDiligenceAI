'use client';

// ============================================================================
// lib/suggestions.js — DueDrill: Smart Suggestions Engine
// ============================================================================
// Analyzes a company's due diligence data and generates actionable next-step
// suggestions based on what's missing, weak, stale or needs attention.
//
// The engine examines:
//   1. Field completeness per section (< 30% → "missing data" suggestion)
//   2. Section scores (< 4 → "low score / risk" suggestion)
//   3. Data freshness via lastResearched timestamps (> 30 days → "stale data")
//   4. Deal stage advancement logic (high score + early stage → advance)
//   5. Deal stage warnings (low score + not passed → consider passing)
//   6. Missing references, pitch deck, financial model
//
// Returns max 5 suggestions sorted by priority (high → medium → low).
//
// Each suggestion object:
//   { id, type, priority, title, description, actionTab, actionLabel }
//
// Types: 'missing-data', 'low-score', 'stale-data', 'next-step', 'risk-alert'
// Priority: 'high', 'medium', 'low'
// ============================================================================

import { SCORE_WEIGHTS, NAV_ITEMS } from './constants';
import { calculateCompletionStats } from './scoring';

// ============================================================================
// SECTION LABEL LOOKUP
// ============================================================================
// Maps section keys (e.g. "team") to human-readable labels (e.g. "Team")
// using NAV_ITEMS as the source of truth. Falls back to capitalized key
// if the section isn't in NAV_ITEMS (shouldn't happen, but defensive).
const SECTION_LABELS = {};
for (const item of NAV_ITEMS) {
  SECTION_LABELS[item.id] = item.label;
}

// ============================================================================
// PRIORITY SORT ORDER
// ============================================================================
// Numeric weight for sorting: high first, then medium, then low.
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// ============================================================================
// generateSuggestions(company)
// ============================================================================
// Main export. Takes a full company object and returns an array of up to 5
// actionable suggestions, sorted by priority.
//
// WHY max 5? More than 5 suggestions creates decision fatigue. The user
// should see the most important actions, not a laundry list. They can
// always run the analysis again after completing the top items.
//
// PARAMS:
//   company — full company data object (from schemas.js / createEmptyCompany)
//
// RETURNS:
//   Array of suggestion objects, max length 5, sorted by priority.
export function generateSuggestions(company) {
  if (!company) return [];

  const suggestions = [];
  let idCounter = 0;

  // Helper: create a suggestion with auto-incrementing id
  const addSuggestion = (type, priority, title, description, actionTab, actionLabel) => {
    suggestions.push({
      id: `suggestion-${++idCounter}`,
      type,
      priority,
      title,
      description,
      actionTab,
      actionLabel,
    });
  };

  // ============================================================================
  // 1. FIELD COMPLETENESS CHECK — "missing-data" suggestions
  // ============================================================================
  // For each DD section, check if fewer than 30% of fields are filled.
  // If so, surface it as a missing-data suggestion with the field count.
  // This catches sections the user hasn't started or barely touched.
  const completionStats = calculateCompletionStats(company);
  const completionSectionKeys = [
    'overview', 'team', 'product', 'market', 'business', 'traction',
    'financial', 'competitive', 'ip', 'customers', 'investors',
    'regulatory', 'legal', 'israel', 'risks', 'deal',
  ];

  for (const sectionKey of completionSectionKeys) {
    const stat = completionStats[sectionKey];
    if (!stat || stat.total === 0) continue;

    // Only flag sections under 30% completion
    if (stat.percentage < 30) {
      const missingCount = stat.total - stat.filled;
      const label = SECTION_LABELS[sectionKey] || sectionKey;

      addSuggestion(
        'missing-data',
        'high',
        `Complete ${label}`,
        `${missingCount} of ${stat.total} fields missing (${stat.percentage}% complete)`,
        sectionKey,
        `Go to ${label}`
      );
    }
  }

  // ============================================================================
  // 2. LOW SECTION SCORE CHECK — "low-score" / "risk-alert" suggestions
  // ============================================================================
  // For each scored section, check if the score is below 4 (out of 10).
  // Scores below 4 indicate significant risk per the scoring engine's
  // threshold system (see lib/scoring.js getScoreVerdict).
  for (const [sectionKey, config] of Object.entries(SCORE_WEIGHTS)) {
    const sectionData = company[sectionKey];
    if (!sectionData) continue;

    const scoreValue = parseFloat(sectionData[config.field]);
    if (isNaN(scoreValue)) continue;

    // Only flag scores that have been evaluated (not the default 5)
    // AND are below the "Weak" threshold of 4
    if (scoreValue < 4 && scoreValue !== 5) {
      const label = SECTION_LABELS[sectionKey] || sectionKey;

      addSuggestion(
        'low-score',
        'high',
        `Review ${label}`,
        `Score of ${scoreValue}/10 indicates significant risk — investigate further`,
        sectionKey,
        `Review ${label}`
      );
    }
  }

  // ============================================================================
  // 3. STALE DATA CHECK — "stale-data" suggestions
  // ============================================================================
  // If a section was last researched more than 30 days ago, the data may
  // be outdated. Startup landscapes change fast: funding rounds close,
  // competitors launch, leadership changes happen, regulatory shifts occur.
  // company.lastResearched is an object keyed by section with ISO timestamps.
  const lastResearched = company.lastResearched || {};
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  for (const [sectionKey, timestamp] of Object.entries(lastResearched)) {
    if (!timestamp) continue;

    const researchedAt = new Date(timestamp).getTime();
    if (isNaN(researchedAt)) continue;

    const elapsedMs = now - researchedAt;
    if (elapsedMs > THIRTY_DAYS_MS) {
      const daysAgo = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
      const label = SECTION_LABELS[sectionKey] || sectionKey;

      addSuggestion(
        'stale-data',
        'medium',
        `Refresh ${label}`,
        `Data is ${daysAgo} days old — re-research to capture recent changes`,
        sectionKey,
        `Refresh ${label}`
      );
    }
  }

  // ============================================================================
  // 4. DEAL STAGE ADVANCEMENT — "next-step" suggestion
  // ============================================================================
  // If the overall weighted score is strong (> 7) but the deal is still
  // in "first-look" stage, suggest advancing to initial screen. A high
  // score with early-stage status means the analyst has done enough
  // preliminary work to justify deeper engagement.
  const overallScore = calculateOverallScoreLocal(company);

  if (overallScore > 7 && company.dealStage === 'first-look') {
    addSuggestion(
      'next-step',
      'medium',
      'Consider advancing to Initial Screen',
      `Overall score of ${overallScore}/10 is strong — this deal may be ready for deeper diligence`,
      'pipeline',
      'View Pipeline'
    );
  }

  // ============================================================================
  // 5. DEAL PASS WARNING — "risk-alert" suggestion
  // ============================================================================
  // If the overall score is below 4 and the deal hasn't been passed on,
  // flag it. No point spending more time on a deal that scores poorly
  // across the board — unless there's a compelling reason to continue.
  if (overallScore < 4 && overallScore > 0 && company.dealStage !== 'pass') {
    addSuggestion(
      'risk-alert',
      'high',
      'Consider passing on this deal',
      `Overall score of ${overallScore}/10 indicates fundamental concerns across multiple areas`,
      'pipeline',
      'Update Stage'
    );
  }

  // ============================================================================
  // 6. MISSING REFERENCES — "missing-data" suggestion
  // ============================================================================
  // Reference checks are one of the most valuable parts of DD but also
  // one of the most commonly skipped. If no references exist at all,
  // prompt the user to add some. Back-channel references on founders
  // are what separate surface-level DD from real diligence.
  const references = company.references || [];
  if (references.length === 0) {
    addSuggestion(
      'missing-data',
      'medium',
      'Add reference checks',
      'No references on file — back-channel checks strengthen diligence significantly',
      'references',
      'Add References'
    );
  }

  // ============================================================================
  // 7. MISSING PITCH DECK — "missing-data" suggestion
  // ============================================================================
  // If no documents are uploaded (or no deck-type doc), suggest uploading
  // the pitch deck. Cross-referencing the deck against researched data
  // is a key part of the DD workflow.
  const documents = company.documents || [];
  const hasDeck = documents.some(
    (doc) => doc.category === 'deck' || doc.category === 'pitch-deck'
  );
  if (!hasDeck && documents.length === 0) {
    addSuggestion(
      'missing-data',
      'low',
      'Upload pitch deck',
      'Upload the pitch deck for cross-reference analysis against researched data',
      'deck',
      'Upload Deck'
    );
  }

  // ============================================================================
  // 8. MISSING FINANCIAL MODEL / REVENUE DATA — "missing-data" suggestion
  // ============================================================================
  // If the financial section exists but has no revenue-related data at all
  // (no totalRaised, no monthlyBurnRate, no runway), suggest requesting
  // the financial model from founders. This is critical for any deal
  // past the first-look stage.
  const fin = company.financial || {};
  const hasRevenueData = !!(
    fin.totalRaised ||
    fin.monthlyBurnRate ||
    fin.runway ||
    fin.lastRoundSize ||
    fin.cashOnHand
  );
  if (!hasRevenueData) {
    addSuggestion(
      'missing-data',
      'medium',
      'Request financial model from founders',
      'No financial data on file — revenue, burn rate and runway are essential for evaluation',
      'financial',
      'Go to Financial'
    );
  }

  // ============================================================================
  // SORT BY PRIORITY AND RETURN TOP 5
  // ============================================================================
  // Sort: high priority first, then medium, then low. Within the same
  // priority level, maintain insertion order (most critical checks run first).
  suggestions.sort((a, b) => {
    return (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99);
  });

  // Cap at 5 suggestions to avoid overwhelming the user
  return suggestions.slice(0, 5);
}

// ============================================================================
// calculateOverallScoreLocal(company)
// ============================================================================
// Lightweight local copy of the overall score calculation.
// We duplicate this logic here to avoid a circular import issue —
// the scoring module's calculateOverallScore does the same thing but
// this keeps lib/suggestions.js self-contained for its internal checks.
// The actual displayed score on the dashboard uses lib/scoring.js directly.
function calculateOverallScoreLocal(company) {
  if (!company) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [sectionKey, config] of Object.entries(SCORE_WEIGHTS)) {
    const section = company[sectionKey];
    if (!section) continue;

    const scoreValue = parseFloat(section[config.field]);
    if (!isNaN(scoreValue)) {
      weightedSum += scoreValue * config.weight;
      totalWeight += config.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
