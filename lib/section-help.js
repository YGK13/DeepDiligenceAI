// ============================================================================
// lib/section-help.js — DueDrill: Contextual Section Help & Scoring Rubrics
// ============================================================================
// Provides in-app tooltips for each of the 16 DD sections so users know
// what they're evaluating and what "good" looks like.
//
// Every entry includes:
//   - title: Section display name
//   - description: 1-2 sentence overview of what this section evaluates
//   - rubric: Scoring guidance for 8-10, 5-7, and 1-4 ranges
//   - redFlags: 3-4 warning signs that should lower the score
//   - greenFlags: 3-4 positive signals that should raise the score
//
// Content is grounded in real VC diligence practice — not generic advice.
// ============================================================================

export const SECTION_HELP = {
  // ============ OVERVIEW ============
  overview: {
    title: 'Company Overview',
    description:
      'Captures the foundational identity of the target company — who they are, what they do, and how they came to your attention. This is the first section you fill in and sets the context for everything else.',
    rubric: {
      high: '8-10: Company story is clear and compelling. Strong elevator pitch, established web presence, verifiable founding date, and a credible deal source (warm intro from trusted network).',
      mid: '5-7: Basic information available but some gaps. Elevator pitch exists but is generic. Deal source is cold or unvetted. Web presence is thin.',
      low: '1-4: Cannot verify basic facts. No website, no LinkedIn presence, inconsistent founding story, or the company came through a pay-to-pitch platform.',
    },
    redFlags: [
      'Cannot verify company existence through independent sources',
      'Founding story or timeline has inconsistencies',
      'Deal came through a paid broker or pay-to-pitch event',
      'Company pivoted multiple times with no clear narrative',
    ],
    greenFlags: [
      'Warm referral from a trusted investor or operator in your network',
      'Clear, differentiated elevator pitch that a non-expert can understand',
      'Strong web presence with consistent messaging across channels',
      'Founding story shows organic problem discovery (not solution-seeking)',
    ],
  },

  // ============ TEAM ============
  team: {
    title: 'Team & Founders',
    description:
      'Assesses the founding team\'s ability to execute — their domain expertise, track record, completeness, and founder-market fit. At early stages, the team is the single most important investment factor.',
    rubric: {
      high: '8-10: Deep domain expertise with prior exits or scaled companies. Complete founding team covering technical, product, and GTM. Strong founder-market fit with a clear "why us, why now" story.',
      mid: '5-7: Relevant experience but no prior exits. Team has gaps in 1-2 key areas (e.g., no sales leader). Founder-market fit is plausible but not obvious.',
      low: '1-4: Solo non-technical founder with no relevant industry experience. No advisory board. Cannot articulate why they are uniquely qualified.',
    },
    redFlags: [
      'Solo founder with no plans to bring on co-founders',
      'No one on the team has built or scaled a product before',
      'Founders have misaligned vesting or unclear equity splits',
      'High early-stage turnover (co-founders or early employees leaving)',
    ],
    greenFlags: [
      'Prior successful exit by at least one founder',
      'Deep domain expertise — founders lived the problem they are solving',
      'Complete founding team: technical + product + GTM covered',
      'Team has worked together before (reduces co-founder conflict risk)',
    ],
  },

  // ============ PRODUCT ============
  product: {
    title: 'Product & Technology',
    description:
      'Evaluates what they\'ve built, how defensible the technology is, and where the product is headed. Looks at technical architecture, moat strength, differentiation, and roadmap credibility.',
    rubric: {
      high: '8-10: Clear technical moat (proprietary data, network effects, or patents). Paying customers using the product daily. Scalable architecture with low technical debt. Product roadmap aligned with customer demand.',
      mid: '5-7: Working product with some customers but moat is unclear. Architecture works at current scale but may need re-engineering. Technical differentiation exists but is not yet proven at scale.',
      low: '1-4: Pre-product or prototype stage with no paying users. No clear moat — features can be replicated by incumbents. Significant technical debt or architecture concerns.',
    },
    redFlags: [
      'No clear moat — features are table stakes that any competitor can copy',
      'Product built on top of a single API (e.g., GPT wrapper with no proprietary layer)',
      'Heavy technical debt with no remediation plan',
      'Roadmap driven by founder vision alone, not customer feedback',
    ],
    greenFlags: [
      'Proprietary data asset that improves with usage (data network effects)',
      'Patent-pending or patented core technology',
      'Architecture designed for 10x scale from current usage',
      'Product roadmap directly informed by customer requests and usage data',
    ],
  },

  // ============ MARKET ============
  market: {
    title: 'Market Opportunity',
    description:
      'Analyzes the total addressable market (TAM), growth dynamics, and timing. A great product in a small or declining market is a bad investment. Looks for large TAM with secular tailwinds and a clear wedge.',
    rubric: {
      high: '8-10: $10B+ TAM with 15%+ CAGR. Clear secular tailwinds (regulatory, technological, behavioral). Timing is perfect — market is inflecting NOW. Bottom-up TAM analysis is credible.',
      mid: '5-7: Reasonable TAM ($1-10B) but growth rate is moderate. Timing is okay but not urgent. TAM is top-down only, not validated bottom-up.',
      low: '1-4: Small or shrinking market (<$1B TAM). Winner-take-all dynamics with entrenched incumbents. No clear "why now" for timing.',
    },
    redFlags: [
      'TAM is calculated top-down only with no bottom-up validation',
      'Market is dominated by 1-2 entrenched players with >80% share',
      'No clear secular tailwind — growth depends on company execution alone',
      'Regulatory headwinds could shrink the addressable market',
    ],
    greenFlags: [
      'Large TAM ($10B+) with strong growth rate (15%+ CAGR)',
      'Clear "why now" — technological or regulatory inflection point',
      'Fragmented market with no dominant incumbent',
      'Multiple secular tailwinds supporting long-term growth',
    ],
  },

  // ============ BUSINESS MODEL ============
  business: {
    title: 'Business Model',
    description:
      'Examines how the company makes money — revenue model, pricing strategy, unit economics, and channel strategy. Strong unit economics at early stage signal product-market fit and scalability.',
    rubric: {
      high: '8-10: Proven unit economics with LTV:CAC > 5x. Gross margins > 70%. Clear pricing power with low churn. Multiple revenue streams or strong expansion revenue.',
      mid: '5-7: Unit economics are reasonable but not yet proven at scale. LTV:CAC between 3-5x. Single revenue stream. Pricing model may need iteration.',
      low: '1-4: No clear monetization strategy. Negative unit economics with no path to improvement. Revenue concentration risk (one customer > 30% of revenue).',
    },
    redFlags: [
      'LTV:CAC ratio below 3x with no clear path to improvement',
      'Gross margins below 50% for a software company',
      'Single customer represents >25% of total revenue',
      'Pricing model requires heavy customization per customer (limits scalability)',
    ],
    greenFlags: [
      'LTV:CAC > 5x with CAC payback under 12 months',
      'Net Revenue Retention > 120% (expansion revenue exceeds churn)',
      'Gross margins > 75% with path to 80%+',
      'Multiple acquisition channels — not dependent on a single channel',
    ],
  },

  // ============ TRACTION ============
  traction: {
    title: 'Traction & Metrics',
    description:
      'The hard numbers that prove (or disprove) product-market fit. ARR, growth rates, retention, and engagement metrics tell the real story — not the pitch deck narrative.',
    rubric: {
      high: '8-10: ARR growing 3x+ YoY. Net Revenue Retention > 120%. Monthly churn < 2%. Strong engagement metrics (DAU/MAU > 40%). Qualified pipeline > 2x current ARR.',
      mid: '5-7: ARR growing 2-3x YoY. Retention is okay (80-90%) but NRR is below 110%. Engagement is moderate. Pipeline exists but quality is mixed.',
      low: '1-4: Flat or declining revenue. High churn (> 5% monthly). Low engagement. No meaningful pipeline. Metrics are cherry-picked or inconsistent.',
    },
    redFlags: [
      'Revenue growth is decelerating quarter-over-quarter',
      'Net Revenue Retention below 100% (revenue shrinking from existing customers)',
      'Metrics presented inconsistently (switching between MRR/ARR/bookings to show best number)',
      'High logo churn masked by a few large expansion deals',
    ],
    greenFlags: [
      'Consistent 3x+ YoY revenue growth with acceleration',
      'Net Revenue Retention > 130% (strong expansion revenue)',
      'NPS > 50 indicating genuine customer love',
      'Organic/word-of-mouth driving significant portion of new business',
    ],
  },

  // ============ FINANCIAL ============
  financial: {
    title: 'Financials & Funding',
    description:
      'Reviews funding history, burn rate, runway, cash position, and financial projections. Ensures the company is funded to reach the next meaningful milestone and that capital is being deployed efficiently.',
    rubric: {
      high: '8-10: 18+ months runway. Clean cap table. Burn rate aligned with growth. Realistic projections grounded in current metrics. Strong existing investors likely to follow on.',
      mid: '5-7: 12-18 months runway. Some cap table complexity. Burn is reasonable but efficiency could improve. Projections are optimistic but not unreasonable.',
      low: '1-4: Less than 6 months runway. Messy cap table with excessive dilution. Burn rate not justified by growth. Projections disconnected from current trajectory.',
    },
    redFlags: [
      'Less than 12 months of runway with no fundraise in progress',
      'Burn rate increasing faster than revenue growth',
      'Cap table has excessive dilution, debt, or complex instruments',
      'Financial projections assume hockey-stick growth with no basis in current metrics',
    ],
    greenFlags: [
      '18+ months of runway at current burn rate',
      'Existing investors committed to follow-on participation',
      'Clean cap table with standard preferred equity terms',
      'Efficient burn — each dollar of spend driving measurable growth',
    ],
  },

  // ============ COMPETITIVE ============
  competitive: {
    title: 'Competitive Landscape',
    description:
      'Maps the competitive environment — direct competitors, indirect substitutes, and the company\'s positioning. The goal is to understand whether this company can WIN, not just compete.',
    rubric: {
      high: '8-10: Clear differentiation that competitors cannot easily replicate. Strong win rates in head-to-head deals. Competitors are well-understood with documented advantages and weaknesses.',
      mid: '5-7: Differentiation exists but is not yet proven in competitive deals. Some competitors have stronger brand or distribution. Win rate data is limited.',
      low: '1-4: No clear differentiation from competitors. Competing on price alone. Incumbents have overwhelming distribution advantages. Company cannot articulate why they win.',
    },
    redFlags: [
      'Founder cannot name their top 3 competitors (lack of market awareness)',
      'Differentiation is primarily price-based (race to bottom)',
      'Well-funded competitor just raised a large round targeting the same segment',
      'Customers frequently cite competitor features as must-haves',
    ],
    greenFlags: [
      'Documented win rates > 40% in competitive deals',
      'Differentiation based on technology or data moat (not just features)',
      'Competitors are focused on different market segments',
      'Customers switching FROM competitors TO this company (not the reverse)',
    ],
  },

  // ============ IP & TECH ============
  ip: {
    title: 'Intellectual Property',
    description:
      'Assesses the strength and defensibility of the company\'s intellectual property — patents, trade secrets, proprietary data assets, and open-source risk. Critical for evaluating long-term moat durability.',
    rubric: {
      high: '8-10: Granted patents protecting core technology. Proprietary data assets that compound over time. All IP properly assigned to the company. Clear freedom to operate.',
      mid: '5-7: Patents filed but not yet granted. Some proprietary data but moat is building. IP assignment is in place. No known FTO issues.',
      low: '1-4: No patents or trade secrets. Core technology is replicable with open-source tools. IP assignment is incomplete or contested. Potential FTO concerns.',
    },
    redFlags: [
      'IP not properly assigned to the company (still with founders personally)',
      'Core technology can be replicated using publicly available open-source models',
      'No patents filed after 2+ years of operation',
      'Potential freedom-to-operate issues with existing patents in the space',
    ],
    greenFlags: [
      'Granted patents on core technology with broad claims',
      'Proprietary data asset that grows with customer usage (compounding moat)',
      'Clean IP assignment with all founders and employees signed',
      'Trade secrets properly documented and protected',
    ],
  },

  // ============ CUSTOMERS ============
  customers: {
    title: 'Customers & Partnerships',
    description:
      'Evaluates customer quality, concentration risk, reference strength, and strategic partnerships. Logos and case studies signal market validation, while concentration risk flags fragility.',
    rubric: {
      high: '8-10: Recognizable brand-name customers. Low concentration risk (no customer > 10% of ARR). Multiple referenceable customers eager to advocate. Strategic partnerships with ecosystem players.',
      mid: '5-7: Solid customer base but limited brand recognition. Some concentration (top customer 15-25% of ARR). One or two referenceable customers. Early partnership exploration.',
      low: '1-4: Few customers with high concentration (one customer > 30% of ARR). No referenceable customers. No partnerships. Customers are mostly design partners or free-tier.',
    },
    redFlags: [
      'Single customer represents > 25% of revenue (existential risk)',
      'No customers willing to serve as references (relationship quality concern)',
      'Customer base is mostly free-tier or deeply discounted design partners',
      'Strategic partnerships are announced but show no actual revenue impact',
    ],
    greenFlags: [
      'Multiple Fortune 500 or recognizable brand-name customers',
      'Low concentration — no single customer > 10% of ARR',
      'Customers proactively refer new business (organic growth signal)',
      'Strategic partnerships driving measurable revenue or distribution',
    ],
  },

  // ============ INVESTORS ============
  investors: {
    title: 'Existing Investors',
    description:
      'Evaluates the quality, reputation, and strategic value of existing investors. Strong investors signal deal quality, provide operational support, and increase follow-on fundraising success.',
    rubric: {
      high: '8-10: Tier 1 VCs with strong enterprise/sector track record. Board is engaged and adds value. Existing investors committed to follow-on. No investor conflicts.',
      mid: '5-7: Reputable but not top-tier investors. Board is functional but not deeply engaged. Follow-on commitment is uncertain. Minor conflicts manageable.',
      low: '1-4: Unknown or tourist investors. No board governance. Existing investors unlikely to follow on. Investor conflicts or misaligned incentives.',
    },
    redFlags: [
      'Existing investors not willing to follow on (signal of lost confidence)',
      'Board is passive — no meaningful governance or strategic guidance',
      'Investor has a competing portfolio company in the same space',
      'Complex cap table with multiple convertible instruments and side letters',
    ],
    greenFlags: [
      'Tier 1 VC with deep expertise in the company\'s sector',
      'Board actively engaged with clear value-add beyond capital',
      'Existing investors committed to pro-rata follow-on investment',
      'Investor network opens doors to potential customers and partners',
    ],
  },

  // ============ REGULATORY ============
  regulatory: {
    title: 'Regulatory & Compliance',
    description:
      'Assesses the regulatory environment and compliance posture. Critical for healthtech, fintech, and defense/govtech companies where regulatory approval can make or break the business.',
    rubric: {
      high: '8-10: All required regulatory approvals obtained. SOC 2 / ISO 27001 certified. Compliance treated as a competitive advantage. Low ongoing regulatory burden.',
      mid: '5-7: Key approvals in progress with clear timeline. Basic compliance frameworks in place. Regulatory risk is known and being managed.',
      low: '1-4: Critical approvals not yet obtained with unclear timeline. No compliance certifications. Operating in a regulatory gray area. Material regulatory risk.',
    },
    redFlags: [
      'Operating without required regulatory approvals (legal risk)',
      'No SOC 2 or equivalent certification when selling to enterprise',
      'Regulatory landscape is changing in ways that could restrict the business model',
      'Compliance is an afterthought — no dedicated compliance function or roadmap',
    ],
    greenFlags: [
      'Regulatory approval already obtained (FDA, SOC 2, etc.)',
      'Compliance is a competitive moat (barrier to entry for competitors)',
      'Dedicated compliance team or advisor on board',
      'Regulatory tailwinds creating new mandated demand for the product',
    ],
  },

  // ============ LEGAL ============
  legal: {
    title: 'Legal Structure',
    description:
      'Reviews corporate structure, pending litigation, material contracts, IP assignments, and ESOP. A clean legal house is table stakes — legal surprises mid-diligence are a major red flag.',
    rubric: {
      high: '8-10: Clean Delaware C-Corp with standard terms. No pending litigation. All IP assigned. Employee agreements in place. ESOP properly structured with available pool.',
      mid: '5-7: Standard corporate structure with minor housekeeping needed. No litigation but some agreements need updating. ESOP exists but pool is limited.',
      low: '1-4: Complex or unusual corporate structure. Pending litigation or threatened claims. IP assignment issues. Missing employee agreements. No ESOP.',
    },
    redFlags: [
      'Pending litigation or credible threatened claims',
      'IP assignment agreements not in place for all founders and key employees',
      'Complex multi-entity structure with unclear intercompany relationships',
      'ESOP fully allocated with no remaining pool for future hires',
    ],
    greenFlags: [
      'Clean Delaware C-Corp with standard charter and bylaws',
      'All IP properly assigned, all employee agreements signed',
      'No pending or threatened litigation',
      'Healthy ESOP with sufficient unallocated pool for next 18 months of hiring',
    ],
  },

  // ============ ISRAEL ============
  israel: {
    title: 'Israel-Specific',
    description:
      'Evaluates Israel-specific factors for Israeli startups — dual-entity structure, IIA grant obligations, Section 102 option plans, transfer pricing, tax treaty usage, and US market entry strategy.',
    rubric: {
      high: '8-10: Clean dual-entity structure with US parent. IIA obligations well-managed. Section 102 plan in place. Transfer pricing documented. Clear US market strategy with local presence.',
      mid: '5-7: Dual structure exists but needs cleanup. IIA grants taken but obligations unclear. Section 102 plan pending. US market entry planned but not yet executed.',
      low: '1-4: Israeli-only entity with no US structure. IIA obligations could block IP transfer or sale. No Section 102 plan. No transfer pricing strategy. No US go-to-market plan.',
    },
    redFlags: [
      'IIA grant obligations could block IP transfer in an M&A scenario',
      'No US entity despite targeting US customers',
      'Transfer pricing not documented (tax audit risk)',
      'Section 102 not filed — employee options may have adverse tax treatment',
    ],
    greenFlags: [
      'Clean US parent / Israel subsidiary structure with proper intercompany agreements',
      'IIA obligations well-understood with waiver strategy if needed',
      'Section 102 plan filed and approved by ITA',
      'US beachhead established with local sales/CS presence',
    ],
  },

  // ============ RISKS ============
  risks: {
    title: 'Risk Assessment',
    description:
      'Comprehensive risk mapping across all dimensions — technical, market, execution, financial, regulatory, competitive, and team. Every deal has risks; the question is whether they are identifiable, quantifiable, and mitigable.',
    rubric: {
      high: '8-10: All material risks identified and documented. Credible mitigants in place for each. No deal-breakers. Risk level is proportionate to the stage and return potential.',
      mid: '5-7: Most risks identified but some gaps in mitigation. One or two concerning risks that need further diligence. No clear deal-breakers but watch items exist.',
      low: '1-4: Major unmitigated risks. Deal-breakers identified. Risk profile is disproportionate to the potential return. Key risks are unknown or poorly understood.',
    },
    redFlags: [
      'Founder dismisses or minimizes obvious risks (lack of self-awareness)',
      'Multiple overlapping risks with no mitigation strategy',
      'Single point of failure with no backup plan (key person, key customer, key technology)',
      'Risk profile is asymmetric — downside scenarios are catastrophic with no recovery path',
    ],
    greenFlags: [
      'Founder openly acknowledges risks and has thoughtful mitigation plans',
      'Risk profile is proportionate to stage — higher risk but higher potential return',
      'Key risks are diversified (not concentrated in one area)',
      'Board and investors are aligned on risk management approach',
    ],
  },

  // ============ DEAL TERMS ============
  deal: {
    title: 'Deal Terms',
    description:
      'Evaluates the proposed investment terms — valuation, round structure, investor rights, governance, and alignment of incentives. Ensures the deal is fair and the terms protect your downside while enabling upside.',
    rubric: {
      high: '8-10: Fair valuation supported by metrics and comps. Standard terms (1x non-participating, broad-based WAA). Board seat offered. Strong pro-rata rights. Clean instrument with no unusual provisions.',
      mid: '5-7: Valuation is full but justifiable with strong growth. Terms have one or two non-standard provisions that need negotiation. Pro-rata rights may be limited.',
      low: '1-4: Overvalued relative to metrics. Aggressive terms (participating preferred, ratchets, multiple liquidation). No governance rights. Unusual side letters or carve-outs.',
    },
    redFlags: [
      'Valuation is 2x+ higher than public comps at similar stage and metrics',
      'Participating preferred with >1x liquidation preference',
      'Anti-dilution ratchets (full ratchet instead of broad-based weighted average)',
      'No board representation or information rights for lead investor',
    ],
    greenFlags: [
      'Valuation supported by bottom-up analysis and public market comps',
      'Standard 1x non-participating preferred with broad-based WAA anti-dilution',
      'Board seat with meaningful governance rights',
      'Pro-rata rights ensuring ability to maintain ownership in future rounds',
    ],
  },
};
