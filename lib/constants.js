// ============================================================================
// lib/constants.js — DueDrill: Application-Wide Constants
// ============================================================================
// Single source of truth for ALL configuration constants used across the app.
// Extracted from the original monolithic HTML app into a clean, importable module.
// Every component that needs nav items, scoring weights, provider configs, or
// dropdown options imports from HERE — never hardcoded inline.
// ============================================================================

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================
// The full 19-item navigation structure for the sidebar.
// Each item maps to a section/page in the due diligence workflow.
// "section" groups items visually in the sidebar under collapsible headers.
// "icon" is an emoji used in the sidebar label — keeps things lightweight
// without needing an icon library dependency.
export const NAV_ITEMS = [
  // --- Core Analysis: the foundational tabs every deal starts with ---
  { id: 'dashboard', label: 'Dashboard', icon: '\uD83D\uDCCA', section: 'core' },
  { id: 'overview', label: 'Overview', icon: '\uD83C\uDFE2', section: 'core' },
  { id: 'team', label: 'Team', icon: '\uD83D\uDC65', section: 'core' },
  { id: 'product', label: 'Product', icon: '\u2699\uFE0F', section: 'core' },
  { id: 'market', label: 'Market', icon: '\uD83D\uDCC8', section: 'core' },

  // --- Financial: revenue, traction, and financial deep-dive ---
  { id: 'business', label: 'Business Model', icon: '\uD83D\uDCB0', section: 'financial' },
  { id: 'traction', label: 'Traction', icon: '\uD83D\uDE80', section: 'financial' },
  { id: 'financial', label: 'Financial', icon: '\uD83D\uDCD1', section: 'financial' },

  // --- Strategic: competitive landscape, IP, customers, investors ---
  { id: 'competitive', label: 'Competitive', icon: '\uD83C\uDFAF', section: 'strategic' },
  { id: 'ip', label: 'IP & Tech', icon: '\uD83D\uDD12', section: 'strategic' },
  { id: 'customers', label: 'Customers', icon: '\uD83E\uDD1D', section: 'strategic' },
  { id: 'investors', label: 'Investors', icon: '\uD83C\uDFE6', section: 'strategic' },
  { id: 'references', label: 'References', icon: '📞', section: 'strategic' },
  { id: 'contacts', label: 'Contacts', icon: '👤', section: 'strategic' },

  // --- Compliance & Legal: regulatory, legal, Israel-specific ---
  { id: 'regulatory', label: 'Regulatory', icon: '\uD83D\uDCCB', section: 'compliance' },
  { id: 'legal', label: 'Legal', icon: '\u2696\uFE0F', section: 'compliance' },
  { id: 'israel', label: 'Israel', icon: '\uD83C\uDDEE\uD83C\uDDF1', section: 'compliance' },

  // --- Evaluation: risk assessment and deal terms ---
  { id: 'risks', label: 'Risks', icon: '\u26A0\uFE0F', section: 'evaluation' },
  { id: 'deal', label: 'Deal Terms', icon: '\uD83D\uDCDD', section: 'evaluation' },

  // --- Data: external data sources, documents, and deck analysis ---
  { id: 'documents', label: 'Documents', icon: '📁', section: 'data' },
  { id: 'deck', label: 'Deck Upload', icon: '📎', section: 'data' },
  { id: 'integrations', label: 'Integrations', icon: '🔗', section: 'data' },

  // --- Output: generated report, pipeline, comparison view, and app settings ---
  { id: 'report', label: 'Report', icon: '\uD83D\uDCC4', section: 'output' },
  { id: 'pipeline', label: 'Pipeline', icon: '🔄', section: 'output' },
  { id: 'analytics', label: 'Fund Analytics', icon: '📈', section: 'output' },
  { id: 'monitoring', label: 'Monitoring', icon: '🔔', section: 'output' },
  { id: 'bulk', label: 'Bulk Actions', icon: '⚡', section: 'output' },
  { id: 'comparison', label: 'Compare', icon: '\uD83D\uDCCA', section: 'output' },
  { id: 'timeline', label: 'Timeline', icon: '\uD83D\uDCC5', section: 'output' },
  { id: 'scoring', label: 'Scoring Models', icon: '\uD83C\uDFAF', section: 'output' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F', section: 'output' },
];

// ============================================================================
// SECTION LABELS
// ============================================================================
// Human-readable labels for each sidebar section group.
// Used by the sidebar component to render collapsible section headers.
export const SECTION_LABELS = {
  core: 'Core Analysis',
  financial: 'Financial',
  strategic: 'Strategic',
  compliance: 'Compliance & Legal',
  evaluation: 'Evaluation',
  data: 'Data Sources',
  output: 'Output',
};

// ============================================================================
// SCORE WEIGHTS
// ============================================================================
// Weighted scoring configuration for calculating the overall due diligence score.
// Each key is a section ID, mapping to { field, weight }.
// - field: the specific score field name inside that section of the company object
// - weight: how much this section contributes to the overall score (all weights sum to 1.0)
//
// WHY these weights? Team is heaviest (0.18) because in early-stage VC, the team
// is the #1 predictor of success. Product and market are next (0.14, 0.13) because
// you need a real product addressing a real market. Legal/deal are lowest because
// they're table-stakes — important but not differentiators.
export const SCORE_WEIGHTS = {
  team:        { field: 'teamCompleteness',  weight: 0.18 },
  product:     { field: 'productScore',      weight: 0.14 },
  market:      { field: 'marketScore',       weight: 0.13 },
  traction:    { field: 'tractionScore',     weight: 0.13 },
  business:    { field: 'businessScore',     weight: 0.10 },
  competitive: { field: 'competitiveScore',  weight: 0.08 },
  financial:   { field: 'financialScore',    weight: 0.07 },
  ip:          { field: 'ipScore',           weight: 0.05 },
  regulatory:  { field: 'regulatoryScore',   weight: 0.04 },
  israel:      { field: 'israelScore',       weight: 0.04 },
  legal:       { field: 'legalScore',        weight: 0.02 },
  deal:        { field: 'dealScore',         weight: 0.02 },
};

// ============================================================================
// SECTION → SCORE FIELD NAME MAPPING
// ============================================================================
// Maps each autofillable section key to its score field name inside the
// company data object. Derived from SCORE_WEIGHTS above. Used by the
// auto-fill system to set AI-suggested scores alongside text data.
//
// When the AI auto-fills a section, it also suggests a quality score (1-10).
// This mapping tells the client which field to write that score into so it
// gets picked up by calculateOverallScore() in lib/scoring.js.
export const SECTION_SCORE_FIELDS = Object.fromEntries(
  Object.entries(SCORE_WEIGHTS).map(([sectionKey, config]) => [sectionKey, config.field])
);
// Result: { team: 'teamCompleteness', product: 'productScore', market: 'marketScore', ... }

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================
// Config for each supported AI provider. Used by the settings page to render
// provider selection UI and by the API route to know which models are available.
//
// NOTE: buildRequest() and extractText() methods from the original HTML app
// have been removed from this client-side config. Those now live server-side
// in /app/api/ai/route.js to keep API keys secure and avoid exposing provider
// implementation details to the browser.
export const PROVIDERS = {
  perplexity: {
    label: 'Perplexity AI',
    // Perplexity is the default because it includes real-time web search,
    // which is critical for due diligence research (checking company news,
    // funding rounds, competitor activity, regulatory filings, etc.)
    models: [
      { value: 'sonar-pro', label: 'Sonar Pro (Best)' },
      { value: 'sonar', label: 'Sonar (Fast)' },
      { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
      { value: 'sonar-reasoning', label: 'Sonar Reasoning' },
    ],
    defaultModel: 'sonar-pro',
    keyPlaceholder: 'pplx-xxxxxxxxxxxxxxxxxxxx',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    keyPlaceholder: 'sk-ant-xxxxxxxxxxxxxxxxxxxx',
  },
  openai: {
    label: 'OpenAI',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Best)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
      { value: 'o1-preview', label: 'o1 Preview (Reasoning)' },
    ],
    defaultModel: 'gpt-4o',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxx',
  },
  groq: {
    label: 'Groq',
    // Groq is the speed king — useful for rapid iteration and bulk research
    // when you need responses in <1 second, even if quality is slightly lower
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Fastest)' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    keyPlaceholder: 'gsk_xxxxxxxxxxxxxxxxxxxx',
  },
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================
// Initial app settings state. Used when no saved settings exist in
// localStorage or Supabase. Perplexity is default because web search
// is essential for DD research.
export const DEFAULT_SETTINGS = {
  provider: 'perplexity',
  // API keys are stored per-provider so users can switch without re-entering
  apiKeys: {},
  // Selected model per provider — falls back to provider's defaultModel if not set
  models: {},
};

// ============================================================================
// STAGE OPTIONS
// ============================================================================
// Company funding stage dropdown options. Used in the Overview section.
// Ordered from earliest to latest stage for intuitive selection.
export const STAGE_OPTIONS = [
  { value: '', label: 'Select Stage...' },
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C' },
  { value: 'series-d+', label: 'Series D+' },
  { value: 'growth', label: 'Growth' },
  { value: 'pre-ipo', label: 'Pre-IPO' },
  { value: 'public', label: 'Public' },
];

// ============================================================================
// SECTOR OPTIONS
// ============================================================================
// Industry sector dropdown options. Used in the Overview section.
// Covers the major verticals relevant to VC due diligence.
export const SECTOR_OPTIONS = [
  { value: '', label: 'Select Sector...' },
  { value: 'saas', label: 'SaaS' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'healthtech', label: 'HealthTech / MedTech' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'ecommerce', label: 'E-Commerce / Marketplace' },
  { value: 'ai-ml', label: 'AI / Machine Learning' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'devtools', label: 'Developer Tools / Infrastructure' },
  { value: 'biotech', label: 'BioTech / Life Sciences' },
  { value: 'cleantech', label: 'CleanTech / Climate' },
  { value: 'proptech', label: 'PropTech / Real Estate' },
  { value: 'insurtech', label: 'InsurTech' },
  { value: 'legaltech', label: 'LegalTech' },
  { value: 'agtech', label: 'AgTech / FoodTech' },
  { value: 'gaming', label: 'Gaming / Entertainment' },
  { value: 'web3', label: 'Web3 / Blockchain' },
  { value: 'robotics', label: 'Robotics / Hardware' },
  { value: 'defense', label: 'Defense / GovTech' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// PRODUCT STAGE OPTIONS
// ============================================================================
// Where the product sits in its lifecycle. Used in the Product section.
export const PRODUCT_STAGE_OPTIONS = [
  { value: '', label: 'Select Product Stage...' },
  { value: 'concept', label: 'Concept / Idea' },
  { value: 'prototype', label: 'Prototype / MVP' },
  { value: 'beta', label: 'Beta' },
  { value: 'launched', label: 'Launched (GA)' },
  { value: 'growth', label: 'Growth / Scaling' },
  { value: 'mature', label: 'Mature' },
];

// ============================================================================
// MOAT TYPE OPTIONS
// ============================================================================
// Types of competitive moats. Used in the Product section to classify
// what gives the company its defensibility.
export const MOAT_TYPE_OPTIONS = [
  { value: '', label: 'Select Moat Type...' },
  { value: 'network-effects', label: 'Network Effects' },
  { value: 'data-moat', label: 'Data Moat' },
  { value: 'switching-costs', label: 'Switching Costs' },
  { value: 'brand', label: 'Brand' },
  { value: 'economies-of-scale', label: 'Economies of Scale' },
  { value: 'regulatory', label: 'Regulatory / Licensing' },
  { value: 'ip-patents', label: 'IP / Patents' },
  { value: 'technology', label: 'Technology / Trade Secrets' },
  { value: 'none', label: 'None / Weak' },
];

// ============================================================================
// REVENUE MODEL OPTIONS
// ============================================================================
// How the company makes money. Used in the Business Model section.
export const REVENUE_MODEL_OPTIONS = [
  { value: '', label: 'Select Revenue Model...' },
  { value: 'subscription', label: 'Subscription (SaaS)' },
  { value: 'usage-based', label: 'Usage-Based / Metered' },
  { value: 'transactional', label: 'Transactional / Per-Transaction' },
  { value: 'marketplace', label: 'Marketplace (Take Rate)' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'hardware', label: 'Hardware + Software' },
  { value: 'services', label: 'Professional Services' },
  { value: 'hybrid', label: 'Hybrid' },
];

// ============================================================================
// INSTRUMENT TYPE OPTIONS
// ============================================================================
// Investment instrument types. Used in the Deal Terms section.
export const INSTRUMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select Instrument...' },
  { value: 'priced-equity', label: 'Priced Equity Round' },
  { value: 'safe', label: 'SAFE' },
  { value: 'convertible-note', label: 'Convertible Note' },
  { value: 'safe-mfn', label: 'SAFE (MFN)' },
  { value: 'safe-cap', label: 'SAFE (Valuation Cap)' },
  { value: 'safe-discount', label: 'SAFE (Discount)' },
  { value: 'safe-cap-discount', label: 'SAFE (Cap + Discount)' },
  { value: 'kiss', label: 'KISS' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// RISK LEVEL OPTIONS
// ============================================================================
// Overall risk assessment levels. Used in the Risks section.
export const RISK_LEVEL_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ============================================================================
// ISRAEL ENTITY TYPE OPTIONS
// ============================================================================
// Israeli legal entity types. Used in the Israel section because many
// Israeli startups have a dual-entity structure (IL + US).
export const ISRAEL_ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Select Entity Type...' },
  { value: 'ltd', label: 'Ltd. (Chevrat Ba"m)' },
  { value: 'pbc', label: 'Public Benefit Company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole-proprietor', label: 'Sole Proprietorship (Osek)' },
  { value: 'nonprofit', label: 'Amuta (Non-Profit)' },
];

// ============================================================================
// US ENTITY TYPE OPTIONS
// ============================================================================
// US legal entity types. Used in the Israel section for the US-side entity.
export const US_ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Select Entity Type...' },
  { value: 'c-corp-de', label: 'C-Corp (Delaware)' },
  { value: 'c-corp-other', label: 'C-Corp (Other State)' },
  { value: 'llc', label: 'LLC' },
  { value: 's-corp', label: 'S-Corp' },
  { value: 'none', label: 'No US Entity' },
];

// ============================================================================
// CORPORATE STRUCTURE OPTIONS
// ============================================================================
// Legal structure types. Used in the Legal section.
export const CORPORATE_STRUCTURE_OPTIONS = [
  { value: '', label: 'Select Structure...' },
  { value: 'c-corp-de', label: 'Delaware C-Corp' },
  { value: 'c-corp-other', label: 'C-Corp (Other)' },
  { value: 'llc', label: 'LLC' },
  { value: 'foreign-corp', label: 'Foreign Corporation' },
  { value: 'dual-entity', label: 'Dual Entity (US + Foreign)' },
  { value: 'holding-company', label: 'Holding Company Structure' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// LIQUIDATION PREFERENCE OPTIONS
// ============================================================================
// Types of liquidation preferences in deal terms.
export const LIQUIDATION_PREF_OPTIONS = [
  { value: '', label: 'Select Preference...' },
  { value: '1x-non-participating', label: '1x Non-Participating' },
  { value: '1x-participating', label: '1x Participating' },
  { value: '1x-participating-capped', label: '1x Participating (Capped)' },
  { value: '2x-non-participating', label: '2x Non-Participating' },
  { value: '2x-participating', label: '2x Participating' },
  { value: 'none', label: 'None' },
];

// ============================================================================
// ANTI-DILUTION OPTIONS
// ============================================================================
// Anti-dilution protection types in deal terms.
export const ANTI_DILUTION_OPTIONS = [
  { value: '', label: 'Select Protection...' },
  { value: 'broad-weighted-average', label: 'Broad-Based Weighted Average' },
  { value: 'narrow-weighted-average', label: 'Narrow-Based Weighted Average' },
  { value: 'full-ratchet', label: 'Full Ratchet' },
  { value: 'none', label: 'None' },
];
