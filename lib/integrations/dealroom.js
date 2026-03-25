// ============================================================================
// lib/integrations/dealroom.js — Dealroom.co API Integration for DueDrill
// ============================================================================
// Dealroom.co is a European-focused VC intelligence platform that tracks
// startups, funding rounds, and ecosystem data. It's particularly strong
// for European and Israeli startups — which makes it a perfect complement
// to Crunchbase (which skews US-centric) for DueDrill's user base.
//
// Dealroom requires a paid API subscription. Their API is RESTful, JSON-based,
// and uses Bearer token authentication.
//
// EXPORTS:
//   searchCompanies(query, apiKey) — search by company name
//   getCompanyDetails(id, apiKey) — full company profile by Dealroom ID
//   mapToSchema(dealroomData) — transforms Dealroom fields → DueDrill schema
//
// API DOCS: https://developer.dealroom.co/ (requires subscription)
// BASE URL: https://api.dealroom.co/api/v1/
// AUTH: Bearer token in Authorization header
// ============================================================================

// ============ API CONFIGURATION ============
const API_BASE = 'https://api.dealroom.co/api/v1/';

// ============ REQUEST TIMEOUT ============
// 15-second timeout — same as Crunchbase for consistency.
const REQUEST_TIMEOUT_MS = 15000;

// ============ GROWTH STAGE MAPPING ============
// Dealroom uses its own growth stage taxonomy. We map these to DueDrill's
// stage field values (which must match STAGE_OPTIONS in the UI).
const GROWTH_STAGE_MAP = {
  'pre-seed': 'Pre-Seed',
  'seed': 'Seed',
  'early stage': 'Series A',
  'series a': 'Series A',
  'series b': 'Series B',
  'series c': 'Series C',
  'series d': 'Series D+',
  'series e': 'Series D+',
  'series f+': 'Series D+',
  'growth': 'Growth',
  'late stage': 'Growth',
  'ipo': 'Pre-IPO',
  'mature': 'Growth',
};

// ============ HELPER: Fetch with Timeout ============
// Same pattern as crunchbase.js — wraps fetch with AbortController.
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
// Translates Dealroom HTTP errors into actionable messages.
function handleApiError(status, statusText, endpoint) {
  switch (status) {
    case 401:
      throw new Error(
        'Dealroom API key is invalid or expired. ' +
        'Verify your API key in your Dealroom account settings.'
      );
    case 403:
      throw new Error(
        'Dealroom API access denied. Your subscription may not include API access, ' +
        'or you may have hit your rate limit. Contact Dealroom support.'
      );
    case 404:
      throw new Error(
        `Company not found on Dealroom (endpoint: ${endpoint}). ` +
        'The company may not be in the Dealroom database yet.'
      );
    case 429:
      throw new Error(
        'Dealroom API rate limit exceeded. Wait a minute and try again.'
      );
    case 500:
    case 502:
    case 503:
      throw new Error(
        `Dealroom API server error (${status}). Try again in a few minutes.`
      );
    default:
      throw new Error(
        `Dealroom API error: ${status} ${statusText} on ${endpoint}`
      );
  }
}

// ============ HELPER: Format Currency ============
// Same as crunchbase.js — converts raw numbers to "$15M" style strings.
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

// ============================================================================
// searchCompanies(query, apiKey)
// ============================================================================
// Searches Dealroom for companies matching the given name.
// Uses the /companies/search endpoint with a text query.
//
// Returns: Array of { id, name, permalink, description, location, logoUrl, source }
export async function searchCompanies(query, apiKey) {
  // ---- Validate inputs ----
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Search query is required and must be a non-empty string.');
  }
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      'Dealroom API key is required. Get one at https://dealroom.co/'
    );
  }

  const trimmedQuery = query.trim();

  // ---- Build the search URL ----
  // Dealroom's search endpoint accepts POST with a JSON body containing
  // the query and filter parameters.
  const endpoint = 'companies/search';
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: trimmedQuery,
        limit: 10,
        // Request only the fields we need for the search results list
        fields: [
          'id', 'name', 'tagline', 'hq_locations', 'logo_url',
          'path', 'industries', 'growth_stage',
        ],
      }),
    });

    // ---- Handle HTTP errors ----
    if (!response.ok) {
      handleApiError(response.status, response.statusText, endpoint);
    }

    const data = await response.json();

    // ---- Transform results ----
    // Dealroom returns companies in data.items or data.companies depending
    // on the endpoint version. Handle both.
    const items = data.items || data.companies || data.results || [];

    const results = items.map((company) => {
      // Extract location from hq_locations array
      const locations = Array.isArray(company.hq_locations)
        ? company.hq_locations.map((loc) => loc.name || loc.city || loc).filter(Boolean)
        : [];

      return {
        id: String(company.id || ''),
        name: company.name || '',
        permalink: company.path || company.slug || String(company.id || ''),
        description: company.tagline || '',
        location: locations.join(', '),
        logoUrl: company.logo_url || '',
        source: 'dealroom',
      };
    });

    return results;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Dealroom API request timed out after 15 seconds. Try again.'
      );
    }
    throw err;
  }
}

// ============================================================================
// getCompanyDetails(id, apiKey)
// ============================================================================
// Fetches the full company profile from Dealroom by company ID.
// Returns the raw Dealroom data object for mapping.
//
// The ID is the numeric Dealroom company ID (e.g., "123456").
// You get this from the search results.
export async function getCompanyDetails(id, apiKey) {
  // ---- Validate inputs ----
  if (!id) {
    throw new Error('Dealroom company ID is required.');
  }
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Dealroom API key is required.');
  }

  const companyId = String(id).trim();

  // ---- Build the company details URL ----
  const endpoint = `companies/${companyId}`;
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    // ---- Handle HTTP errors ----
    if (!response.ok) {
      handleApiError(response.status, response.statusText, endpoint);
    }

    const data = await response.json();

    // Dealroom wraps the company in a data property sometimes
    const company = data.data || data.company || data;

    return {
      ...company,
      _dealroomId: companyId,
      _dealroomUrl: `https://dealroom.co/companies/${company.path || companyId}`,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `Dealroom request for company ${companyId} timed out. Try again.`
      );
    }
    throw err;
  }
}

// ============================================================================
// mapToSchema(dealroomData)
// ============================================================================
// Transforms raw Dealroom API data into the DueDrill schema format.
//
// Mapping:
//   tagline → overview.elevatorPitch
//   hq_locations → overview.hqCity / hqCountry
//   industries → overview.sector
//   total_funding → financial.totalRaised
//   growth_stage → overview.stage
//   team_size → team.totalTeamSize
//   + many more fields extracted from the rich Dealroom profile
//
// Returns: { overview: {...}, team: {...}, financial: {...}, ... }
export function mapToSchema(dealroomData) {
  if (!dealroomData) {
    return {};
  }

  const d = dealroomData;

  // ---- Extract location data ----
  // Dealroom stores HQ locations as an array of objects with city/country.
  let hqCity = '';
  let hqCountry = '';
  if (Array.isArray(d.hq_locations) && d.hq_locations.length > 0) {
    const primary = d.hq_locations[0];
    hqCity = primary.city || primary.name || '';
    hqCountry = primary.country || '';
  } else if (typeof d.hq_locations === 'string') {
    const parts = d.hq_locations.split(',').map((s) => s.trim());
    hqCity = parts[0] || '';
    hqCountry = parts[parts.length - 1] || '';
  }

  // ---- Extract industries/sectors ----
  // Dealroom uses a hierarchical industry taxonomy. We take the primary one.
  const industries = Array.isArray(d.industries)
    ? d.industries.map((ind) => ind.name || ind).filter(Boolean)
    : [];
  const primarySector = industries[0] || '';
  const subSector = industries.slice(1).join(', ');

  // ---- Map growth stage to DueDrill stage ----
  const rawStage = (d.growth_stage || d.stage || '').toLowerCase().trim();
  const stage = GROWTH_STAGE_MAP[rawStage] || '';

  // ---- Extract team size ----
  // Dealroom may provide team_size as a number or an object with min/max.
  let teamSize = '';
  if (typeof d.team_size === 'number') {
    teamSize = String(d.team_size);
  } else if (d.team_size && typeof d.team_size === 'object') {
    teamSize = d.team_size.min && d.team_size.max
      ? `${d.team_size.min}-${d.team_size.max}`
      : String(d.team_size.min || d.team_size.max || '');
  } else if (d.employee_count) {
    teamSize = String(d.employee_count);
  }

  // ---- Extract funding data ----
  const totalFunding = d.total_funding || d.total_funding_usd || 0;
  const totalRaised = formatCurrency(totalFunding);

  // ---- Extract last round info ----
  let lastRoundSize = '';
  let lastRoundDate = '';
  let lastRoundType = '';
  if (d.last_funding_round || d.latest_round) {
    const round = d.last_funding_round || d.latest_round;
    lastRoundSize = formatCurrency(round.amount || round.money_raised || 0);
    lastRoundDate = round.date || round.announced_on || '';
    lastRoundType = round.round_type || round.funding_type || '';
  }

  // ---- Extract investor names ----
  let investors = [];
  if (Array.isArray(d.investors)) {
    investors = d.investors
      .map((inv) => inv.name || inv)
      .filter(Boolean);
  } else if (Array.isArray(d.notable_investors)) {
    investors = d.notable_investors
      .map((inv) => inv.name || inv)
      .filter(Boolean);
  }

  // ---- Extract founder/people data ----
  let ceoName = '';
  let ctoName = '';
  let founders = [];
  if (Array.isArray(d.team_members || d.people)) {
    const people = d.team_members || d.people;
    const ceo = people.find((p) =>
      (p.title || p.role || '').toLowerCase().includes('ceo') ||
      (p.title || p.role || '').toLowerCase().includes('chief executive')
    );
    const cto = people.find((p) =>
      (p.title || p.role || '').toLowerCase().includes('cto') ||
      (p.title || p.role || '').toLowerCase().includes('chief technology')
    );
    founders = people
      .filter((p) => (p.title || p.role || '').toLowerCase().includes('founder'))
      .map((p) => p.name || '')
      .filter(Boolean);

    if (ceo) ceoName = ceo.name || '';
    if (cto) ctoName = cto.name || '';
  }

  // ---- Extract year founded ----
  let yearFounded = '';
  if (d.founded_year || d.launch_date || d.founding_date) {
    const raw = String(d.founded_year || d.launch_date || d.founding_date);
    const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) yearFounded = yearMatch[0];
  }

  // ---- Extract valuation ----
  const valuation = d.valuation || d.last_valuation || 0;
  const valuationFormatted = formatCurrency(valuation);

  // ---- Build the mapped schema object ----
  return {
    // ============ OVERVIEW ============
    overview: {
      companyName: d.name || '',
      elevatorPitch: d.tagline || d.short_description || d.description || '',
      yearFounded,
      hqCity,
      hqCountry,
      sector: primarySector,
      subSector,
      stage,
      employeeCount: teamSize,
      websiteUrl: d.website || d.url || '',
      linkedinUrl: d.linkedin_url || '',
    },

    // ============ TEAM ============
    team: {
      totalTeamSize: teamSize,
      ceoName,
      ctoName,
      coFounders: founders.join(', '),
    },

    // ============ FINANCIAL ============
    financial: {
      totalRaised,
      lastRoundSize,
      lastRoundDate,
      lastValuation: valuationFormatted,
    },

    // ============ INVESTORS ============
    investors: {
      leadInvestor: investors[0] || '',
      allInvestors: investors.join(', '),
      investorReputation: investors.length > 0
        ? `${investors.length} known investor(s) on Dealroom`
        : '',
    },

    // ============ DEAL ============
    deal: {
      roundName: lastRoundType,
      targetRaise: lastRoundSize,
    },

    // ============ TRACTION ============
    traction: {
      // Dealroom sometimes provides revenue range data
      currentArr: d.revenue
        ? formatCurrency(d.revenue)
        : '',
    },
  };
}
