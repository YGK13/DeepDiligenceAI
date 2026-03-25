'use client';

// ============================================================================
// components/deck/DeckUploadPanel.js — Pitch Deck Upload & AI Analysis
// ============================================================================
// Allows users to upload a startup's pitch deck (PDF/PPTX) and have AI:
//   1. Extract structured data from the deck slides
//   2. Auto-fill DueDrill fields with the extracted data
//   3. Cross-reference deck claims against AI research for accuracy
//
// This is a premium feature — requires Solo plan or above.
//
// The cross-check feature is the real value: VCs often receive decks with
// inflated metrics. DueDrill compares deck claims against independent
// web research to flag discrepancies (e.g., deck says "$2M ARR" but
// Crunchbase shows "Pre-revenue"). This is what separates DueDrill from
// just reading a PDF.
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';

// ============ ACCEPTED FILE TYPES ============
const ACCEPTED_TYPES = '.pdf,.pptx,.ppt';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit

// ============ COMPONENT ============
export default function DeckUploadPanel({
  company,
  settings,
  onAutoFill,
  onSaveResult,
}) {
  // ============ STATE ============
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCrossChecking, setIsCrossChecking] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [crossCheckResults, setCrossCheckResults] = useState(null);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  const companyName = company?.overview?.companyName || company?.name || '';

  // ============ HANDLE FILE SELECT ============
  const handleFileChange = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file size
    if (selected.size > MAX_FILE_SIZE) {
      setError(`File too large (${(selected.size / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB.`);
      return;
    }

    setFile(selected);
    setError('');
    setExtractedData(null);
    setCrossCheckResults(null);
    setStatus('');
  }, []);

  // ============ HANDLE UPLOAD + ANALYSIS ============
  // Step 1: Upload the deck and extract structured data
  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setError('');
    setIsUploading(true);
    setStatus('Uploading deck...');

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyName', companyName);

      // Upload to our API
      const uploadRes = await fetch('/api/deck/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      setIsUploading(false);
      setIsAnalyzing(true);
      setStatus('Analyzing deck with AI... This may take 30-60 seconds.');

      // Step 2: Analyze the uploaded deck
      const analyzeRes = await fetch('/api/deck/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          fileName: file.name,
          companyName,
          provider: settings?.provider || 'perplexity',
          model: settings?.models?.[settings?.provider] || '',
          apiKeys: settings?.apiKeys || {},
        }),
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok || !analyzeData.success) {
        throw new Error(analyzeData.error || 'Analysis failed');
      }

      setExtractedData(analyzeData.data);

      // Count extracted fields
      let fieldCount = 0;
      if (analyzeData.data) {
        for (const section of Object.values(analyzeData.data)) {
          if (section && typeof section === 'object') {
            fieldCount += Object.values(section).filter(v => v !== '' && v != null).length;
          }
        }
      }

      setStatus(`Extracted ${fieldCount} data points from ${file.name}`);

    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }, [file, companyName, settings]);

  // ============ HANDLE CROSS-CHECK ============
  // Compares deck claims against independent AI research
  const handleCrossCheck = useCallback(async () => {
    if (!extractedData) return;
    setError('');
    setIsCrossChecking(true);
    setStatus('Cross-checking deck claims against web research...');

    try {
      const res = await fetch('/api/deck/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckData: extractedData,
          companyName,
          companyUrl: company?.overview?.websiteUrl || '',
          provider: settings?.provider || 'perplexity',
          model: settings?.models?.[settings?.provider] || '',
          apiKeys: settings?.apiKeys || {},
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cross-check failed');
      }

      setCrossCheckResults(data.results);
      setStatus('Cross-check complete — review discrepancies below');

      // Save cross-check results as AI research
      if (onSaveResult && data.results?.summary) {
        onSaveResult('deckCrossCheck', data.results.summary);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsCrossChecking(false);
    }
  }, [extractedData, companyName, company, settings, onSaveResult]);

  // ============ HANDLE IMPORT TO FIELDS ============
  // Merges extracted deck data into the company's form fields
  const handleImportData = useCallback(() => {
    if (!extractedData || !onAutoFill) return;

    let totalFilled = 0;
    for (const [sectionKey, sectionData] of Object.entries(extractedData)) {
      if (sectionData && typeof sectionData === 'object') {
        const filledFields = Object.values(sectionData).filter(v => v !== '' && v != null).length;
        if (filledFields > 0) {
          onAutoFill(sectionKey, sectionData, {});
          totalFilled += filledFields;
        }
      }
    }

    setStatus(`Imported ${totalFilled} fields from deck into DueDrill`);
  }, [extractedData, onAutoFill]);

  // ============ DERIVED STATE ============
  const isBusy = isUploading || isAnalyzing || isCrossChecking;

  // ============ RENDER ============
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-5">
      {/* ============ HEADER ============ */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📄</span>
        <h3 className="text-[#e8e9ed] font-semibold text-sm">
          Deck Upload & AI Cross-Check
        </h3>
      </div>

      <p className="text-[#6b7084] text-xs mb-4">
        Upload a pitch deck (PDF/PPTX) to extract structured data and cross-check claims against web research.
      </p>

      {/* ============ FILE INPUT ============ */}
      <div className="mb-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ' +
            'transition-all duration-200 ' +
            (file
              ? 'border-[#34d399]/40 bg-[#34d399]/5'
              : 'border-[#2d3148] bg-[#252836] hover:border-[#4a7dff] hover:bg-[#4a7dff]/5')
          }
        >
          {file ? (
            <>
              <p className="text-[#34d399] text-sm font-medium">📎 {file.name}</p>
              <p className="text-[#6b7084] text-xs mt-1">
                {(file.size / 1024 / 1024).toFixed(1)}MB — Click to change
              </p>
            </>
          ) : (
            <>
              <p className="text-[#9ca0b0] text-sm">
                Drop a pitch deck here or click to browse
              </p>
              <p className="text-[#6b7084] text-xs mt-1">PDF or PPTX, up to 25MB</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* ============ ACTION BUTTONS ============ */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Analyze deck */}
        <button
          onClick={handleAnalyze}
          disabled={!file || isBusy}
          className={
            'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold ' +
            'transition-all duration-200 cursor-pointer ' +
            (!file || isBusy
              ? 'bg-[#4a7dff]/30 text-white/50 cursor-not-allowed'
              : 'bg-[#4a7dff] text-white hover:bg-[#3d6be6] shadow-lg shadow-[#4a7dff]/20')
          }
        >
          {isUploading || isAnalyzing ? (
            <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Analyzing...</>
          ) : (
            <>🔬 Analyze Deck</>
          )}
        </button>

        {/* Cross-check (only after analysis) */}
        {extractedData && (
          <button
            onClick={handleCrossCheck}
            disabled={isBusy}
            className={
              'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold ' +
              'transition-all duration-200 cursor-pointer ' +
              (isBusy
                ? 'bg-[#f59e0b]/30 text-white/50 cursor-not-allowed'
                : 'bg-[#f59e0b] text-[#0f1117] hover:bg-[#d97706] shadow-lg shadow-[#f59e0b]/20')
            }
          >
            {isCrossChecking ? (
              <><span className="w-2 h-2 rounded-full bg-[#0f1117] animate-pulse" /> Cross-Checking...</>
            ) : (
              <>⚖️ Cross-Check Claims</>
            )}
          </button>
        )}

        {/* Import to fields (only after analysis) */}
        {extractedData && (
          <button
            onClick={handleImportData}
            disabled={isBusy}
            className={
              'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold ' +
              'transition-all duration-200 cursor-pointer ' +
              'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886]'
            }
          >
            ⬇️ Import to Fields
          </button>
        )}
      </div>

      {/* ============ STATUS ============ */}
      {status && (
        <div className="mb-3 px-3 py-2 bg-[#4a7dff]/10 border border-[#4a7dff]/30 rounded-md">
          <p className="text-[#4a7dff] text-xs font-medium">{status}</p>
        </div>
      )}

      {/* ============ ERROR ============ */}
      {error && (
        <div className="mb-3 px-3 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-md">
          <p className="text-[#ef4444] text-sm font-medium mb-0.5">Failed</p>
          <p className="text-[#ef4444]/80 text-xs">{error}</p>
        </div>
      )}

      {/* ============ CROSS-CHECK RESULTS ============ */}
      {crossCheckResults && (
        <div className="mt-4">
          <h4 className="text-[#e8e9ed] text-sm font-semibold mb-3">
            ⚖️ Deck vs. Reality Cross-Check
          </h4>

          {/* Discrepancies */}
          {crossCheckResults.discrepancies?.length > 0 ? (
            <div className="space-y-2">
              {crossCheckResults.discrepancies.map((d, i) => (
                <div
                  key={i}
                  className={
                    'px-3 py-2 rounded-md border text-xs ' +
                    (d.severity === 'high'
                      ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                      : d.severity === 'medium'
                        ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                        : 'bg-[#6b7084]/10 border-[#6b7084]/30')
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={
                        'font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ' +
                        (d.severity === 'high'
                          ? 'bg-[#ef4444]/20 text-[#ef4444]'
                          : d.severity === 'medium'
                            ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                            : 'bg-[#6b7084]/20 text-[#6b7084]')
                      }
                    >
                      {d.severity}
                    </span>
                    <span className="text-[#e8e9ed] font-medium">{d.field}</span>
                  </div>
                  <p className="text-[#9ca0b0]">
                    <strong>Deck:</strong> {d.deckValue} → <strong>Research:</strong> {d.researchValue}
                  </p>
                  {d.note && <p className="text-[#6b7084] mt-0.5">{d.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 bg-[#34d399]/10 border border-[#34d399]/30 rounded-md">
              <p className="text-[#34d399] text-xs font-medium">
                ✅ No major discrepancies found — deck claims appear consistent with public data.
              </p>
            </div>
          )}

          {/* Summary */}
          {crossCheckResults.summary && (
            <div className="mt-3 bg-[#252836] border border-[#2d3148] rounded-md p-3 max-h-48 overflow-y-auto">
              <p className="text-[#6b7084] text-[10px] uppercase tracking-wider mb-1">
                AI Analysis Summary
              </p>
              <p className="text-[#e8e9ed] text-xs leading-relaxed whitespace-pre-wrap">
                {crossCheckResults.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
