'use client';

// ============================================================================
// components/views/ReportView.js — Print-Ready Due Diligence Report
// ============================================================================
// Renders a Goldman Sachs / Morgan Stanley style investment memo.
// Professional, comprehensive, print-optimized due diligence report with:
//   - Executive header with company identity, date, and overall score badge
//   - Scoring matrix showing all 12 weighted section scores
//   - All 16 DD sections with every non-empty field as label:value pairs
//   - AI Research results displayed under each section when available
//   - Print button triggering window.print() with @media print CSS
//   - Dark theme: bg-[#1e2130], text-[#e8e9ed], border-[#2d3148], accent-[#4a7dff]
//
// Props:
//   company — full company data object with section sub-objects (from schemas.js)
// ============================================================================

import React, { useMemo, useCallback } from 'react';
import { calculateOverallScore, getScoreVerdict } from '@/lib/scoring';
import { SCORE_WEIGHTS } from '@/lib/constants';

// ============ SCORE COLOR UTILITY ============
// Returns hex color for a 0-10 score. Used for inline styles on score badges,
// borders, and text where Tailwind classes can't be dynamically applied.
function getScoreHex(score) {
  const num = parseFloat(score) || 0;
  if (num >= 8) return '#34d399';   // emerald — excellent
  if (num >= 7) return '#22c55e';   // green — good
  if (num >= 5) return '#f59e0b';   // amber — average
  if (num >= 4) return '#f97316';   // orange — below average
  return '#ef4444';                  // red — poor
}

// ============ RISK LEVEL COLOR ============
// Returns hex color for risk level strings (low/medium/high/critical)
function getRiskLevelHex(level) {
  const normalized = (level || '').toLowerCase().trim();
  if (normalized === 'low') return '#34d399';
  if (normalized === 'medium') return '#f59e0b';
  if (normalized === 'high') return '#f97316';
  if (normalized === 'critical') return '#ef4444';
  return '#6b7084';
}

// ============ SCORE LABELS FOR MATRIX ============
// Human-readable labels for the 12 scored sections in the scoring matrix
const SCORE_MATRIX_LABELS = {
  team:        'Team',
  product:     'Product',
  market:      'Market',
  traction:    'Traction',
  business:    'Business Model',
  competitive: 'Competitive',
  financial:   'Financial',
  ip:          'IP & Technology',
  regulatory:  'Regulatory',
  israel:      'Israel-Specific',
  legal:       'Legal',
  deal:        'Deal Terms',
};

// ============ SECTION DEFINITIONS ============
// Maps each of the 16 DD sections to their display title, data key on the
// company object, optional score field name, and field-to-label mappings.
// Field names match schemas.js EXACTLY — this is the data contract.
// Order determines report section order.
const SECTION_DEFINITIONS = [
  {
    key: 'overview',
    title: '1. Company Overview',
    dataKey: 'overview',
    scoreField: null,
    fields: {
      companyName:      'Company Name',
      websiteUrl:       'Website URL',
      yearFounded:      'Year Founded',
      hqCity:           'HQ City',
      hqCountry:        'HQ Country',
      stage:            'Funding Stage',
      sector:           'Industry Sector',
      subSector:        'Sub-Sector',
      elevatorPitch:    'Elevator Pitch',
      employeeCount:    'Employee Count',
      linkedinUrl:      'LinkedIn URL',
      crunchbaseUrl:    'Crunchbase URL',
      oneLineSummary:   'One-Line Summary',
      dealSource:       'Deal Source',
      referredBy:       'Referred By',
    },
  },
  {
    key: 'team',
    title: '2. Team Analysis',
    dataKey: 'team',
    scoreField: 'teamCompleteness',
    fields: {
      ceoName:            'CEO Name',
      ceoBackground:      'CEO Background',
      ceoLinkedin:        'CEO LinkedIn',
      ctoName:            'CTO Name',
      ctoBackground:      'CTO Background',
      ctoLinkedin:        'CTO LinkedIn',
      coFounders:         'Co-Founders',
      totalTeamSize:      'Total Team Size',
      engineeringTeamSize:'Engineering Team Size',
      keyHiresNeeded:     'Key Hires Needed',
      founderMarketFit:   'Founder-Market Fit',
      previousExits:      'Previous Exits',
      domainExpertise:    'Domain Expertise',
      teamCompleteness:   'Team Score',
      advisors:           'Advisors',
      boardMembers:       'Board Members',
      founderVesting:     'Founder Vesting',
      teamNotes:          'Team Notes',
    },
  },
  {
    key: 'product',
    title: '3. Product Analysis',
    dataKey: 'product',
    scoreField: 'productScore',
    fields: {
      productDescription:      'Product Description',
      techStack:               'Tech Stack',
      demoUrl:                 'Demo URL',
      productStage:            'Product Stage',
      moatType:                'Moat Type',
      moatDescription:         'Moat Description',
      technicalDifferentiator: 'Technical Differentiator',
      aiMlUsage:               'AI/ML Usage',
      scalability:             'Scalability',
      technicalDebt:           'Technical Debt',
      productRoadmap:          'Product Roadmap',
      integrations:            'Integrations',
      productScore:            'Product Score',
      productNotes:            'Product Notes',
    },
  },
  {
    key: 'market',
    title: '4. Market Analysis',
    dataKey: 'market',
    scoreField: 'marketScore',
    fields: {
      tam:                   'Total Addressable Market (TAM)',
      sam:                   'Serviceable Addressable Market (SAM)',
      som:                   'Serviceable Obtainable Market (SOM)',
      marketGrowthRate:      'Market Growth Rate',
      marketDynamics:        'Market Dynamics',
      targetCustomerProfile: 'Target Customer Profile',
      geographicFocus:       'Geographic Focus',
      marketTiming:          'Market Timing (Why Now)',
      tailwinds:             'Tailwinds',
      headwinds:             'Headwinds',
      marketScore:           'Market Score',
      marketNotes:           'Market Notes',
    },
  },
  {
    key: 'business',
    title: '5. Business Model',
    dataKey: 'business',
    scoreField: 'businessScore',
    fields: {
      revenueModel:              'Revenue Model',
      pricingModel:              'Pricing Model',
      avgContractValue:          'Average Contract Value (ACV)',
      grossMargin:               'Gross Margin',
      ltv:                       'Customer Lifetime Value (LTV)',
      cac:                       'Customer Acquisition Cost (CAC)',
      ltvCacRatio:               'LTV:CAC Ratio',
      paybackPeriod:             'Payback Period',
      expansionRevenue:          'Expansion Revenue',
      revenueConcentrationRisk:  'Revenue Concentration Risk',
      channelStrategy:           'Channel Strategy',
      businessScore:             'Business Model Score',
      businessNotes:             'Business Model Notes',
    },
  },
  {
    key: 'traction',
    title: '6. Traction & Metrics',
    dataKey: 'traction',
    scoreField: 'tractionScore',
    fields: {
      currentArr:          'Current ARR',
      mrrGrowthRate:       'MRR Growth Rate',
      totalRevenueLtm:     'Total Revenue (LTM)',
      yoyRevenueGrowth:    'YoY Revenue Growth',
      totalUsers:          'Total Users',
      activeUsers:         'Active Users',
      dau:                 'Daily Active Users (DAU)',
      mau:                 'Monthly Active Users (MAU)',
      retentionRate:       'Retention Rate',
      churnRate:           'Churn Rate',
      netRevenueRetention: 'Net Revenue Retention (NRR)',
      npsScore:            'Net Promoter Score (NPS)',
      pipelineValue:       'Pipeline Value',
      tractionScore:       'Traction Score',
      tractionNotes:       'Traction Notes',
    },
  },
  {
    key: 'financial',
    title: '7. Financial Deep Dive',
    dataKey: 'financial',
    scoreField: 'financialScore',
    fields: {
      lastRoundSize:      'Last Round Size',
      lastRoundDate:      'Last Round Date',
      lastValuation:      'Last Valuation (Post-Money)',
      totalRaised:        'Total Capital Raised',
      monthlyBurnRate:    'Monthly Burn Rate',
      runway:             'Runway (Months)',
      cashOnHand:         'Cash on Hand',
      useOfFunds:         'Use of Funds',
      revenueProjection:  'Revenue Projection',
      breakEvenTarget:    'Break-Even Target',
      capTableSummary:    'Cap Table Summary',
      financialScore:     'Financial Score',
      financialNotes:     'Financial Notes',
    },
  },
  {
    key: 'competitive',
    title: '8. Competitive Landscape',
    dataKey: 'competitive',
    scoreField: 'competitiveScore',
    fields: {
      directCompetitors:      'Direct Competitors',
      indirectCompetitors:    'Indirect Competitors',
      competitiveAdvantages:  'Competitive Advantages',
      competitiveWeaknesses:  'Competitive Weaknesses',
      marketPositioning:      'Market Positioning',
      switchingCosts:         'Switching Costs',
      winRate:                'Win Rate',
      competitorFundingIntel: 'Competitor Funding Intel',
      competitiveScore:       'Competitive Score',
      competitiveNotes:       'Competitive Notes',
    },
  },
  {
    key: 'ip',
    title: '9. Intellectual Property & Technology',
    dataKey: 'ip',
    scoreField: 'ipScore',
    fields: {
      patentsFiled:         'Patents Filed',
      patentsGranted:       'Patents Granted',
      patentsPending:       'Patents Pending',
      tradeSecrets:         'Trade Secrets',
      proprietaryDataAssets:'Proprietary Data Assets',
      openSourceRisk:       'Open Source Risk',
      ipAssignment:         'IP Assignment Status',
      ipJurisdiction:       'IP Jurisdiction',
      freedomToOperate:     'Freedom to Operate',
      ipScore:              'IP Score',
      ipNotes:              'IP Notes',
    },
  },
  {
    key: 'customers',
    title: '10. Customers & Partnerships',
    dataKey: 'customers',
    scoreField: 'customerScore',
    fields: {
      keyCustomers:           'Key Customers',
      customerLogos:          'Customer Logos',
      caseStudies:            'Case Studies',
      strategicPartnerships:  'Strategic Partnerships',
      channelPartners:        'Channel Partners',
      customerConcentration:  'Customer Concentration',
      referenceableCustomers: 'Referenceable Customers',
      pipelineQuality:        'Pipeline Quality',
      customerScore:          'Customer Score',
      customerNotes:          'Customer Notes',
    },
  },
  {
    key: 'investors',
    title: '11. Investor Syndicate',
    dataKey: 'investors',
    scoreField: 'investorScore',
    fields: {
      leadInvestor:           'Lead Investor',
      allInvestors:           'All Investors',
      boardComposition:       'Board Composition',
      investorReputation:     'Investor Reputation',
      followOnLikelihood:     'Follow-On Likelihood',
      investorConflicts:      'Investor Conflicts',
      proRataRights:          'Pro-Rata Rights',
      investorStrategicValue: 'Investor Strategic Value',
      investorScore:          'Investor Score',
      investorNotes:          'Investor Notes',
    },
  },
  {
    key: 'regulatory',
    title: '12. Regulatory & Compliance',
    dataKey: 'regulatory',
    scoreField: 'regulatoryScore',
    fields: {
      fdaStatus:                   'FDA Status',
      fdaPathway:                  'FDA Pathway',
      fdaTimeline:                 'FDA Timeline',
      otherRegulatoryApprovals:    'Other Regulatory Approvals',
      complianceFrameworks:        'Compliance Frameworks',
      hipaaCompliance:             'HIPAA Compliance',
      gdprCompliance:              'GDPR Compliance',
      soc2Compliance:              'SOC 2 Compliance',
      regulatoryRisks:             'Regulatory Risks',
      regulatoryBurdenAssessment:  'Regulatory Burden Assessment',
      regulatoryScore:             'Regulatory Score',
      regulatoryNotes:             'Regulatory Notes',
    },
  },
  {
    key: 'legal',
    title: '13. Legal Structure',
    dataKey: 'legal',
    scoreField: 'legalScore',
    fields: {
      corporateStructure:    'Corporate Structure',
      jurisdiction:          'Jurisdiction',
      pendingLitigation:     'Pending Litigation',
      ipAssignments:         'IP Assignments',
      employmentAgreements:  'Employment Agreements',
      nonCompeteStatus:      'Non-Compete Status',
      materialContracts:     'Material Contracts',
      outstandingWarrants:   'Outstanding Warrants',
      optionPool:            'Option Pool (ESOP)',
      legalRisks:            'Legal Risks',
      legalScore:            'Legal Score',
      legalNotes:            'Legal Notes',
    },
  },
  {
    key: 'israel',
    title: '14. Israel-Specific Considerations',
    dataKey: 'israel',
    scoreField: 'israelScore',
    fields: {
      israelEntityName:         'Israel Entity Name',
      israelEntityType:         'Israel Entity Type',
      usEntityName:             'US Entity Name',
      usEntityType:             'US Entity Type',
      iiaGrants:                'IIA Grants',
      iiaObligations:           'IIA Obligations',
      rdCenterLocation:         'R&D Center Location',
      rdHeadcount:              'R&D Headcount',
      section102Options:        'Section 102 Options',
      transferPricingStrategy:  'Transfer Pricing Strategy',
      taxTreatyUsage:           'Tax Treaty Usage',
      usMarketStrategy:         'US Market Strategy',
      usPresence:               'US Presence',
      culturalAdaptationPlan:   'Cultural Adaptation Plan',
      usHiringPlan:             'US Hiring Plan',
      dualListingConsideration: 'Dual-Listing Consideration',
      israelScore:              'Israel Score',
      israelNotes:              'Israel-Specific Notes',
    },
  },
  {
    key: 'risks',
    title: '15. Risk Assessment',
    dataKey: 'risks',
    scoreField: 'riskScore',
    fields: {
      keyRisksTop5:       'Top 5 Key Risks',
      technicalRisks:     'Technical Risks',
      marketRisks:        'Market Risks',
      executionRisks:     'Execution Risks',
      financialRisks:     'Financial Risks',
      regulatoryRisks:    'Regulatory Risks',
      competitiveRisks:   'Competitive Risks',
      teamRisks:          'Team Risks',
      riskMitigants:      'Risk Mitigants',
      dealBreakers:       'Deal Breakers',
      overallRiskLevel:   'Overall Risk Level',
      riskScore:          'Risk Score',
      riskNotes:          'Risk Notes',
    },
  },
  {
    key: 'deal',
    title: '16. Deal Terms & Structure',
    dataKey: 'deal',
    scoreField: 'dealScore',
    fields: {
      roundName:              'Round Name',
      targetRaise:            'Target Raise',
      preMoneyValuation:      'Pre-Money Valuation',
      instrumentType:         'Instrument Type',
      leadInvestorCommitted:  'Lead Investor Committed',
      ourAllocation:          'Our Allocation',
      ownershipTarget:        'Ownership Target',
      boardSeat:              'Board Seat',
      proRataRights:          'Pro-Rata Rights',
      liquidationPreference:  'Liquidation Preference',
      antiDilution:           'Anti-Dilution Protection',
      dragAlong:              'Drag-Along Rights',
      tagAlong:               'Tag-Along Rights',
      vestingSchedule:        'Vesting Schedule',
      esopSize:               'ESOP Size',
      keyTermsConditions:     'Key Terms & Conditions',
      dealScore:              'Deal Score',
      dealNotes:              'Deal Notes',
    },
  },
];

// ============ COMPONENT ============
export default function ReportView({ company }) {
  // ============ COMPUTE OVERALL SCORE ============
  const overallScore = useMemo(
    () => calculateOverallScore(company),
    [company]
  );
  const verdict = getScoreVerdict(overallScore);
  const scoreColor = getScoreHex(overallScore);

  // ============ FORMAT DATE ============
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ============ SECTION SCORES FOR MATRIX ============
  // Extract each scored section's value for the scoring matrix display
  const sectionScores = useMemo(() => {
    if (!company) return [];
    return Object.entries(SCORE_WEIGHTS).map(([sectionKey, config]) => {
      const section = company[sectionKey];
      const value = section ? parseFloat(section[config.field]) : NaN;
      return {
        key: sectionKey,
        label: SCORE_MATRIX_LABELS[sectionKey] || sectionKey,
        score: isNaN(value) ? null : value,
        weight: config.weight,
        weightPct: Math.round(config.weight * 100),
      };
    });
  }, [company]);

  // ============ PRINT HANDLER ============
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ============ CHECK IF FIELD IS EMPTY / DEFAULT ============
  // Returns true for values that should be skipped in the report.
  // Skips empty strings, null, undefined. Does NOT skip numeric scores
  // (even default 5) because they represent the analyst's assessment.
  // Does NOT skip the string 'medium' for overallRiskLevel since it's the default.
  const isFieldEmpty = useCallback((value, fieldKey) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    // Skip the default 'medium' risk level — it means "not yet assessed"
    if (fieldKey === 'overallRiskLevel' && value === 'medium') return true;
    return false;
  }, []);

  // ============ FORMAT FIELD VALUE ============
  // Renders a field value with appropriate formatting based on type and content
  const formatValue = useCallback((value, fieldKey) => {
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  }, []);

  // ============ RENDER ============
  return (
    <div className="max-w-[960px] mx-auto">
      {/* ============ PRINT-SPECIFIC CSS ============ */}
      {/* Injected via <style> tag — hides sidebar, nav, and non-report elements
          when printing. Forces white background and black text for readability. */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the report */
          nav, aside, .print\\:hidden, [data-sidebar], [data-topbar] {
            display: none !important;
          }
          /* Force the report container to full width */
          main, .main-content, [data-main] {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          /* White background, black text for printing */
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Prevent page breaks inside cards */
          .report-section-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Ensure scoring matrix stays together */
          .scoring-matrix {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Force page break before risk assessment for cleaner layout */
          .report-section-risks {
            break-before: page;
          }
        }
      `}</style>

      {/* ============ PRINT BUTTON + EXPORT CONTROLS ============ */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <p className="text-[#6b7084] text-xs">
          Confidential Investment Memorandum
        </p>
        <button
          onClick={handlePrint}
          className={
            'inline-flex items-center justify-center gap-2 ' +
            'font-semibold rounded-lg border border-transparent ' +
            'py-2.5 px-5 text-sm transition-all duration-200 cursor-pointer ' +
            'bg-[#4a7dff] text-white hover:bg-[#3d6be6] active:bg-[#3560d4] ' +
            'shadow-lg shadow-[#4a7dff]/20'
          }
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </button>
      </div>

      {/* ============ REPORT HEADER ============ */}
      {/* Investment memo header — company identity, date, verdict badge */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-8 mb-6 print:border-gray-400 print:bg-white print:rounded-none">
        {/* Top rule line — accent color */}
        <div className="h-1 w-full bg-[#4a7dff] rounded-full mb-6 print:bg-blue-700" />

        {/* Title block */}
        <div className="text-center mb-6">
          <p className="text-[#6b7084] text-xs font-medium tracking-[0.2em] uppercase mb-2 print:text-gray-500">
            Confidential
          </p>
          <h1 className="text-[#e8e9ed] text-3xl font-bold tracking-tight mb-1 print:text-black">
            Investment Due Diligence Report
          </h1>
          <div className="h-px w-24 mx-auto bg-[#4a7dff] my-4 print:bg-blue-700" />
          <h2 className="text-[#4a7dff] text-2xl font-bold mb-1 print:text-blue-800">
            {company?.overview?.companyName || company?.name || 'Unnamed Company'}
          </h2>
          {company?.overview?.sector && (
            <p className="text-[#9ca0b0] text-sm mt-1 print:text-gray-600">
              {company.overview.sector}
              {company.overview.subSector ? ` / ${company.overview.subSector}` : ''}
              {company.overview.stage ? ` \u2014 ${company.overview.stage}` : ''}
            </p>
          )}
          <p className="text-[#6b7084] text-sm mt-3 print:text-gray-500">
            Prepared: {reportDate}
          </p>
        </div>

        {/* Overall score badge — centered, prominent */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-5 px-6 py-4 bg-[#252836] rounded-xl border border-[#2d3148] print:bg-gray-50 print:border-gray-300">
            {/* Score circle */}
            <div
              className="w-16 h-16 rounded-full border-[3px] flex items-center justify-center font-bold text-2xl"
              style={{
                borderColor: scoreColor,
                color: scoreColor,
                backgroundColor: `${scoreColor}12`,
              }}
            >
              {overallScore}
            </div>
            {/* Verdict text */}
            <div className="text-left">
              <p className="text-lg font-bold" style={{ color: scoreColor }}>
                {verdict}
              </p>
              <p className="text-[#6b7084] text-xs print:text-gray-500">
                Overall Composite Score: {overallScore} / 10
              </p>
              <p className="text-[#6b7084] text-[10px] mt-0.5 print:text-gray-400">
                Weighted across {Object.keys(SCORE_WEIGHTS).length} evaluation dimensions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ EXECUTIVE SUMMARY ============ */}
      {/* Quick-glance summary with key company data points */}
      {company?.overview && (
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 mb-6 print:border-gray-300 print:bg-white report-section-card">
          <h2 className="text-[#4a7dff] text-lg font-bold mb-4 pb-2 border-b border-[#2d3148] print:text-blue-800 print:border-gray-300">
            Executive Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Founded', value: company.overview.yearFounded },
              { label: 'HQ', value: [company.overview.hqCity, company.overview.hqCountry].filter(Boolean).join(', ') },
              { label: 'Employees', value: company.overview.employeeCount },
              { label: 'Stage', value: company.overview.stage },
              { label: 'Sector', value: company.overview.sector },
              { label: 'Last Valuation', value: company.financial?.lastValuation },
              { label: 'Total Raised', value: company.financial?.totalRaised },
              { label: 'Current ARR', value: company.traction?.currentArr },
            ]
              .filter((item) => item.value && String(item.value).trim() !== '')
              .map((item) => (
                <div key={item.label} className="bg-[#252836] rounded-lg p-3 print:bg-gray-50">
                  <p className="text-[#6b7084] text-[10px] font-medium tracking-wider uppercase print:text-gray-500">
                    {item.label}
                  </p>
                  <p className="text-[#e8e9ed] text-sm font-semibold mt-0.5 print:text-black">
                    {item.value}
                  </p>
                </div>
              ))}
          </div>
          {/* Elevator pitch if available */}
          {company.overview.elevatorPitch && (
            <div className="mt-4 pt-4 border-t border-[#2d3148] print:border-gray-200">
              <p className="text-[#9ca0b0] text-xs font-medium uppercase tracking-wider mb-1 print:text-gray-500">
                Company Description
              </p>
              <p className="text-[#e8e9ed] text-sm leading-relaxed print:text-black">
                {company.overview.elevatorPitch}
              </p>
            </div>
          )}
          {/* Overall verdict if set */}
          {company.overallVerdict && (
            <div className="mt-4 pt-4 border-t border-[#2d3148] print:border-gray-200">
              <p className="text-[#9ca0b0] text-xs font-medium uppercase tracking-wider mb-1 print:text-gray-500">
                Investment Verdict
              </p>
              <p className="text-[#e8e9ed] text-sm leading-relaxed font-medium print:text-black">
                {company.overallVerdict}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============ SCORING MATRIX ============ */}
      {/* Shows all 12 weighted scores in a compact grid — the quantitative backbone */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 mb-6 print:border-gray-300 print:bg-white scoring-matrix">
        <h2 className="text-[#4a7dff] text-lg font-bold mb-4 pb-2 border-b border-[#2d3148] print:text-blue-800 print:border-gray-300">
          Scoring Matrix
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sectionScores.map((item) => {
            const color = item.score !== null ? getScoreHex(item.score) : '#6b7084';
            return (
              <div
                key={item.key}
                className="bg-[#252836] rounded-lg p-3 border border-[#2d3148] print:bg-gray-50 print:border-gray-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[#9ca0b0] text-xs font-medium print:text-gray-600">
                    {item.label}
                  </p>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: color,
                      backgroundColor: `${color}15`,
                    }}
                  >
                    {item.weightPct}%
                  </span>
                </div>
                <p
                  className="text-xl font-bold"
                  style={{ color }}
                >
                  {item.score !== null ? item.score : '--'}
                  <span className="text-[#6b7084] text-xs font-normal ml-0.5">/10</span>
                </p>
                {/* Mini progress bar */}
                <div className="w-full h-1 bg-[#1e2130] rounded-full mt-2 print:bg-gray-200">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: item.score !== null ? `${item.score * 10}%` : '0%',
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ DETAILED SECTION REPORTS ============ */}
      {/* Each of the 16 DD sections rendered as a card with all non-empty fields */}
      {SECTION_DEFINITIONS.map((section) => {
        const sectionData = company?.[section.dataKey] || {};
        const aiResult = company?.aiResearch?.[section.key] || '';

        // Collect non-empty fields for this section
        const filledFields = [];
        for (const [fieldKey, fieldLabel] of Object.entries(section.fields)) {
          const value = sectionData[fieldKey];
          if (!isFieldEmpty(value, fieldKey)) {
            filledFields.push({ key: fieldKey, label: fieldLabel, value });
          }
        }

        // Skip sections with no data and no AI results
        if (filledFields.length === 0 && !aiResult) return null;

        // Determine the section score (if this section has one)
        const sectionScore = section.scoreField ? sectionData[section.scoreField] : null;
        const sectionScoreColor = sectionScore !== null && sectionScore !== undefined
          ? getScoreHex(sectionScore)
          : null;

        return (
          <div
            key={section.key}
            className={
              'bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 mb-4 ' +
              'print:border-gray-300 print:bg-white report-section-card ' +
              (section.key === 'risks' ? 'report-section-risks' : '')
            }
          >
            {/* Section header — title + score badge */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d3148] print:border-gray-300">
              <h2 className="text-[#4a7dff] text-lg font-bold print:text-blue-800">
                {section.title}
              </h2>
              {/* Score badge for scored sections */}
              {sectionScoreColor && typeof sectionScore === 'number' && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                  style={{
                    borderColor: `${sectionScoreColor}40`,
                    backgroundColor: `${sectionScoreColor}10`,
                  }}
                >
                  <span
                    className="text-sm font-bold"
                    style={{ color: sectionScoreColor }}
                  >
                    {sectionScore}
                  </span>
                  <span className="text-[#6b7084] text-xs">/10</span>
                </div>
              )}
            </div>

            {/* Field rows — label:value pairs */}
            {filledFields.length > 0 && (
              <div className="space-y-2 mb-4">
                {filledFields.map((field) => {
                  // Score fields get special rendering with color
                  const isScore = field.key.endsWith('Score') || field.key === 'teamCompleteness';
                  const isRiskLevel = field.key === 'overallRiskLevel';

                  return (
                    <div
                      key={field.key}
                      className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-0 py-1.5 border-b border-[#2d3148]/40 last:border-b-0 print:border-gray-100"
                    >
                      {/* Label */}
                      <span className="text-[#9ca0b0] text-xs font-medium shrink-0 sm:w-52 sm:text-right sm:pr-4 sm:pt-0.5 print:text-gray-600">
                        {field.label}
                      </span>
                      {/* Value */}
                      {isScore && typeof field.value === 'number' ? (
                        <span
                          className="text-sm font-semibold flex-1"
                          style={{ color: getScoreHex(field.value) }}
                        >
                          {field.value} / 10
                        </span>
                      ) : isRiskLevel ? (
                        <span
                          className="text-sm font-semibold flex-1 uppercase tracking-wide"
                          style={{ color: getRiskLevelHex(field.value) }}
                        >
                          {String(field.value)}
                        </span>
                      ) : (
                        <span className="text-[#e8e9ed] text-sm flex-1 whitespace-pre-wrap leading-relaxed print:text-black">
                          {formatValue(field.value, field.key)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI Research results — displayed below manual fields with distinct styling */}
            {aiResult && (
              <div className="mt-4 pt-4 border-t border-[#2d3148] print:border-gray-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                  <p className="text-[#a78bfa] text-xs font-semibold uppercase tracking-[0.15em] print:text-purple-700">
                    AI Research Analysis
                  </p>
                </div>
                <div className="bg-[#252836] rounded-lg p-4 border border-[#2d3148]/60 print:bg-gray-50 print:border-gray-200">
                  <div className="text-[#e8e9ed] text-sm leading-relaxed whitespace-pre-wrap print:text-black">
                    {aiResult}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ============ REPORT FOOTER ============ */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 mt-6 mb-8 text-center print:border-gray-300 print:bg-white">
        <div className="h-px w-full bg-[#2d3148] mb-4 print:bg-gray-300" />
        <p className="text-[#6b7084] text-xs print:text-gray-500">
          This document is confidential and intended solely for the use of the intended recipient(s).
        </p>
        <p className="text-[#6b7084] text-xs mt-1 print:text-gray-500">
          Generated by DueDrill &mdash; {reportDate}
        </p>
        <p className="text-[#4a7dff] text-[10px] mt-2 font-medium print:text-blue-700">
          CONFIDENTIAL &mdash; DO NOT DISTRIBUTE
        </p>
      </div>
    </div>
  );
}
