// ============================================================================
// lib/integrations/opencorporates.js — OpenCorporates Integration for DueDrill
// ============================================================================
// OpenCorporates is the largest open database of companies in the world,
// aggregating official corporate registry data from 140+ jurisdictions.
// It's FREE for basic searches — no API key required.
//
// WHY OpenCorporates? It fills a gap the VC databases don't cover:
//   - Official incorporation data (not self-reported)
//   - Legal entity status (active, dissolved, struck off)
//   - Officer/director names from official filings
//   - Filing history (annual reports, registered agent changes)
//   - Registered addresses (official, not marketing addresses)
//
// This is critical for legal due diligence — you need to verify the company
// actually exists, is in good standing, and matches what the founders claim.
//
// EXPORTS:
//   searchCompanies(query) — search by name (no API key needed for basic)
//   getCompanyDetails(jurisdictionCode, companyNumber) — full filing details
//   mapToSchema(data) — transforms OpenCorporates fields → DueDrill schema
//
// API DOCS: https://api.opencorporates.com/documentation
// BASE URL: https://api.opencorporates.com/v0.4/
// AUTH: Optional api_token query param (increases rate limits from 5→50 req/sec)
// ============================================================================

// ============ API CONFIGURATION ============
const API_BASE = 'https://api.opencorporates.com/v0.4/';

// ============ REQUEST TIMEOUT ============
// OpenCorporates can be slow on complex multi-jurisdiction searches.
// 20 seconds is generous but necessary for the free tier.
const REQUEST_TIMEOUT_MS = 20000;

// ============ COMPANY STATUS MAPPING ============
// OpenCorporates uses various status strings depending on jurisdiction.
// We normalize these into categories useful for DD analysis.
const STATUS_CATEGORIES = {
  'active': 'Active',
  'good standing': 'Active',
  'in existence': 'Active',
  'registered': 'Active',
  'live': 'Active',
  'current': 'Active',
  'dissolved': 'Dissolved',
  'inactive': 'Inactive',
  'struck off': 'Struck Off',
  'closed': 'Dissolved',
  'liquidation': 'In Liquidation',
  'in liquidation': 'In Liquidation',
  'administration': 'In Administration',
  'removed': 'Removed',
  'cancelled': 'Cancelled',
  'suspended': 'Suspended',
  'converted': 'Converted/Merged',
  'merged': 'Converted/Merged',
};

// ============ HELPER: Fetch with Timeout ============
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ HELPER: Handle API Errors ============
function handleApiError(status, statusText, endpoint) {
  switch (status) {
    case 401:
      throw new Error(
        'OpenCorporates API token is invalid. ' +
        'Basic searches work without a token — remove the token or update it.'
      );
    case 403:
      throw new Error(
        'OpenCorporates API rate limit exceeded. Free tier allows ~5 requests/second. ' +
        'Wait a moment and retry, or add an API token for higher limits.'
      );
    case 404:
      throw new Error(
        `Company not found on OpenCorporates (${endpoint}). ` +
        'Check the jurisdiction code and company number are correct.'
      );
    case 429:
      throw new Error(
        'OpenCorporates rate limit hit (429). Wait 10 seconds before retrying. ' +
        'Consider adding an API token for increased limits.'
      );
    case 500:
    case 502:
    case 503:
      throw new Error(
        `OpenCorporates server error (${status}). Try again in a few minutes.`
      );
    default:
      throw new Error(
        `OpenCorporates API error: ${status} ${statusText} on ${endpoint}`
      );
  }
}

// ============ HELPER: Normalize Company Status ============
// Maps the raw OpenCorporates status string to a clean category.
function normalizeStatus(rawStatus) {
  if (!rawStatus) return '';
  const lower = rawStatus.toLowerCase().trim();

  // Check direct mapping first
  if (STATUS_CATEGORIES[lower]) return STATUS_CATEGORIES[lower];

  // Check if the status CONTAINS any of our known keywords
  for (const [keyword, category] of Object.entries(STATUS_CATEGORIES)) {
    if (lower.includes(keyword)) return category;
  }

  // Return as-is if we can't categorize it (with title case)
  return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
}

// ============================================================================
// searchCompanies(query, apiKey)
// ============================================================================
// Searches OpenCorporates for companies matching the given name.
// NO API KEY is needed for basic searches — the free tier allows ~5 req/sec.
// Pass an apiKey to get higher rate limits (50 req/sec).
//
// Returns: Array of { id, name, permalink, description, location, source }
export async function searchCompanies(query, apiKey = '') {
  // ---- Validate inputs ----
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Search query is required and must be a non-empty string.');
  }

  const trimmedQuery = query.trim();

  // ---- Build the search URL ----
  // OpenCorporates search endpoint returns companies matching the query.
  // We request the first page of results (30 per page by default).
  const endpoint = 'companies/search';
  const url = new URL(endpoint, API_BASE);
  url.searchParams.set('q', trimmedQuery);
  url.searchParams.set('per_page', '10');
  url.searchParams.set('order', 'score'); // best match first

  // Add API token if provided (optional, increases rate limits)
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    url.searchParams.set('api_token', apiKey.trim());
  }

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // ---- Handle HTTP errors ----
    if (!response.ok) {
      handleApiError(response.status, response.statusText, endpoint);
    }

    const data = await response.json();

    // ---- Transform results ----
    // OpenCorporates wraps results in results.companies, each with a
    // company object inside.
    const companies = data.results?.companies || [];

    const results = companies.map((item) => {
      const c = item.company || item;

      // Build a descriptive string from available data
      const descParts = [];
      if (c.company_type) descParts.push(c.company_type);
      if (c.current_status) descParts.push(normalizeStatus(c.current_status));
      if (c.incorporation_date) descParts.push(`Inc. ${c.incorporation_date}`);

      // Extract location from jurisdiction and registered address
      const jurisdiction = c.jurisdiction_code
        ? c.jurisdiction_code.toUpperCase().replace('_', ' ')
        : '';

      return {
        id: `${c.jurisdiction_code}/${c.company_number}`,
        name: c.name || '',
        permalink: `${c.jurisdiction_code}/${c.company_number}`,
        description: descParts.join(' · '),
        location: c.registered_address_in_full
          ? c.registered_address_in_full.substring(0, 100)
          : jurisdiction,
        jurisdictionCode: c.jurisdiction_code || '',
        companyNumber: c.company_number || '',
        source: 'opencorporates',
      };
    });

    return results;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'OpenCorporates request timed out after 20 seconds. Try a more specific search.'
      );
    }
    throw err;
  }
}

// ============================================================================
// getCompanyDetails(jurisdictionCode, companyNumber, apiKey)
// ============================================================================
// Fetches the full company record from OpenCorporates.
//
// OpenCorporates identifies companies by jurisdiction + company number:
//   - jurisdictionCode: "us_de" (Delaware), "gb" (UK), "il" (Israel), etc.
//   - companyNumber: The official registration number in that jurisdiction
//
// This returns the richest data — including officers, filings, and status.
export async function getCompanyDetails(jurisdictionCode, companyNumber, apiKey = '') {
  // ---- Validate inputs ----
  if (!jurisdictionCode || typeof jurisdictionCode !== 'string') {
    throw new Error(
      'Jurisdiction code is required (e.g., "us_de" for Delaware, "gb" for UK, "il" for Israel).'
    );
  }
  if (!companyNumber || typeof companyNumber !== 'string') {
    throw new Error('Company number is required (the official registration number).');
  }

  const jCode = jurisdictionCode.trim().toLowerCase();
  const cNumber = companyNumber.trim();

  // ---- Build the company details URL ----
  const endpoint = `companies/${jCode}/${cNumber}`;
  const url = new URL(endpoint, API_BASE);

  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    url.searchParams.set('api_token', apiKey.trim());
  }

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // ---- Handle HTTP errors ----
    if (!response.ok) {
      handleApiError(response.status, response.statusText, endpoint);
    }

    const data = await response.json();

    // OpenCorporates wraps the company in results.company
    const company = data.results?.company || data.company || data;

    return {
      ...company,
      _jurisdictionCode: jCode,
      _companyNumber: cNumber,
      _opencorporatesUrl: `https://opencorporates.com/companies/${jCode}/${cNumber}`,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `OpenCorporates request for ${jCode}/${cNumber} timed out. Try again.`
      );
    }
    throw err;
  }
}

// ============================================================================
// mapToSchema(data)
// ============================================================================
// Transforms raw OpenCorporates data into the DueDrill schema format.
//
// OpenCorporates focuses on LEGAL data, not business metrics. So we populate:
//   - overview (basic identity, founding date, location)
//   - team (officers as co-founders/board)
//   - legal (corporate structure, jurisdiction, status)
//   - regulatory (filing data)
//   - israel (if jurisdiction is Israeli)
//
// Financial, traction, and investor data are NOT available from OpenCorporates.
//
// Returns: { overview: {...}, team: {...}, legal: {...}, ... }
export function mapToSchema(data) {
  if (!data) {
    return {};
  }

  const d = data;

  // ---- Extract year founded from incorporation date ----
  // OpenCorporates provides incorporation_date in YYYY-MM-DD format.
  let yearFounded = '';
  if (d.incorporation_date) {
    const yearMatch = d.incorporation_date.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) yearFounded = yearMatch[0];
  }

  // ---- Extract address components ----
  // OpenCorporates provides registered_address as a full string and
  // sometimes as structured fields. We try both.
  let hqCity = '';
  let hqCountry = '';

  if (d.registered_address) {
    // Structured address fields
    const addr = d.registered_address;
    hqCity = addr.locality || addr.city || '';
    hqCountry = addr.country || '';

    // Fallback: parse the full address string
    if (!hqCity && addr.in_full) {
      const parts = addr.in_full.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        hqCity = parts[parts.length - 2] || '';
        hqCountry = parts[parts.length - 1] || '';
      }
    }
  } else if (d.registered_address_in_full) {
    const parts = d.registered_address_in_full.split(',').map((s) => s.trim());
    if (parts.length >= 2) {
      hqCity = parts[parts.length - 2] || '';
      hqCountry = parts[parts.length - 1] || '';
    }
  }

  // ---- Extract jurisdiction as country ----
  // If we couldn't get country from the address, derive it from the
  // jurisdiction code (e.g., "us_de" → US, "gb" → UK, "il" → Israel).
  if (!hqCountry && d._jurisdictionCode) {
    const jCode = d._jurisdictionCode.toLowerCase();
    if (jCode.startsWith('us')) hqCountry = 'United States';
    else if (jCode === 'gb' || jCode.startsWith('gb_')) hqCountry = 'United Kingdom';
    else if (jCode === 'il') hqCountry = 'Israel';
    else if (jCode === 'de') hqCountry = 'Germany';
    else if (jCode === 'fr') hqCountry = 'France';
    else if (jCode === 'ca' || jCode.startsWith('ca_')) hqCountry = 'Canada';
    else if (jCode === 'au' || jCode.startsWith('au_')) hqCountry = 'Australia';
    else if (jCode === 'sg') hqCountry = 'Singapore';
    else hqCountry = jCode.toUpperCase();
  }

  // ---- Normalize company status ----
  const currentStatus = normalizeStatus(d.current_status);

  // ---- Determine corporate structure from company type ----
  // Map OpenCorporates company_type to DueDrill's CORPORATE_STRUCTURE_OPTIONS.
  let corporateStructure = '';
  const companyType = (d.company_type || '').toLowerCase();
  if (companyType.includes('c corp') || companyType.includes('corporation')) {
    corporateStructure = 'Delaware C-Corp';
  } else if (companyType.includes('llc') || companyType.includes('limited liability')) {
    corporateStructure = 'LLC';
  } else if (companyType.includes('s corp')) {
    corporateStructure = 'S-Corp';
  } else if (companyType.includes('ltd') || companyType.includes('baam') || companyType.includes('בע"מ')) {
    corporateStructure = 'Israeli Ltd';
  } else if (companyType) {
    corporateStructure = 'Other';
  }

  // ---- Extract officers (directors, secretaries, etc.) ----
  // Officers are the company's legal officeholders — useful for verifying
  // the team and board composition against what founders claim.
  let officers = [];
  let boardMembers = '';
  let ceoName = '';
  if (Array.isArray(d.officers)) {
    officers = d.officers
      .map((item) => {
        const officer = item.officer || item;
        const name = officer.name || '';
        const position = officer.position || officer.role || '';
        return { name, position };
      })
      .filter((o) => o.name);

    // Extract CEO/director names
    const ceo = officers.find((o) =>
      o.position.toLowerCase().includes('ceo') ||
      o.position.toLowerCase().includes('chief executive') ||
      o.position.toLowerCase().includes('managing director')
    );
    if (ceo) ceoName = ceo.name;

    // Board members are typically "director" positions
    const directors = officers
      .filter((o) => o.position.toLowerCase().includes('director'))
      .map((o) => `${o.name} (${o.position})`);
    boardMembers = directors.join(', ');
  }

  // ---- Extract filing summary ----
  // Filings tell us about the company's compliance history — are they
  // filing annual reports on time? Have there been any unusual filings?
  let filingSummary = '';
  if (Array.isArray(d.filings) && d.filings.length > 0) {
    const filingCount = d.filings.length;
    const latestFiling = d.filings[0]?.filing || d.filings[0];
    const latestDate = latestFiling?.date || latestFiling?.filing_date || '';
    const latestType = latestFiling?.title || latestFiling?.filing_type || '';
    filingSummary = `${filingCount} filing(s) on record. Latest: ${latestType} (${latestDate})`;
  }

  // ---- Check if this is an Israeli entity ----
  const isIsraeli = (d._jurisdictionCode || '').toLowerCase() === 'il';

  // ---- Build the mapped schema object ----
  const result = {
    // ============ OVERVIEW ============
    overview: {
      companyName: d.name || '',
      yearFounded,
      hqCity,
      hqCountry,
      // OpenCorporates doesn't have business descriptions or sectors
    },

    // ============ TEAM ============
    team: {
      ceoName,
      boardMembers,
      // Map all officers as co-founders context
      coFounders: officers
        .map((o) => `${o.name} (${o.position})`)
        .join(', '),
    },

    // ============ LEGAL ============
    legal: {
      corporateStructure,
      jurisdiction: d._jurisdictionCode
        ? d._jurisdictionCode.toUpperCase().replace('_', '-')
        : '',
      // Company status is critical for legal DD — a dissolved or suspended
      // company is a major red flag
      legalRisks: currentStatus !== 'Active' && currentStatus
        ? `Company status: ${currentStatus}. Verify with founders.`
        : '',
    },

    // ============ REGULATORY ============
    regulatory: {
      // Filing data goes into regulatory for compliance tracking
      regulatoryBurdenAssessment: filingSummary,
      otherRegulatoryApprovals: currentStatus
        ? `Corporate registry status: ${currentStatus}`
        : '',
    },
  };

  // ---- Add Israel-specific fields if applicable ----
  if (isIsraeli) {
    result.israel = {
      israelEntityName: d.name || '',
      israelEntityType: corporateStructure === 'Israeli Ltd' ? 'Ltd (Baam)' : '',
    };
  }

  return result;
}
