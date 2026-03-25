'use client';

// ============================================================================
// components/export/ExportPanel.js — DueDrill: Spreadsheet Export UI
// ============================================================================
// Beautiful export panel that lets users generate professional CSV exports
// of their due diligence data — designed for IC meetings and partner sharing.
//
// Two export modes:
//   1. PORTFOLIO SUMMARY — all companies in one spreadsheet (summary table)
//   2. SINGLE COMPANY DEEP DIVE — all 16 sections for one company
//
// Props:
//   companies     — array of all company objects from the companies list
//   currentCompany — the currently selected company (for single export default)
//   onClose       — optional callback to close/collapse the panel
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';

// ============ EXPORT MODE DEFINITIONS ============
const EXPORT_MODES = {
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio Summary',
    description: 'All companies in one spreadsheet — perfect for IC pipeline reviews',
    icon: '\uD83D\uDCCA',
  },
  single: {
    id: 'single',
    label: 'Single Company Deep Dive',
    description: 'All 16 sections with every field — full DD export for one company',
    icon: '\uD83D\uDD0D',
  },
};

// ============ COLUMN PREVIEWS ============
// Show users what columns they'll get in each export mode
const PORTFOLIO_COLUMNS = [
  'Company', 'Stage', 'Sector', 'Score', 'Verdict',
  'Founded', 'HQ', 'Total Raised', 'ARR', 'Team Size',
  'Deal Stage', 'Risk Level',
];

const DEEP_DIVE_SECTIONS = [
  'Overview', 'Team', 'Product', 'Market', 'Business Model',
  'Traction', 'Financial', 'Competitive', 'IP & Tech', 'Customers',
  'Investors', 'Regulatory', 'Legal', 'Israel', 'Risks', 'Deal Terms',
];

// ============ COMPONENT ============
export default function ExportPanel({ companies = [], currentCompany = null, onClose }) {
  // ============ STATE ============
  const [mode, setMode] = useState('portfolio');
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    currentCompany?.id || ''
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  // ============ DERIVED STATE ============
  // Find the selected company for single export mode
  const selectedCompany = useMemo(() => {
    if (mode !== 'single') return null;
    return companies.find((c) => c.id === selectedCompanyId) || currentCompany || null;
  }, [mode, selectedCompanyId, companies, currentCompany]);

  // Determine if export is possible
  const canExport = useMemo(() => {
    if (mode === 'portfolio') {
      return companies.length > 0;
    }
    return selectedCompany !== null;
  }, [mode, companies.length, selectedCompany]);

  // ============ EXPORT HANDLER ============
  const handleExport = useCallback(async () => {
    if (!canExport) return;

    setIsExporting(true);
    setExportError('');
    setExportSuccess('');

    try {
      // Build the request payload
      const payload = {
        format: 'csv',
        mode: mode,
        companies: mode === 'single'
          ? [selectedCompany]
          : companies,
      };

      // Call the export API
      const response = await fetch('/api/export/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Export failed (${response.status})`);
      }

      // Get the CSV blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Extract filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch?.[1] || `DueDrill-Export-${new Date().toISOString().slice(0, 10)}.csv`;

      // Create temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success feedback
      const companyCount = mode === 'single' ? 1 : companies.length;
      setExportSuccess(
        `Exported ${companyCount} ${companyCount === 1 ? 'company' : 'companies'} to ${filename}`
      );

      // Auto-clear success message after 5 seconds
      setTimeout(() => setExportSuccess(''), 5000);
    } catch (err) {
      console.error('[ExportPanel] Export failed:', err);
      setExportError(err.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [canExport, mode, selectedCompany, companies]);

  // ============ RENDER ============
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg overflow-hidden">
      {/* ============ PANEL HEADER ============ */}
      <div className="px-5 py-4 border-b border-[#2d3148] flex items-center justify-between">
        <div>
          <h3 className="text-[#e8e9ed] text-sm font-bold flex items-center gap-2">
            <svg
              width="16"
              height="16"
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
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export to Spreadsheet
          </h3>
          <p className="text-[#6b7084] text-[11px] mt-0.5">
            Generate a professional CSV for IC meetings and partner sharing
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#6b7084] hover:text-[#e8e9ed] transition-colors p-1 cursor-pointer"
            aria-label="Close export panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* ============ MODE SELECTOR ============ */}
        <div>
          <label className="block text-[#9ca0b0] text-xs font-semibold mb-2 uppercase tracking-wider">
            Export Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(EXPORT_MODES).map((exportMode) => {
              const isActive = mode === exportMode.id;
              // Disable portfolio mode if no companies
              const isDisabled =
                exportMode.id === 'portfolio' && companies.length === 0;

              return (
                <button
                  key={exportMode.id}
                  onClick={() => !isDisabled && setMode(exportMode.id)}
                  disabled={isDisabled}
                  className={
                    'text-left p-3.5 rounded-lg border transition-all duration-200 cursor-pointer ' +
                    (isActive
                      ? 'bg-[#34d399]/10 border-[#34d399]/40 ring-1 ring-[#34d399]/20'
                      : isDisabled
                        ? 'bg-[#252836]/50 border-[#2d3148]/50 opacity-50 cursor-not-allowed'
                        : 'bg-[#252836] border-[#2d3148] hover:border-[#34d399]/30 hover:bg-[#2d3148]')
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{exportMode.icon}</span>
                    <span
                      className={
                        'text-sm font-semibold ' +
                        (isActive ? 'text-[#34d399]' : 'text-[#e8e9ed]')
                      }
                    >
                      {exportMode.label}
                    </span>
                  </div>
                  <p className="text-[#6b7084] text-[11px] leading-snug">
                    {exportMode.description}
                  </p>
                  {/* Company count badge for portfolio mode */}
                  {exportMode.id === 'portfolio' && (
                    <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#2d3148] text-[#9ca0b0]">
                      {companies.length} {companies.length === 1 ? 'company' : 'companies'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ COMPANY SELECTOR (SINGLE MODE ONLY) ============ */}
        {mode === 'single' && (
          <div>
            <label className="block text-[#9ca0b0] text-xs font-semibold mb-2 uppercase tracking-wider">
              Select Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className={
                'w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] ' +
                'rounded-lg text-sm px-3 py-2.5 cursor-pointer appearance-none ' +
                'focus:border-[#34d399] outline-none transition-colors duration-200'
              }
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca0b0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem',
              }}
            >
              <option value="" className="bg-[#252836]">
                Choose a company...
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#252836]">
                  {c.name || c.overview?.companyName || 'Unnamed Company'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ============ FORMAT SELECTOR ============ */}
        <div>
          <label className="block text-[#9ca0b0] text-xs font-semibold mb-2 uppercase tracking-wider">
            Format
          </label>
          <div className="flex items-center gap-3">
            {/* CSV — active */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#34d399]/10 border border-[#34d399]/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[#34d399] text-xs font-semibold">CSV</span>
            </div>
            {/* XLSX — coming soon */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#252836] border border-[#2d3148] opacity-50">
              <span className="text-[#6b7084] text-xs">Excel (.xlsx) coming soon</span>
            </div>
          </div>
        </div>

        {/* ============ COLUMN PREVIEW ============ */}
        <div>
          <label className="block text-[#9ca0b0] text-xs font-semibold mb-2 uppercase tracking-wider">
            {mode === 'portfolio' ? 'Columns Included' : 'Sections Included'}
          </label>
          <div className="bg-[#252836] border border-[#2d3148] rounded-lg p-3">
            <div className="flex flex-wrap gap-1.5">
              {(mode === 'portfolio' ? PORTFOLIO_COLUMNS : DEEP_DIVE_SECTIONS).map(
                (col) => (
                  <span
                    key={col}
                    className="inline-block px-2 py-1 text-[10px] font-medium rounded bg-[#2d3148] text-[#9ca0b0]"
                  >
                    {col}
                  </span>
                )
              )}
            </div>
            {mode === 'single' && (
              <p className="text-[#6b7084] text-[10px] mt-2">
                Each section includes all fields, values, and score ratings.
              </p>
            )}
            {mode === 'portfolio' && (
              <p className="text-[#6b7084] text-[10px] mt-2">
                Includes summary table + category score breakdown for side-by-side comparison.
              </p>
            )}
          </div>
        </div>

        {/* ============ ERROR MESSAGE ============ */}
        {exportError && (
          <div className="px-3 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
            <p className="text-[#ef4444] text-xs font-medium">{exportError}</p>
          </div>
        )}

        {/* ============ SUCCESS MESSAGE ============ */}
        {exportSuccess && (
          <div className="px-3 py-2.5 rounded-lg bg-[#34d399]/10 border border-[#34d399]/30">
            <p className="text-[#34d399] text-xs font-medium">{exportSuccess}</p>
          </div>
        )}

        {/* ============ EXPORT BUTTON ============ */}
        <button
          onClick={handleExport}
          disabled={!canExport || isExporting}
          className={
            'w-full inline-flex items-center justify-center gap-2 ' +
            'font-bold rounded-lg border border-transparent ' +
            'py-3 px-5 text-sm transition-all duration-200 cursor-pointer ' +
            (canExport && !isExporting
              ? 'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886] active:bg-[#27a377] shadow-lg shadow-[#34d399]/20'
              : 'bg-[#34d399]/20 text-[#34d399]/50 cursor-not-allowed')
          }
        >
          {isExporting ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-[#0f1117]/30 border-t-[#0f1117] animate-spin" />
              Generating CSV...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {mode === 'portfolio'
                ? `Export ${companies.length} ${companies.length === 1 ? 'Company' : 'Companies'} as CSV`
                : 'Export Deep Dive as CSV'}
            </>
          )}
        </button>

        {/* ============ HELP TEXT ============ */}
        <p className="text-[#6b7084] text-[10px] text-center">
          CSV files open in Excel, Google Sheets, and Numbers. UTF-8 encoded with BOM for proper character display.
        </p>
      </div>
    </div>
  );
}
