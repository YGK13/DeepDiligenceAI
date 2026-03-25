// ============================================================================
// lib/integrations/index.js — Integration Registry & Unified Interface
// ============================================================================
// Central hub for all third-party data integrations in DueDrill.
// Provides a unified API so the rest of the app doesn't need to know
// which integration is being used — it just calls importFromIntegration()
// or getCompanyFromIntegration() with an integration ID.
//
// This module serves three purposes:
//   1. REGISTRY: Metadata about each integration (name, icon, description,
//      whether it needs an API key, docs URL, etc.) — used by the UI to
//      render integration cards.
//   2. UNIFIED SEARCH: importFromIntegration() dispatches to the correct
//      integration's searchCompanies() function.
//   3. UNIFIED IMPORT: getCompanyFromIntegration() dispatches to the correct
//      integration's getCompanyDetails() + mapToSchema() pipeline.
//
// ADDING A NEW INTEGRATION:
//   1. Create lib/integrations/newprovider.js with searchCompanies,
//      getCompanyDetails, and mapToSchema exports
//   2. Add an entry to the INTEGRATIONS object below
//   3. Add the import and case statement in the switch blocks
//   That's it — the API routes and UI pick it up automatically.
//
// EXPORTS:
//   INTEGRATIONS — metadata object for all integrations
//   importFromIntegration(integrationId, query, apiKey) — unified search
//   getCompanyFromIntegration(integrationId, companyId, apiKey) — unified import
// ============================================================================

import * as crunchbase from './crunchbase';
import * as pitchbook from './pitchbook';
import * as dealroom from './dealroom';
import * as opencorporates from './opencorporates';

// ============================================================================
// INTEGRATIONS — Registry of All Available Integrations
// ============================================================================
// Each integration has metadata the UI uses to render cards, show connection
// status, and guide the user to docs. The id field is the key used throughout
// the app to identify which integration we're talking about.
//
// Fields:
//   id               — unique slug, used as lookup key everywhere
//   name             — human-readable display name
//   icon             — emoji icon for the card header (kept simple intentionally —
//                      real logos would require image assets and licensing)
//   description      — one-liner explaining what data this integration provides
//   requiresApiKey   — whether the integration needs an API key to function
//   apiKeyPlaceholder — hint text for the API key input field
//   docsUrl          — link to the provider's API documentation
//   freeTier         — whether there's a free tier available
//   dataFocus        — what TYPE of data this integration is best for
//   importType       — 'api' (live search) or 'file' (CSV/PDF upload)
export const INTEGRATIONS = {
  // ============ CRUNCHBASE ============
  crunchbase: {
    id: 'crunchbase',
    name: 'Crunchbase',
    icon: '🔷',
    description: 'Startup funding data, investor lists, and company profiles from the industry-standard VC database.',
    requiresApiKey: true,
    apiKeyPlaceholder: 'Enter your Crunchbase API key (Basic or Pro)',
    docsUrl: 'https://data.crunchbase.com/docs',
    freeTier: true,
    dataFocus: 'Funding history, investors, company metadata',
    importType: 'api',
  },

  // ============ PITCHBOOK ============
  pitchbook: {
    id: 'pitchbook',
    name: 'PitchBook',
    icon: '📊',
    description: 'Import company data from PitchBook CSV exports or PDF tearsheets. No API — upload your export files.',
    requiresApiKey: false,
    apiKeyPlaceholder: '',
    docsUrl: 'https://pitchbook.com/data',
    freeTier: false,
    dataFocus: 'Comprehensive VC data, valuations, deal terms',
    importType: 'file', // PitchBook has no API — file upload only
  },

  // ============ DEALROOM ============
  dealroom: {
    id: 'dealroom',
    name: 'Dealroom',
    icon: '🇪🇺',
    description: 'European & Israeli startup data, growth signals, and ecosystem intelligence from Dealroom.co.',
    requiresApiKey: true,
    apiKeyPlaceholder: 'Enter your Dealroom API key',
    docsUrl: 'https://developer.dealroom.co/',
    freeTier: false,
    dataFocus: 'European startups, growth stages, team data',
    importType: 'api',
  },

  // ============ OPENCORPORATES ============
  opencorporates: {
    id: 'opencorporates',
    name: 'OpenCorporates',
    icon: '🏛️',
    description: 'Official corporate registry data from 140+ jurisdictions. Free for basic searches — great for legal DD.',
    requiresApiKey: false,
    apiKeyPlaceholder: 'Optional API token (increases rate limits)',
    docsUrl: 'https://api.opencorporates.com/documentation',
    freeTier: true,
    dataFocus: 'Legal entity verification, officers, filings',
    importType: 'api',
  },
};

// ============ HELPER: Get Integration Module ============
// Returns the actual integration module (with searchCompanies, getCompanyDetails,
// mapToSchema functions) for a given integration ID. Throws if the ID is invalid.
function getIntegrationModule(integrationId) {
  switch (integrationId) {
    case 'crunchbase':
      return crunchbase;
    case 'pitchbook':
      return pitchbook;
    case 'dealroom':
      return dealroom;
    case 'opencorporates':
      return opencorporates;
    default:
      throw new Error(
        `Unknown integration: "${integrationId}". ` +
        `Valid options: ${Object.keys(INTEGRATIONS).join(', ')}`
      );
  }
}

// ============================================================================
// importFromIntegration(integrationId, query, apiKey)
// ============================================================================
// Unified search interface. Dispatches to the correct integration's
// searchCompanies() function based on the integration ID.
//
// WHY a unified interface? So the API route and UI component don't need
// a bunch of if/else statements — they just call this one function.
//
// Parameters:
//   integrationId — 'crunchbase', 'dealroom', 'opencorporates'
//   query         — company name to search for
//   apiKey        — API key (optional for opencorporates)
//
// Returns: Array of search results (shape depends on integration)
//
// NOTE: PitchBook is excluded from search because it has no API.
// PitchBook data comes in via CSV/PDF upload, not search.
export async function importFromIntegration(integrationId, query, apiKey) {
  // ---- Validate the integration exists ----
  if (!INTEGRATIONS[integrationId]) {
    throw new Error(
      `Unknown integration: "${integrationId}". ` +
      `Valid options: ${Object.keys(INTEGRATIONS).join(', ')}`
    );
  }

  // ---- PitchBook doesn't support search — it's file-upload only ----
  if (integrationId === 'pitchbook') {
    throw new Error(
      'PitchBook does not support API search. ' +
      'Use the CSV upload feature to import PitchBook data.'
    );
  }

  // ---- Check API key requirement ----
  const meta = INTEGRATIONS[integrationId];
  if (meta.requiresApiKey && (!apiKey || !apiKey.trim())) {
    throw new Error(
      `${meta.name} requires an API key. ` +
      `Get one at ${meta.docsUrl}`
    );
  }

  // ---- Dispatch to the correct integration ----
  const mod = getIntegrationModule(integrationId);

  // All integration modules export searchCompanies(query, apiKey)
  // OpenCorporates apiKey is optional, so passing empty string is fine.
  const results = await mod.searchCompanies(query, apiKey || '');

  return results;
}

// ============================================================================
// getCompanyFromIntegration(integrationId, companyId, apiKey)
// ============================================================================
// Unified company import interface. Fetches the full company profile from
// the specified integration, maps it to the DueDrill schema, and returns
// the mapped data ready to merge into the company object.
//
// Parameters:
//   integrationId — 'crunchbase', 'dealroom', 'opencorporates'
//   companyId     — the integration-specific company identifier:
//                     - Crunchbase: permalink string (e.g., "stripe")
//                     - Dealroom: numeric ID string (e.g., "123456")
//                     - OpenCorporates: "jurisdictionCode/companyNumber" (e.g., "us_de/12345")
//   apiKey        — API key (optional for opencorporates)
//
// Returns: { overview: {...}, team: {...}, financial: {...}, ... }
//          (DueDrill schema format, ready to merge)
export async function getCompanyFromIntegration(integrationId, companyId, apiKey) {
  // ---- Validate the integration exists ----
  if (!INTEGRATIONS[integrationId]) {
    throw new Error(
      `Unknown integration: "${integrationId}". ` +
      `Valid options: ${Object.keys(INTEGRATIONS).join(', ')}`
    );
  }

  // ---- PitchBook doesn't support API fetch ----
  if (integrationId === 'pitchbook') {
    throw new Error(
      'PitchBook does not support API fetching. ' +
      'Use parsePitchBookExport() or parsePitchBookPDF() for file imports.'
    );
  }

  // ---- Check API key requirement ----
  const meta = INTEGRATIONS[integrationId];
  if (meta.requiresApiKey && (!apiKey || !apiKey.trim())) {
    throw new Error(
      `${meta.name} requires an API key. ` +
      `Get one at ${meta.docsUrl}`
    );
  }

  // ---- Fetch raw data from the integration ----
  const mod = getIntegrationModule(integrationId);
  let rawData;

  if (integrationId === 'opencorporates') {
    // OpenCorporates uses jurisdiction/companyNumber as compound ID
    // The search results return id as "jurisdiction/number"
    const parts = String(companyId).split('/');
    if (parts.length < 2) {
      throw new Error(
        'OpenCorporates company ID must be in format "jurisdictionCode/companyNumber" ' +
        '(e.g., "us_de/12345678").'
      );
    }
    const jurisdictionCode = parts[0];
    const companyNumber = parts.slice(1).join('/'); // handle numbers with slashes
    rawData = await mod.getCompanyDetails(jurisdictionCode, companyNumber, apiKey || '');
  } else {
    // Crunchbase and Dealroom use a single ID (permalink or numeric)
    rawData = await mod.getCompanyDetails(companyId, apiKey);
  }

  // ---- Map to DueDrill schema ----
  const mappedData = mod.mapToSchema(rawData);

  // ---- Add metadata about the import source ----
  // This lets the UI show where the data came from and link back to the source.
  mappedData._source = {
    integration: integrationId,
    integrationName: meta.name,
    companyId,
    importedAt: new Date().toISOString(),
    sourceUrl: rawData._crunchbaseUrl || rawData._dealroomUrl || rawData._opencorporatesUrl || '',
  };

  return mappedData;
}

// ============================================================================
// Re-export PitchBook parsers for direct use by the CSV upload handler
// ============================================================================
// The UI needs direct access to these for file upload processing.
// They don't go through the unified interface because they're not API-based.
export const {
  parsePitchBookExport,
  mapPitchBookToSchema,
  parsePitchBookPDF,
} = pitchbook;
