// ============================================================================
// lib/schemas.js — DueDrill: Company Data Schema & Factory
// ============================================================================
// Defines the complete shape of a company due diligence object.
// createEmptyCompany(name) is the ONLY way to create a new company — it
// guarantees every section and every field exists with sensible defaults,
// so downstream components never need to check for undefined sections.
//
// This is the data contract between:
//   - The form UI (reads/writes individual fields)
//   - The scoring engine (reads score fields from each section)
//   - The AI research module (writes findings into section fields)
//   - The persistence layer (saves/loads the full object to Supabase or localStorage)
//   - The report generator (reads all sections to produce the final DD report)
//
// IMPORTANT: Field names in each section MUST match the field names used in
// the corresponding section component (components/sections/*Section.js).
// The components are the source of truth. If a component reads data.fooBar,
// this schema must have fooBar, not foo_bar or fooBaz.
// ============================================================================

// ============================================================================
// createEmptyCompany(name)
// ============================================================================
// Factory function that returns a fully-initialized company object.
// Every field is present with its default value — empty string for text,
// 0 for numbers, 5 for scores (mid-point of 0-10 scale), empty arrays
// for lists, etc.
//
// WHY a factory function instead of a plain object?
// Because each company needs its own independent copy. If we used a shared
// object, mutating one company would mutate all of them (reference sharing).
// A function returns a fresh deep copy every time.
//
// WHY default scores to 5?
// 5/10 is the neutral midpoint. It means "not yet evaluated" — neither good
// nor bad. This prevents unscored sections from tanking the overall score
// (which would happen with 0) or inflating it (which would happen with 10).
// As the user fills in data and adjusts scores, they move away from 5.
export function createEmptyCompany(name) {
  return {
    // ============ METADATA ============
    // Top-level fields that don't belong to any specific section.
    // createdAt/updatedAt enable sorting and staleness detection.
    id: crypto.randomUUID(),
    name: name || '',                   // Top-level name used by TopBar dropdown
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // ============ OVERVIEW SECTION ============
    // Basic company identity — the first thing you fill in when starting a DD.
    // These fields populate the header card and enable AI research lookups.
    // Field names match OverviewSection.js exactly.
    overview: {
      companyName: name || '',          // Company legal name (OverviewSection: data.companyName)
      websiteUrl: '',                   // Primary website URL (OverviewSection: data.websiteUrl)
      yearFounded: '',                  // Year founded (OverviewSection: data.yearFounded)
      hqCity: '',                       // Headquarters city
      hqCountry: '',                    // Headquarters country
      stage: '',                        // Funding stage (maps to STAGE_OPTIONS values)
      sector: '',                       // Industry sector (maps to SECTOR_OPTIONS values)
      subSector: '',                    // More specific vertical within the sector
      elevatorPitch: '',                // One-paragraph description of what they do
      employeeCount: '',                // Current headcount (string: "45", "100-150")
      linkedinUrl: '',                  // LinkedIn company page URL for research
      crunchbaseUrl: '',                // Crunchbase profile URL for funding data
      oneLineSummary: '',               // Ultra-short summary for dashboard cards
      dealSource: '',                   // How this deal came to us (OverviewSection: data.dealSource)
      referredBy: '',                   // Specific person who referred the deal
    },

    // ============ TEAM SECTION ============
    // Founder and team assessment — the single most important factor in
    // early-stage investing. A great team can pivot a bad idea; a bad team
    // will ruin a great one.
    // Field names match TeamSection.js exactly.
    team: {
      ceoName: '',                      // CEO / lead founder full name
      ceoBackground: '',                // CEO professional background and relevant experience
      ceoLinkedin: '',                  // CEO LinkedIn URL for verification
      ctoName: '',                      // CTO / technical co-founder full name
      ctoBackground: '',                // CTO professional background
      ctoLinkedin: '',                  // CTO LinkedIn URL
      coFounders: '',                   // Other co-founders (free text, comma-separated)
      totalTeamSize: '',                // Total team size (TeamSection: data.totalTeamSize)
      engineeringTeamSize: '',          // Engineering/technical team size (TeamSection: data.engineeringTeamSize)
      keyHiresNeeded: '',               // Critical roles still unfilled
      founderMarketFit: '',             // Why THESE founders for THIS problem
      previousExits: '',                // Prior successful exits by the founders
      domainExpertise: '',              // Relevant domain expertise description
      teamCompleteness: 5,              // Score: 0-10, how complete is the team
      advisors: '',                     // Notable advisors (names, backgrounds)
      boardMembers: '',                 // Current board composition
      founderVesting: '',               // Vesting schedule details for founders
      teamNotes: '',                    // Free-form notes on team assessment
    },

    // ============ PRODUCT SECTION ============
    // What they've built, how defensible it is, and where it's headed.
    // Field names match ProductSection.js exactly.
    product: {
      productDescription: '',           // Detailed product description (ProductSection: data.productDescription)
      techStack: '',                    // Technologies used (React, Python, AWS, etc.)
      demoUrl: '',                      // Link to product demo or sandbox
      productStage: '',                 // Maps to PRODUCT_STAGE_OPTIONS
      moatType: '',                     // Maps to MOAT_TYPE_OPTIONS
      moatDescription: '',              // Explanation of WHY the moat is defensible
      technicalDifferentiator: '',      // What's technically unique vs. competitors (ProductSection: data.technicalDifferentiator)
      aiMlUsage: '',                    // How AI/ML is used in the product (if applicable)
      scalability: '',                  // Architecture scalability assessment
      technicalDebt: '',                // Known technical debt and remediation plans
      productRoadmap: '',               // Upcoming features and timeline
      integrations: '',                 // Key integrations (APIs, partners, platforms)
      productScore: 5,                  // Score: 0-10
      productNotes: '',                 // Free-form product assessment notes
    },

    // ============ MARKET SECTION ============
    // TAM/SAM/SOM analysis and market dynamics. Critical for understanding
    // whether the company is going after a big enough opportunity.
    // Field names match MarketSection.js exactly.
    market: {
      tam: '',                          // Total Addressable Market (dollar amount)
      sam: '',                          // Serviceable Addressable Market
      som: '',                          // Serviceable Obtainable Market
      marketGrowthRate: '',             // Annual market growth rate (%)
      marketDynamics: '',               // Key market trends and forces
      targetCustomerProfile: '',        // Ideal customer persona / ICP
      geographicFocus: '',              // Geographic focus (MarketSection: data.geographicFocus)
      marketTiming: '',                 // Why now? What's changed to make this possible
      tailwinds: '',                    // Macro trends working in the company's favor
      headwinds: '',                    // Macro trends working against them
      marketScore: 5,                   // Score: 0-10
      marketNotes: '',                  // Free-form market assessment notes
    },

    // ============ BUSINESS MODEL SECTION ============
    // How they make money — revenue model, unit economics, channel strategy.
    // Field names match BusinessSection.js exactly.
    business: {
      revenueModel: '',                 // Maps to REVENUE_MODEL_OPTIONS
      pricingModel: '',                 // Pricing tiers, per-seat, usage-based details
      avgContractValue: '',             // Average contract value (ACV)
      grossMargin: '',                  // Gross margin percentage
      ltv: '',                          // Customer lifetime value
      cac: '',                          // Customer acquisition cost
      ltvCacRatio: '',                  // LTV:CAC ratio (>3x is healthy)
      paybackPeriod: '',                // Months to recover CAC
      expansionRevenue: '',             // Net revenue expansion from existing customers
      revenueConcentrationRisk: '',     // % of revenue from top customers (BusinessSection: data.revenueConcentrationRisk)
      channelStrategy: '',              // Sales channels: direct, PLG, channel partners, etc.
      businessScore: 5,                 // Score: 0-10
      businessNotes: '',                // Free-form business model notes
    },

    // ============ TRACTION SECTION ============
    // Hard numbers on growth — this is where the rubber meets the road.
    // ARR, growth rates, retention, and pipeline tell the real story.
    // Field names match TractionSection.js exactly.
    traction: {
      currentArr: '',                   // Current Annual Recurring Revenue
      mrrGrowthRate: '',                // Month-over-month MRR growth rate (%)
      totalRevenueLtm: '',              // Total revenue LTM (TractionSection: data.totalRevenueLtm)
      yoyRevenueGrowth: '',             // Year-over-year revenue growth (TractionSection: data.yoyRevenueGrowth)
      totalUsers: '',                   // Total registered users
      activeUsers: '',                  // Monthly or weekly active users
      dau: '',                          // Daily active users
      mau: '',                          // Monthly active users
      retentionRate: '',                // User retention rate (%)
      churnRate: '',                    // Monthly/annual churn rate (%)
      netRevenueRetention: '',          // Net Revenue Retention (TractionSection: data.netRevenueRetention)
      npsScore: '',                     // Net Promoter Score (TractionSection: data.npsScore)
      pipelineValue: '',                // Sales pipeline value
      tractionScore: 5,                // Score: 0-10
      tractionNotes: '',                // Free-form traction notes
    },

    // ============ FINANCIAL SECTION ============
    // Funding history, burn rate, runway, and projections.
    // Field names match FinancialSection.js exactly.
    financial: {
      lastRoundSize: '',                // Size of most recent funding round
      lastRoundDate: '',                // Date of most recent round
      lastValuation: '',                // Post-money valuation of last round
      totalRaised: '',                  // Total capital raised to date
      monthlyBurnRate: '',              // Monthly cash burn (FinancialSection: data.monthlyBurnRate)
      runway: '',                       // Months of runway remaining
      cashOnHand: '',                   // Current cash position
      useOfFunds: '',                   // How they plan to use the new capital
      revenueProjection: '',            // Forward revenue projections
      breakEvenTarget: '',              // When they expect to reach profitability
      capTableSummary: '',              // High-level cap table overview
      financialScore: 5,                // Score: 0-10
      financialNotes: '',               // Free-form financial notes
    },

    // ============ COMPETITIVE SECTION ============
    // Competitive landscape — who else is doing this, and why this company wins.
    // Field names match CompetitiveSection.js exactly.
    competitive: {
      directCompetitors: '',            // Companies solving the exact same problem
      indirectCompetitors: '',          // Adjacent solutions or substitutes
      competitiveAdvantages: '',        // Why this company wins against competitors
      competitiveWeaknesses: '',        // Where competitors have an edge
      marketPositioning: '',            // How they position vs. the field
      switchingCosts: '',               // How hard is it for customers to switch away
      winRate: '',                      // Win rate in competitive deals (%)
      competitorFundingIntel: '',       // How well-funded are the competitors (CompetitiveSection: data.competitorFundingIntel)
      competitiveScore: 5,              // Score: 0-10
      competitiveNotes: '',             // Free-form competitive notes
    },

    // ============ IP & TECH SECTION ============
    // Intellectual property assessment — patents, trade secrets, open-source risk.
    // Field names match IPSection.js exactly.
    ip: {
      patentsFiled: '',                 // Number of patents filed
      patentsGranted: '',               // Number of patents granted
      patentsPending: '',               // Number of patents pending
      tradeSecrets: '',                 // Description of trade secrets
      proprietaryDataAssets: '',        // Proprietary data assets (IPSection: data.proprietaryDataAssets)
      openSourceRisk: '',               // Risk from open-source dependencies or competitors
      ipAssignment: '',                 // Whether all IP is assigned to the company
      ipJurisdiction: '',               // Jurisdictions where IP is protected
      freedomToOperate: '',             // FTO analysis — can they operate without infringing
      ipScore: 5,                       // Score: 0-10
      ipNotes: '',                      // Free-form IP notes
    },

    // ============ CUSTOMERS SECTION ============
    // Customer quality, logos, references, and partnerships.
    // Field names match CustomersSection.js exactly.
    customers: {
      keyCustomers: '',                 // List of key/notable customers
      customerLogos: '',                // Brand-name logos for the pitch deck
      caseStudies: '',                  // Published case studies or testimonials
      strategicPartnerships: '',        // Strategic partnerships (not just customers)
      channelPartners: '',              // Resellers, distributors, integration partners
      customerConcentration: '',        // Revenue concentration risk (top 1-3 customers)
      referenceableCustomers: '',       // Customers willing to take reference calls (CustomersSection: data.referenceableCustomers)
      pipelineQuality: '',              // Quality and stage of sales pipeline
      customerScore: 5,                 // Score: 0-10
      customerNotes: '',                // Free-form customer notes
    },

    // ============ INVESTORS SECTION ============
    // Existing investor quality, board dynamics, and follow-on potential.
    // Field names match InvestorsSection.js exactly.
    investors: {
      leadInvestor: '',                 // Lead investor in current/last round
      allInvestors: '',                 // Full list of investors across all rounds
      boardComposition: '',             // Board seats and who holds them
      investorReputation: '',           // Quality/reputation of existing investors
      followOnLikelihood: '',           // Will existing investors follow on?
      investorConflicts: '',            // Any conflicts of interest among investors
      proRataRights: '',                // Which investors have pro-rata rights
      investorStrategicValue: '',       // Value-add beyond capital (InvestorsSection: data.investorStrategicValue)
      investorScore: 5,                 // Score: 0-10
      investorNotes: '',                // Free-form investor notes
    },

    // ============ REGULATORY SECTION ============
    // Regulatory environment — FDA, HIPAA, GDPR, SOC, and sector-specific compliance.
    // Especially relevant for healthtech, fintech, and defense/govtech companies.
    // Field names match RegulatorySection.js exactly.
    regulatory: {
      fdaStatus: '',                    // Current FDA status (if applicable)
      fdaPathway: '',                   // FDA pathway being pursued (510(k), PMA, De Novo)
      fdaTimeline: '',                  // Expected FDA timeline
      otherRegulatoryApprovals: '',     // Other regulatory approvals obtained (RegulatorySection: data.otherRegulatoryApprovals)
      complianceFrameworks: '',         // Compliance frameworks in use (SOC2, ISO27001, etc.)
      hipaaCompliance: '',              // HIPAA compliance status
      gdprCompliance: '',               // GDPR compliance status
      soc2Compliance: '',               // SOC 2 compliance status (RegulatorySection: data.soc2Compliance)
      regulatoryRisks: '',              // Key regulatory risks
      regulatoryBurdenAssessment: '',   // Ongoing compliance cost/burden assessment (RegulatorySection: data.regulatoryBurdenAssessment)
      regulatoryScore: 5,               // Score: 0-10
      regulatoryNotes: '',              // Free-form regulatory notes
    },

    // ============ LEGAL SECTION ============
    // Corporate structure, pending litigation, material contracts, and legal risks.
    // Field names match LegalSection.js exactly.
    legal: {
      corporateStructure: '',           // Maps to CORPORATE_STRUCTURE_OPTIONS
      jurisdiction: '',                 // Primary legal jurisdiction
      pendingLitigation: '',            // Any pending or threatened lawsuits
      ipAssignments: '',                // IP assignment agreements in place
      employmentAgreements: '',         // Key employment agreements
      nonCompeteStatus: '',             // Non-compete agreements and enforceability (LegalSection: data.nonCompeteStatus)
      materialContracts: '',            // Material contracts (LegalSection: data.materialContracts)
      outstandingWarrants: '',          // Outstanding warrants or convertible instruments
      optionPool: '',                   // Size and availability of ESOP
      legalRisks: '',                   // Key legal risks identified
      legalScore: 5,                    // Score: 0-10
      legalNotes: '',                   // Free-form legal notes
    },

    // ============ ISRAEL SECTION ============
    // Israel-specific considerations — critical for Israeli startups doing DD.
    // Covers dual-entity structure, IIA grants, Section 102, tax treaty usage,
    // and US market entry strategy. This section exists because ~50% of deals
    // in this app will be Israeli companies, and these factors are unique and
    // material to the investment decision.
    // Field names match IsraelSection.js exactly.
    israel: {
      israelEntityName: '',             // Name of Israeli entity (IsraelSection: data.israelEntityName)
      israelEntityType: '',             // Maps to ISRAEL_ENTITY_TYPE_OPTIONS
      usEntityName: '',                 // Name of US entity (IsraelSection: data.usEntityName)
      usEntityType: '',                 // Maps to US_ENTITY_TYPE_OPTIONS
      iiaGrants: '',                    // Israel Innovation Authority grants received
      iiaObligations: '',               // IIA obligations (IP transfer restrictions, royalties)
      rdCenterLocation: '',             // R&D center location (IsraelSection: data.rdCenterLocation)
      rdHeadcount: '',                  // R&D headcount in Israel
      section102Options: '',            // Section 102 stock option plan details
      transferPricingStrategy: '',      // Transfer pricing arrangement (IsraelSection: data.transferPricingStrategy)
      taxTreatyUsage: '',               // US-Israel tax treaty usage
      usMarketStrategy: '',             // Strategy for US market entry/expansion
      usPresence: '',                   // Current US presence (office, team, customers)
      culturalAdaptationPlan: '',       // Cultural adaptation for US market (IsraelSection: data.culturalAdaptationPlan)
      usHiringPlan: '',                 // US hiring plans
      dualListingConsideration: '',     // Dual-listing considerations (TASE + NASDAQ)
      israelScore: 5,                   // Score: 0-10
      israelNotes: '',                  // Free-form Israel-specific notes
    },

    // ============ RISKS SECTION ============
    // Comprehensive risk assessment across all dimensions.
    // overallRiskLevel defaults to 'medium' — the neutral starting point.
    // Field names match RisksSection.js exactly.
    risks: {
      keyRisksTop5: '',                 // Top 5 key risks (RisksSection: data.keyRisksTop5)
      technicalRisks: '',               // Technical/product risks
      marketRisks: '',                  // Market-related risks
      executionRisks: '',               // Execution and operational risks
      financialRisks: '',               // Financial and fundraising risks
      regulatoryRisks: '',              // Regulatory and compliance risks
      competitiveRisks: '',             // Competitive risks
      teamRisks: '',                    // Team and people risks
      riskMitigants: '',                // What mitigates the key risks
      dealBreakers: '',                 // Any absolute deal-breakers identified
      overallRiskLevel: 'medium',       // Categorical risk level (low/medium/high/critical)
      riskScore: 5,                     // Score: 0-10
      riskNotes: '',                    // Free-form risk notes
    },

    // ============ DEAL TERMS SECTION ============
    // Proposed deal structure, terms, and investor-specific details.
    // Field names match DealSection.js exactly.
    deal: {
      roundName: '',                    // Round name (e.g., "Series A", "Seed Extension")
      targetRaise: '',                  // Target raise amount
      preMoneyValuation: '',            // Pre-money valuation
      instrumentType: '',               // Maps to INSTRUMENT_TYPE_OPTIONS
      leadInvestorCommitted: '',        // Is a lead investor committed?
      ourAllocation: '',                // Our proposed allocation amount
      ownershipTarget: '',              // Target ownership percentage
      boardSeat: '',                    // Board seat offered?
      proRataRights: '',                // Pro-rata rights included? (DealSection: data.proRataRights)
      liquidationPreference: '',        // Liquidation preference terms (DealSection: data.liquidationPreference)
      antiDilution: '',                 // Anti-dilution protection type
      dragAlong: '',                    // Drag-along rights
      tagAlong: '',                     // Tag-along rights
      vestingSchedule: '',              // Vesting schedule for founders/key employees
      esopSize: '',                     // Employee stock option pool size (%)
      keyTermsConditions: '',           // Other key terms worth noting (DealSection: data.keyTermsConditions)
      dealScore: 5,                     // Score: 0-10
      dealNotes: '',                    // Free-form deal terms notes
    },

    // ============ DEAL TIMELINE & STAGE TRACKING ============
    // Tracks the deal's progression through the DD pipeline.
    // dealStage: current stage in the deal pipeline (first-look → close/pass)
    // activityLog: chronological array of timestamped activity entries
    // lastResearched: per-section timestamps for data freshness tracking
    dealStage: 'first-look',
    activityLog: [],
    lastResearched: {},

    // ============ AI RESEARCH RESULTS ============
    // Stores the output from AI-powered research for each section.
    // Keyed by section ID — populated when the user triggers AI research
    // for a specific section. Kept separate from section data so we can
    // distinguish user-entered data from AI-generated research.
    aiResearch: {},

    // ============ REFERENCES ============
    // Back-channel reference checks on founders and key team members.
    // This is one of the most critical parts of real due diligence —
    // talking to people who've actually worked with the founders.
    // Stored as an array of reference objects, each with structured
    // assessments, scores, red flags, and key quotes.
    references: [],

    // ============ OVERALL VERDICT ============
    // The final investment recommendation, set manually by the analyst
    // after reviewing all sections. Empty until explicitly set.
    overallVerdict: '',

    // ============ OVERALL SCORE ============
    // Weighted composite score (0-10) calculated by scoring.js.
    // Starts at 0; recalculated whenever section scores change.
    overallScore: 0,
  };
}
