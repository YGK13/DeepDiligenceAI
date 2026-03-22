'use client';

// ============================================================================
// components/ai/AIResearchPanel.js — AI-Powered Research & Auto-Fill Panel
// ============================================================================
// The brain of DeepDiligence AI. Two modes:
//
// 1. AUTO-FILL (primary): Calls /api/ai/autofill to research a company and
//    return structured JSON that directly populates the section's form fields.
//    This is the killer feature — type a company name, click one button,
//    and the entire section fills with real data from the internet.
//
// 2. RESEARCH (secondary): Calls /api/ai/research to generate a free-form
//    text analysis that can be saved as a reference alongside the data.
//
// Props:
//   company      — full company data object (overview, scores, etc.)
//   sectionId    — current section ID (e.g., 'team')
//   sectionLabel — human-readable section name (e.g., 'Team & Founders')
//   settings     — AI settings object { provider, model, apiKeys, models }
//   onSaveResult — callback(sectionId, resultText) to persist AI research text
//   onAutoFill   — callback(sectionId, fieldData) to populate form fields
// ============================================================================

import React, { useState, useCallback } from 'react';

// ============ COMPONENT ============
export default function AIResearchPanel({
  company,
  sectionId,
  sectionLabel,
  settings,
  onSaveResult,
  onAutoFill,
}) {
  // ============ LOCAL STATE ============
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [error, setError] = useState('');
  const [autoFillStatus, setAutoFillStatus] = useState(''); // success message

  // ============ DERIVE PROVIDER INFO ============
  const activeProvider = settings?.provider || 'perplexity';
  const providerDisplayName = {
    perplexity: 'Perplexity',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    groq: 'Groq',
  }[activeProvider] || activeProvider;

  // ============ CHECK API KEY STATUS ============
  const hasApiKey = !!(settings?.apiKeys?.[activeProvider]);

  // ============ GET COMPANY NAME ============
  const companyName = company?.overview?.companyName || company?.overview?.name || company?.name || '';
  const companyUrl = company?.overview?.websiteUrl || company?.overview?.url || '';

  // ============ HANDLE AUTO-FILL ============
  // THE MAIN FEATURE: calls /api/ai/autofill to get structured data
  // and passes it to the parent component to populate form fields.
  const handleAutoFill = useCallback(async () => {
    if (!companyName) {
      setError('Enter a company name in the Overview section first, then come back to auto-fill.');
      return;
    }

    setError('');
    setAutoFillStatus('');
    setIsAutoFilling(true);

    try {
      const response = await fetch('/api/ai/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyUrl,
          section: sectionId,
          provider: activeProvider,
          model: settings?.models?.[activeProvider] || '',
          apiKeys: settings?.apiKeys || {},
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Auto-fill failed with status ${response.status}`);
      }

      // Count how many fields were filled (non-empty values)
      const filledCount = Object.values(data.data || {}).filter(
        (v) => v !== '' && v !== null && v !== undefined
      ).length;
      const totalCount = Object.keys(data.data || {}).length;

      // Pass the structured data to the parent to update the form
      if (onAutoFill && data.data) {
        onAutoFill(sectionId, data.data);
      }

      setAutoFillStatus(
        `Filled ${filledCount}/${totalCount} fields from ${providerDisplayName} research`
      );
    } catch (err) {
      let msg = err.message;
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Network error — check your connection.';
      } else if (msg.includes('401') || msg.includes('403')) {
        msg = `Authentication failed for ${providerDisplayName}. Check your API key.`;
      } else if (msg.includes('429')) {
        msg = `Rate limit exceeded. Wait a moment and try again.`;
      }
      setError(msg);
    } finally {
      setIsAutoFilling(false);
    }
  }, [companyName, companyUrl, sectionId, activeProvider, settings, onAutoFill, providerDisplayName]);

  // ============ BUILD COMPANY CONTEXT (for text research) ============
  const buildCompanyContext = useCallback(() => {
    const overview = company?.overview || {};
    return {
      name: overview.companyName || overview.name || '',
      url: overview.websiteUrl || overview.url || '',
      sector: overview.sector || '',
      stage: overview.stage || '',
      founded: overview.yearFounded || overview.founded || '',
      hqCity: overview.hqCity || '',
      hqCountry: overview.hqCountry || '',
    };
  }, [company]);

  // ============ HANDLE TEXT RESEARCH (secondary feature) ============
  const handleResearch = useCallback(async () => {
    setError('');
    setResult('');
    setIsLoading(true);

    try {
      const activeModel = settings?.models?.[activeProvider] || '';
      const clientApiKey = settings?.apiKeys?.[activeProvider] || '';

      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          model: activeModel,
          apiKey: clientApiKey,
          companyContext: buildCompanyContext(),
          sectionLabel,
          customPrompt: customPrompt.trim() || '',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      setResult(data.text);
    } catch (err) {
      let msg = err.message;
      if (msg.includes('Failed to fetch')) msg = 'Network error — check your connection.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, settings, buildCompanyContext, sectionLabel, customPrompt]);

  // ============ HANDLE SAVE ============
  const handleSave = useCallback(() => {
    if (result && onSaveResult) {
      onSaveResult(sectionId, result);
    }
  }, [result, onSaveResult, sectionId]);

  // ============ DERIVED STATE ============
  const isBusy = isLoading || isAutoFilling;

  // ============ RENDER ============
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-4 mb-4">
      {/* ============ PANEL HEADER ============ */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-[#e8e9ed] font-semibold text-sm">
            AI Research & Auto-Fill
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-[#34d399]' : 'bg-[#f59e0b]'}`}
          />
          <span className="text-[#9ca0b0]">{providerDisplayName}</span>
        </span>
      </div>

      {/* ============ API KEY WARNING ============ */}
      {!hasApiKey && (
        <div className="mb-3 px-3 py-2.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-md">
          <p className="text-[#f59e0b] text-xs font-medium">
            ⚠ No API key for {providerDisplayName}
          </p>
          <p className="text-[#f59e0b]/70 text-[11px] mt-0.5">
            Go to <strong>Settings</strong> → enter your API key → click <strong>Save</strong>.
          </p>
        </div>
      )}

      {/* ============ COMPANY CONTEXT ============ */}
      <div className="mb-3 px-3 py-2 bg-[#252836] rounded-md border border-[#2d3148]">
        <p className="text-[#6b7084] text-[10px] uppercase tracking-wider mb-0.5">
          {sectionLabel}
        </p>
        {companyName ? (
          <p className="text-[#e8e9ed] text-sm font-medium">
            {companyName}
            {companyUrl && (
              <span className="text-[#6b7084] text-xs ml-2">({companyUrl})</span>
            )}
          </p>
        ) : (
          <p className="text-[#f59e0b] text-xs">
            Enter a company name in the Overview section first
          </p>
        )}
      </div>

      {/* ============ PRIMARY ACTION: AUTO-FILL FIELDS ============ */}
      {/* This is THE killer feature — one click fills all fields in this section */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleAutoFill}
          disabled={isBusy || !companyName}
          className={
            'inline-flex items-center justify-center gap-1.5 ' +
            'font-bold rounded-lg border border-transparent ' +
            'py-2.5 px-5 text-sm transition-all duration-200 cursor-pointer ' +
            (isBusy || !companyName
              ? 'bg-[#34d399]/30 text-white/50 cursor-not-allowed'
              : 'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886] active:bg-[#27a377] shadow-lg shadow-[#34d399]/20')
          }
        >
          {isAutoFilling ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#0f1117] animate-pulse" />
              Auto-Filling...
            </>
          ) : (
            <>⚡ Auto-Fill Fields</>
          )}
        </button>

        {/* Secondary: text research */}
        <button
          onClick={handleResearch}
          disabled={isBusy}
          className={
            'inline-flex items-center justify-center gap-1.5 ' +
            'font-semibold rounded-lg border border-[#2d3148] ' +
            'py-2.5 px-4 text-sm transition-all duration-200 cursor-pointer ' +
            (isBusy
              ? 'bg-transparent text-[#6b7084] cursor-not-allowed'
              : 'bg-transparent text-[#9ca0b0] hover:bg-[#252836] hover:text-[#e8e9ed] hover:border-[#4a7dff]')
          }
        >
          {isLoading ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#4a7dff] animate-pulse" />
              Researching...
            </>
          ) : (
            <>🔍 Deep Research</>
          )}
        </button>
      </div>

      {/* ============ AUTO-FILL SUCCESS MESSAGE ============ */}
      {autoFillStatus && (
        <div className="mb-3 px-3 py-2 bg-[#34d399]/10 border border-[#34d399]/30 rounded-md">
          <p className="text-[#34d399] text-xs font-medium">
            ✅ {autoFillStatus}
          </p>
          <p className="text-[#34d399]/70 text-[11px] mt-0.5">
            Review the populated fields below and adjust scores based on your analysis.
          </p>
        </div>
      )}

      {/* ============ LOADING INDICATOR ============ */}
      {isBusy && (
        <div className="mb-3">
          <div className="h-1 w-full bg-[#252836] rounded-full overflow-hidden">
            <div className="h-full bg-[#4a7dff] rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-[#6b7084] text-xs mt-2 text-center">
            {isAutoFilling
              ? `Researching ${companyName} and extracting structured data...`
              : `Analyzing with ${providerDisplayName}...`}
            {' '}This may take 15-45 seconds.
          </p>
        </div>
      )}

      {/* ============ ERROR DISPLAY ============ */}
      {error && (
        <div className="mb-3 px-3 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-md">
          <p className="text-[#ef4444] text-sm font-medium mb-0.5">Failed</p>
          <p className="text-[#ef4444]/80 text-xs">{error}</p>
        </div>
      )}

      {/* ============ CUSTOM PROMPT (collapsible for power users) ============ */}
      <details className="mb-2">
        <summary className="text-[#6b7084] text-xs cursor-pointer hover:text-[#9ca0b0] select-none">
          Custom prompt (advanced)
        </summary>
        <div className="mt-2">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask a specific research question..."
            rows={2}
            className={
              'w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] ' +
              'rounded-md text-sm px-3 py-2 resize-y min-h-[50px] ' +
              'focus:border-[#4a7dff] outline-none transition-colors duration-200 ' +
              'placeholder:text-[#6b7084]'
            }
            disabled={isBusy}
          />
        </div>
      </details>

      {/* ============ TEXT RESEARCH RESULTS ============ */}
      {result && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#9ca0b0] text-xs font-medium uppercase tracking-wider">
              Research Results
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[#6b7084] text-[10px]">
                {result.length.toLocaleString()} chars
              </p>
              {onSaveResult && (
                <button
                  onClick={handleSave}
                  className="text-[#34d399] text-xs font-semibold hover:text-[#2db886] cursor-pointer"
                >
                  💾 Save
                </button>
              )}
            </div>
          </div>
          <div
            className={
              'bg-[#252836] border border-[#2d3148] rounded-md p-3 ' +
              'max-h-64 overflow-y-auto ' +
              'text-[#e8e9ed] text-xs leading-relaxed whitespace-pre-wrap'
            }
          >
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
