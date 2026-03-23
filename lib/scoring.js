// ============================================================================
// lib/scoring.js — DueDrill: Scoring Engine
// ============================================================================
// All scoring logic lives here — calculating the overall weighted score,
// determining score classifications (color, class, verdict), and computing
// completion statistics for each section.
//
// This is a pure-logic module with zero React dependencies. It can be used
// server-side (in API routes for report generation) or client-side (in React
// components for live score display). No side effects, no state mutation.
// ============================================================================

import { SCORE_WEIGHTS } from './constants';

// ============================================================================
// calculateOverallScore(company)
// ============================================================================
// Computes a weighted average score (0-10) across all scored sections.
//
// HOW IT WORKS:
// 1. Iterates over SCORE_WEIGHTS (defined in constants.js)
// 2. For each section, looks up the score field in the company object
//    e.g., company.team.teamCompleteness, company.product.productScore
// 3. Multiplies the score by the section's weight
// 4. Sums all weighted scores and divides by total weight applied
//
// WHY divide by totalWeight instead of just summing?
// If a section's data doesn't exist in the company object (shouldn't happen
// with createEmptyCompany, but defensive coding), we skip it. The totalWeight
// tracks only the weights we actually used, so the average stays accurate
// even if some sections are missing.
//
// RETURNS: number (0-10, rounded to 1 decimal place)
export function calculateOverallScore(company) {
  if (!company) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  // Walk through every scored section defined in SCORE_WEIGHTS
  for (const [sectionKey, config] of Object.entries(SCORE_WEIGHTS)) {
    const section = company[sectionKey];

    // Skip if the section doesn't exist on the company object
    if (!section) continue;

    // Extract the score value from the section using the configured field name
    // e.g., for team: company.team.teamCompleteness
    const scoreValue = parseFloat(section[config.field]);

    // Only include this section if we got a valid number
    // NaN check prevents garbage data from corrupting the overall score
    if (!isNaN(scoreValue)) {
      weightedSum += scoreValue * config.weight;
      totalWeight += config.weight;
    }
  }

  // Guard against division by zero — if no valid scores exist, return 0
  if (totalWeight === 0) return 0;

  // Normalize to 0-10 scale and round to 1 decimal place
  // The (weightedSum / totalWeight) already gives us 0-10 because individual
  // scores are 0-10 and weights sum to 1.0 — but we divide by totalWeight
  // (not 1.0) to handle the case where some sections were skipped
  const rawScore = weightedSum / totalWeight;

  // Round to 1 decimal: multiply by 10, round, divide by 10
  return Math.round(rawScore * 10) / 10;
}

// ============================================================================
// getScoreClass(score)
// ============================================================================
// Returns a CSS class name based on score threshold.
// Used for conditional styling in the UI — green for good, yellow for
// borderline, red for concerning.
//
// WHY these thresholds?
// - 7+ = Strong/Pass territory (green) — investable with due diligence
// - 4-6.9 = Borderline (yellow) — needs more work or has concerns
// - <4 = Weak/Fail (red) — significant concerns, likely pass
export function getScoreClass(score) {
  const numericScore = parseFloat(score);
  if (isNaN(numericScore)) return 'score-low';

  if (numericScore >= 7) return 'score-high';
  if (numericScore >= 4) return 'score-mid';
  return 'score-low';
}

// ============================================================================
// getScoreColor(score)
// ============================================================================
// Returns Tailwind CSS color classes for score display.
// Provides text, bg, and border classes so components can use whichever
// style they need (text labels, badges, progress bars, borders).
//
// Five tiers give more granular visual feedback than a simple 3-tier system:
// - 8-10: Excellent (emerald) — this section is strong
// - 7-7.9: Good (green) — solid, no major concerns
// - 5-6.9: Average (yellow) — needs attention
// - 4-4.9: Below average (orange) — concerning
// - 0-3.9: Poor (red) — significant issues
//
// RETURNS: object { text, bg, border } with Tailwind class strings
export function getScoreColor(score) {
  const numericScore = parseFloat(score);
  if (isNaN(numericScore)) {
    return {
      text: 'text-gray-400',
      bg: 'bg-gray-100',
      border: 'border-gray-300',
    };
  }

  // 8-10: Excellent — strong emerald green
  if (numericScore >= 8) {
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
    };
  }

  // 7-7.9: Good — standard green
  if (numericScore >= 7) {
    return {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-300',
    };
  }

  // 5-6.9: Average — yellow/amber warning zone
  if (numericScore >= 5) {
    return {
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
    };
  }

  // 4-4.9: Below average — orange caution
  if (numericScore >= 4) {
    return {
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-300',
    };
  }

  // 0-3.9: Poor — red alert
  return {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
  };
}

// ============================================================================
// getScoreVerdict(score)
// ============================================================================
// Converts a numeric score to a human-readable investment verdict.
// Displayed on the dashboard and in generated reports.
//
// These map to standard VC decision language:
// - "Strong Pass" (8+) = we want to invest, champion internally
// - "Pass" (7-7.9) = good opportunity, proceed with full DD
// - "Borderline" (5-6.9) = needs more conviction, conditional on key answers
// - "Weak" (3-4.9) = significant concerns, would need major improvements
// - "Fail" (<3) = do not invest, fundamental issues present
export function getScoreVerdict(score) {
  const numericScore = parseFloat(score);
  if (isNaN(numericScore)) return 'Not Scored';

  if (numericScore >= 8) return 'Strong Pass';
  if (numericScore >= 7) return 'Pass';
  if (numericScore >= 5) return 'Borderline';
  if (numericScore >= 3) return 'Weak';
  return 'Fail';
}

// ============================================================================
// calculateCompletionStats(company)
// ============================================================================
// Counts how many fields are filled vs. total fields for each section.
// Used to show completion progress bars on the dashboard and sidebar.
//
// HOW "FILLED" IS DETERMINED:
// - Strings: non-empty after trimming
// - Numbers: not 0 (scores default to 5, so they count as filled —
//   this is intentional because a default score IS a value)
// - Arrays: length > 0
// - Objects: at least one key
// - Booleans: always counted as filled (they have a value either way)
// - null/undefined: not filled
//
// RETURNS: object keyed by section ID, each containing:
//   { filled: number, total: number, percentage: number }
//   Plus an 'overall' key with aggregate stats across all sections.
export function calculateCompletionStats(company) {
  if (!company) return {};

  // Define which top-level keys are actual DD sections (not metadata like
  // id, createdAt, updatedAt, aiResearch, overallVerdict, overallScore)
  const sectionKeys = [
    'overview', 'team', 'product', 'market', 'business', 'traction',
    'financial', 'competitive', 'ip', 'customers', 'investors',
    'regulatory', 'legal', 'israel', 'risks', 'deal',
  ];

  const stats = {};

  for (const sectionKey of sectionKeys) {
    const section = company[sectionKey];

    // If the section doesn't exist, report 0/0
    if (!section || typeof section !== 'object') {
      stats[sectionKey] = { filled: 0, total: 0, percentage: 0 };
      continue;
    }

    const fields = Object.keys(section);
    const total = fields.length;
    let filled = 0;

    for (const field of fields) {
      const value = section[field];

      // Check if the field has meaningful content based on its type
      if (typeof value === 'string') {
        // Strings must be non-empty after trimming
        if (value.trim().length > 0) filled++;
      } else if (typeof value === 'number') {
        // Numbers are "filled" if they're not 0
        // Score fields default to 5, so they'll count as filled —
        // this is intentional because a default score IS a value
        if (value !== 0) filled++;
      } else if (Array.isArray(value)) {
        // Arrays need at least one element
        if (value.length > 0) filled++;
      } else if (typeof value === 'object' && value !== null) {
        // Objects need at least one key
        if (Object.keys(value).length > 0) filled++;
      } else if (typeof value === 'boolean') {
        // Booleans always count as filled — they're always set
        filled++;
      }
      // null/undefined = not filled (no increment)
    }

    // Calculate percentage, guarding against division by zero
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

    stats[sectionKey] = { filled, total, percentage };
  }

  // ============ OVERALL AGGREGATE ============
  // Sum up filled/total across all sections for a single "how complete
  // is this entire DD" metric, shown on the dashboard header.
  const allSections = Object.values(stats);
  const totalFilled = allSections.reduce((sum, s) => sum + s.filled, 0);
  const totalFields = allSections.reduce((sum, s) => sum + s.total, 0);
  stats.overall = {
    filled: totalFilled,
    total: totalFields,
    percentage: totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0,
  };

  return stats;
}
