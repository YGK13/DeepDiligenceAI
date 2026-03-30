'use client';
// ============================================================================
// components/views/BulkOperationsView.js — Bulk Operations for Multiple Companies
// ============================================================================
// Batch action center for performing operations across multiple companies at once.
// Eliminates the tedium of clicking through each company one-by-one when you
// have 20+ deals in your pipeline and need to research, export, or clean up.
//
// CAPABILITIES:
//   1. Research All Selected — sequential AI auto-fill (overview section) with progress
//   2. Export Selected to CSV — calls /api/export/spreadsheet for selected companies
//   3. Export Selected to PDF — calls /api/export/pdf for each selected company
//   4. Delete Selected — bulk deletion with confirmation dialog
//   5. Change Deal Stage — bulk-update deal stage for all selected companies
//
// Props:
//   - companies: Array of company objects from useCompanies hook
//   - settings: App settings object (provider, apiKeys, models)
//   - onResearchCompany: (companyId) => Promise — triggers AI auto-fill for one company
//   - onDeleteCompany: (companyId) => Promise — deletes a single company
//   - onUpdateCompany: (companyId, key, value) => void — updates a company field
//   - onExport: (companyIds) => void — triggers export for selected companies
//
// Dark theme: bg #0f1117, cards #1e2130, borders #2d3148, text #e8e9ed,
//             secondary #9ca0b0, accent #4a7dff, green #34d399, error #ef4444
// ============================================================================

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// CONSTANTS — Deal Stages & Operation Definitions
// ============================================================================

// Pipeline deal stages — used by the "Change Deal Stage" bulk action.
// Matches the canonical deal pipeline stages used throughout DueDrill.
const DEAL_STAGES = [
  'first-look',
  'initial-screen',
  'deep-dive',
  'ic-review',
  'term-sheet',
  'close',
  'pass',
];

// Human-readable labels for each deal stage — displayed in the dropdown.
// Mapping here because the raw slugs ('ic-review') aren't user-friendly.
const DEAL_STAGE_LABELS = {
  'first-look': 'First Look',
  'initial-screen': 'Initial Screen',
  'deep-dive': 'Deep Dive',
  'ic-review': 'IC Review',
  'term-sheet': 'Term Sheet',
  'close': 'Close',
  'pass': 'Pass',
};

// Color badges for deal stages — visual differentiation in the company list.
// Matches the pipeline view's color coding for consistency.
const DEAL_STAGE_COLORS = {
  'first-look': '#4a7dff',
  'initial-screen': '#a78bfa',
  'deep-dive': '#f59e0b',
  'ic-review': '#f97316',
  'term-sheet': '#34d399',
  'close': '#10b981',
  'pass': '#ef4444',
};

// ============================================================================
// OPERATION STATUS TYPES — tracks state of each bulk operation
// ============================================================================
// idle: nothing running
// running: operation in progress, show progress bar
// complete: operation finished, show summary
// error: operation failed globally (individual errors tracked per-company)
const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BulkOperationsView({
  companies = [],
  settings = {},
  onResearchCompany,
  onDeleteCompany,
  onUpdateCompany,
  onExport,
}) {
  // ============================================================================
  // STATE — Selection & Operation Tracking
  // ============================================================================

  // Set of selected company IDs — using Set for O(1) lookups during bulk ops
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Current operation status — drives the progress display
  const [operationStatus, setOperationStatus] = useState(STATUS.IDLE);

  // Which operation is currently running — used for labeling the progress bar
  const [activeOperation, setActiveOperation] = useState(null);

  // Progress tracking: how many companies processed out of total
  const [progress, setProgress] = useState({ current: 0, total: 0, currentName: '' });

  // Per-company results: array of { companyId, companyName, status: 'success'|'error', error? }
  const [results, setResults] = useState([]);

  // Delete confirmation dialog visibility
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Deal stage change — which stage to apply to all selected
  const [targetStage, setTargetStage] = useState('');

  // Show/hide the stage change dropdown panel
  const [showStagePanel, setShowStagePanel] = useState(false);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  // How many companies are selected — drives button enable/disable states
  const selectedCount = selectedIds.size;

  // Whether any operation is currently in flight — disables all action buttons
  const isRunning = operationStatus === STATUS.RUNNING;

  // Sorted companies — alphabetical by name for a consistent list order.
  // useMemo prevents re-sorting on every render when state changes.
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const nameA = (a.overview?.companyName || a.overview?.name || a.name || 'Unnamed').toLowerCase();
      const nameB = (b.overview?.companyName || b.overview?.name || b.name || 'Unnamed').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [companies]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  // Toggle a single company in/out of the selection set
  const toggleCompany = useCallback((companyId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  }, []);

  // Select ALL companies — one click to grab the entire pipeline
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(companies.map((c) => c.id)));
  }, [companies]);

  // Deselect ALL — clear the selection set completely
  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ============================================================================
  // HELPER — Get company display name (used throughout the component)
  // ============================================================================
  const getCompanyName = useCallback((company) => {
    return company.overview?.companyName || company.overview?.name || company.name || 'Unnamed Company';
  }, []);

  // ============================================================================
  // HELPER — Reset operation state back to idle (called after viewing results)
  // ============================================================================
  const resetOperation = useCallback(() => {
    setOperationStatus(STATUS.IDLE);
    setActiveOperation(null);
    setProgress({ current: 0, total: 0, currentName: '' });
    setResults([]);
  }, []);

  // ============================================================================
  // OPERATION: Research All Selected
  // ============================================================================
  // Calls /api/ai/autofill for each selected company's overview section.
  // Sequential execution — we don't want to hammer the API with parallel
  // requests that could hit rate limits or cause token exhaustion.
  // Shows a progress bar with the current company name as it processes.
  const handleResearchAll = useCallback(async () => {
    if (selectedCount === 0 || isRunning) return;

    const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));
    setActiveOperation('research');
    setOperationStatus(STATUS.RUNNING);
    setProgress({ current: 0, total: selectedCompanies.length, currentName: '' });
    setResults([]);

    const operationResults = [];

    for (let i = 0; i < selectedCompanies.length; i++) {
      const comp = selectedCompanies[i];
      const name = getCompanyName(comp);

      // Update progress to show which company we're working on
      setProgress({ current: i, total: selectedCompanies.length, currentName: name });

      try {
        // Call the autofill API for the overview section — this gives us
        // the company's basic profile data (description, sector, stage, etc.)
        // which is the most useful starting point for bulk research.
        const companyName = comp.overview?.companyName || comp.overview?.name || comp.name || '';
        const companyUrl = comp.overview?.websiteUrl || comp.overview?.url || '';

        const response = await fetch('/api/ai/autofill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: companyName,
            companyUrl: companyUrl,
            section: 'overview',
            provider: settings?.provider,
            model: settings?.models?.[settings?.provider] || '',
            apiKeys: settings?.apiKeys || {},
          }),
        });

        const result = await response.json();

        if (response.ok && result.success && result.data) {
          // Merge the AI data into the company's overview section
          // Using onUpdateCompany to persist the changes
          if (onUpdateCompany) {
            const currentOverview = comp.overview || {};
            const merged = { ...currentOverview };

            for (const [key, value] of Object.entries(result.data)) {
              if (key === 'suggestedScore') continue;
              if (value !== '' && value !== null && value !== undefined) {
                merged[key] = value;
              }
            }

            onUpdateCompany(comp.id, 'overview', merged);
          }

          operationResults.push({ companyId: comp.id, companyName: name, status: 'success' });
        } else {
          operationResults.push({
            companyId: comp.id,
            companyName: name,
            status: 'error',
            error: result.error || 'Auto-fill returned no data',
          });
        }
      } catch (err) {
        operationResults.push({
          companyId: comp.id,
          companyName: name,
          status: 'error',
          error: err.message || 'Network error',
        });
      }
    }

    // Finalize — show the results summary
    setProgress({ current: selectedCompanies.length, total: selectedCompanies.length, currentName: '' });
    setResults(operationResults);
    setOperationStatus(STATUS.COMPLETE);
  }, [selectedCount, isRunning, companies, selectedIds, settings, getCompanyName, onUpdateCompany]);

  // ============================================================================
  // OPERATION: Export Selected to CSV
  // ============================================================================
  // Calls the /api/export/spreadsheet endpoint with the selected company IDs.
  // The API returns a CSV file as a blob download.
  const handleExportCSV = useCallback(async () => {
    if (selectedCount === 0 || isRunning) return;

    const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));
    setActiveOperation('csv');
    setOperationStatus(STATUS.RUNNING);
    setProgress({ current: 0, total: selectedCompanies.length, currentName: 'Generating CSV...' });
    setResults([]);

    try {
      // If the parent provides an onExport callback, use it
      if (onExport) {
        onExport(Array.from(selectedIds));
      }

      // Also call the spreadsheet export API directly
      const response = await fetch('/api/export/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: selectedCompanies,
        }),
      });

      if (response.ok) {
        // Download the response as a file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `duedrill-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setResults([{ companyId: 'csv', companyName: 'CSV Export', status: 'success' }]);
      } else {
        const err = await response.json().catch(() => ({ error: 'Export failed' }));
        setResults([{ companyId: 'csv', companyName: 'CSV Export', status: 'error', error: err.error }]);
      }
    } catch (err) {
      setResults([{ companyId: 'csv', companyName: 'CSV Export', status: 'error', error: err.message }]);
    }

    setProgress({ current: selectedCompanies.length, total: selectedCompanies.length, currentName: '' });
    setOperationStatus(STATUS.COMPLETE);
  }, [selectedCount, isRunning, companies, selectedIds, onExport]);

  // ============================================================================
  // OPERATION: Export Selected to PDF
  // ============================================================================
  // Calls /api/export/pdf for each selected company to generate individual
  // DD memo PDFs. Sequential to avoid overloading the PDF generation service.
  const handleExportPDF = useCallback(async () => {
    if (selectedCount === 0 || isRunning) return;

    const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));
    setActiveOperation('pdf');
    setOperationStatus(STATUS.RUNNING);
    setProgress({ current: 0, total: selectedCompanies.length, currentName: '' });
    setResults([]);

    const operationResults = [];

    for (let i = 0; i < selectedCompanies.length; i++) {
      const comp = selectedCompanies[i];
      const name = getCompanyName(comp);
      setProgress({ current: i, total: selectedCompanies.length, currentName: name });

      try {
        const response = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: comp }),
        });

        if (response.ok) {
          // Download each PDF with a company-specific filename
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name.replace(/[^a-zA-Z0-9]/g, '-')}-dd-memo.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          operationResults.push({ companyId: comp.id, companyName: name, status: 'success' });
        } else {
          const err = await response.json().catch(() => ({ error: 'PDF generation failed' }));
          operationResults.push({ companyId: comp.id, companyName: name, status: 'error', error: err.error });
        }
      } catch (err) {
        operationResults.push({ companyId: comp.id, companyName: name, status: 'error', error: err.message });
      }
    }

    setProgress({ current: selectedCompanies.length, total: selectedCompanies.length, currentName: '' });
    setResults(operationResults);
    setOperationStatus(STATUS.COMPLETE);
  }, [selectedCount, isRunning, companies, selectedIds, getCompanyName]);

  // ============================================================================
  // OPERATION: Delete Selected
  // ============================================================================
  // Deletes all selected companies after user confirms via the confirmation dialog.
  // Sequential deletion with progress tracking so user can see what's happening.
  const handleDeleteSelected = useCallback(async () => {
    if (selectedCount === 0 || isRunning) return;

    const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));
    setShowDeleteConfirm(false);
    setActiveOperation('delete');
    setOperationStatus(STATUS.RUNNING);
    setProgress({ current: 0, total: selectedCompanies.length, currentName: '' });
    setResults([]);

    const operationResults = [];

    for (let i = 0; i < selectedCompanies.length; i++) {
      const comp = selectedCompanies[i];
      const name = getCompanyName(comp);
      setProgress({ current: i, total: selectedCompanies.length, currentName: name });

      try {
        if (onDeleteCompany) {
          await onDeleteCompany(comp.id);
        }
        operationResults.push({ companyId: comp.id, companyName: name, status: 'success' });
      } catch (err) {
        operationResults.push({ companyId: comp.id, companyName: name, status: 'error', error: err.message });
      }
    }

    // Clear selection since deleted companies no longer exist
    setSelectedIds(new Set());
    setProgress({ current: selectedCompanies.length, total: selectedCompanies.length, currentName: '' });
    setResults(operationResults);
    setOperationStatus(STATUS.COMPLETE);
  }, [selectedCount, isRunning, companies, selectedIds, getCompanyName, onDeleteCompany]);

  // ============================================================================
  // OPERATION: Change Deal Stage
  // ============================================================================
  // Bulk-updates the deal stage for all selected companies.
  // Uses onUpdateCompany to set company.overview.dealStage for each.
  const handleChangeStage = useCallback(async () => {
    if (selectedCount === 0 || isRunning || !targetStage) return;

    const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));
    setShowStagePanel(false);
    setActiveOperation('stage');
    setOperationStatus(STATUS.RUNNING);
    setProgress({ current: 0, total: selectedCompanies.length, currentName: '' });
    setResults([]);

    const operationResults = [];

    for (let i = 0; i < selectedCompanies.length; i++) {
      const comp = selectedCompanies[i];
      const name = getCompanyName(comp);
      setProgress({ current: i, total: selectedCompanies.length, currentName: name });

      try {
        if (onUpdateCompany) {
          // Update the overview section with the new deal stage
          const currentOverview = comp.overview || {};
          onUpdateCompany(comp.id, 'overview', { ...currentOverview, dealStage: targetStage });
        }
        operationResults.push({ companyId: comp.id, companyName: name, status: 'success' });
      } catch (err) {
        operationResults.push({ companyId: comp.id, companyName: name, status: 'error', error: err.message });
      }
    }

    setProgress({ current: selectedCompanies.length, total: selectedCompanies.length, currentName: '' });
    setResults(operationResults);
    setOperationStatus(STATUS.COMPLETE);
    setTargetStage('');
  }, [selectedCount, isRunning, targetStage, companies, selectedIds, getCompanyName, onUpdateCompany]);

  // ============================================================================
  // RENDER HELPERS — Progress Bar & Results Summary
  // ============================================================================

  // Operation labels for the progress display header
  const operationLabels = {
    research: 'Researching Companies',
    csv: 'Exporting to CSV',
    pdf: 'Generating PDF Memos',
    delete: 'Deleting Companies',
    stage: 'Updating Deal Stages',
  };

  // Count successes and errors in the results array
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ============================================================ */}
      {/* PAGE HEADER                                                    */}
      {/* ============================================================ */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#e8e9ed' }}>
          Bulk Actions
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9ca0b0' }}>
          Perform batch operations on multiple companies at once. Select companies below, then choose an action.
        </p>
      </div>

      {/* ============================================================ */}
      {/* PROGRESS DISPLAY — shown when an operation is running/complete */}
      {/* ============================================================ */}
      {operationStatus !== STATUS.IDLE && (
        <div
          className="rounded-xl p-5"
          style={{ background: '#1e2130', border: '1px solid #2d3148' }}
        >
          {/* Progress header with operation name */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: '#e8e9ed' }}>
              {operationLabels[activeOperation] || 'Processing'}
            </h3>
            {operationStatus === STATUS.COMPLETE && (
              <button
                className="text-xs px-3 py-1 rounded-md transition-all hover:opacity-80"
                style={{ background: '#2d3148', color: '#9ca0b0' }}
                onClick={resetOperation}
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Progress bar — shows percentage completion visually */}
          <div className="w-full rounded-full h-2 mb-3" style={{ background: '#2d3148' }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                // Width is a percentage of completed / total. Min 2% so the bar is visible.
                width: `${progress.total > 0 ? Math.max(2, (progress.current / progress.total) * 100) : 0}%`,
                background: operationStatus === STATUS.COMPLETE
                  ? (errorCount > 0 ? '#f59e0b' : '#34d399')
                  : '#4a7dff',
              }}
            />
          </div>

          {/* Progress text — "3 / 12 — Processing: Acme Corp" */}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: '#9ca0b0' }}>
              {progress.current} / {progress.total}
              {progress.currentName && operationStatus === STATUS.RUNNING && (
                <span style={{ color: '#e8e9ed' }}> — Processing: {progress.currentName}</span>
              )}
            </p>
            {operationStatus === STATUS.RUNNING && (
              <span className="text-xs" style={{ color: '#4a7dff' }}>
                In progress...
              </span>
            )}
          </div>

          {/* ============================================================ */}
          {/* RESULTS SUMMARY — shown after operation completes             */}
          {/* ============================================================ */}
          {operationStatus === STATUS.COMPLETE && results.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #2d3148' }}>
              {/* Summary stats */}
              <div className="flex gap-4 mb-3">
                <span className="text-xs font-medium" style={{ color: '#34d399' }}>
                  {successCount} succeeded
                </span>
                {errorCount > 0 && (
                  <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                    {errorCount} failed
                  </span>
                )}
              </div>

              {/* Per-company result list — only show if there are errors to report.
                  Showing every success would be noisy for large batches. */}
              {errorCount > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {results
                    .filter((r) => r.status === 'error')
                    .map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <span style={{ color: '#e8e9ed' }}>{r.companyName}</span>
                        <span style={{ color: '#ef4444' }}>{r.error}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ACTION BUTTONS — the 5 bulk operations                       */}
      {/* Disabled when no companies selected or operation in progress  */}
      {/* ============================================================ */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1e2130', border: '1px solid #2d3148' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: '#e8e9ed' }}>
            Operations
          </h3>
          <span className="text-xs" style={{ color: '#9ca0b0' }}>
            {selectedCount} of {companies.length} selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* --- Research All Selected --- */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(74, 125, 255, 0.12)',
              border: '1px solid rgba(74, 125, 255, 0.3)',
              color: '#4a7dff',
            }}
            disabled={selectedCount === 0 || isRunning}
            onClick={handleResearchAll}
          >
            <span className="text-lg">🔬</span>
            <div className="text-left">
              <div>Research Selected</div>
              <div className="text-xs opacity-60">AI auto-fill overview data</div>
            </div>
          </button>

          {/* --- Export to CSV --- */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
            }}
            disabled={selectedCount === 0 || isRunning}
            onClick={handleExportCSV}
          >
            <span className="text-lg">📊</span>
            <div className="text-left">
              <div>Export to CSV</div>
              <div className="text-xs opacity-60">Spreadsheet download</div>
            </div>
          </button>

          {/* --- Export to PDF --- */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(167, 139, 250, 0.12)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              color: '#a78bfa',
            }}
            disabled={selectedCount === 0 || isRunning}
            onClick={handleExportPDF}
          >
            <span className="text-lg">📄</span>
            <div className="text-left">
              <div>Export to PDF</div>
              <div className="text-xs opacity-60">DD memo per company</div>
            </div>
          </button>

          {/* --- Change Deal Stage --- */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
            }}
            disabled={selectedCount === 0 || isRunning}
            onClick={() => setShowStagePanel(!showStagePanel)}
          >
            <span className="text-lg">🔄</span>
            <div className="text-left">
              <div>Change Deal Stage</div>
              <div className="text-xs opacity-60">Bulk pipeline update</div>
            </div>
          </button>

          {/* --- Delete Selected --- */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
            disabled={selectedCount === 0 || isRunning}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <span className="text-lg">🗑️</span>
            <div className="text-left">
              <div>Delete Selected</div>
              <div className="text-xs opacity-60">Permanent removal</div>
            </div>
          </button>
        </div>

        {/* ============================================================ */}
        {/* STAGE CHANGE DROPDOWN — shown inline when user clicks button */}
        {/* ============================================================ */}
        {showStagePanel && (
          <div
            className="mt-4 p-4 rounded-lg flex items-center gap-3"
            style={{ background: '#0f1117', border: '1px solid #2d3148' }}
          >
            <label className="text-xs font-medium" style={{ color: '#9ca0b0' }}>
              Move to stage:
            </label>
            <select
              className="px-3 py-2 rounded-md text-sm outline-none flex-1"
              style={{
                background: '#1e2130',
                border: '1px solid #2d3148',
                color: '#e8e9ed',
              }}
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
            >
              <option value="">Select Stage...</option>
              {DEAL_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {DEAL_STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: '#f59e0b' }}
              disabled={!targetStage}
              onClick={handleChangeStage}
            >
              Apply
            </button>
            <button
              className="px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ color: '#9ca0b0' }}
              onClick={() => { setShowStagePanel(false); setTargetStage(''); }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* COMPANY SELECTION LIST                                        */}
      {/* Checkbox list of all companies with select all/none controls  */}
      {/* ============================================================ */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1e2130', border: '1px solid #2d3148' }}
      >
        {/* Selection header with controls */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: '#e8e9ed' }}>
            Companies ({companies.length})
          </h3>
          <div className="flex gap-2">
            <button
              className="text-xs px-3 py-1.5 rounded-md transition-all hover:opacity-80"
              style={{ background: '#2d3148', color: '#4a7dff' }}
              onClick={selectAll}
              disabled={isRunning}
            >
              Select All
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded-md transition-all hover:opacity-80"
              style={{ background: '#2d3148', color: '#9ca0b0' }}
              onClick={selectNone}
              disabled={isRunning}
            >
              Select None
            </button>
          </div>
        </div>

        {/* Empty state — no companies in the system yet */}
        {companies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm" style={{ color: '#9ca0b0' }}>
              No companies yet. Create companies first, then come back for bulk operations.
            </p>
          </div>
        )}

        {/* Company list — scrollable container for large portfolios */}
        {companies.length > 0 && (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {sortedCompanies.map((comp) => {
              const isSelected = selectedIds.has(comp.id);
              const name = getCompanyName(comp);
              const sector = comp.overview?.sector || '';
              const stage = comp.overview?.dealStage || comp.overview?.stage || '';
              const stageLabel = DEAL_STAGE_LABELS[stage] || stage;
              const stageColor = DEAL_STAGE_COLORS[stage] || '#9ca0b0';

              return (
                <label
                  key={comp.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    // Highlight selected rows with a subtle accent tint
                    background: isSelected ? 'rgba(74, 125, 255, 0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(74, 125, 255, 0.3)' : 'transparent'}`,
                  }}
                >
                  {/* Custom checkbox — styled to match dark theme */}
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: isSelected ? '#4a7dff' : 'transparent',
                      border: `2px solid ${isSelected ? '#4a7dff' : '#2d3148'}`,
                    }}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Hidden native checkbox for accessibility */}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => toggleCompany(comp.id)}
                    disabled={isRunning}
                  />

                  {/* Company info — name, sector, and deal stage badge */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#e8e9ed' }}>
                      {name}
                    </div>
                    {sector && (
                      <div className="text-xs truncate" style={{ color: '#9ca0b0' }}>
                        {sector}
                      </div>
                    )}
                  </div>

                  {/* Deal stage badge — color-coded for at-a-glance pipeline status */}
                  {stageLabel && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: `${stageColor}20`,
                        color: stageColor,
                        border: `1px solid ${stageColor}40`,
                      }}
                    >
                      {stageLabel}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION DIALOG                                    */}
      {/* Modal overlay — requires explicit "Yes, Delete" click.       */}
      {/* We NEVER auto-delete without confirmation for safety.        */}
      {/* ============================================================ */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: '#1e2130', border: '1px solid #2d3148' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#e8e9ed' }}>
              Delete {selectedCount} {selectedCount === 1 ? 'Company' : 'Companies'}?
            </h3>
            <p className="text-sm mb-1" style={{ color: '#9ca0b0' }}>
              This action cannot be undone. The following companies will be permanently removed:
            </p>

            {/* List the companies about to be deleted so the user knows exactly what they're doing */}
            <div
              className="my-3 p-3 rounded-lg max-h-40 overflow-y-auto space-y-1"
              style={{ background: '#0f1117' }}
            >
              {companies
                .filter((c) => selectedIds.has(c.id))
                .map((c) => (
                  <div key={c.id} className="text-xs" style={{ color: '#ef4444' }}>
                    {getCompanyName(c)}
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: '#2d3148', color: '#9ca0b0' }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#ef4444' }}
                onClick={handleDeleteSelected}
              >
                Yes, Delete {selectedCount} {selectedCount === 1 ? 'Company' : 'Companies'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
