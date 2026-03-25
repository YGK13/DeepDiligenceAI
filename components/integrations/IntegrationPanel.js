'use client';

// ============================================================================
// components/integrations/IntegrationPanel.js — Third-Party Data Import Panel
// ============================================================================
// The UI for importing company data from external VC databases (Crunchbase,
// PitchBook, Dealroom, OpenCorporates) into DueDrill.
//
// This panel complements the AI Research Panel — while AI auto-fill uses LLMs
// to research companies, this panel pulls STRUCTURED data directly from
// professional databases. The data is more reliable (it comes from curated
// sources) but less comprehensive (limited to what each database tracks).
//
// Flow:
//   1. User sees integration cards (Crunchbase, PitchBook, etc.)
//   2. Clicks on one → search bar appears (or CSV upload for PitchBook)
//   3. Types company name → sees search results
//   4. Clicks "Import" on a result → full profile is fetched and mapped
//   5. Mapped data merges into the current company (same as AI auto-fill)
//
// Props:
//   company      — current company data object (for context)
//   settings     — app settings (contains stored API keys)
//   onAutoFill   — callback(sectionId, fieldData) to populate form fields
//                   (same callback used by AIResearchPanel)
//
// Dark theme: #1e2130 (bg), #2d3148 (border), #e8e9ed (text),
//             #4a7dff (accent blue), #34d399 (success green)
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';

// ============ INTEGRATION METADATA ============
// Defined inline to avoid server/client module boundary issues.
// This matches the INTEGRATIONS registry in lib/integrations/index.js.
const INTEGRATIONS = {
  crunchbase: {
    id: 'crunchbase',
    name: 'Crunchbase',
    icon: '🔷',
    description: 'Startup funding data, investor lists, and company profiles.',
    requiresApiKey: true,
    apiKeyPlaceholder: 'Crunchbase API key',
    docsUrl: 'https://data.crunchbase.com/docs',
    freeTier: true,
    importType: 'api',
  },
  pitchbook: {
    id: 'pitchbook',
    name: 'PitchBook',
    icon: '📊',
    description: 'Import from PitchBook CSV exports or PDF tearsheets.',
    requiresApiKey: false,
    apiKeyPlaceholder: '',
    docsUrl: 'https://pitchbook.com/data',
    freeTier: false,
    importType: 'file',
  },
  dealroom: {
    id: 'dealroom',
    name: 'Dealroom',
    icon: '🇪🇺',
    description: 'European & Israeli startup data and growth intelligence.',
    requiresApiKey: true,
    apiKeyPlaceholder: 'Dealroom API key',
    docsUrl: 'https://developer.dealroom.co/',
    freeTier: false,
    importType: 'api',
  },
  opencorporates: {
    id: 'opencorporates',
    name: 'OpenCorporates',
    icon: '🏛️',
    description: 'Official corporate registry data from 140+ jurisdictions. Free.',
    requiresApiKey: false,
    apiKeyPlaceholder: 'Optional API token (increases rate limits)',
    docsUrl: 'https://api.opencorporates.com/documentation',
    freeTier: true,
    importType: 'api',
  },
};

// ============ COMPONENT ============
export default function IntegrationPanel({ company, settings, onAutoFill }) {
  // ============ LOCAL STATE ============
  const [activeIntegration, setActiveIntegration] = useState(null); // which integration card is expanded
  const [searchQuery, setSearchQuery] = useState('');              // current search input
  const [searchResults, setSearchResults] = useState([]);           // results from search API
  const [isSearching, setIsSearching] = useState(false);           // loading state for search
  const [isImporting, setIsImporting] = useState(false);           // loading state for import
  const [importingId, setImportingId] = useState(null);            // which result is being imported
  const [error, setError] = useState('');                           // error message
  const [successMessage, setSuccessMessage] = useState('');        // success feedback
  const [apiKeyOverrides, setApiKeyOverrides] = useState({});       // per-integration API key overrides
  const fileInputRef = useRef(null);                                // ref for PitchBook file upload

  // ============ DERIVE API KEY ============
  // Check both the settings (persisted keys) and local overrides (session keys).
  // Local overrides take precedence — useful for trying a key without saving it.
  const getApiKey = useCallback((integrationId) => {
    // Check local override first
    if (apiKeyOverrides[integrationId]) return apiKeyOverrides[integrationId];
    // Check settings.apiKeys (where saved keys live)
    if (settings?.apiKeys?.[integrationId]) return settings.apiKeys[integrationId];
    // Check settings.integrationKeys (alternate location)
    if (settings?.integrationKeys?.[integrationId]) return settings.integrationKeys[integrationId];
    return '';
  }, [apiKeyOverrides, settings]);

  // ============ CHECK IF CONNECTED ============
  // An integration is "connected" if it has an API key set (or doesn't need one).
  const isConnected = useCallback((integrationId) => {
    const meta = INTEGRATIONS[integrationId];
    if (!meta) return false;
    if (!meta.requiresApiKey) return true; // OpenCorporates, PitchBook don't need keys
    return !!getApiKey(integrationId);
  }, [getApiKey]);

  // ============ HANDLE CARD CLICK ============
  // Expand/collapse integration card. Clear previous state when switching.
  const handleCardClick = useCallback((integrationId) => {
    if (activeIntegration === integrationId) {
      // Collapse if clicking the active card
      setActiveIntegration(null);
    } else {
      // Expand new card, clear previous search state
      setActiveIntegration(integrationId);
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setSuccessMessage('');
    }
  }, [activeIntegration]);

  // ============ HANDLE SEARCH ============
  // Calls /api/integrations/search with the active integration and query.
  const handleSearch = useCallback(async () => {
    if (!activeIntegration || !searchQuery.trim()) return;

    const meta = INTEGRATIONS[activeIntegration];
    if (!meta || meta.importType !== 'api') return;

    setError('');
    setSuccessMessage('');
    setSearchResults([]);
    setIsSearching(true);

    try {
      const response = await fetch('/api/integrations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration: activeIntegration,
          query: searchQuery.trim(),
          apiKey: getApiKey(activeIntegration),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Search failed with status ${response.status}`);
      }

      setSearchResults(data.results || []);

      if ((data.results || []).length === 0) {
        setError(`No results found for "${searchQuery.trim()}" on ${meta.name}.`);
      }
    } catch (err) {
      setError(err.message || 'Search failed. Check your connection and API key.');
    } finally {
      setIsSearching(false);
    }
  }, [activeIntegration, searchQuery, getApiKey]);

  // ============ HANDLE IMPORT ============
  // Fetches full company data from the integration and passes it to onAutoFill.
  const handleImport = useCallback(async (result) => {
    if (!activeIntegration || !result) return;

    setError('');
    setSuccessMessage('');
    setIsImporting(true);
    setImportingId(result.id);

    try {
      const response = await fetch('/api/integrations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration: activeIntegration,
          companyId: result.permalink || result.id,
          apiKey: getApiKey(activeIntegration),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Import failed with status ${response.status}`);
      }

      // ---- Merge imported data into company fields ----
      // We call onAutoFill for EACH section that has data, just like the
      // AI auto-fill does. This means the parent component handles the
      // merge logic consistently regardless of data source.
      if (onAutoFill && data.data) {
        const mappedData = data.data;
        let fieldsImported = 0;

        for (const [sectionId, sectionData] of Object.entries(mappedData)) {
          // Skip metadata fields
          if (sectionId.startsWith('_')) continue;
          if (typeof sectionData !== 'object' || sectionData === null) continue;

          // Only call onAutoFill if the section has non-empty values
          const hasData = Object.values(sectionData).some(
            (v) => v !== '' && v !== null && v !== undefined && v !== 0
          );

          if (hasData) {
            onAutoFill(sectionId, sectionData);
            fieldsImported += Object.values(sectionData).filter(
              (v) => v !== '' && v !== null && v !== undefined && v !== 0
            ).length;
          }
        }

        const sourceName = INTEGRATIONS[activeIntegration]?.name || activeIntegration;
        setSuccessMessage(
          `Imported ${fieldsImported} field(s) from ${sourceName} for "${result.name}"`
        );
      }
    } catch (err) {
      setError(err.message || 'Import failed. Check your connection and API key.');
    } finally {
      setIsImporting(false);
      setImportingId(null);
    }
  }, [activeIntegration, getApiKey, onAutoFill]);

  // ============ HANDLE PITCHBOOK CSV UPLOAD ============
  // Reads a CSV file, sends the content to the client-side parser,
  // and merges the results using onAutoFill.
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccessMessage('');
    setIsImporting(true);

    try {
      // ---- Read file content ----
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      if (!text || text.trim().length === 0) {
        throw new Error('File is empty. Select a valid PitchBook CSV or text export.');
      }

      // ---- Dynamically import the PitchBook parser ----
      // We use dynamic import to avoid bundling the parser in the main chunk.
      // It's only needed when the user actually uploads a PitchBook file.
      const { parsePitchBookExport, mapPitchBookToSchema, parsePitchBookPDF } =
        await import('@/lib/integrations/pitchbook');

      let mappedData;

      // ---- Determine file type and parse accordingly ----
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
        // CSV export from PitchBook
        const parsed = parsePitchBookExport(text);
        mappedData = mapPitchBookToSchema(parsed);
      } else {
        // Assume it's extracted PDF text (the user ran pdf-to-text already)
        mappedData = parsePitchBookPDF(text);
      }

      // ---- Merge imported data into company fields ----
      if (onAutoFill && mappedData) {
        let fieldsImported = 0;

        for (const [sectionId, sectionData] of Object.entries(mappedData)) {
          if (sectionId.startsWith('_')) continue;
          if (typeof sectionData !== 'object' || sectionData === null) continue;

          const hasData = Object.values(sectionData).some(
            (v) => v !== '' && v !== null && v !== undefined && v !== 0
          );

          if (hasData) {
            onAutoFill(sectionId, sectionData);
            fieldsImported += Object.values(sectionData).filter(
              (v) => v !== '' && v !== null && v !== undefined && v !== 0
            ).length;
          }
        }

        setSuccessMessage(
          `Imported ${fieldsImported} field(s) from PitchBook file "${file.name}"`
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to parse PitchBook file. Check the file format.');
    } finally {
      setIsImporting(false);
      // Reset file input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onAutoFill]);

  // ============ HANDLE KEY PRESS ============
  // Enter key triggers search
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  }, [handleSearch, isSearching]);

  // ============ RENDER ============
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-4 mb-4">
      {/* ============ PANEL HEADER ============ */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔌</span>
          <h3 className="text-[#e8e9ed] font-semibold text-sm">
            Data Integrations
          </h3>
        </div>
        <span className="text-[#6b7084] text-xs">
          Import from VC databases
        </span>
      </div>

      {/* ============ INTEGRATION CARDS GRID ============ */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {Object.values(INTEGRATIONS).map((meta) => {
          const connected = isConnected(meta.id);
          const isActive = activeIntegration === meta.id;

          return (
            <button
              key={meta.id}
              onClick={() => handleCardClick(meta.id)}
              className={
                'flex flex-col items-start p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left ' +
                (isActive
                  ? 'bg-[#4a7dff]/10 border-[#4a7dff]/50'
                  : 'bg-[#252836] border-[#2d3148] hover:border-[#4a7dff]/30 hover:bg-[#2a2f42]')
              }
            >
              {/* Card header: icon + name + badge */}
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{meta.icon}</span>
                  <span className="text-[#e8e9ed] text-xs font-semibold">
                    {meta.name}
                  </span>
                </div>
                {/* Connection badge */}
                {connected && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#34d399] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                    {meta.requiresApiKey ? 'Connected' : 'Free'}
                  </span>
                )}
                {!connected && meta.requiresApiKey && (
                  <span className="text-[10px] text-[#f59e0b] font-medium">
                    Key needed
                  </span>
                )}
              </div>
              {/* Card description */}
              <p className="text-[#6b7084] text-[10px] leading-snug">
                {meta.description}
              </p>
              {/* Free tier badge */}
              {meta.freeTier && (
                <span className="mt-1.5 inline-flex text-[9px] font-medium text-[#34d399]/80 bg-[#34d399]/10 rounded px-1.5 py-0.5">
                  Free tier available
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============ EXPANDED INTEGRATION PANEL ============ */}
      {activeIntegration && INTEGRATIONS[activeIntegration] && (
        <div className="mt-3 pt-3 border-t border-[#2d3148]">
          {/* ---- API Key Input (if needed and not connected) ---- */}
          {INTEGRATIONS[activeIntegration].requiresApiKey && !isConnected(activeIntegration) && (
            <div className="mb-3">
              <label className="block text-[#9ca0b0] text-xs font-medium mb-1">
                {INTEGRATIONS[activeIntegration].name} API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyOverrides[activeIntegration] || ''}
                  onChange={(e) =>
                    setApiKeyOverrides((prev) => ({
                      ...prev,
                      [activeIntegration]: e.target.value,
                    }))
                  }
                  placeholder={INTEGRATIONS[activeIntegration].apiKeyPlaceholder}
                  className={
                    'flex-1 bg-[#252836] border border-[#2d3148] text-[#e8e9ed] ' +
                    'rounded-md text-xs px-3 py-2 ' +
                    'focus:border-[#4a7dff] outline-none transition-colors ' +
                    'placeholder:text-[#6b7084]'
                  }
                />
                <a
                  href={INTEGRATIONS[activeIntegration].docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4a7dff] text-xs hover:underline flex items-center whitespace-nowrap px-2"
                >
                  Get key
                </a>
              </div>
            </div>
          )}

          {/* ---- SEARCH INPUT (for API-based integrations) ---- */}
          {INTEGRATIONS[activeIntegration].importType === 'api' && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${INTEGRATIONS[activeIntegration].name} for a company...`}
                disabled={isSearching || isImporting}
                className={
                  'flex-1 bg-[#252836] border border-[#2d3148] text-[#e8e9ed] ' +
                  'rounded-md text-sm px-3 py-2 ' +
                  'focus:border-[#4a7dff] outline-none transition-colors ' +
                  'placeholder:text-[#6b7084]'
                }
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || isImporting || !searchQuery.trim()}
                className={
                  'inline-flex items-center justify-center gap-1.5 ' +
                  'font-semibold rounded-md border border-transparent ' +
                  'py-2 px-4 text-sm transition-all duration-200 cursor-pointer whitespace-nowrap ' +
                  (isSearching || isImporting || !searchQuery.trim()
                    ? 'bg-[#4a7dff]/30 text-white/50 cursor-not-allowed'
                    : 'bg-[#4a7dff] text-white hover:bg-[#3d6ee0] active:bg-[#3360cc]')
                }
              >
                {isSearching ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          )}

          {/* ---- FILE UPLOAD (for PitchBook) ---- */}
          {INTEGRATIONS[activeIntegration].importType === 'file' && (
            <div className="mb-3">
              <p className="text-[#9ca0b0] text-xs mb-2">
                Upload a PitchBook CSV export or extracted PDF text file.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="hidden"
                  id="pitchbook-upload"
                />
                <label
                  htmlFor="pitchbook-upload"
                  className={
                    'inline-flex items-center justify-center gap-1.5 ' +
                    'font-semibold rounded-md border border-[#2d3148] ' +
                    'py-2.5 px-5 text-sm transition-all duration-200 cursor-pointer ' +
                    (isImporting
                      ? 'bg-[#252836] text-[#6b7084] cursor-not-allowed'
                      : 'bg-[#252836] text-[#e8e9ed] hover:bg-[#2a2f42] hover:border-[#4a7dff]')
                  }
                >
                  {isImporting ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#4a7dff] animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>📁 Upload CSV / Text</>
                  )}
                </label>
                <span className="text-[#6b7084] text-[10px]">
                  .csv, .tsv, or .txt files
                </span>
              </div>
            </div>
          )}

          {/* ---- SEARCH RESULTS ---- */}
          {searchResults.length > 0 && (
            <div className="mb-3">
              <p className="text-[#9ca0b0] text-xs font-medium mb-2">
                {searchResults.length} result(s) found
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {searchResults.map((result) => {
                  const isThisImporting = isImporting && importingId === result.id;

                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2.5 bg-[#252836] border border-[#2d3148] rounded-md hover:border-[#4a7dff]/30 transition-colors"
                    >
                      {/* Result info */}
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          {/* Logo thumbnail (if available) */}
                          {result.logoUrl && (
                            <img
                              src={result.logoUrl}
                              alt=""
                              className="w-6 h-6 rounded object-contain bg-white/10 flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <p className="text-[#e8e9ed] text-sm font-medium truncate">
                            {result.name}
                          </p>
                        </div>
                        {result.description && (
                          <p className="text-[#6b7084] text-[11px] truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                        {result.location && (
                          <p className="text-[#6b7084] text-[10px] mt-0.5">
                            📍 {result.location}
                          </p>
                        )}
                      </div>

                      {/* Import button */}
                      <button
                        onClick={() => handleImport(result)}
                        disabled={isImporting}
                        className={
                          'inline-flex items-center gap-1 ' +
                          'font-semibold rounded-md text-xs py-1.5 px-3 ' +
                          'transition-all duration-200 cursor-pointer flex-shrink-0 ' +
                          (isImporting
                            ? 'bg-[#34d399]/20 text-[#34d399]/50 cursor-not-allowed'
                            : 'bg-[#34d399]/20 text-[#34d399] hover:bg-[#34d399]/30 active:bg-[#34d399]/40')
                        }
                      >
                        {isThisImporting ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                            Importing...
                          </>
                        ) : (
                          <>⬇ Import</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- LOADING INDICATOR ---- */}
          {(isSearching || isImporting) && (
            <div className="mb-3">
              <div className="h-1 w-full bg-[#252836] rounded-full overflow-hidden">
                <div className="h-full bg-[#4a7dff] rounded-full animate-pulse w-2/3" />
              </div>
              <p className="text-[#6b7084] text-xs mt-2 text-center">
                {isSearching
                  ? `Searching ${INTEGRATIONS[activeIntegration].name}...`
                  : `Importing company data from ${INTEGRATIONS[activeIntegration].name}...`}
              </p>
            </div>
          )}

          {/* ---- SUCCESS MESSAGE ---- */}
          {successMessage && (
            <div className="mb-3 px-3 py-2 bg-[#34d399]/10 border border-[#34d399]/30 rounded-md">
              <p className="text-[#34d399] text-xs font-medium">
                {successMessage}
              </p>
              <p className="text-[#34d399]/70 text-[11px] mt-0.5">
                Review the imported data in each section and adjust scores as needed.
              </p>
            </div>
          )}

          {/* ---- ERROR MESSAGE ---- */}
          {error && (
            <div className="mb-3 px-3 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-md">
              <p className="text-[#ef4444] text-sm font-medium mb-0.5">
                {error.includes('not found') || error.includes('No results') ? 'No Results' : 'Error'}
              </p>
              <p className="text-[#ef4444]/80 text-xs">{error}</p>
            </div>
          )}

          {/* ---- DOCS LINK ---- */}
          <div className="flex items-center justify-between mt-2">
            <a
              href={INTEGRATIONS[activeIntegration].docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4a7dff] text-[11px] hover:underline"
            >
              {INTEGRATIONS[activeIntegration].name} documentation ↗
            </a>
            {activeIntegration && (
              <button
                onClick={() => setActiveIntegration(null)}
                className="text-[#6b7084] text-[11px] hover:text-[#9ca0b0] cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
