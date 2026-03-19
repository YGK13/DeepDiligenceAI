'use client';

// ============================================================================
// components/ai/AIResearchPanel.js — AI-Powered Research Panel
// ============================================================================
// Provides an in-app interface for AI-assisted due diligence research.
// Calls the server-side /api/ai/research route to avoid CORS issues.
//
// Props:
//   company      — full company data object (overview, scores, etc.)
//   sectionId    — current section ID (e.g., 'team-analysis')
//   sectionLabel — human-readable section name (e.g., 'Team Analysis')
//   settings     — AI settings object { provider, model, apiKeys, models }
//   onSaveResult — callback(sectionId, resultText) to persist AI output
// ============================================================================

import React, { useState, useCallback } from 'react';

// ============ COMPONENT ============
export default function AIResearchPanel({
  company,
  sectionId,
  sectionLabel,
  settings,
  onSaveResult,
}) {
  // ============ LOCAL STATE ============
  const [customPrompt, setCustomPrompt] = useState('');    // user's custom research query
  const [result, setResult] = useState('');                  // AI-generated research text
  const [isLoading, setIsLoading] = useState(false);         // loading/streaming indicator
  const [error, setError] = useState('');                    // error message to display

  // ============ DERIVE PROVIDER INFO ============
  // The active provider comes from settings; default to 'perplexity' if not set
  const activeProvider = settings?.provider || 'perplexity';

  // Capitalize provider name for display
  const providerDisplayName = {
    perplexity: 'Perplexity',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    groq: 'Groq',
  }[activeProvider] || activeProvider;

  // ============ BUILD COMPANY CONTEXT ============
  // Extract relevant fields from company.overview to send to the API.
  // This gives the AI enough context to produce targeted research.
  const buildCompanyContext = useCallback(() => {
    const overview = company?.overview || {};
    // Use the field names that the OverviewSection component actually writes.
    // Falls back to alternate field names for migration compatibility.
    return {
      name:      overview.companyName || overview.name      || '',
      url:       overview.websiteUrl  || overview.url       || '',
      sector:    overview.sector    || '',
      stage:     overview.stage     || '',
      founded:   overview.yearFounded || overview.founded   || '',
      hqCity:    overview.hqCity    || '',
      hqCountry: overview.hqCountry || '',
    };
  }, [company]);

  // ============ HANDLE RESEARCH REQUEST ============
  // Calls the server-side /api/ai/research endpoint with the current
  // provider, model, company context, section, and optional custom prompt.
  const handleResearch = useCallback(async () => {
    // Clear previous state
    setError('');
    setResult('');
    setIsLoading(true);

    try {
      // Determine which model to use (from settings or let the server default)
      const activeModel = settings?.models?.[activeProvider] || '';

      // Get the client-side API key (if entered in Settings)
      // Server env vars take priority, but this allows development without .env
      const clientApiKey = settings?.apiKeys?.[activeProvider] || '';

      // POST to server-side route handler — NO direct browser API calls
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          model: activeModel,
          apiKey: clientApiKey,
          companyContext: buildCompanyContext(),
          sectionLabel: sectionLabel,
          customPrompt: customPrompt.trim() || '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Server returned an error — show it to the user
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      // Successfully received research text
      setResult(data.text);
    } catch (err) {
      // Transform technical errors into user-friendly messages
      let friendlyMessage = err.message;

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        friendlyMessage = 'Network error — check your internet connection and try again.';
      } else if (err.message.includes('API key not configured')) {
        friendlyMessage = `${providerDisplayName} API key is not configured on the server. Add ${activeProvider.toUpperCase()}_API_KEY to your .env.local file.`;
      } else if (err.message.includes('401') || err.message.includes('403')) {
        friendlyMessage = `Authentication failed for ${providerDisplayName}. Verify your API key is correct.`;
      } else if (err.message.includes('429')) {
        friendlyMessage = `Rate limit exceeded for ${providerDisplayName}. Wait a moment and try again.`;
      }

      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, settings, buildCompanyContext, sectionLabel, customPrompt, providerDisplayName]);

  // ============ HANDLE SAVE ============
  // Saves the current AI research result to the parent component's state
  const handleSave = useCallback(() => {
    if (result && onSaveResult) {
      onSaveResult(sectionId, result);
    }
  }, [result, onSaveResult, sectionId]);

  // ============ DERIVE KEY STATUS ============
  // Check if the active provider has an API key configured
  const hasApiKey = !!(settings?.apiKeys?.[activeProvider]);

  // ============ RENDER ============
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-4">
      {/* ============ PANEL HEADER ============ */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* AI icon */}
          <span className="text-lg">🤖</span>
          <h3 className="text-[#e8e9ed] font-semibold text-sm">
            AI Research Assistant
          </h3>
        </div>

        {/* Provider status indicator */}
        <div className="flex items-center gap-2">
          {/* Green dot = key configured, yellow dot = no key */}
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-[#34d399]' : 'bg-[#f59e0b]'}`}
              title={hasApiKey ? `${providerDisplayName} active` : `${providerDisplayName} — no API key`}
            />
            <span className="text-[#9ca0b0]">{providerDisplayName}</span>
          </span>
        </div>
      </div>

      {/* ============ API KEY WARNING ============ */}
      {/* Show a helpful banner when no API key is configured */}
      {!hasApiKey && (
        <div className="mb-3 px-3 py-2.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-md">
          <p className="text-[#f59e0b] text-xs font-medium">
            ⚠ No API key for {providerDisplayName}
          </p>
          <p className="text-[#f59e0b]/70 text-[11px] mt-0.5">
            Go to <strong>Settings</strong> → select <strong>{providerDisplayName}</strong> → enter your API key → click <strong>Save Settings</strong>.
            {activeProvider === 'perplexity' && ' Get a key at perplexity.ai/settings/api'}
            {activeProvider === 'anthropic' && ' Get a key at console.anthropic.com/settings/keys'}
            {activeProvider === 'openai' && ' Get a key at platform.openai.com/api-keys'}
            {activeProvider === 'groq' && ' Get a key at console.groq.com/keys'}
          </p>
        </div>
      )}

      {/* ============ SECTION CONTEXT ============ */}
      {/* Shows which section the AI will research */}
      <div className="mb-3 px-3 py-2 bg-[#252836] rounded-md border border-[#2d3148]">
        <p className="text-[#6b7084] text-[10px] uppercase tracking-wider mb-0.5">
          Researching
        </p>
        <p className="text-[#e8e9ed] text-sm font-medium">{sectionLabel}</p>
        {/* Show company name if available */}
        {(company?.overview?.companyName || company?.overview?.name) && (
          <p className="text-[#9ca0b0] text-xs mt-0.5">
            for {company.overview.companyName || company.overview.name}
          </p>
        )}
      </div>

      {/* ============ CUSTOM PROMPT INPUT ============ */}
      {/* Optional: user can provide a specific research question */}
      <div className="mb-3">
        <label className="block text-[#9ca0b0] text-xs font-medium mb-1.5">
          Custom Prompt (optional)
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ask a specific research question, or leave blank for a comprehensive analysis..."
          rows={3}
          className={
            'w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] ' +
            'rounded-md text-sm px-3 py-2 resize-y min-h-[60px] ' +
            'focus:border-[#4a7dff] outline-none transition-colors duration-200 ' +
            'placeholder:text-[#6b7084]'
          }
          disabled={isLoading}
        />
      </div>

      {/* ============ ACTION BUTTONS ============ */}
      <div className="flex items-center gap-2 mb-4">
        {/* Auto-Research button — triggers the API call */}
        <button
          onClick={handleResearch}
          disabled={isLoading}
          className={
            'inline-flex items-center justify-center gap-1.5 ' +
            'font-semibold rounded-lg border border-transparent ' +
            'py-2 px-4 text-sm transition-all duration-200 cursor-pointer ' +
            (isLoading
              ? 'bg-[#4a7dff]/50 text-white/70 cursor-not-allowed'
              : 'bg-[#4a7dff] text-white hover:bg-[#3d6be6] active:bg-[#3560d4]')
          }
        >
          {isLoading ? (
            <>
              {/* Pulse animation dot during loading */}
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Researching...
            </>
          ) : (
            <>
              🔍 Auto-Research
            </>
          )}
        </button>

        {/* Save button — only enabled when there's a result to save */}
        {result && onSaveResult && (
          <button
            onClick={handleSave}
            className={
              'inline-flex items-center justify-center gap-1.5 ' +
              'font-semibold rounded-lg border border-transparent ' +
              'py-2 px-4 text-sm transition-all duration-200 cursor-pointer ' +
              'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886] active:bg-[#27a377]'
            }
          >
            💾 Save Result
          </button>
        )}
      </div>

      {/* ============ LOADING INDICATOR ============ */}
      {/* Animated pulse bar shown while waiting for the AI response */}
      {isLoading && (
        <div className="mb-4">
          <div className="h-1 w-full bg-[#252836] rounded-full overflow-hidden">
            <div className="h-full bg-[#4a7dff] rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-[#6b7084] text-xs mt-2 text-center">
            Analyzing with {providerDisplayName}... This may take 10-30 seconds.
          </p>
        </div>
      )}

      {/* ============ ERROR DISPLAY ============ */}
      {/* Shows error messages in a red-tinted box */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-md">
          <p className="text-[#ef4444] text-sm font-medium mb-0.5">
            Research Failed
          </p>
          <p className="text-[#ef4444]/80 text-xs">{error}</p>
        </div>
      )}

      {/* ============ RESULT DISPLAY ============ */}
      {/* Shows the AI-generated research in a scrollable, pre-wrapped container */}
      {result && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#9ca0b0] text-xs font-medium uppercase tracking-wider">
              Research Results
            </p>
            {/* Character count for reference */}
            <p className="text-[#6b7084] text-[10px]">
              {result.length.toLocaleString()} chars
            </p>
          </div>
          <div
            className={
              'bg-[#252836] border border-[#2d3148] rounded-md p-4 ' +
              'max-h-96 overflow-y-auto ' +
              'text-[#e8e9ed] text-sm leading-relaxed whitespace-pre-wrap'
            }
          >
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
