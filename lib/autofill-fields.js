// ============================================================================
// lib/autofill-fields.js — Field Definitions for AI Auto-Fill
// ============================================================================
// Maps each section to its fillable fields with descriptions that the AI
// uses to understand what data to return. Score fields and notes are excluded
// from auto-fill — those require human judgment.
//
// Each field entry has:
//   key    — the exact field name in the schema (must match schemas.js)
//   label  — human-readable name for the AI prompt
//   type   — 'text' (short string), 'long' (paragraph), 'number', 'select'
//   hint   — guidance for the AI on what kind of data to return
// ============================================================================

export const AUTOFILL_SECTIONS = {
  // ============ OVERVIEW ============
  overview: {
    label: 'Company Overview',
    fields: [
      { key: 'websiteUrl', label: 'Website URL', type: 'text', hint: 'Official company website URL' },
      { key: 'yearFounded', label: 'Year Founded', type: 'text', hint: 'Year the company was founded (e.g., "2019")' },
      { key: 'hqCity', label: 'Headquarters City', type: 'text', hint: 'City where HQ is located' },
      { key: 'hqCountry', label: 'Headquarters Country', type: 'text', hint: 'Country where HQ is located' },
      { key: 'stage', label: 'Funding Stage', type: 'select', hint: 'One of: Pre-Seed, Seed, Series A, Series B, Series C, Series D+, Growth, Pre-IPO' },
      { key: 'sector', label: 'Industry Sector', type: 'select', hint: 'One of: SaaS, FinTech, HealthTech, EdTech, AI/ML, Cybersecurity, E-commerce, CleanTech, BioTech, DeepTech, InsurTech, PropTech, AgTech, Gaming, Other' },
      { key: 'subSector', label: 'Sub-Sector', type: 'text', hint: 'More specific industry vertical' },
      { key: 'elevatorPitch', label: 'Elevator Pitch', type: 'long', hint: 'One paragraph describing what the company does, who it serves, and why it matters' },
      { key: 'employeeCount', label: 'Employee Count', type: 'text', hint: 'Approximate headcount (e.g., "45" or "100-150")' },
      { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'text', hint: 'LinkedIn company page URL' },
      { key: 'crunchbaseUrl', label: 'Crunchbase URL', type: 'text', hint: 'Crunchbase profile URL' },
      { key: 'oneLineSummary', label: 'One-Line Summary', type: 'text', hint: 'Ultra-short summary, max 15 words' },
    ],
  },

  // ============ TEAM ============
  team: {
    label: 'Team & Founders',
    fields: [
      { key: 'ceoName', label: 'CEO Name', type: 'text', hint: 'CEO or lead founder full name' },
      { key: 'ceoBackground', label: 'CEO Background', type: 'long', hint: 'Professional background, prior roles, education, achievements' },
      { key: 'ceoLinkedin', label: 'CEO LinkedIn URL', type: 'text', hint: 'LinkedIn profile URL' },
      { key: 'ctoName', label: 'CTO Name', type: 'text', hint: 'CTO or technical co-founder full name' },
      { key: 'ctoBackground', label: 'CTO Background', type: 'long', hint: 'Technical background, prior roles, expertise' },
      { key: 'ctoLinkedin', label: 'CTO LinkedIn URL', type: 'text', hint: 'LinkedIn profile URL' },
      { key: 'coFounders', label: 'Other Co-Founders', type: 'long', hint: 'Names and backgrounds of other co-founders' },
      { key: 'totalTeamSize', label: 'Total Team Size', type: 'text', hint: 'Total employee count' },
      { key: 'engineeringTeamSize', label: 'Engineering Team Size', type: 'text', hint: 'Number of engineers/developers' },
      { key: 'keyHiresNeeded', label: 'Key Hires Needed', type: 'long', hint: 'Critical unfilled roles' },
      { key: 'founderMarketFit', label: 'Founder-Market Fit', type: 'select', hint: 'One of: Exceptional, Strong, Moderate, Weak, Unclear' },
      { key: 'previousExits', label: 'Previous Exits', type: 'long', hint: 'Prior successful exits by the founding team' },
      { key: 'domainExpertise', label: 'Domain Expertise', type: 'long', hint: 'Relevant industry/domain expertise' },
      { key: 'advisors', label: 'Advisors', type: 'long', hint: 'Notable advisors with backgrounds' },
      { key: 'boardMembers', label: 'Board Members', type: 'long', hint: 'Current board composition' },
    ],
  },

  // ============ PRODUCT ============
  product: {
    label: 'Product & Technology',
    fields: [
      { key: 'productDescription', label: 'Product Description', type: 'long', hint: 'Detailed description of the product, what it does, who uses it' },
      { key: 'techStack', label: 'Tech Stack', type: 'text', hint: 'Core technologies used (e.g., React, Python, AWS, Kubernetes)' },
      { key: 'demoUrl', label: 'Demo URL', type: 'text', hint: 'Link to product demo or sandbox' },
      { key: 'productStage', label: 'Product Stage', type: 'select', hint: 'One of: Concept, Prototype, MVP, Beta, GA, Mature' },
      { key: 'moatType', label: 'Moat Type', type: 'select', hint: 'One of: Network Effects, Proprietary Tech, Data Moat, Brand, Switching Costs, Regulatory, None' },
      { key: 'moatDescription', label: 'Moat Description', type: 'long', hint: 'Explanation of competitive moat and defensibility' },
      { key: 'technicalDifferentiator', label: 'Technical Differentiator', type: 'long', hint: 'What is technically unique vs. competitors' },
      { key: 'aiMlUsage', label: 'AI/ML Usage', type: 'long', hint: 'How AI/ML is used in the product' },
      { key: 'scalability', label: 'Scalability', type: 'long', hint: 'Architecture scalability assessment' },
      { key: 'productRoadmap', label: 'Product Roadmap', type: 'long', hint: 'Upcoming features and development timeline' },
      { key: 'integrations', label: 'Integrations', type: 'long', hint: 'Key integrations with other platforms/APIs' },
    ],
  },

  // ============ MARKET ============
  market: {
    label: 'Market Opportunity',
    fields: [
      { key: 'tam', label: 'TAM (Total Addressable Market)', type: 'text', hint: 'Dollar amount (e.g., "$50B")' },
      { key: 'sam', label: 'SAM (Serviceable Addressable Market)', type: 'text', hint: 'Dollar amount' },
      { key: 'som', label: 'SOM (Serviceable Obtainable Market)', type: 'text', hint: 'Dollar amount' },
      { key: 'marketGrowthRate', label: 'Market Growth Rate', type: 'text', hint: 'Annual CAGR percentage (e.g., "25%")' },
      { key: 'marketDynamics', label: 'Market Dynamics', type: 'long', hint: 'Key market trends, forces, and shifts' },
      { key: 'targetCustomerProfile', label: 'Target Customer Profile', type: 'long', hint: 'Ideal customer persona (ICP)' },
      { key: 'geographicFocus', label: 'Geographic Focus', type: 'text', hint: 'Primary geographic markets' },
      { key: 'marketTiming', label: 'Market Timing (Why Now?)', type: 'long', hint: 'What has changed to make this opportunity viable now' },
      { key: 'tailwinds', label: 'Tailwinds', type: 'long', hint: 'Macro trends working in the company\'s favor' },
      { key: 'headwinds', label: 'Headwinds', type: 'long', hint: 'Macro trends working against the company' },
    ],
  },

  // ============ BUSINESS MODEL ============
  business: {
    label: 'Business Model',
    fields: [
      { key: 'revenueModel', label: 'Revenue Model', type: 'select', hint: 'One of: SaaS Subscription, Marketplace, Transaction Fee, Usage-Based, Freemium, Enterprise License, Advertising, Hardware+Software, Other' },
      { key: 'pricingModel', label: 'Pricing Model', type: 'long', hint: 'Pricing tiers and strategy details' },
      { key: 'avgContractValue', label: 'Avg Contract Value (ACV)', type: 'text', hint: 'Dollar amount (e.g., "$25K/year")' },
      { key: 'grossMargin', label: 'Gross Margin', type: 'text', hint: 'Percentage (e.g., "75%")' },
      { key: 'ltv', label: 'Customer LTV', type: 'text', hint: 'Dollar amount' },
      { key: 'cac', label: 'Customer CAC', type: 'text', hint: 'Dollar amount' },
      { key: 'ltvCacRatio', label: 'LTV:CAC Ratio', type: 'text', hint: 'Ratio (e.g., "4.5x")' },
      { key: 'channelStrategy', label: 'Channel Strategy', type: 'long', hint: 'Sales channels: direct, PLG, channel partners, etc.' },
    ],
  },

  // ============ TRACTION ============
  traction: {
    label: 'Traction & Metrics',
    fields: [
      { key: 'currentArr', label: 'Current ARR', type: 'text', hint: 'Annual recurring revenue (e.g., "$2.5M")' },
      { key: 'mrrGrowthRate', label: 'MRR Growth Rate', type: 'text', hint: 'Month-over-month growth (e.g., "15%")' },
      { key: 'totalRevenueLtm', label: 'Total Revenue (LTM)', type: 'text', hint: 'Last twelve months revenue' },
      { key: 'yoyRevenueGrowth', label: 'YoY Revenue Growth', type: 'text', hint: 'Year-over-year growth percentage' },
      { key: 'totalUsers', label: 'Total Users', type: 'text', hint: 'Total registered users' },
      { key: 'activeUsers', label: 'Active Users', type: 'text', hint: 'Monthly or weekly active users' },
      { key: 'retentionRate', label: 'Retention Rate', type: 'text', hint: 'Percentage' },
      { key: 'churnRate', label: 'Churn Rate', type: 'text', hint: 'Monthly or annual churn percentage' },
      { key: 'netRevenueRetention', label: 'Net Revenue Retention', type: 'text', hint: 'NRR percentage (e.g., "120%")' },
      { key: 'npsScore', label: 'NPS Score', type: 'text', hint: 'Net Promoter Score (-100 to +100)' },
    ],
  },

  // ============ FINANCIAL ============
  financial: {
    label: 'Financials & Funding',
    fields: [
      { key: 'lastRoundSize', label: 'Last Round Size', type: 'text', hint: 'Dollar amount (e.g., "$15M")' },
      { key: 'lastRoundDate', label: 'Last Round Date', type: 'text', hint: 'Date or approximate date' },
      { key: 'lastValuation', label: 'Last Valuation', type: 'text', hint: 'Post-money valuation' },
      { key: 'totalRaised', label: 'Total Raised', type: 'text', hint: 'Total capital raised to date' },
      { key: 'monthlyBurnRate', label: 'Monthly Burn Rate', type: 'text', hint: 'Monthly cash burn' },
      { key: 'runway', label: 'Runway (Months)', type: 'text', hint: 'Months of runway remaining' },
      { key: 'cashOnHand', label: 'Cash on Hand', type: 'text', hint: 'Current cash position' },
      { key: 'useOfFunds', label: 'Use of Funds', type: 'long', hint: 'How new capital will be allocated' },
    ],
  },

  // ============ COMPETITIVE ============
  competitive: {
    label: 'Competitive Landscape',
    fields: [
      { key: 'directCompetitors', label: 'Direct Competitors', type: 'long', hint: 'Companies solving the same problem' },
      { key: 'indirectCompetitors', label: 'Indirect Competitors', type: 'long', hint: 'Adjacent or substitute solutions' },
      { key: 'competitiveAdvantages', label: 'Competitive Advantages', type: 'long', hint: 'Why this company wins' },
      { key: 'competitiveWeaknesses', label: 'Competitive Weaknesses', type: 'long', hint: 'Where competitors have an edge' },
      { key: 'marketPositioning', label: 'Market Positioning', type: 'long', hint: 'How they position vs. the field' },
      { key: 'switchingCosts', label: 'Switching Costs', type: 'long', hint: 'Difficulty for customers to switch away' },
      { key: 'competitorFundingIntel', label: 'Competitor Funding Intel', type: 'long', hint: 'How well-funded are key competitors' },
    ],
  },

  // ============ IP & TECH ============
  ip: {
    label: 'IP & Technology',
    fields: [
      { key: 'patentsFiled', label: 'Patents Filed', type: 'text', hint: 'Number of patents filed' },
      { key: 'patentsGranted', label: 'Patents Granted', type: 'text', hint: 'Number of patents granted' },
      { key: 'proprietaryDataAssets', label: 'Proprietary Data Assets', type: 'long', hint: 'Unique data assets the company owns' },
      { key: 'openSourceRisk', label: 'Open Source Risk', type: 'long', hint: 'Risk from OSS dependencies or competitors' },
    ],
  },

  // ============ CUSTOMERS ============
  customers: {
    label: 'Customers & Partnerships',
    fields: [
      { key: 'keyCustomers', label: 'Key Customers', type: 'long', hint: 'Notable customers or logos' },
      { key: 'customerLogos', label: 'Customer Logos', type: 'long', hint: 'Brand-name clients for reference' },
      { key: 'caseStudies', label: 'Case Studies', type: 'long', hint: 'Published case studies or testimonials' },
      { key: 'strategicPartnerships', label: 'Strategic Partnerships', type: 'long', hint: 'Strategic partnerships beyond customers' },
      { key: 'channelPartners', label: 'Channel Partners', type: 'long', hint: 'Resellers, distributors, integration partners' },
    ],
  },

  // ============ INVESTORS ============
  investors: {
    label: 'Investors & Cap Table',
    fields: [
      { key: 'leadInvestor', label: 'Lead Investor', type: 'text', hint: 'Lead investor in current/last round' },
      { key: 'allInvestors', label: 'All Investors', type: 'long', hint: 'Full list of investors across all rounds' },
      { key: 'boardComposition', label: 'Board Composition', type: 'long', hint: 'Board seats and who holds them' },
      { key: 'investorReputation', label: 'Investor Reputation', type: 'long', hint: 'Quality assessment of existing investors' },
      { key: 'investorStrategicValue', label: 'Strategic Value of Investors', type: 'long', hint: 'Value-add beyond capital' },
    ],
  },

  // ============ REGULATORY ============
  regulatory: {
    label: 'Regulatory & Compliance',
    fields: [
      { key: 'complianceFrameworks', label: 'Compliance Frameworks', type: 'long', hint: 'SOC2, ISO27001, HIPAA, etc.' },
      { key: 'regulatoryRisks', label: 'Regulatory Risks', type: 'long', hint: 'Key regulatory risks' },
      { key: 'gdprCompliance', label: 'GDPR Compliance', type: 'text', hint: 'GDPR compliance status' },
    ],
  },

  // ============ LEGAL ============
  legal: {
    label: 'Legal Structure',
    fields: [
      { key: 'corporateStructure', label: 'Corporate Structure', type: 'select', hint: 'One of: Delaware C-Corp, LLC, S-Corp, Israeli Ltd, Dual-Entity, Other' },
      { key: 'jurisdiction', label: 'Primary Jurisdiction', type: 'text', hint: 'Primary legal jurisdiction' },
      { key: 'pendingLitigation', label: 'Pending Litigation', type: 'long', hint: 'Any pending or threatened lawsuits' },
    ],
  },

  // ============ ISRAEL ============
  israel: {
    label: 'Israel Operations',
    fields: [
      { key: 'israelEntityName', label: 'Israeli Entity Name', type: 'text', hint: 'Name of Israeli entity' },
      { key: 'israelEntityType', label: 'Israeli Entity Type', type: 'select', hint: 'One of: Ltd (Baam), Public (Bam), Partnership' },
      { key: 'usEntityName', label: 'US Entity Name', type: 'text', hint: 'Name of US entity if exists' },
      { key: 'rdCenterLocation', label: 'R&D Center Location', type: 'text', hint: 'R&D center city in Israel' },
      { key: 'rdHeadcount', label: 'R&D Headcount', type: 'text', hint: 'Number of R&D staff in Israel' },
      { key: 'iiaGrants', label: 'IIA Grants', type: 'long', hint: 'Israel Innovation Authority grants received' },
      { key: 'iiaObligations', label: 'IIA Obligations', type: 'long', hint: 'IIA royalty and IP transfer obligations' },
      { key: 'usMarketStrategy', label: 'US Market Strategy', type: 'long', hint: 'Strategy for US market entry' },
      { key: 'usPresence', label: 'US Presence', type: 'long', hint: 'Current US offices, team, customers' },
    ],
  },

  // ============ RISKS ============
  risks: {
    label: 'Risk Assessment',
    fields: [
      { key: 'keyRisksTop5', label: 'Top 5 Key Risks', type: 'long', hint: 'The five most critical risks for this investment' },
      { key: 'technicalRisks', label: 'Technical Risks', type: 'long', hint: 'Technical and product risks' },
      { key: 'marketRisks', label: 'Market Risks', type: 'long', hint: 'Market-related risks' },
      { key: 'executionRisks', label: 'Execution Risks', type: 'long', hint: 'Execution and operational risks' },
      { key: 'financialRisks', label: 'Financial Risks', type: 'long', hint: 'Financial and fundraising risks' },
      { key: 'competitiveRisks', label: 'Competitive Risks', type: 'long', hint: 'Competitive risks' },
      { key: 'teamRisks', label: 'Team Risks', type: 'long', hint: 'People and leadership risks' },
      { key: 'riskMitigants', label: 'Risk Mitigants', type: 'long', hint: 'What mitigates the key risks' },
      { key: 'dealBreakers', label: 'Deal Breakers', type: 'long', hint: 'Any absolute deal-breaking risks' },
      { key: 'overallRiskLevel', label: 'Overall Risk Level', type: 'select', hint: 'One of: low, medium, high, critical' },
    ],
  },
};

// ============================================================================
// SECTION KEYS — ordered list of all auto-fillable sections
// Used by the master "Research All" feature on the dashboard
// ============================================================================
export const AUTOFILL_SECTION_ORDER = [
  'overview', 'team', 'product', 'market', 'business', 'traction',
  'financial', 'competitive', 'ip', 'customers', 'investors',
  'regulatory', 'legal', 'israel', 'risks',
];
