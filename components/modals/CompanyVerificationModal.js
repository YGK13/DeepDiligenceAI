'use client';

// ============================================================================
// components/modals/CompanyVerificationModal.js — Company Identity Verification
// ============================================================================
// CRITICAL P0 FEATURE. Before auto-fill runs, this modal confirms the user
// means the RIGHT company. Prevents catastrophic misfills (e.g., "Mercury"
// could be Mercury Financial, Mercury Systems, or Mercury the neobank).
//
// Flow:
//   1. User enters company name → triggers verification API
//   2. Modal shows 3-5 candidates with name, domain, description, location
//   3. User clicks the correct one (or "None of these")
//   4. Confirmed company data is passed back to the parent
//
// Props:
//   companyName — the name the user typed
//   companyUrl  — optional URL if provided
//   settings    — AI settings (provider, apiKeys)
//   onConfirm   — callback(candidate) when user picks a match
//   onCancel    — callback() when user closes without picking
//   onNoneMatch — callback() when user says "none of these match"
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

// ============ CONFIDENCE BADGE COLORS ============
const CONFIDENCE_STYLES = {
  high: { bg: 'bg-[#34d399]/15', text: 'text-[#34d399]', border: 'border-[#34d399]/30', label: 'High match' },
  medium: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/30', label: 'Possible match' },
  low: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', border: 'border-[#ef4444]/30', label: 'Unlikely' },
};

// ============ COMPONENT ============
export default function CompanyVerificationModal({
  companyName,
  companyUrl,
  settings,
  onConfirm,
  onCancel,
  onNoneMatch,
}) {
  // ============ STATE ============
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);

  // ============ DECK UPLOAD STATE ============
  // Optional pitch deck file — if provided, it gets passed back with
  // the confirmed company so the parent can cross-reference deck claims
  // with AI web research during auto-fill. This is the natural moment
  // for a VC to attach a deck: they just received it and are now
  // looking up the company.
  const [deckFile, setDeckFile] = useState(null);
  const deckInputRef = React.useRef(null);

  // ============ FETCH CANDIDATES ON MOUNT ============
  useEffect(() => {
    let cancelled = false;

    async function fetchCandidates() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/ai/verify-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            companyUrl,
            provider: settings?.provider,
            apiKeys: settings?.apiKeys || {},
          }),
        });

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Verification failed');
        }

        setCandidates(data.candidates || []);

        // Auto-select the first high-confidence candidate
        const highConfIdx = (data.candidates || []).findIndex(
          (c) => c.confidence === 'high'
        );
        if (highConfIdx >= 0) {
          setSelectedIndex(highConfIdx);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCandidates();
    return () => { cancelled = true; };
  }, [companyName, companyUrl, settings]);

  // ============ HANDLERS ============
  const handleConfirm = useCallback(() => {
    if (selectedIndex !== null && candidates[selectedIndex]) {
      // Pass the confirmed candidate + optional deck file back to parent.
      // Parent (page.js) will create the company and optionally trigger
      // deck analysis alongside web research.
      onConfirm(candidates[selectedIndex], deckFile);
    }
  }, [selectedIndex, candidates, onConfirm, deckFile]);

  // ============ RENDER ============
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card, #1e2130)',
          border: '1px solid var(--border, #2d3148)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============ HEADER ============ */}
        <div className="px-6 py-4 border-b border-[#2d3148]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#e8e9ed] text-lg font-bold">
                Verify Company Identity
              </h2>
              <p className="text-[#6b7084] text-xs mt-0.5">
                Confirm which "{companyName}" you mean before we research it
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-[#6b7084] hover:text-[#e8e9ed] text-xl leading-none cursor-pointer p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ============ BODY ============ */}
        <div className="px-6 py-4">
          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-[#4a7dff] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[#9ca0b0] text-sm">
                Searching for "{companyName}"...
              </p>
              <p className="text-[#6b7084] text-xs mt-1">
                This takes 5-10 seconds
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="mb-4 px-4 py-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
              <p className="text-[#ef4444] text-sm font-medium">Search failed</p>
              <p className="text-[#ef4444]/70 text-xs mt-1">{error}</p>
              <button
                onClick={onCancel}
                className="mt-3 text-[#9ca0b0] text-xs underline cursor-pointer hover:text-[#e8e9ed]"
              >
                Close and try again
              </button>
            </div>
          )}

          {/* No results */}
          {!isLoading && !error && candidates.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[#9ca0b0] text-sm mb-2">
                No companies found matching "{companyName}"
              </p>
              <p className="text-[#6b7084] text-xs">
                Check the spelling, or proceed with manual entry.
              </p>
            </div>
          )}

          {/* ============ CANDIDATE LIST ============ */}
          {!isLoading && candidates.length > 0 && (
            <div className="space-y-2">
              <p className="text-[#9ca0b0] text-xs font-medium mb-3">
                {candidates.length} match{candidates.length !== 1 ? 'es' : ''} found — select the correct company:
              </p>

              {candidates.map((candidate, idx) => {
                const isSelected = selectedIndex === idx;
                const conf = CONFIDENCE_STYLES[candidate.confidence] || CONFIDENCE_STYLES.medium;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={
                      'w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 cursor-pointer ' +
                      (isSelected
                        ? 'border-[#4a7dff] bg-[#4a7dff]/10 shadow-lg shadow-[#4a7dff]/10'
                        : 'border-[#2d3148] bg-[#252836] hover:border-[#4a7dff]/50 hover:bg-[#252836]/80')
                    }
                  >
                    {/* Top row: name + confidence badge */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {/* Radio indicator */}
                        <div
                          className={
                            'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                            (isSelected ? 'border-[#4a7dff]' : 'border-[#6b7084]')
                          }
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-[#4a7dff]" />
                          )}
                        </div>
                        <span className="text-[#e8e9ed] font-semibold text-sm">
                          {candidate.name}
                        </span>
                      </div>

                      {/* Confidence badge */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${conf.bg} ${conf.text} border ${conf.border}`}
                      >
                        {conf.label}
                      </span>
                    </div>

                    {/* Domain */}
                    {candidate.domain && (
                      <p className="text-[#4a7dff] text-xs ml-6 mb-0.5">
                        {candidate.domain}
                      </p>
                    )}

                    {/* Description */}
                    <p className="text-[#9ca0b0] text-xs ml-6 mb-1">
                      {candidate.description}
                    </p>

                    {/* Meta row: location, sector, stage, founded */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-6">
                      {candidate.location && candidate.location !== 'Unknown' && (
                        <span className="text-[#6b7084] text-[10px]">
                          📍 {candidate.location}
                        </span>
                      )}
                      {candidate.sector && candidate.sector !== 'Unknown' && (
                        <span className="text-[#6b7084] text-[10px]">
                          🏷️ {candidate.sector}
                        </span>
                      )}
                      {candidate.stage && candidate.stage !== 'Unknown' && (
                        <span className="text-[#6b7084] text-[10px]">
                          💰 {candidate.stage}
                        </span>
                      )}
                      {candidate.founded && candidate.founded !== 'Unknown' && (
                        <span className="text-[#6b7084] text-[10px]">
                          📅 {candidate.founded}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ============ DECK UPLOAD (OPTIONAL) ============ */}
        {/* Shown after candidates load. VCs usually have the deck in hand
            when they look up a company — this is the natural moment to attach it.
            The deck gets passed back with onConfirm so page.js can cross-check
            deck claims against web research during auto-fill. */}
        {!isLoading && candidates.length > 0 && (
          <div className="px-6 py-3 border-t border-[#2d3148]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">📎</span>
                <div>
                  <p className="text-[#9ca0b0] text-xs font-medium">
                    Have a pitch deck?
                  </p>
                  <p className="text-[#6b7084] text-[10px]">
                    Upload it to cross-check claims against web data
                  </p>
                </div>
              </div>

              {deckFile ? (
                // ============ FILE ATTACHED — show name + remove button ============
                <div className="flex items-center gap-2">
                  <span className="text-[#34d399] text-xs font-medium truncate max-w-[160px]">
                    {deckFile.name}
                  </span>
                  <button
                    onClick={() => {
                      setDeckFile(null);
                      if (deckInputRef.current) deckInputRef.current.value = '';
                    }}
                    className="text-[#6b7084] hover:text-[#ef4444] text-xs cursor-pointer"
                    title="Remove deck"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                // ============ NO FILE — show upload button ============
                <button
                  onClick={() => deckInputRef.current?.click()}
                  className={
                    'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ' +
                    'bg-[#4a7dff]/10 text-[#4a7dff] border border-[#4a7dff]/30 ' +
                    'hover:bg-[#4a7dff]/20 transition-all'
                  }
                >
                  Upload Deck
                </button>
              )}

              {/* Hidden file input — accepts PDF and PPTX */}
              <input
                ref={deckInputRef}
                type="file"
                accept=".pdf,.pptx,.ppt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setDeckFile(file);
                }}
                className="hidden"
                aria-label="Upload pitch deck"
              />
            </div>
          </div>
        )}

        {/* ============ FOOTER ============ */}
        {!isLoading && (
          <div className="px-6 py-4 border-t border-[#2d3148] flex items-center justify-between">
            {/* Left: "None of these" link */}
            <button
              onClick={onNoneMatch || onCancel}
              className="text-[#6b7084] text-xs hover:text-[#9ca0b0] cursor-pointer underline"
            >
              None of these — proceed with manual name
            </button>

            {/* Right: Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={selectedIndex === null}
              className={
                'px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 cursor-pointer ' +
                (selectedIndex !== null
                  ? 'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886] shadow-lg shadow-[#34d399]/20'
                  : 'bg-[#34d399]/30 text-white/50 cursor-not-allowed')
              }
            >
              {deckFile ? '✓ Confirm & Research + Analyze Deck' : '✓ Confirm & Research'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
