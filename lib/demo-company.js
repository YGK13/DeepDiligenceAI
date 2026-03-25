// ============================================================================
// lib/demo-company.js — DueDrill: Pre-loaded Demo Company Factory
// ============================================================================
// Creates a fully-populated demo company ("NovaTech AI") so first-time users
// can explore every feature — scoring, AI research, reports, pipeline, etc.
// — before committing their own data.
//
// The data is intentionally realistic: a fictional Series A AI/ML startup
// with strong metrics but imperfect scores (6-8 range). Some fields are
// left empty (~30%) to simulate real-world incomplete diligence.
//
// The `isDemo: true` flag lets the UI identify and optionally badge or
// filter demo data separately from real companies.
// ============================================================================

// ============================================================================
// createDemoCompany()
// ============================================================================
// Returns a full company object matching the exact shape from
// createEmptyCompany() in lib/schemas.js. Every section is populated
// with believable startup data for "NovaTech AI".
// ============================================================================
export function createDemoCompany() {
  const now = new Date().toISOString();

  return {
    // ============ METADATA ============
    id: 'demo-company-novatech',
    name: 'NovaTech AI',
    createdAt: now,
    updatedAt: now,
    isDemo: true, // Flag so UI can identify demo data

    // ============ OVERVIEW SECTION ============
    overview: {
      companyName: 'NovaTech AI',
      websiteUrl: 'https://novatech-ai.com',
      yearFounded: '2023',
      hqCity: 'San Francisco',
      hqCountry: 'United States',
      stage: 'Series A',
      sector: 'AI-ML',
      subSector: 'Enterprise Analytics & Decision Intelligence',
      elevatorPitch:
        'NovaTech AI builds an AI-powered analytics platform that transforms raw business data into actionable intelligence. Using proprietary transformer models fine-tuned on enterprise datasets, the platform delivers predictive insights 10x faster than traditional BI tools — enabling mid-market and enterprise companies to make data-driven decisions without hiring a data science team.',
      employeeCount: '45',
      linkedinUrl: 'https://linkedin.com/company/novatech-ai',
      crunchbaseUrl: '',
      oneLineSummary: 'AI-powered analytics platform replacing legacy BI for mid-market enterprises',
      dealSource: 'Network Referral',
      referredBy: 'David Kim (Sequoia Scout)',
    },

    // ============ TEAM SECTION ============
    team: {
      ceoName: 'Sarah Chen',
      ceoBackground:
        'Former ML Engineering Lead at Google Brain (2018-2023). Led the team that built AutoML Tables. PhD in Computer Science from Stanford, specializing in deep learning for structured data. Published 12 papers in NeurIPS/ICML. Previously co-founded DataLens (acquired by Tableau in 2017 for $28M).',
      ceoLinkedin: 'https://linkedin.com/in/sarahchen-ml',
      ctoName: 'Marcus Rodriguez',
      ctoBackground:
        'Former Senior Staff Engineer at Meta AI (2016-2023). Architected Meta\'s internal analytics inference pipeline serving 2B+ daily predictions. MS Computer Science from MIT. Built and scaled systems processing 50TB+ daily. Deep expertise in distributed ML systems and real-time inference.',
      ctoLinkedin: 'https://linkedin.com/in/marcusrodriguez-eng',
      coFounders:
        'Priya Patel (CPO) — ex-Palantir Product Lead, 8 years enterprise data products; James Wu (VP Eng) — ex-Stripe Staff Eng, built Stripe Sigma; Elena Volkov (Head of AI) — ex-DeepMind Research Scientist, 15 NeurIPS papers',
      totalTeamSize: '45',
      engineeringTeamSize: '28',
      keyHiresNeeded: 'VP Sales (enterprise), Head of Customer Success, 3 senior ML engineers',
      founderMarketFit:
        'All 5 co-founders spent 5-10 years at the intersection of AI and enterprise data. Sarah\'s prior exit (DataLens → Tableau) demonstrates she can build and sell analytics products. Marcus built Meta\'s internal version of exactly what NovaTech is productizing. Priya brings the enterprise go-to-market instinct from Palantir.',
      previousExits: 'Sarah Chen: DataLens acquired by Tableau (2017, $28M)',
      domainExpertise:
        'Deep expertise in ML infrastructure, enterprise analytics, and data engineering. Combined 40+ years in AI/ML across Google, Meta, Palantir, Stripe, and DeepMind.',
      teamCompleteness: 7,
      advisors:
        'Dr. Andrew Ng (AI advisor), Jeff Hammerbacher (data infrastructure), Sarah Guo (GTM strategy, ex-Greylock)',
      boardMembers: 'Sarah Chen (CEO), Marcus Rodriguez (CTO), Rachel Park (Lightspeed Venture Partners)',
      founderVesting: '4-year vesting with 1-year cliff, standard. All founders on same schedule, started at incorporation.',
      teamNotes: '',
    },

    // ============ PRODUCT SECTION ============
    product: {
      productDescription:
        'NovaTech AI is an end-to-end analytics platform that ingests data from 40+ enterprise sources (Salesforce, HubSpot, Snowflake, BigQuery, etc.), applies proprietary transformer-based models to identify patterns and anomalies, and delivers predictive insights through a natural language interface. Users ask questions in plain English ("Why did churn spike in Q3?") and get visual, data-backed answers in seconds. Key modules: (1) DataConnect — unified data ingestion layer, (2) InsightEngine — proprietary ML models for pattern detection, (3) NovaTalk — conversational analytics interface, (4) ActionBoard — automated recommendation dashboards.',
      techStack: 'Python (FastAPI backend), React/TypeScript frontend, PostgreSQL + Clickhouse for data, PyTorch for ML models, Kubernetes on AWS (EKS), Terraform for IaC, Redis for caching, Apache Kafka for streaming',
      demoUrl: 'https://demo.novatech-ai.com',
      productStage: 'Growth',
      moatType: 'Data Network Effects',
      moatDescription:
        'Three-layer moat: (1) Proprietary training data — 18 months of enterprise analytics patterns from 85+ customers feeding model improvements; (2) Fine-tuned transformer models that get better with each customer deployment (data network effects); (3) 40+ pre-built data connectors that took 12 months to build and certify. Competitors would need 18+ months to replicate the connector library alone.',
      technicalDifferentiator:
        'Custom transformer architecture (NovaFormer) optimized for tabular/time-series enterprise data, achieving 3x faster inference than GPT-4 on structured data tasks at 1/10th the cost. Patent-pending attention mechanism for multi-source data fusion.',
      aiMlUsage:
        'Core to the product. Proprietary NovaFormer model (800M params) for pattern detection, anomaly identification, and predictive analytics. Fine-tuned on 18 months of enterprise data. Also uses RAG pipeline with customer-specific data for contextual Q&A.',
      scalability:
        'Horizontally scalable on Kubernetes. Currently handles 500M+ events/day across all customers. Architecture supports 10x growth without re-engineering. Multi-tenant with customer data isolation.',
      technicalDebt: 'Moderate — legacy Python 3.9 codebase being migrated to 3.12. Some early connectors need refactoring. Test coverage at 72%, target 85%.',
      productRoadmap:
        'Q1 2025: Real-time streaming analytics, Q2 2025: Self-serve connector builder, Q3 2025: Multi-language support (Spanish, German, Japanese), Q4 2025: On-premise deployment option for regulated industries',
      integrations: 'Salesforce, HubSpot, Snowflake, BigQuery, Redshift, PostgreSQL, MySQL, MongoDB, Stripe, Shopify, Google Analytics, Mixpanel, Segment, Slack, Teams, Jira, Zendesk, and 23 more',
      productScore: 8,
      productNotes: '',
    },

    // ============ MARKET SECTION ============
    market: {
      tam: '$45B — Global Business Intelligence & Analytics Software market (2025)',
      sam: '$12B — AI-powered analytics for mid-market and enterprise (500-10,000 employees)',
      som: '$1.8B — English-speaking markets, companies already using cloud data warehouses',
      marketGrowthRate: '15% CAGR (2024-2029)',
      marketDynamics:
        'Massive shift from traditional BI (Tableau, Power BI) to AI-native analytics. Mid-market companies drowning in data but lack data science teams. The rise of cloud data warehouses (Snowflake, BigQuery) created a new data-rich layer that legacy BI tools can\'t fully exploit. LLM breakthroughs made natural language interfaces viable for the first time.',
      targetCustomerProfile:
        'Mid-market companies (500-5,000 employees) with $50M-$500M revenue, already using a cloud data warehouse, no dedicated data science team, relying on Excel/legacy BI for analytics. Decision makers: VP Analytics, CDO, CTO, CFO.',
      geographicFocus: 'US (primary), UK and DACH region (expansion in 2025)',
      marketTiming:
        'Perfect timing: (1) Cloud data warehouse adoption hit critical mass in 2023; (2) GPT/LLM breakthroughs made conversational interfaces credible; (3) Mid-market companies now have enterprise-grade data but consumer-grade analytics tools; (4) Economic pressure forcing companies to extract more value from existing data vs. hiring.',
      tailwinds:
        'AI hype driving budget allocation to AI-powered tools, cloud data warehouse ubiquity, shortage of data scientists making self-serve analytics essential, regulatory pressure (ESG, SOX) increasing demand for data-driven compliance',
      headwinds:
        'Potential AI fatigue/skepticism from failed AI projects, enterprise sales cycles lengthening in uncertain economy, big tech (Microsoft Copilot, Google Duet AI) entering adjacent spaces',
      marketScore: 7,
      marketNotes: '',
    },

    // ============ BUSINESS MODEL SECTION ============
    business: {
      revenueModel: 'SaaS',
      pricingModel:
        'Three tiers: Starter ($2,500/mo, up to 5 data sources, 10 users), Professional ($7,500/mo, unlimited sources, 50 users, custom models), Enterprise ($25,000+/mo, unlimited everything, on-premise option, dedicated support). Annual contracts with 15% discount.',
      avgContractValue: '$96,000 ACV',
      grossMargin: '78%',
      ltv: '$288,000 (3-year average customer lifetime)',
      cac: '$48,000 (blended across channels)',
      ltvCacRatio: '6:1',
      paybackPeriod: '6 months',
      expansionRevenue:
        '20% of existing customers expand within 12 months — typically adding more data sources, more users, or upgrading tiers. Net Revenue Retention at 120%.',
      revenueConcentrationRisk:
        'Top 3 customers account for 22% of ARR. Largest single customer is 9% — acceptable but watching.',
      channelStrategy:
        'Product-led growth (free trial → Starter) + direct enterprise sales. 60% of revenue from direct sales, 30% from PLG conversion, 10% from channel partners (Snowflake, AWS Marketplace).',
      businessScore: 7,
      businessNotes: '',
    },

    // ============ TRACTION SECTION ============
    traction: {
      currentArr: '$2.1M',
      mrrGrowthRate: '12% MoM',
      totalRevenueLtm: '$1.6M',
      yoyRevenueGrowth: '340%',
      totalUsers: '2,800',
      activeUsers: '1,950',
      dau: '',
      mau: '1,950',
      retentionRate: '85%',
      churnRate: '2.1% monthly logo churn',
      netRevenueRetention: '120%',
      npsScore: '62',
      pipelineValue: '$4.8M in qualified pipeline',
      tractionScore: 8,
      tractionNotes: '',
    },

    // ============ FINANCIAL SECTION ============
    financial: {
      lastRoundSize: '$4M Seed (March 2024)',
      lastRoundDate: '2024-03',
      lastValuation: '$20M post-money (Seed)',
      totalRaised: '$8M ($4M pre-seed from angels + $4M Seed from Lightspeed)',
      monthlyBurnRate: '$180,000',
      runway: '18 months at current burn (with $3.2M cash on hand)',
      cashOnHand: '$3,200,000',
      useOfFunds:
        'Series A allocation: 45% engineering (hire 12 engineers), 30% sales & marketing (build enterprise sales team), 15% infrastructure (GPU costs, data processing), 10% G&A',
      revenueProjection:
        'Projecting $5.5M ARR by end of 2025, $14M ARR by end of 2026. Path to profitability at ~$20M ARR (projected Q3 2027).',
      breakEvenTarget: 'Q3 2027',
      capTableSummary:
        'Founders: 62% (fully diluted), Lightspeed: 18%, Angels: 12%, ESOP: 8%. Clean cap table, no debt, no convertible notes outstanding.',
      financialScore: 7,
      financialNotes: '',
    },

    // ============ COMPETITIVE SECTION ============
    competitive: {
      directCompetitors:
        'ThoughtSpot ($4.2B valuation, Series F) — strong but focused on large enterprise, too expensive for mid-market. Tellius (Series A, $16M raised) — similar positioning but weaker ML capabilities, slower product velocity. Pyramid Analytics (Series E, $120M raised) — legacy architecture being retrofitted with AI, heavy on-premise focus.',
      indirectCompetitors:
        'Tableau/Power BI — incumbent BI tools, no native AI/ML. Looker (Google) — developer-focused, steep learning curve. Mode Analytics — strong for analysts but no self-serve for business users.',
      competitiveAdvantages:
        '(1) Purpose-built AI-native architecture vs. bolted-on AI from legacy BI; (2) Natural language interface that actually works (not a gimmick); (3) 10x faster time-to-insight for non-technical users; (4) 40+ pre-built connectors vs. competitors\' 15-20; (5) 3x lower total cost of ownership vs. ThoughtSpot.',
      competitiveWeaknesses:
        'Smaller brand recognition vs. established players. Limited enterprise reference customers (<10 Fortune 500). No on-premise option yet (coming Q4 2025). Smaller sales team than competitors.',
      marketPositioning:
        'Positioned as "AI-native Tableau for the mid-market" — premium product at mid-market price point. Differentiated on speed-to-value: customers see ROI in 2 weeks vs. 3-6 months for legacy BI.',
      switchingCosts:
        'Moderate — once customers connect their data sources and train custom models, switching requires re-integrating data and re-training. Average customer has 8 connected sources after 6 months.',
      winRate: '42% in competitive deals against ThoughtSpot, 65% against Tellius',
      competitorFundingIntel:
        'ThoughtSpot raised $248M Series F (2024) — well-funded but focusing upmarket. Tellius raised $16M Series A (2023) — smaller team, slower product iteration. Pyramid raised $120M Series E but rumored to be exploring strategic sale.',
      competitiveScore: 7,
      competitiveNotes: '',
    },

    // ============ IP & TECH SECTION ============
    ip: {
      patentsFiled: '3',
      patentsGranted: '0',
      patentsPending: '3',
      tradeSecrets:
        'NovaFormer architecture details, training data preprocessing pipeline, proprietary benchmark datasets',
      proprietaryDataAssets:
        '18 months of anonymized enterprise analytics patterns from 85+ customers. This data continuously improves model accuracy — a compounding asset that competitors cannot replicate.',
      openSourceRisk:
        'Low — core ML models and data pipeline are proprietary. Uses standard open-source frameworks (PyTorch, FastAPI) for infrastructure. No risk of an OSS project replicating the full platform.',
      ipAssignment: 'All IP assigned to NovaTech AI Inc. (Delaware C-Corp). Founders signed PIIA at incorporation.',
      ipJurisdiction: 'United States (USPTO)',
      freedomToOperate: '',
      ipScore: 6,
      ipNotes: '',
    },

    // ============ CUSTOMERS SECTION ============
    customers: {
      keyCustomers:
        'Brex (fintech, $500K ACV), Notion (SaaS, $180K ACV), Plaid (fintech, $240K ACV), Gusto (HR tech, $120K ACV), Rippling (HR tech, $96K ACV)',
      customerLogos: 'Brex, Notion, Plaid, Gusto, Rippling, Webflow, Pipe, Ramp',
      caseStudies:
        'Brex case study: reduced time-to-insight from 2 weeks to 2 hours, saved $400K/year in analyst headcount. Notion case study: identified $1.2M in expansion revenue opportunities through churn prediction.',
      strategicPartnerships:
        'Snowflake Technology Partner (listed on Snowflake Marketplace), AWS ISV Partner, Segment Integration Partner',
      channelPartners: 'AWS Marketplace, Snowflake Marketplace. Exploring reseller agreements with Accenture and Deloitte.',
      customerConcentration: 'Top 3 = 22% of ARR, top 10 = 48% of ARR. Largest single customer = 9%.',
      referenceableCustomers: 'Brex (VP Analytics), Notion (Head of Data), Gusto (CTO) — all willing to take reference calls',
      pipelineQuality:
        '$4.8M qualified pipeline. 60% enterprise ($100K+ ACV), 40% mid-market. Average deal cycle: 45 days (mid-market), 90 days (enterprise).',
      customerScore: 7,
      customerNotes: '',
    },

    // ============ INVESTORS SECTION ============
    investors: {
      leadInvestor: 'Lightspeed Venture Partners (Seed)',
      allInvestors:
        'Lightspeed Venture Partners (Seed lead, $3M), Andrew Ng (angel, $200K), Elad Gil (angel, $150K), David Kim (Sequoia Scout, $100K), various angels ($550K)',
      boardComposition: '3 seats: Sarah Chen (CEO), Marcus Rodriguez (CTO), Rachel Park (Lightspeed)',
      investorReputation:
        'Lightspeed is Tier 1 — strong enterprise SaaS portfolio (Snap, Nutanix, AppDynamics). Angel network includes Andrew Ng (AI credibility) and Elad Gil (scaling expertise).',
      followOnLikelihood:
        'Lightspeed highly likely to follow on (verbally committed to pro-rata in Series A). Angels expected to participate.',
      investorConflicts: 'None identified. Lightspeed has no competing portfolio companies in AI-native analytics.',
      proRataRights: 'Lightspeed has pro-rata rights. Angels do not.',
      investorStrategicValue:
        'Lightspeed: enterprise GTM playbook, intro to CTO network. Andrew Ng: AI credibility, hiring magnet. Elad Gil: scaling operations advisory.',
      investorScore: 7,
      investorNotes: '',
    },

    // ============ REGULATORY SECTION ============
    regulatory: {
      fdaStatus: '',
      fdaPathway: '',
      fdaTimeline: '',
      otherRegulatoryApprovals: '',
      complianceFrameworks: 'SOC 2 Type II (achieved August 2024), pursuing ISO 27001',
      hipaaCompliance: 'Not applicable (no health data processing)',
      gdprCompliance: 'GDPR compliant — data processing agreements in place, EU data residency option available',
      soc2Compliance: 'SOC 2 Type II certified (August 2024)',
      regulatoryRisks:
        'Emerging AI regulation (EU AI Act) could impose transparency/explainability requirements on ML models used for business decisions. Low near-term risk, monitoring actively.',
      regulatoryBurdenAssessment:
        'Low current burden — SOC 2 compliance is table stakes for enterprise SaaS. GDPR compliance well-handled. EU AI Act may add moderate compliance costs in 2026+.',
      regulatoryScore: 7,
      regulatoryNotes: '',
    },

    // ============ LEGAL SECTION ============
    legal: {
      corporateStructure: 'Delaware C-Corp',
      jurisdiction: 'Delaware, United States',
      pendingLitigation: 'None',
      ipAssignments: 'All IP assigned. PIIA signed by all founders and employees.',
      employmentAgreements:
        'Standard at-will employment. All employees have signed NDAs, PIIA, and non-solicitation agreements.',
      nonCompeteStatus: 'No non-competes (California-based employees). Non-solicitation agreements in place.',
      materialContracts: '',
      outstandingWarrants: 'None',
      optionPool: '8% ESOP, 4.2% allocated, 3.8% available for future grants',
      legalRisks: 'Low overall legal risk. Clean corporate structure, no litigation, standard agreements in place.',
      legalScore: 8,
      legalNotes: '',
    },

    // ============ ISRAEL SECTION ============
    // Intentionally mostly empty — NovaTech is a US company
    israel: {
      israelEntityName: '',
      israelEntityType: '',
      usEntityName: 'NovaTech AI Inc.',
      usEntityType: 'Delaware C-Corp',
      iiaGrants: '',
      iiaObligations: '',
      rdCenterLocation: '',
      rdHeadcount: '',
      section102Options: '',
      transferPricingStrategy: '',
      taxTreatyUsage: '',
      usMarketStrategy: '',
      usPresence: 'HQ in San Francisco, all operations US-based',
      culturalAdaptationPlan: '',
      usHiringPlan: '',
      dualListingConsideration: '',
      israelScore: 5,
      israelNotes: 'N/A — NovaTech AI is a US-only company with no Israel operations.',
    },

    // ============ RISKS SECTION ============
    risks: {
      keyRisksTop5:
        '1. Enterprise sales execution — need to hire VP Sales and build outbound motion\n2. Big tech encroachment — Microsoft Copilot and Google Duet AI entering adjacent space\n3. Customer concentration — top 3 customers at 22% of ARR\n4. Burn rate acceleration — Series A hiring plan increases burn to $350K/mo\n5. Model accuracy dependency — product value directly tied to ML model performance',
      technicalRisks:
        'Model degradation risk if training data quality drops. Scaling inference costs with GPU demand. Technical debt in early connector codebase.',
      marketRisks:
        'AI analytics market could commoditize as LLMs improve. Big tech could bundle competitive features into existing products (Teams + Copilot, Google Sheets + Duet AI).',
      executionRisks:
        'Transitioning from founder-led sales to a scalable enterprise sales org is a known failure point for Series A companies. VP Sales hire is critical.',
      financialRisks:
        'GPU/compute costs rising faster than revenue per customer. 18-month runway assumes current burn — Series A hiring plan accelerates burn significantly.',
      regulatoryRisks: 'EU AI Act could impose compliance costs. Low near-term probability.',
      competitiveRisks:
        'ThoughtSpot could move downmarket with a cheaper tier. Microsoft Copilot analytics features could reduce demand for standalone tools.',
      teamRisks:
        'VP Sales not yet hired — critical gap. Key person risk on CTO (sole infrastructure architect). Engineering team concentrated in one office.',
      riskMitigants:
        'Strong founder-market fit reduces execution risk. 120% NRR demonstrates product-market fit. Lightspeed provides GTM advisory. 18-month runway provides buffer. Patent filings protect core IP.',
      dealBreakers: 'None identified at this stage.',
      overallRiskLevel: 'medium',
      riskScore: 6,
      riskNotes: '',
    },

    // ============ DEAL TERMS SECTION ============
    deal: {
      roundName: 'Series A',
      targetRaise: '$12,000,000',
      preMoneyValuation: '$45,000,000',
      instrumentType: 'Preferred Equity',
      leadInvestorCommitted: 'In discussions with 3 potential leads (Andreessen Horowitz, Index Ventures, Accel)',
      ourAllocation: '',
      ownershipTarget: '',
      boardSeat: 'One new board seat for Series A lead',
      proRataRights: 'Pro-rata rights for all Series A investors',
      liquidationPreference: '1x non-participating preferred',
      antiDilution: 'Broad-based weighted average',
      dragAlong: '',
      tagAlong: '',
      vestingSchedule: '4 years, 1-year cliff (standard)',
      esopSize: 'Expanding ESOP to 12% post-Series A (from 8%)',
      keyTermsConditions: '',
      dealScore: 6,
      dealNotes: '',
    },

    // ============ DEAL TIMELINE & STAGE TRACKING ============
    dealStage: 'deep-dive',
    activityLog: [
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'note',
        text: 'Initial intro via David Kim (Sequoia Scout). Strong first impression.',
      },
      {
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'note',
        text: 'First meeting with Sarah Chen (CEO) and Marcus Rodriguez (CTO). Impressive technical depth.',
      },
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'note',
        text: 'Product demo — natural language interface genuinely impressive. Asked for data room access.',
      },
    ],
    lastResearched: {},

    // ============ AI RESEARCH RESULTS ============
    aiResearch: {},

    // ============ REFERENCES ============
    references: [],

    // ============ OVERALL VERDICT ============
    overallVerdict: '',

    // ============ OVERALL SCORE ============
    overallScore: 0,
  };
}
