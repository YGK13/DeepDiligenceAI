// ============================================================================
// app/api/export/spreadsheet/route.js — DueDrill: CSV Spreadsheet Export API
// ============================================================================
// POST endpoint that generates a professional, IC-meeting-ready CSV export of
// due diligence data. Designed to look polished when opened in Excel or
// Google Sheets — not a raw data dump.
//
// Two export modes:
//   1. PORTFOLIO SUMMARY — multiple companies in a summary table
//   2. SINGLE COMPANY DEEP DIVE — all 16 sections for one company
//
// Request body:
//   { companies: [...], format: 'csv', mode: 'portfolio' | 'single' }
//
// Response:
//   CSV file with Content-Type: text/csv and Content-Disposition attachment header.
//   Filename: DueDrill-Export-{date}.csv or DueDrill-{companyName}-{date}.csv
// ============================================================================

import { NextResponse } from 'next/server';

// ============ SECTION DEFINITIONS ============
// Maps each section to its human-readable field labels.
// Order matters — this is the order fields appear in the CSV.
// Field keys must match the company schema in lib/schemas.js exactly.
const SECTION_FIELDS = {
  overview: {
    label: 'OVERVIEW',
    fields: [
      { key: 'companyName', label: 'Company Name' },
      { key: 'websiteUrl', label: 'Website' },
      { key: 'yearFounded', label: 'Year Founded' },
      { key: 'hqCity', label: 'HQ City' },
      { key: 'hqCountry', label: 'HQ Country' },
      { key: 'stage', label: 'Stage' },
      { key: 'sector', label: 'Sector' },
      { key: 'subSector', label: 'Sub-Sector' },
      { key: 'elevatorPitch', label: 'Elevator Pitch' },
      { key: 'employeeCount', label: 'Employee Count' },
      { key: 'linkedinUrl', label: 'LinkedIn URL' },
      { key: 'crunchbaseUrl', label: 'Crunchbase URL' },
      { key: 'oneLineSummary', label: 'One-Line Summary' },
      { key: 'dealSource', label: 'Deal Source' },
      { key: 'referredBy', label: 'Referred By' },
    ],
  },
  team: {
    label: 'TEAM',
    fields: [
      { key: 'ceoName', label: 'CEO Name' },
      { key: 'ceoBackground', label: 'CEO Background' },
      { key: 'ceoLinkedin', label: 'CEO LinkedIn' },
      { key: 'ctoName', label: 'CTO Name' },
      { key: 'ctoBackground', label: 'CTO Background' },
      { key: 'ctoLinkedin', label: 'CTO LinkedIn' },
      { key: 'coFounders', label: 'Co-Founders' },
      { key: 'totalTeamSize', label: 'Total Team Size' },
      { key: 'engineeringTeamSize', label: 'Engineering Team Size' },
      { key: 'keyHiresNeeded', label: 'Key Hires Needed' },
      { key: 'founderMarketFit', label: 'Founder-Market Fit' },
      { key: 'previousExits', label: 'Previous Exits' },
      { key: 'domainExpertise', label: 'Domain Expertise' },
      { key: 'teamCompleteness', label: 'Team Score', isScore: true },
      { key: 'advisors', label: 'Advisors' },
      { key: 'boardMembers', label: 'Board Members' },
      { key: 'founderVesting', label: 'Founder Vesting' },
      { key: 'teamNotes', label: 'Team Notes' },
    ],
  },
  product: {
    label: 'PRODUCT',
    fields: [
      { key: 'productDescription', label: 'Product Description' },
      { key: 'techStack', label: 'Tech Stack' },
      { key: 'demoUrl', label: 'Demo URL' },
      { key: 'productStage', label: 'Product Stage' },
      { key: 'moatType', label: 'Moat Type' },
      { key: 'moatDescription', label: 'Moat Description' },
      { key: 'technicalDifferentiator', label: 'Technical Differentiator' },
      { key: 'aiMlUsage', label: 'AI/ML Usage' },
      { key: 'scalability', label: 'Scalability' },
      { key: 'technicalDebt', label: 'Technical Debt' },
      { key: 'productRoadmap', label: 'Product Roadmap' },
      { key: 'integrations', label: 'Integrations' },
      { key: 'productScore', label: 'Product Score', isScore: true },
      { key: 'productNotes', label: 'Product Notes' },
    ],
  },
  market: {
    label: 'MARKET',
    fields: [
      { key: 'tam', label: 'TAM' },
      { key: 'sam', label: 'SAM' },
      { key: 'som', label: 'SOM' },
      { key: 'marketGrowthRate', label: 'Market Growth Rate' },
      { key: 'marketDynamics', label: 'Market Dynamics' },
      { key: 'targetCustomerProfile', label: 'Target Customer Profile' },
      { key: 'geographicFocus', label: 'Geographic Focus' },
      { key: 'marketTiming', label: 'Market Timing' },
      { key: 'tailwinds', label: 'Tailwinds' },
      { key: 'headwinds', label: 'Headwinds' },
      { key: 'marketScore', label: 'Market Score', isScore: true },
      { key: 'marketNotes', label: 'Market Notes' },
    ],
  },
  business: {
    label: 'BUSINESS MODEL',
    fields: [
      { key: 'revenueModel', label: 'Revenue Model' },
      { key: 'pricingModel', label: 'Pricing Model' },
      { key: 'avgContractValue', label: 'Avg Contract Value' },
      { key: 'grossMargin', label: 'Gross Margin' },
      { key: 'ltv', label: 'LTV' },
      { key: 'cac', label: 'CAC' },
      { key: 'ltvCacRatio', label: 'LTV:CAC Ratio' },
      { key: 'paybackPeriod', label: 'Payback Period' },
      { key: 'expansionRevenue', label: 'Expansion Revenue' },
      { key: 'revenueConcentrationRisk', label: 'Revenue Concentration Risk' },
      { key: 'channelStrategy', label: 'Channel Strategy' },
      { key: 'businessScore', label: 'Business Model Score', isScore: true },
      { key: 'businessNotes', label: 'Business Model Notes' },
    ],
  },
  traction: {
    label: 'TRACTION',
    fields: [
      { key: 'currentArr', label: 'Current ARR' },
      { key: 'mrrGrowthRate', label: 'MRR Growth Rate' },
      { key: 'totalRevenueLtm', label: 'Total Revenue (LTM)' },
      { key: 'yoyRevenueGrowth', label: 'YoY Revenue Growth' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active Users' },
      { key: 'dau', label: 'DAU' },
      { key: 'mau', label: 'MAU' },
      { key: 'retentionRate', label: 'Retention Rate' },
      { key: 'churnRate', label: 'Churn Rate' },
      { key: 'netRevenueRetention', label: 'Net Revenue Retention' },
      { key: 'npsScore', label: 'NPS Score' },
      { key: 'pipelineValue', label: 'Pipeline Value' },
      { key: 'tractionScore', label: 'Traction Score', isScore: true },
      { key: 'tractionNotes', label: 'Traction Notes' },
    ],
  },
  financial: {
    label: 'FINANCIAL',
    fields: [
      { key: 'lastRoundSize', label: 'Last Round Size' },
      { key: 'lastRoundDate', label: 'Last Round Date' },
      { key: 'lastValuation', label: 'Last Valuation' },
      { key: 'totalRaised', label: 'Total Raised' },
      { key: 'monthlyBurnRate', label: 'Monthly Burn Rate' },
      { key: 'runway', label: 'Runway (months)' },
      { key: 'cashOnHand', label: 'Cash on Hand' },
      { key: 'useOfFunds', label: 'Use of Funds' },
      { key: 'revenueProjection', label: 'Revenue Projection' },
      { key: 'breakEvenTarget', label: 'Break-Even Target' },
      { key: 'capTableSummary', label: 'Cap Table Summary' },
      { key: 'financialScore', label: 'Financial Score', isScore: true },
      { key: 'financialNotes', label: 'Financial Notes' },
    ],
  },
  competitive: {
    label: 'COMPETITIVE LANDSCAPE',
    fields: [
      { key: 'directCompetitors', label: 'Direct Competitors' },
      { key: 'indirectCompetitors', label: 'Indirect Competitors' },
      { key: 'competitiveAdvantages', label: 'Competitive Advantages' },
      { key: 'competitiveWeaknesses', label: 'Competitive Weaknesses' },
      { key: 'marketPositioning', label: 'Market Positioning' },
      { key: 'switchingCosts', label: 'Switching Costs' },
      { key: 'winRate', label: 'Win Rate' },
      { key: 'competitorFundingIntel', label: 'Competitor Funding Intel' },
      { key: 'competitiveScore', label: 'Competitive Score', isScore: true },
      { key: 'competitiveNotes', label: 'Competitive Notes' },
    ],
  },
  ip: {
    label: 'IP & TECHNOLOGY',
    fields: [
      { key: 'patentsFiled', label: 'Patents Filed' },
      { key: 'patentsGranted', label: 'Patents Granted' },
      { key: 'patentsPending', label: 'Patents Pending' },
      { key: 'tradeSecrets', label: 'Trade Secrets' },
      { key: 'proprietaryDataAssets', label: 'Proprietary Data Assets' },
      { key: 'openSourceRisk', label: 'Open Source Risk' },
      { key: 'ipAssignment', label: 'IP Assignment' },
      { key: 'ipJurisdiction', label: 'IP Jurisdiction' },
      { key: 'freedomToOperate', label: 'Freedom to Operate' },
      { key: 'ipScore', label: 'IP & Tech Score', isScore: true },
      { key: 'ipNotes', label: 'IP Notes' },
    ],
  },
  customers: {
    label: 'CUSTOMERS',
    fields: [
      { key: 'keyCustomers', label: 'Key Customers' },
      { key: 'customerLogos', label: 'Customer Logos' },
      { key: 'caseStudies', label: 'Case Studies' },
      { key: 'strategicPartnerships', label: 'Strategic Partnerships' },
      { key: 'channelPartners', label: 'Channel Partners' },
      { key: 'customerConcentration', label: 'Customer Concentration' },
      { key: 'referenceableCustomers', label: 'Referenceable Customers' },
      { key: 'pipelineQuality', label: 'Pipeline Quality' },
      { key: 'customerScore', label: 'Customer Score', isScore: true },
      { key: 'customerNotes', label: 'Customer Notes' },
    ],
  },
  investors: {
    label: 'INVESTORS',
    fields: [
      { key: 'leadInvestor', label: 'Lead Investor' },
      { key: 'allInvestors', label: 'All Investors' },
      { key: 'boardComposition', label: 'Board Composition' },
      { key: 'investorReputation', label: 'Investor Reputation' },
      { key: 'followOnLikelihood', label: 'Follow-On Likelihood' },
      { key: 'investorConflicts', label: 'Investor Conflicts' },
      { key: 'proRataRights', label: 'Pro-Rata Rights' },
      { key: 'investorStrategicValue', label: 'Investor Strategic Value' },
      { key: 'investorScore', label: 'Investor Score', isScore: true },
      { key: 'investorNotes', label: 'Investor Notes' },
    ],
  },
  regulatory: {
    label: 'REGULATORY & COMPLIANCE',
    fields: [
      { key: 'fdaStatus', label: 'FDA Status' },
      { key: 'fdaPathway', label: 'FDA Pathway' },
      { key: 'fdaTimeline', label: 'FDA Timeline' },
      { key: 'otherRegulatoryApprovals', label: 'Other Regulatory Approvals' },
      { key: 'complianceFrameworks', label: 'Compliance Frameworks' },
      { key: 'hipaaCompliance', label: 'HIPAA Compliance' },
      { key: 'gdprCompliance', label: 'GDPR Compliance' },
      { key: 'soc2Compliance', label: 'SOC 2 Compliance' },
      { key: 'regulatoryRisks', label: 'Regulatory Risks' },
      { key: 'regulatoryBurdenAssessment', label: 'Regulatory Burden Assessment' },
      { key: 'regulatoryScore', label: 'Regulatory Score', isScore: true },
      { key: 'regulatoryNotes', label: 'Regulatory Notes' },
    ],
  },
  legal: {
    label: 'LEGAL',
    fields: [
      { key: 'corporateStructure', label: 'Corporate Structure' },
      { key: 'jurisdiction', label: 'Jurisdiction' },
      { key: 'pendingLitigation', label: 'Pending Litigation' },
      { key: 'ipAssignments', label: 'IP Assignments' },
      { key: 'employmentAgreements', label: 'Employment Agreements' },
      { key: 'nonCompeteStatus', label: 'Non-Compete Status' },
      { key: 'materialContracts', label: 'Material Contracts' },
      { key: 'outstandingWarrants', label: 'Outstanding Warrants' },
      { key: 'optionPool', label: 'Option Pool (ESOP)' },
      { key: 'legalRisks', label: 'Legal Risks' },
      { key: 'legalScore', label: 'Legal Score', isScore: true },
      { key: 'legalNotes', label: 'Legal Notes' },
    ],
  },
  israel: {
    label: 'ISRAEL-SPECIFIC',
    fields: [
      { key: 'israelEntityName', label: 'Israel Entity Name' },
      { key: 'israelEntityType', label: 'Israel Entity Type' },
      { key: 'usEntityName', label: 'US Entity Name' },
      { key: 'usEntityType', label: 'US Entity Type' },
      { key: 'iiaGrants', label: 'IIA Grants' },
      { key: 'iiaObligations', label: 'IIA Obligations' },
      { key: 'rdCenterLocation', label: 'R&D Center Location' },
      { key: 'rdHeadcount', label: 'R&D Headcount' },
      { key: 'section102Options', label: 'Section 102 Options' },
      { key: 'transferPricingStrategy', label: 'Transfer Pricing Strategy' },
      { key: 'taxTreatyUsage', label: 'Tax Treaty Usage' },
      { key: 'usMarketStrategy', label: 'US Market Strategy' },
      { key: 'usPresence', label: 'US Presence' },
      { key: 'culturalAdaptationPlan', label: 'Cultural Adaptation Plan' },
      { key: 'usHiringPlan', label: 'US Hiring Plan' },
      { key: 'dualListingConsideration', label: 'Dual Listing Consideration' },
      { key: 'israelScore', label: 'Israel Score', isScore: true },
      { key: 'israelNotes', label: 'Israel Notes' },
    ],
  },
  risks: {
    label: 'RISKS',
    fields: [
      { key: 'keyRisksTop5', label: 'Top 5 Key Risks' },
      { key: 'technicalRisks', label: 'Technical Risks' },
      { key: 'marketRisks', label: 'Market Risks' },
      { key: 'executionRisks', label: 'Execution Risks' },
      { key: 'financialRisks', label: 'Financial Risks' },
      { key: 'regulatoryRisks', label: 'Regulatory Risks' },
      { key: 'competitiveRisks', label: 'Competitive Risks' },
      { key: 'teamRisks', label: 'Team Risks' },
      { key: 'riskMitigants', label: 'Risk Mitigants' },
      { key: 'dealBreakers', label: 'Deal Breakers' },
      { key: 'overallRiskLevel', label: 'Overall Risk Level' },
      { key: 'riskScore', label: 'Risk Score', isScore: true },
      { key: 'riskNotes', label: 'Risk Notes' },
    ],
  },
  deal: {
    label: 'DEAL TERMS',
    fields: [
      { key: 'roundName', label: 'Round Name' },
      { key: 'targetRaise', label: 'Target Raise' },
      { key: 'preMoneyValuation', label: 'Pre-Money Valuation' },
      { key: 'instrumentType', label: 'Instrument Type' },
      { key: 'leadInvestorCommitted', label: 'Lead Investor Committed' },
      { key: 'ourAllocation', label: 'Our Allocation' },
      { key: 'ownershipTarget', label: 'Ownership Target' },
      { key: 'boardSeat', label: 'Board Seat' },
      { key: 'proRataRights', label: 'Pro-Rata Rights' },
      { key: 'liquidationPreference', label: 'Liquidation Preference' },
      { key: 'antiDilution', label: 'Anti-Dilution' },
      { key: 'dragAlong', label: 'Drag-Along' },
      { key: 'tagAlong', label: 'Tag-Along' },
      { key: 'vestingSchedule', label: 'Vesting Schedule' },
      { key: 'esopSize', label: 'ESOP Size' },
      { key: 'keyTermsConditions', label: 'Key Terms & Conditions' },
      { key: 'dealScore', label: 'Deal Score', isScore: true },
      { key: 'dealNotes', label: 'Deal Notes' },
    ],
  },
};

// ============ CSV HELPER FUNCTIONS ============

/**
 * Escapes a value for CSV output.
 * Rules:
 *   - Wraps in double quotes if the value contains commas, newlines, or quotes
 *   - Escapes internal double quotes by doubling them ("" per RFC 4180)
 *   - Converts null/undefined to em-dash for visual clarity in spreadsheets
 *   - Trims whitespace
 */
function escapeCSV(value) {
  // Handle missing/empty values — show em-dash instead of blank cells
  if (value === null || value === undefined || value === '') return '\u2014';

  // Convert numbers and booleans to strings
  let str = String(value).trim();

  // If still empty after trimming, show em-dash
  if (str.length === 0) return '\u2014';

  // Replace newlines with spaces to prevent row-breaking in Excel
  // (multi-line text in CSV cells causes rendering issues in some readers)
  str = str.replace(/\r?\n/g, ' | ');

  // If the value contains special CSV characters, quote it
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape internal double quotes by doubling them (RFC 4180)
    str = '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Creates a single CSV row from an array of values.
 * Applies escapeCSV to each cell and joins with commas.
 */
function csvRow(values) {
  return values.map(escapeCSV).join(',');
}

/**
 * Creates an empty CSV row (blank line separator between sections).
 */
function emptyRow() {
  return '';
}

/**
 * Formats the current date as YYYY-MM-DD for filenames and headers.
 */
function formatDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Computes a simple overall score from a company object.
 * Mirrors the scoring logic in lib/scoring.js but runs server-side.
 */
function computeOverallScore(company) {
  const SCORE_WEIGHTS = {
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

/**
 * Returns a text verdict based on score — matches lib/scoring.js logic.
 */
function getVerdict(score) {
  const num = parseFloat(score) || 0;
  if (num >= 8) return 'Strong Pass';
  if (num >= 7) return 'Pass';
  if (num >= 5) return 'Borderline';
  if (num >= 3) return 'Weak';
  return 'Fail';
}

// ============ PORTFOLIO SUMMARY GENERATOR ============

/**
 * Generates a multi-company portfolio summary CSV.
 * This is the format used for IC meetings — one row per company with
 * the key metrics a partner needs to evaluate the pipeline at a glance.
 */
function generatePortfolioCSV(companies) {
  const rows = [];
  const date = formatDate();

  // ---- Title Header ----
  rows.push(csvRow(['DUEDRILL \u2014 PORTFOLIO DUE DILIGENCE EXPORT']));
  rows.push(csvRow([`Generated: ${date}`]));
  rows.push(csvRow([`Companies: ${companies.length}`]));
  rows.push(emptyRow());

  // ---- Summary Table Header ----
  // These 12 columns fit comfortably on one screen in Excel at standard zoom
  rows.push(csvRow([
    'COMPANY',
    'STAGE',
    'SECTOR',
    'SCORE',
    'VERDICT',
    'FOUNDED',
    'HQ',
    'TOTAL RAISED',
    'ARR',
    'TEAM SIZE',
    'DEAL STAGE',
    'RISK LEVEL',
  ]));

  // ---- One Row Per Company ----
  for (const company of companies) {
    const ov = company.overview || {};
    const tm = company.team || {};
    const tr = company.traction || {};
    const fi = company.financial || {};
    const rs = company.risks || {};

    // Compute overall score on the fly
    const score = computeOverallScore(company);
    const verdict = getVerdict(score);

    // Format HQ as "City, Country" for compactness
    const hq = [ov.hqCity, ov.hqCountry].filter(Boolean).join(', ') || '';

    // Format monetary values as clean numbers (no $ prefix — Excel handles formatting)
    const totalRaised = fi.totalRaised || '';
    const arr = tr.currentArr || '';

    rows.push(csvRow([
      company.name || ov.companyName || '',
      ov.stage || '',
      ov.sector || '',
      score,
      verdict,
      ov.yearFounded || '',
      hq,
      totalRaised,
      arr,
      tm.totalTeamSize || '',
      company.dealStage || '',
      rs.overallRiskLevel || '',
    ]));
  }

  rows.push(emptyRow());

  // ---- Score Breakdown Table ----
  // Second table showing category-level scores for side-by-side comparison
  rows.push(csvRow(['CATEGORY SCORE BREAKDOWN']));

  // Header row with company names
  const scoreHeaders = ['CATEGORY', ...companies.map(c => c.name || c.overview?.companyName || 'Unknown')];
  rows.push(csvRow(scoreHeaders));

  // One row per score category
  const SCORE_CATEGORIES = [
    { key: 'team', field: 'teamCompleteness', label: 'Team', weight: '18%' },
    { key: 'product', field: 'productScore', label: 'Product', weight: '14%' },
    { key: 'market', field: 'marketScore', label: 'Market', weight: '13%' },
    { key: 'traction', field: 'tractionScore', label: 'Traction', weight: '13%' },
    { key: 'business', field: 'businessScore', label: 'Business Model', weight: '10%' },
    { key: 'competitive', field: 'competitiveScore', label: 'Competitive', weight: '8%' },
    { key: 'financial', field: 'financialScore', label: 'Financial', weight: '7%' },
    { key: 'ip', field: 'ipScore', label: 'IP & Tech', weight: '5%' },
    { key: 'regulatory', field: 'regulatoryScore', label: 'Regulatory', weight: '4%' },
    { key: 'israel', field: 'israelScore', label: 'Israel', weight: '4%' },
    { key: 'legal', field: 'legalScore', label: 'Legal', weight: '2%' },
    { key: 'deal', field: 'dealScore', label: 'Deal Terms', weight: '2%' },
  ];

  for (const cat of SCORE_CATEGORIES) {
    const rowValues = [`${cat.label} (${cat.weight})`];
    for (const company of companies) {
      const section = company[cat.key] || {};
      const val = parseFloat(section[cat.field]);
      rowValues.push(isNaN(val) ? '' : val);
    }
    rows.push(csvRow(rowValues));
  }

  // Overall score row
  const overallRow = ['OVERALL SCORE'];
  for (const company of companies) {
    overallRow.push(computeOverallScore(company));
  }
  rows.push(csvRow(overallRow));

  rows.push(emptyRow());
  rows.push(csvRow(['End of DueDrill Export']));

  return rows.join('\r\n');
}

// ============ SINGLE COMPANY DEEP DIVE GENERATOR ============

/**
 * Generates a comprehensive single-company CSV with all 16 sections.
 * Each section gets a header row, then field/value pairs in a two-column layout.
 * Scores are called out explicitly with "/10" suffix for clarity.
 */
function generateSingleCompanyCSV(company) {
  const rows = [];
  const date = formatDate();
  const companyName = company.name || company.overview?.companyName || 'Unknown Company';

  // ---- Title Header ----
  rows.push(csvRow([`DUEDRILL \u2014 DUE DILIGENCE DEEP DIVE`]));
  rows.push(csvRow([`Company: ${companyName}`]));
  rows.push(csvRow([`Generated: ${date}`]));

  // Overall score and verdict
  const overallScore = computeOverallScore(company);
  const verdict = getVerdict(overallScore);
  rows.push(csvRow([`Overall Score: ${overallScore}/10 \u2014 ${verdict}`]));
  rows.push(csvRow([`Deal Stage: ${company.dealStage || '\u2014'}`]));
  rows.push(emptyRow());

  // ---- Quick Summary Row ----
  // Same 12-column layout as the portfolio view, but for one company
  rows.push(csvRow(['QUICK SUMMARY']));
  rows.push(csvRow([
    'COMPANY', 'STAGE', 'SECTOR', 'SCORE', 'VERDICT',
    'FOUNDED', 'HQ', 'TOTAL RAISED', 'ARR', 'TEAM SIZE',
    'DEAL STAGE', 'RISK LEVEL',
  ]));

  const ov = company.overview || {};
  const tm = company.team || {};
  const tr = company.traction || {};
  const fi = company.financial || {};
  const rs = company.risks || {};
  const hq = [ov.hqCity, ov.hqCountry].filter(Boolean).join(', ') || '';

  rows.push(csvRow([
    companyName,
    ov.stage || '',
    ov.sector || '',
    overallScore,
    verdict,
    ov.yearFounded || '',
    hq,
    fi.totalRaised || '',
    tr.currentArr || '',
    tm.totalTeamSize || '',
    company.dealStage || '',
    rs.overallRiskLevel || '',
  ]));

  rows.push(emptyRow());

  // ---- Per-Section Detail Blocks ----
  // Two-column layout: FIELD | VALUE
  // Each section starts with a bold-friendly ALL-CAPS header row
  for (const [sectionKey, sectionConfig] of Object.entries(SECTION_FIELDS)) {
    const sectionData = company[sectionKey] || {};

    // Section header — ALL CAPS in column A, spanning two columns visually
    rows.push(csvRow([`=== ${sectionConfig.label} ===`, '']));
    rows.push(csvRow(['FIELD', 'VALUE']));

    // Field/value rows
    for (const field of sectionConfig.fields) {
      let value = sectionData[field.key];

      // Format score fields with "/10" suffix for clarity
      if (field.isScore) {
        const numVal = parseFloat(value);
        value = isNaN(numVal) ? '' : `${numVal}/10`;
      }

      rows.push(csvRow([field.label, value]));
    }

    // Blank row separator between sections
    rows.push(emptyRow());
  }

  // ---- Verdict Notes ----
  if (company.verdictNotes || company.overallVerdict) {
    rows.push(csvRow(['=== OVERALL VERDICT ===', '']));
    if (company.overallVerdict) {
      rows.push(csvRow(['Verdict', company.overallVerdict]));
    }
    if (company.verdictNotes) {
      rows.push(csvRow(['Notes', company.verdictNotes]));
    }
    rows.push(emptyRow());
  }

  rows.push(csvRow(['End of DueDrill Deep Dive Export']));

  return rows.join('\r\n');
}

// ============ POST HANDLER ============

export async function POST(request) {
  try {
    const body = await request.json();
    const { companies, format, mode } = body;

    // ---- Validation ----
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json(
        { error: 'No companies provided. Send { companies: [...], mode: "portfolio"|"single" }' },
        { status: 400 }
      );
    }

    // ---- Generate CSV based on mode ----
    let csvContent;
    let filename;
    const date = formatDate();

    if (mode === 'single' && companies.length === 1) {
      // Single company deep dive
      csvContent = generateSingleCompanyCSV(companies[0]);
      const safeName = (companies[0].name || companies[0].overview?.companyName || 'Company')
        .replace(/[^a-zA-Z0-9\-_ ]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      filename = `DueDrill-${safeName}-${date}.csv`;
    } else {
      // Portfolio summary (default for multiple companies)
      csvContent = generatePortfolioCSV(companies);
      filename = `DueDrill-Export-${date}.csv`;
    }

    // ---- Add UTF-8 BOM ----
    // The BOM tells Excel to interpret the file as UTF-8 instead of ANSI,
    // which prevents mojibake with special characters (em-dashes, accents, etc.)
    const bom = '\uFEFF';
    const fullContent = bom + csvContent;

    // ---- Return the CSV file ----
    return new Response(fullContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Export API] Error generating CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV export.' },
      { status: 500 }
    );
  }
}
