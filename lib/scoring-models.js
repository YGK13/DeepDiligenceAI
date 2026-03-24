// ============================================================================
// lib/scoring-models.js — Custom Scoring Model Definitions
// ============================================================================
// Defines pre-built scoring templates for different investment strategies.
// Each template specifies weights for the 12 scoring categories. Users can
// select a template, customize weights, or create their own from scratch.
//
// The weights MUST sum to 1.0 (100%). The UI enforces this constraint.
//
// ARCHITECTURE:
// - SCORING_TEMPLATES: read-only templates that ship with DueDrill
// - User custom models are stored in settings.scoringModels[]
// - Each company can have a scoringModelId that determines which model to use
// - If no model is selected, the "balanced" default is used
// ============================================================================

// ============ ALL 12 SCORING CATEGORIES ============
// These are the categories that can be weighted. Each maps to a section
// in the app and a score field in that section's data.
export const SCORING_CATEGORIES = [
  { id: 'team', label: 'Team & Founders', field: 'teamCompleteness', icon: '👥' },
  { id: 'product', label: 'Product & Tech', field: 'productScore', icon: '⚙️' },
  { id: 'market', label: 'Market Opportunity', field: 'marketScore', icon: '📈' },
  { id: 'traction', label: 'Traction & Metrics', field: 'tractionScore', icon: '🚀' },
  { id: 'business', label: 'Business Model', field: 'businessScore', icon: '💰' },
  { id: 'competitive', label: 'Competitive Position', field: 'competitiveScore', icon: '🎯' },
  { id: 'financial', label: 'Financial Health', field: 'financialScore', icon: '📑' },
  { id: 'ip', label: 'IP & Technology', field: 'ipScore', icon: '🔒' },
  { id: 'regulatory', label: 'Regulatory & Compliance', field: 'regulatoryScore', icon: '📋' },
  { id: 'israel', label: 'Israel-Specific', field: 'israelScore', icon: '🇮🇱' },
  { id: 'legal', label: 'Legal Structure', field: 'legalScore', icon: '⚖️' },
  { id: 'deal', label: 'Deal Terms', field: 'dealScore', icon: '📝' },
];

// ============ PRE-BUILT SCORING TEMPLATES ============
// Each template is designed for a specific investment thesis or stage.
// Weights must sum to 1.0.
export const SCORING_TEMPLATES = {
  // ---- DEFAULT: Balanced across all categories ----
  balanced: {
    id: 'balanced',
    name: 'Balanced (Default)',
    description: 'Equal emphasis across all major categories. Good starting point for generalist investors.',
    stage: 'All Stages',
    editable: false, // built-in templates are read-only (users clone to customize)
    weights: {
      team: 0.18, product: 0.14, market: 0.13, traction: 0.13,
      business: 0.10, competitive: 0.08, financial: 0.07, ip: 0.05,
      regulatory: 0.04, israel: 0.04, legal: 0.02, deal: 0.02,
    },
  },

  // ---- SEED STAGE: Team and market are everything ----
  seed: {
    id: 'seed',
    name: 'Seed / Pre-Seed',
    description: 'At the earliest stage, team quality and market size dominate. Traction is minimal, financials barely exist.',
    stage: 'Pre-Seed / Seed',
    editable: false,
    weights: {
      team: 0.30, market: 0.20, product: 0.15, business: 0.10,
      traction: 0.05, competitive: 0.05, ip: 0.05, financial: 0.03,
      deal: 0.03, regulatory: 0.02, israel: 0.01, legal: 0.01,
    },
  },

  // ---- SERIES A: Traction proves the thesis ----
  seriesA: {
    id: 'seriesA',
    name: 'Series A',
    description: 'Product-market fit must be proven. Traction metrics and unit economics carry heavy weight.',
    stage: 'Series A',
    editable: false,
    weights: {
      traction: 0.22, team: 0.18, product: 0.15, market: 0.12,
      business: 0.10, financial: 0.08, competitive: 0.06, ip: 0.03,
      deal: 0.03, regulatory: 0.01, israel: 0.01, legal: 0.01,
    },
  },

  // ---- GROWTH: Financial performance is king ----
  growth: {
    id: 'growth',
    name: 'Growth / Series B+',
    description: 'At growth stage, financial metrics, unit economics, and competitive moat matter most.',
    stage: 'Series B+',
    editable: false,
    weights: {
      financial: 0.20, traction: 0.18, competitive: 0.15, business: 0.12,
      market: 0.10, team: 0.08, product: 0.06, deal: 0.05,
      ip: 0.03, regulatory: 0.01, israel: 0.01, legal: 0.01,
    },
  },

  // ---- DEEP TECH: IP and technical moat dominate ----
  deepTech: {
    id: 'deepTech',
    name: 'Deep Tech / Biotech',
    description: 'For IP-heavy companies where patents, proprietary tech, and regulatory approval are make-or-break.',
    stage: 'All Stages',
    editable: false,
    weights: {
      ip: 0.22, team: 0.18, product: 0.15, regulatory: 0.12,
      market: 0.10, competitive: 0.08, financial: 0.05, traction: 0.04,
      business: 0.03, deal: 0.01, israel: 0.01, legal: 0.01,
    },
  },

  // ---- ISRAEL-FOCUSED: Heavy weight on Israel-specific factors ----
  israelFocused: {
    id: 'israelFocused',
    name: 'Israel-Focused Fund',
    description: 'For funds investing in Israeli startups. Weights Israel-specific factors (IIA grants, dual HQ, military tech) heavily.',
    stage: 'All Stages',
    editable: false,
    weights: {
      team: 0.16, israel: 0.15, product: 0.12, market: 0.12,
      traction: 0.10, competitive: 0.08, business: 0.07, financial: 0.06,
      ip: 0.05, regulatory: 0.04, deal: 0.03, legal: 0.02,
    },
  },

  // ---- PAYNE SCORECARD: Based on the classic angel investing framework ----
  payneScorecard: {
    id: 'payneScorecard',
    name: 'Payne Scorecard',
    description: 'Based on Bill Payne\'s angel investing scorecard. Team is 30%, Market is 25%, with other factors distributed.',
    stage: 'Angel / Pre-Seed',
    editable: false,
    weights: {
      team: 0.30, market: 0.25, product: 0.10, competitive: 0.10,
      business: 0.10, traction: 0.05, financial: 0.05, ip: 0.02,
      deal: 0.01, regulatory: 0.01, israel: 0.005, legal: 0.005,
    },
  },
};

// ============ HELPER: Get weights for a model ============
// Given a model ID, returns the weights object. Falls back to balanced.
// Also checks user's custom models stored in settings.
export function getModelWeights(modelId, customModels = []) {
  // Check built-in templates first
  if (SCORING_TEMPLATES[modelId]) {
    return SCORING_TEMPLATES[modelId].weights;
  }

  // Check user's custom models
  const custom = customModels.find((m) => m.id === modelId);
  if (custom) {
    return custom.weights;
  }

  // Fallback to balanced
  return SCORING_TEMPLATES.balanced.weights;
}

// ============ HELPER: Calculate score with specific model ============
// Like calculateOverallScore but uses a custom weight set instead of SCORE_WEIGHTS.
export function calculateScoreWithModel(company, weights) {
  if (!company || !weights) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const cat of SCORING_CATEGORIES) {
    const section = company[cat.id];
    if (!section) continue;

    const scoreValue = parseFloat(section[cat.field]);
    if (isNaN(scoreValue)) continue;

    const weight = weights[cat.id] || 0;
    weightedSum += scoreValue * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

// ============ HELPER: Validate weights sum to ~1.0 ============
export function validateWeights(weights) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  // Allow small floating-point tolerance
  return Math.abs(sum - 1.0) < 0.01;
}

// ============ HELPER: Normalize weights to sum to 1.0 ============
export function normalizeWeights(weights) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;
  const normalized = {};
  for (const [key, val] of Object.entries(weights)) {
    normalized[key] = Math.round((val / sum) * 1000) / 1000;
  }
  return normalized;
}
