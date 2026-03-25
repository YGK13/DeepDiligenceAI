'use client';

// ============================================================================
// components/views/SettingsView.js — AI Settings & Data Management Panel
// ============================================================================
// Provides configuration UI for AI research providers and data import/export.
//
// Structure:
//   1. Provider Selector — tab buttons for Perplexity, Anthropic, OpenAI, Groq
//   2. Per-Provider Config — API key input (password) + model selector dropdown
//   3. Save Button — persists settings via onSave callback
//   4. Data Management — Export/Import JSON for backup and transfer
//
// Props:
//   settings — current settings object { provider, apiKeys, models }
//   onSave   — callback({ provider, apiKeys, models }) to persist changes
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { PROVIDERS } from '@/lib/constants';
import ExportPanel from '@/components/export/ExportPanel';

// ============ PROVIDER KEYS (ordered for tab rendering) ============
const PROVIDER_KEYS = ['perplexity', 'anthropic', 'openai', 'groq'];

// ============ COMPONENT ============
export default function SettingsView({ settings, onSave, onExport, onImport, companies, currentCompany }) {
  // ============ LOCAL STATE ============
  // Initialize from props to allow editing without immediately saving.
  // User must explicitly click "Save" to persist changes.
  const [activeProvider, setActiveProvider] = useState(
    settings?.provider || 'perplexity'
  );
  const [apiKeys, setApiKeys] = useState(
    settings?.apiKeys || {
      perplexity: '',
      anthropic: '',
      openai: '',
      groq: '',
    }
  );
  const [models, setModels] = useState(
    settings?.models || {
      perplexity: PROVIDERS.perplexity.defaultModel,
      anthropic:  PROVIDERS.anthropic.defaultModel,
      openai:     PROVIDERS.openai.defaultModel,
      groq:       PROVIDERS.groq.defaultModel,
    }
  );

  // Track save confirmation state
  const [showSaved, setShowSaved] = useState(false);

  // ============ SPREADSHEET EXPORT TOGGLE ============
  // Controls visibility of the inline ExportPanel for CSV/spreadsheet exports
  const [showSpreadsheetExport, setShowSpreadsheetExport] = useState(false);

  // File input ref for JSON import
  const fileInputRef = useRef(null);

  // ============ HANDLERS ============

  // Update API key for a specific provider
  const handleApiKeyChange = useCallback((providerKey, value) => {
    setApiKeys((prev) => ({ ...prev, [providerKey]: value }));
  }, []);

  // Update selected model for a specific provider
  const handleModelChange = useCallback((providerKey, value) => {
    setModels((prev) => ({ ...prev, [providerKey]: value }));
  }, []);

  // Save settings — calls onSave prop and shows confirmation
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave({
        provider: activeProvider,
        apiKeys,
        models,
      });
    }

    // Show confirmation flash for 2 seconds
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [onSave, activeProvider, apiKeys, models]);

  // ============ DATA MANAGEMENT: EXPORT ============
  // Exports the current settings as a downloadable JSON file
  const handleExport = useCallback(() => {
    const exportData = {
      provider: activeProvider,
      apiKeys,
      models,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);

    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `deepdiligence-settings-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();

    // Cleanup DOM and revoke object URL
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeProvider, apiKeys, models]);

  // ============ DATA MANAGEMENT: IMPORT ============
  // Reads a JSON file and populates the settings form
  const handleImport = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);

        // Validate imported data has expected shape before applying
        if (imported.provider && PROVIDERS[imported.provider]) {
          setActiveProvider(imported.provider);
        }
        if (imported.apiKeys && typeof imported.apiKeys === 'object') {
          setApiKeys((prev) => ({ ...prev, ...imported.apiKeys }));
        }
        if (imported.models && typeof imported.models === 'object') {
          setModels((prev) => ({ ...prev, ...imported.models }));
        }

        alert('Settings imported successfully. Click "Save Settings" to apply.');
      } catch (err) {
        alert('Failed to import settings: Invalid JSON file.');
      }
    };
    reader.readAsText(file);

    // Reset the file input so the same file can be re-imported if needed
    event.target.value = '';
  }, []);

  // ============ RENDER ============
  return (
    <div className="space-y-6 max-w-[700px]">
      {/* ============ SECTION 1: PROVIDER SELECTOR ============ */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-5">
        <h2 className="text-[#e8e9ed] text-base font-semibold mb-4">
          AI Provider Configuration
        </h2>

        {/* Provider tab buttons — horizontal row */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {PROVIDER_KEYS.map((provKey) => {
            const isActive = activeProvider === provKey;
            const provConfig = PROVIDERS[provKey];

            return (
              <button
                key={provKey}
                onClick={() => setActiveProvider(provKey)}
                className={
                  'px-4 py-2 rounded-lg text-sm font-semibold ' +
                  'transition-all duration-200 cursor-pointer border ' +
                  (isActive
                    ? // Active: solid blue background, white text
                      'bg-[#4a7dff] text-white border-[#4a7dff]'
                    : // Inactive: transparent bg, muted text, subtle border
                      'bg-transparent text-[#9ca0b0] border-[#2d3148] ' +
                      'hover:bg-[#252836] hover:text-[#e8e9ed] hover:border-[#4a7dff]')
                }
              >
                {provConfig.label}
              </button>
            );
          })}
        </div>

        {/* ============ PER-PROVIDER CONFIG ============ */}
        {/* Shows the API key input and model selector for the active provider */}
        {PROVIDER_KEYS.map((provKey) => {
          const provConfig = PROVIDERS[provKey];
          const isVisible = activeProvider === provKey;

          // Only render the active provider's config panel
          if (!isVisible) return null;

          return (
            <div key={provKey} className="space-y-4">
              {/* Provider header with indicator dot */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#4a7dff]" />
                <h3 className="text-[#e8e9ed] text-sm font-semibold">
                  {provConfig.label} Settings
                </h3>
              </div>

              {/* API Key status — server-managed, not user-entered */}
              <div className="mb-3 px-3 py-2.5 bg-[#34d399]/10 border border-[#34d399]/30 rounded-md">
                <p className="text-[#34d399] text-xs font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#34d399]" />
                  API key managed by DueDrill
                </p>
                <p className="text-[#34d399]/70 text-[11px] mt-0.5">
                  AI credits are included in your plan. No API key needed.
                </p>
              </div>

              {/* Model selector dropdown */}
              {/* PROVIDERS.models is an array of { value, label } objects */}
              <div className="mb-3">
                <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
                  Model
                </label>
                <select
                  value={models[provKey] || provConfig.defaultModel}
                  onChange={(e) => handleModelChange(provKey, e.target.value)}
                  className={
                    'w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] ' +
                    'rounded-md text-sm px-3 py-2 cursor-pointer appearance-none ' +
                    'focus:border-[#4a7dff] outline-none transition-colors duration-200'
                  }
                  style={{
                    // Custom dropdown arrow using an inline SVG data URI
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca0b0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    paddingRight: '2.5rem',
                  }}
                >
                  {provConfig.models.map((modelObj) => (
                    <option
                      key={modelObj.value}
                      value={modelObj.value}
                      className="bg-[#252836] text-[#e8e9ed]"
                    >
                      {modelObj.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        {/* ============ SAVE BUTTON ============ */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#2d3148]">
          <button
            onClick={handleSave}
            className={
              'inline-flex items-center justify-center gap-1.5 ' +
              'font-semibold rounded-lg border border-transparent ' +
              'py-2 px-5 text-sm transition-all duration-200 cursor-pointer ' +
              'bg-[#4a7dff] text-white hover:bg-[#3d6be6] active:bg-[#3560d4]'
            }
          >
            Save Settings
          </button>

          {/* Save confirmation flash — auto-hides after 2 seconds */}
          {showSaved && (
            <span className="text-[#34d399] text-sm font-medium animate-pulse">
              Settings saved!
            </span>
          )}
        </div>
      </div>

      {/* ============ SECTION 2: DATA MANAGEMENT ============ */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-5">
        <h2 className="text-[#e8e9ed] text-base font-semibold mb-4">
          Data Management
        </h2>
        <p className="text-[#6b7084] text-xs mb-4">
          Export all companies and settings as JSON for backup, or import a previously exported file.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Export ALL data (companies + settings) */}
          <button
            onClick={onExport}
            className={
              'inline-flex items-center justify-center gap-1.5 ' +
              'font-semibold rounded-lg border border-[#2d3148] ' +
              'py-2 px-4 text-sm transition-all duration-200 cursor-pointer ' +
              'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/30 ' +
              'hover:bg-[#34d399]/20 active:bg-[#34d399]/30'
            }
          >
            Export All Data
          </button>

          {/* Import data — triggers hidden file input */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={
              'inline-flex items-center justify-center gap-1.5 ' +
              'font-semibold rounded-lg border border-[#2d3148] ' +
              'py-2 px-4 text-sm transition-all duration-200 cursor-pointer ' +
              'bg-transparent text-[#e8e9ed] ' +
              'hover:bg-[#252836] hover:border-[#4a7dff] active:bg-[#2d3148]'
            }
          >
            Import Data
          </button>

          {/* Hidden file input for JSON import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImport) {
                onImport(file);
              }
              e.target.value = '';
            }}
            className="hidden"
            aria-label="Import data JSON file"
          />
        </div>

        {/* ============ SPREADSHEET EXPORT ============ */}
        {/* Separate from the JSON backup — this produces a polished, IC-meeting-ready CSV */}
        <div className="mt-5 pt-4 border-t border-[#2d3148]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[#e8e9ed] text-sm font-semibold flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Spreadsheet Export
              </h3>
              <p className="text-[#6b7084] text-[11px] mt-0.5">
                Export polished CSV files for IC meetings and partner sharing
              </p>
            </div>
            <button
              onClick={() => setShowSpreadsheetExport((prev) => !prev)}
              className={
                'inline-flex items-center justify-center gap-1.5 ' +
                'font-semibold rounded-lg border ' +
                'py-2 px-4 text-sm transition-all duration-200 cursor-pointer ' +
                (showSpreadsheetExport
                  ? 'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/30 hover:bg-[#34d399]/30'
                  : 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/30 hover:bg-[#34d399]/20')
              }
            >
              {showSpreadsheetExport ? 'Hide' : 'Export to Spreadsheet'}
            </button>
          </div>

          {/* Inline ExportPanel — slides open when toggled */}
          {showSpreadsheetExport && (
            <div className="mt-3">
              <ExportPanel
                companies={companies || []}
                currentCompany={currentCompany || null}
                onClose={() => setShowSpreadsheetExport(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
