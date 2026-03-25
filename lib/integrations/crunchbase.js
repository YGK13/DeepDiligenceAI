// ============================================================================
// lib/integrations/crunchbase.js — Crunchbase API Integration for DueDrill
// ============================================================================
// Connects to the Crunchbase REST API (v4) to pull structured company data
// for VC due diligence. Supports both Basic (free tier) and Pro API keys.
//
// WHY Crunchbase? It's the industry-standard database for startup funding data.
// Every VC uses it. Having direct API access means DueDrill can auto-populate
// funding history, investor lists, employee counts, and company metadata
// without manual data entry — saving analysts 30-60 minutes per company.
//
// EXPORTS:
//   searchCompanies(query, apiKey) — fuzzy search by company name
//   getCompanyDetails(permalink, apiKey) — full company profile by permalink
//   mapToSchema(crunchbaseData) — transforms Crunchbase fields → DueDrill schema
//
// API DOCS: https://data.crunchbase.com/docs (requires account)
// BASE URL: https://api.crunchbase.com/api/v4/
// AUTH: user_key query parameter (Basic) or X-cb-user-key header (Pro)
// ============================================================================

// ============ API CONFIGURATION ============
// Crunchbase v4 API base URL — all endpoints are relative to this.
// The trailing slash is intentional so we can append paths directly.
const API_BASE = 'https://api.crunchbase.com/api/v4/';

// ============ REQUEST TIMEOUT ============
// Crunchbase can be slow under load. 15 seconds is generous but prevents
// the UI from hanging indefinitely if their API is having issues.
const REQUEST_TIMEOUT_MS = 15000;

// ============ EMPLOYEE COUNT MAPPING ============
// Crunchbase returns employee counts as enum strings (e.g., "c_00051_00100").
// We map these to human-readable ranges for the DueDrill schema.
// These enums are documented in the Crunchbase API reference.
const EMPLOYEE_ENUM_MAP = {
  'c_00001_00010': '1-10',
  'c_00011_00050': '11-50',
  'c_00051_00100': '51-100',
  'c_00101_00250': '101-250',
  'c_00251_00500': '251-500',
  'c_00501_01000': '501-1,000',
  'c_01001_05000': '1,001-5,000',
  'c_05001_10000': '5,001-10,000',
  'c_10001_max': '10,000+',
};

// ============ FUNDING TYPE → STAGE MAPPING ============
// Crunchbase last_funding_type values mapped to DueDrill's stage field.
// This lets us auto-detect the company's current funding stage.
const FUNDING_TYPE_TO_STAGE = {
  'angel': 'Pre-Seed',
  'pre_seed': 'Pre-Seed',
  'seed': 'Seed',
  'series_a': 'Series A',
  'series_b': 'Series B',
  'series_c': 'Series C',
  'series_d': 'Series D+',
  'series_e': 'Series D+',
  'series_f': 'Series D+',
  'series_g': 'Series D+',
  'series_h': 'Series D+',
  'private_equity': 'Growth',
  'corporate_round': 'Growth',
  'ipo': 'Pre-IPO',
  'post_ipo_equity': 'Pre-IPO',
  'post_ipo_debt': 'Pre-IPO',
  'grant': 'Pre-Seed',
  'convertible_note': 'Seed',
  'debt_financing': 'Growth',
};

// ============ REVENUE RANGE MAPPING ============
// Crunchbase revenue_range enums → human-readable strings for DueDrill.
const REVENUE_RANGE_MAP = {
  'r_00000000': 'Less than $1M',
  'r_00001000': '$1M - $10M',
  'r_00010000': '$10M - $50M',
  'r_00050000': '$50M - $100M',
  'r_00100000': '$100M - $500M',
  'r_00500000': '$500M - $1B',
  'r_01000000': '$1B - $10B',
  'r_10000000': '$10B+',
};

// ============ HELPER: Build Request with Timeout ============
// Wraps fetch with an AbortController timeout so we don't hang forever
// if Crunchbase is unresponsive. Returns the raw Response object.
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
// Crunchbase returns different HTTP codes for different problems.
// We translate these into clear, actionable error messages for the UI.
function handleApiError(status, statusText, endpoint) {
  switch (status) {
    case 401:
      throw new Error(
        'Crunchbase API key is invalid or expired. ' +
        'Check your key at https://data.crunchbase.com/docs/using-the-api'
      );
    case 403:
      throw new Error(
        'Crunchbase API rate limit exceeded or insufficient permissions. ' +
        'Free tier allows 200 requests/minute. Wait and retry, or upgrade your plan.'
      );
    case 404:
      throw new Error(
        `Company not found on Crunchbase (endpoint: ${endpoint}). ` +
        'Verify the company name or permalink is correct.'
      );
    case 429:
      throw new Error(
        'Crunchbase rate limit hit (429). Too many requests in a short window. ' +
        'Wait 60 seconds before retrying.'
      );
    case 500:
    case 502:
    case 503:
      throw new Error(
        `Crunchbase API server error (${status}). Their service may be temporarily down. ` +
        'Try again in a few minutes.'
      );
    default:
      throw new Error(
        `Crunchbase API error: ${status} ${statusText} on ${endpoint}`
      );
  }
}

// ============ HELPER: Format Currency ============
// Turns raw numbers into readable dollar strings (e.g., 15000000 → "$15M").
// Used for funding_total and other monetary fields.
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
// Searches Crunchbase for companies matching the given name query.
// Returns an array of simplified result objects for display in the UI.
//
// Crunchbase's autocomplete endpoint is fast and returns the most relevant
// matches first — perfect for a search-as-you-type UI.
//
// Returns: Array of { id, name, permalink, description, location, logoUrl }
export async function searchCompanies(query, apiKey) {
  // ---- Validate inputs ----
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Search query is required and must be a non-empty string.');
  }
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Crunchbase API key is required. Get one at https://data.crunchbase.com/');
  }

  const trimmedQuery = query.trim();

  // ---- Build the autocomplete URL ----
  // The autocomplete endpoint is the fastest way to search — it's what
  // Crunchbase's own search bar uses. Returns up to 25 results by default.
  const endpoint = 'autocompletes';
  const url = new URL(endpoint, API_BASE);
  url.searchParams.set('query', trimmedQuery);
  url.searchParams.set('collection_ids', 'organizations'); // only companies, not people/funding rounds
  url.searchParams.set('limit', '10'); // 10 results is enough for a dropdown
  url.searchParams.set('user_key', apiKey);

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-cb-user-key': apiKey, // Pro API uses header auth
      },
    });

    // ---- Handle HTTP errors ----
    if (!response.ok) {
      handleApiError(response.status, response.statusText, endpoint);
    }

    const data = await response.json();

    // ---- Transform results into a clean, UI-friendly format ----
    // Crunchbase autocomplete returns entities with different shapes
    // depending on the entity type. We normalize to a flat object.
    const results = (data.entities || []).map((entity) => {
      const props = entity.properties || {};
      const id = entity.uuid || props.identifier?.uuid || '';
      const permalink = props.identifier?.permalink || props.permalink || '';

      return {
        id,
        name: props.identifier?.value || props.name || props.short_description || '',
        permalink,
        description: props.short_description || '',
        location: props.location_identifiers
          ? props.location_identifiers.map((loc) => loc.value).join(', ')
          : '',
        logoUrl: props.identifier?.image_id
          ? `https://images.crunchbase.com/image/upload/c_pad,h_60,w_60/${props.identifier.image_id}`
          : '',
        // Source tag so the UI knows which integration this came from
        source: 'crunchbase',
      };
    });

    return results;
  } catch (err) {
    // ---- Handle network/timeout errors separately ----
    if (err.name === 'AbortError') {
      throw new Error(
        'Crunchbase API request timed out after 15 seconds. ' +
        'Check your internet connection or try again.'
      );
    }
    // Re-throw our own errors (from handleApiError) as-is
    throw err;
  }
}

// ============================================================================
// getCompanyDetails(permalink, apiKey)
// ============================================================================
// Fetches the full company profile from Crunchbase using the company's
// permalink (URL slug). Returns the raw Crunchbase data object.
//
// The permalink is the unique identifier in Crunchbase URLs, e.g.:
//   https://www.crunchbase.com/organization/stripe → permalink = "stripe"
//
// We request specific field_ids to minimize response size and avoid
// hitting the rate limit on large responses.
export async function getCompanyDetails(permalink, apiKey) {
  // ---- Validate inputs ----
  if (!permalink || typeof permalink !== 'string') {
    throw new Error('Company permalink is required (e.g., "stripe", "openai").');
  }
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Crunchbase API key is required.');
  }

  const cleanPermalink = permalink.trim().toLowerCase();

  // ---- Build the organization lookup URL ----
  // We specify exactly which fields we want via field_ids to keep the
  // response lean. Without this, Crunchbase returns EVERYTHING — hundreds
  // of fields we don't need, which slows down the response.
  const endpoint = `entities/organizations/${cleanPermalink}`;
  const url = new URL(endpoint, API_BASE);
  url.searchParams.set('user_key', apiKey);

  // These are the fields we actually map to the DueDrill schema.
  // Requesting only what we need keeps the response fast and under rate limits.
  const fieldIds = [
    'identifier',
    'short_description',
    'description',
    'founded_on',
    'location_identifiers',
    'categories',
    'category_groups',
    'num_employees_enum',
    'funding_total',
    'last_funding_type',
    'last_funding_at',
    'num_funding_rounds',
    'investor_identifiers',
    'revenue_range',
    'website_url',
    'linkedin',
    'contact_email',
    'ipo_status',
    'operating_status',
    'stock_exchange_symbol',
    'last_equity_funding_total',
    'num_investors',
    'num_lead_investors',
    'founder_identifiers',
  ].join(',');

  url.searchParams.set('field_ids', fieldIds);

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-cb-user-key': apiKey,
      },
    });

    // ---- Handle HTTP errors ----
    if (!response.ok) {
      handleApiError(response.status, response.statusText, endpoint);
    }

    const data = await response.json();

    // ---- Return the properties object ----
    // Crunchbase wraps the useful data in data.properties. We return the full
    // object so mapToSchema can work with it, but also attach the permalink
    // for linking back to the Crunchbase profile.
    return {
      ...data.properties,
      _permalink: cleanPermalink,
      _crunchbaseUrl: `https://www.crunchbase.com/organization/${cleanPermalink}`,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `Crunchbase request for "${cleanPermalink}" timed out. Try again.`
      );
    }
    throw err;
  }
}

// ============================================================================
// mapToSchema(crunchbaseData)
// ============================================================================
// Transforms raw Crunchbase API data into the DueDrill schema format.
// This is the critical mapping layer — it translates Crunchbase's field names
// and data structures into the exact field names used by schemas.js.
//
// The mapping covers:
//   - overview section (company identity, stage, sector, pitch)
//   - team section (employee count, founders)
//   - financial section (total raised, last round)
//   - traction section (revenue range → ARR estimate)
//   - investors section (investor names, lead investor)
//   - deal section (total raised, last funding type)
//
// Returns: { overview: {...}, team: {...}, financial: {...}, ... }
export function mapToSchema(crunchbaseData) {
  if (!crunchbaseData) {
    return {};
  }

  const d = crunchbaseData;

  // ---- Extract location data ----
  // Crunchbase stores locations as an array of location_identifiers,
  // each with a location_type (city, region, country). We pick the
  // most specific ones for hqCity and hqCountry.
  let hqCity = '';
  let hqCountry = '';
  if (Array.isArray(d.location_identifiers)) {
    const cityLoc = d.location_identifiers.find(
      (loc) => loc.location_type === 'city'
    );
    const countryLoc = d.location_identifiers.find(
      (loc) => loc.location_type === 'country'
    );
    const regionLoc = d.location_identifiers.find(
      (loc) => loc.location_type === 'region'
    );
    hqCity = cityLoc?.value || regionLoc?.value || '';
    hqCountry = countryLoc?.value || '';
  }

  // ---- Extract sector from categories ----
  // Crunchbase has a deep category taxonomy. We take the first category
  // as the primary sector. If it maps to one of DueDrill's SECTOR_OPTIONS,
  // great; if not, it still provides useful context.
  const categories = Array.isArray(d.categories)
    ? d.categories.map((c) => c.value || c.name || c).filter(Boolean)
    : [];
  const primarySector = categories[0] || '';

  // ---- Extract category groups for sub-sector ----
  const categoryGroups = Array.isArray(d.category_groups)
    ? d.category_groups.map((g) => g.value || g.name || g).filter(Boolean)
    : [];

  // ---- Map employee enum to readable string ----
  const employeeCount = EMPLOYEE_ENUM_MAP[d.num_employees_enum] || d.num_employees_enum || '';

  // ---- Map funding type to DueDrill stage ----
  const stage = FUNDING_TYPE_TO_STAGE[d.last_funding_type] || '';

  // ---- Extract investor names ----
  // investor_identifiers is an array of objects with a value (name) field.
  const investors = Array.isArray(d.investor_identifiers)
    ? d.investor_identifiers.map((inv) => inv.value || inv.name || '').filter(Boolean)
    : [];
  const leadInvestor = investors[0] || '';
  const allInvestors = investors.join(', ');

  // ---- Extract founder names ----
  const founders = Array.isArray(d.founder_identifiers)
    ? d.founder_identifiers.map((f) => f.value || f.name || '').filter(Boolean)
    : [];

  // ---- Format funding total ----
  const fundingTotal = d.funding_total?.value_usd || d.funding_total?.value || d.funding_total || 0;
  const totalRaisedFormatted = formatCurrency(fundingTotal);

  // ---- Format last equity funding ----
  const lastEquityTotal = d.last_equity_funding_total?.value_usd || d.last_equity_funding_total?.value || 0;
  const lastRoundFormatted = formatCurrency(lastEquityTotal);

  // ---- Map revenue range ----
  const revenueStr = REVENUE_RANGE_MAP[d.revenue_range] || d.revenue_range || '';

  // ---- Extract year founded ----
  const yearFounded = d.founded_on ? d.founded_on.substring(0, 4) : '';

  // ---- Build the mapped schema object ----
  // Each key here matches a section in schemas.js exactly.
  return {
    // ============ OVERVIEW ============
    overview: {
      elevatorPitch: d.short_description || '',
      yearFounded,
      hqCity,
      hqCountry,
      sector: primarySector,
      subSector: categoryGroups.join(', '),
      stage,
      employeeCount,
      websiteUrl: d.website_url?.value || d.website_url || '',
      linkedinUrl: d.linkedin?.value || d.linkedin || '',
      crunchbaseUrl: d._crunchbaseUrl || '',
      oneLineSummary: d.short_description
        ? d.short_description.substring(0, 100)
        : '',
    },

    // ============ TEAM ============
    team: {
      totalTeamSize: employeeCount,
      // Crunchbase doesn't break down engineering vs. total, so we leave
      // engineeringTeamSize empty — the user or AI auto-fill can populate it.
      coFounders: founders.join(', '),
      // If we have founders, set the first as CEO (common assumption for startups).
      // The user can correct this if needed.
      ceoName: founders[0] || '',
    },

    // ============ FINANCIAL ============
    financial: {
      totalRaised: totalRaisedFormatted,
      lastRoundSize: lastRoundFormatted,
      lastRoundDate: d.last_funding_at || '',
    },

    // ============ TRACTION ============
    // Revenue range is the closest Crunchbase has to ARR data.
    // It's a rough bucket, not an exact number — but still valuable context.
    traction: {
      currentArr: revenueStr,
    },

    // ============ INVESTORS ============
    investors: {
      leadInvestor,
      allInvestors,
      investorReputation: investors.length > 0
        ? `${investors.length} known investor(s) on Crunchbase`
        : '',
    },

    // ============ DEAL ============
    // Map funding data into the deal section for context on current round.
    deal: {
      targetRaise: totalRaisedFormatted, // Total raised as context
      instrumentType: d.last_funding_type
        ? d.last_funding_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '',
    },
  };
}
