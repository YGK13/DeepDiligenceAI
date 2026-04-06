// ============================================================================
// /api/export/sheets — Generate Google Sheets-Compatible TSV Export
// ============================================================================
// Produces a tab-separated values (TSV) file that Google Sheets imports
// perfectly via File → Import. TSV is preferred over CSV because:
//   1. Google Sheets auto-detects TSV columns more reliably
//   2. No quoting issues with commas in company descriptions
//   3. Works with direct paste into Google Sheets (Ctrl+V)
//
// Two export modes:
//   mode: 'portfolio' — Summary table of all companies (one row per company)
//   mode: 'single'    — Deep dive on one company (one row per field)
//
// POST /api/export/sheets
// Body: { companies: Company[], format: 'tsv', mode: 'portfolio' | 'single' }
// Returns: TSV file with proper Content-Type for Google Sheets import
// ============================================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/session';
import { rateLimitByApiRoute } from '@/lib/security/rateLimit';

// ============ SECTION LABELS FOR DEEP DIVE EXPORT ============
const SECTION_LABELS = {
  overview: 'Company Overview',
  team: 'Team & Founders',
  product: 'Product & Technology',
  market: 'Market Analysis',
  business: 'Business Model',
  traction: 'Traction & Metrics',
  financial: 'Financial Overview',
  competitive: 'Competitive Landscape',
  ip: 'IP & Technology',
  customers: 'Customers',
  investors: 'Investors',
  regulatory: 'Regulatory',
  legal: 'Legal',
  israel: 'Israel',
  risks: 'Risk Assessment',
  deal: 'Deal Terms',
};

// ============ ESCAPE TSV VALUE ============
// Tab and newline characters would break the TSV format.
// Replace them with spaces to keep each value in one cell.
function escapeTsv(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\t/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

// ============ PORTFOLIO SUMMARY EXPORT ============
// One row per company with key metrics as columns.
// Designed for a quick portfolio overview in Google Sheets.
function buildPortfolioTsv(companies) {
  const headers = [
    'Company',
    'Stage',
    'Sector',
    'Founded',
    'HQ',
    'Team Size',
    'Total Raised',
    'Monthly Revenue',
    'Burn Rate',
    'Deal Stage',
    'Overall Score',
    'Team Score',
    'Product Score',
    'Market Score',
    'Traction Score',
    'Financial Score',
    'Risk Level',
    'Last Researched',
  ];

  const rows = [headers.join('\t')];

  for (const company of companies) {
    const o = company.overview || {};
    const f = company.financial || {};
    const t = company.traction || {};
    const row = [
      escapeTsv(o.companyName || company.name || 'Unnamed'),
      escapeTsv(o.stage || ''),
      escapeTsv(o.sector || ''),
      escapeTsv(o.yearFounded || ''),
      escapeTsv([o.hqCity, o.hqCountry].filter(Boolean).join(', ')),
      escapeTsv(company.team?.totalTeamSize || o.employeeCount || ''),
      escapeTsv(f.totalRaised || company.deal?.totalRaised || ''),
      escapeTsv(t.monthlyRevenue || f.monthlyRevenue || ''),
      escapeTsv(f.monthlyBurnRate || ''),
      escapeTsv(company.dealStage || 'first-look'),
      escapeTsv(company.scores?.overall || ''),
      escapeTsv(company.team?.teamCompleteness || ''),
      escapeTsv(company.product?.productScore || ''),
      escapeTsv(company.market?.marketScore || ''),
      escapeTsv(company.traction?.tractionScore || ''),
      escapeTsv(company.financial?.financialScore || ''),
      escapeTsv(company.risks?.overallRiskLevel || ''),
      escapeTsv(company.lastResearched?.overview || ''),
    ];
    rows.push(row.join('\t'));
  }

  return rows.join('\n');
}

// ============ SINGLE COMPANY DEEP DIVE EXPORT ============
// Every field from every section as SECTION | FIELD | VALUE rows.
// Designed for pasting into a Google Sheet for detailed review.
function buildSingleCompanyTsv(company) {
  const rows = [['Section', 'Field', 'Value'].join('\t')];

  for (const [sectionKey, sectionLabel] of Object.entries(SECTION_LABELS)) {
    const sectionData = company[sectionKey] || {};

    // Add a blank row before each section (except the first) for readability
    if (rows.length > 1) {
      rows.push('');
    }

    // Section header row
    rows.push(['--- ' + sectionLabel + ' ---', '', ''].join('\t'));

    // Add every field in this section
    for (const [fieldKey, fieldValue] of Object.entries(sectionData)) {
      // Skip internal fields and score fields (they're in the summary)
      if (fieldKey === 'id' || fieldKey === 'createdAt' || fieldKey === 'updatedAt') continue;

      // Format the field name: camelCase → Title Case
      const fieldLabel = fieldKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();

      rows.push(
        [escapeTsv(sectionLabel), escapeTsv(fieldLabel), escapeTsv(fieldValue)].join('\t')
      );
    }
  }

  return rows.join('\n');
}

// ============ MAIN HANDLER ============
export async function POST(request) {
  try {
    // ============ AUTH + RATE LIMIT ============
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const rateLimitResult = rateLimitByApiRoute(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { companies, mode } = body;

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No companies provided.' },
        { status: 400 }
      );
    }

    // ============ BUILD TSV ============
    let tsv;
    let filename;

    if (mode === 'single' && companies.length === 1) {
      // Single company deep dive
      tsv = buildSingleCompanyTsv(companies[0]);
      const name = companies[0].overview?.companyName || companies[0].name || 'company';
      filename = `DueDrill-${name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.tsv`;
    } else {
      // Portfolio summary
      tsv = buildPortfolioTsv(companies);
      filename = `DueDrill-Portfolio-${new Date().toISOString().slice(0, 10)}.tsv`;
    }

    // ============ RETURN TSV FILE ============
    // UTF-8 BOM ensures Excel and Google Sheets detect encoding correctly
    const BOM = '\ufeff';
    return new Response(BOM + tsv, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[SHEETS EXPORT] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Export failed.' },
      { status: 500 }
    );
  }
}
