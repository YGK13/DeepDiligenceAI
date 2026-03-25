'use client';
// ============================================================
// DueDrill — Main Application Page
// ============================================================
// Orchestrates state management, routing between views,
// company CRUD, and settings persistence.
//
// DATA LAYER: Uses Supabase hooks (useCompanies, useSettings)
// which automatically fall back to localStorage when Supabase
// is not configured. Zero-config local mode, cloud-ready.
// ============================================================

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================
// LAYOUT COMPONENTS
// ============================================================
import AppShell from '@/components/layout/AppShell';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// ============================================================
// MODALS
// ============================================================
import CompanyVerificationModal from '@/components/modals/CompanyVerificationModal';

// ============================================================
// ONBOARDING — first-time user wizard (shows once, then never)
// ============================================================
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

// ============================================================
// VIEW COMPONENTS
// ============================================================
import DashboardView from '@/components/views/DashboardView';
import ReportView from '@/components/views/ReportView';
import ComparisonView from '@/components/views/ComparisonView';
import PipelineView from '@/components/views/PipelineView';
import TimelineView from '@/components/views/TimelineView';
import ScoringModelEditor from '@/components/views/ScoringModelEditor';
import SettingsView from '@/components/views/SettingsView';
import ReferenceCheckView from '@/components/views/ReferenceCheckView';
import DeckUploadPanel from '@/components/deck/DeckUploadPanel';
import IntegrationPanel from '@/components/integrations/IntegrationPanel';
import UpgradePrompt from '@/components/ui/UpgradePrompt';

// ============================================================
// SECTION COMPONENTS — all 16 DD categories
// ============================================================
import {
  OverviewSection,
  TeamSection,
  ProductSection,
  MarketSection,
  BusinessSection,
  TractionSection,
  FinancialSection,
  CompetitiveSection,
  IPSection,
  CustomersSection,
  InvestorsSection,
  RegulatorySection,
  LegalSection,
  IsraelSection,
  RisksSection,
  DealSection,
} from '@/components/sections';

// ============================================================
// DATA LAYER — Supabase hooks with localStorage fallback
// ============================================================
import { useSupabaseAuth } from '@/lib/hooks/useSupabaseAuth';
import { useCompanies } from '@/lib/hooks/useCompanies';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { calculateOverallScore, calculateCompletionStats } from '@/lib/scoring';

// ============================================================
// SECTION → COMPONENT MAPPING
// Maps tab IDs to their React components for dynamic rendering
// ============================================================
const SECTION_COMPONENTS = {
  overview: OverviewSection,
  team: TeamSection,
  product: ProductSection,
  market: MarketSection,
  business: BusinessSection,
  traction: TractionSection,
  financial: FinancialSection,
  competitive: CompetitiveSection,
  ip: IPSection,
  customers: CustomersSection,
  investors: InvestorsSection,
  regulatory: RegulatorySection,
  legal: LegalSection,
  israel: IsraelSection,
  risks: RisksSection,
  deal: DealSection,
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function HomePage() {
  // ============================================================
  // AUTH & DATA HOOKS
  // ============================================================
  // useSupabaseAuth: returns { user, loading: authLoading, signOut }
  // useCompanies: returns { companies, loading, createCompany, updateCompany, deleteCompany, importCompanies }
  // useSettings: returns { settings, loading, saveSettings }
  //
  // When Supabase is not configured (no env vars), all three hooks
  // run in "local mode" — user=null, data from localStorage.
  // ============================================================
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const {
    companies,
    setCompanies,
    loading: companiesLoading,
    createCompany,
    updateCompany,
    deleteCompany,
    importCompanies,
  } = useCompanies(user);
  const { settings, loading: settingsLoading, saveSettings } = useSettings(user);

  // --- Subscription: controls feature gating ---
  const { plan, planLabel, canAccess, isLoading: subLoading } = useSubscription(user);

  // --- UI state (not persisted) ---
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  // --- Company Verification state ---
  // When the user types a name and clicks "Create", we first show a
  // verification modal so they confirm the RIGHT company before we
  // spend API credits auto-filling 214 fields with the wrong data.
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [pendingCompanyName, setPendingCompanyName] = useState('');
  const [pendingCompanyUrl, setPendingCompanyUrl] = useState('');

  // --- Onboarding wizard state ---
  // Shown once for first-time users with no companies.
  // After completion or skip, localStorage flag prevents re-showing.
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Derived loading state ---
  // We're "hydrated" when all async data loads have finished.
  // This prevents flash-of-empty-content on first render.
  const isHydrated = !authLoading && !companiesLoading && !settingsLoading && !subLoading;

  // ============================================================
  // ONBOARDING CHECK — show wizard for first-time users
  // Fires once after hydration. If the user has zero companies
  // and hasn't been onboarded yet, show the wizard overlay.
  // ============================================================
  useEffect(() => {
    if (!isHydrated) return;
    const alreadyOnboarded = localStorage.getItem('duedrill_onboarded');
    if (companies.length === 0 && !alreadyOnboarded) {
      setShowOnboarding(true);
    }
  }, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-select first company when companies load ---
  // Only runs when companies change AND no company is selected
  useMemo(() => {
    if (isHydrated && companies.length > 0 && !activeCompanyId) {
      setActiveCompanyId(companies[0].id);
    }
  }, [isHydrated, companies, activeCompanyId]);

  // --- Derive the active company from state ---
  const company = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) || null,
    [companies, activeCompanyId]
  );

  // --- Calculate overall score for the active company ---
  const overallScore = useMemo(
    () => (company ? calculateOverallScore(company) : 0),
    [company]
  );

  // --- Calculate completion badges for sidebar nav ---
  const completionBadges = useMemo(() => {
    if (!company) return {};
    const stats = calculateCompletionStats(company);
    const badges = {};
    for (const [section, info] of Object.entries(stats)) {
      badges[section] = `${info.filled}/${info.total}`;
    }
    return badges;
  }, [company]);

  // ============================================================
  // COMPANY CRUD OPERATIONS
  // ============================================================

  // ============================================================
  // STEP 1: User types a name → open verification modal
  // We DON'T create the company yet. First we verify identity.
  // ============================================================
  const handleNewCompany = useCallback(
    (name) => {
      if (!name?.trim()) return;
      setPendingCompanyName(name.trim());
      setPendingCompanyUrl('');
      setShowNewModal(false);
      setNewCompanyName('');
      setShowVerifyModal(true); // triggers the verification modal
    },
    []
  );

  // ============================================================
  // STEP 2: User confirms a candidate from verification modal
  // NOW we create the company with verified data pre-populated.
  // ============================================================
  const handleVerifiedCompany = useCallback(
    async (candidate) => {
      setShowVerifyModal(false);

      // Create the company with the verified name
      const newCompany = await createCompany(candidate.name);
      if (!newCompany) return;

      // Pre-populate the overview section with verified data from the candidate
      const overviewData = {
        companyName: candidate.name,
        websiteUrl: candidate.domain ? `https://${candidate.domain}` : '',
        hqCity: candidate.location?.split(',')[0]?.trim() || '',
        hqCountry: candidate.location?.split(',')[1]?.trim() || '',
        sector: candidate.sector !== 'Unknown' ? candidate.sector : '',
        stage: candidate.stage !== 'Unknown' ? candidate.stage : '',
        yearFounded: candidate.founded !== 'Unknown' ? candidate.founded : '',
        elevatorPitch: candidate.description || '',
      };
      updateCompany(newCompany.id, 'overview', overviewData);

      setActiveCompanyId(newCompany.id);
      setActiveTab('dashboard');
    },
    [createCompany, updateCompany]
  );

  // ============================================================
  // STEP 2b: User says "none match" — create with just the name
  // ============================================================
  const handleNoVerificationMatch = useCallback(
    async () => {
      setShowVerifyModal(false);

      // Create company with just the typed name — no pre-population
      const newCompany = await createCompany(pendingCompanyName);
      if (newCompany) {
        updateCompany(newCompany.id, 'overview', { companyName: pendingCompanyName });
        setActiveCompanyId(newCompany.id);
        setActiveTab('overview'); // send to overview so they can fill details manually
      }
    },
    [pendingCompanyName, createCompany, updateCompany]
  );

  // Delete the active company (with confirmation)
  const handleDeleteCompany = useCallback(async () => {
    if (!company) return;
    if (
      !window.confirm(
        `Delete "${company.overview?.companyName || company.overview?.name || 'Unnamed'}"? This cannot be undone.`
      )
    )
      return;

    await deleteCompany(activeCompanyId);

    // Switch to the next available company or null
    const remaining = companies.filter((c) => c.id !== activeCompanyId);
    if (remaining.length > 0) {
      setActiveCompanyId(remaining[0].id);
    } else {
      setActiveCompanyId(null);
    }
    setActiveTab('dashboard');
  }, [company, activeCompanyId, companies, deleteCompany]);

  // Switch active company
  const handleCompanyChange = useCallback((companyId) => {
    setActiveCompanyId(companyId);
    setActiveTab('dashboard');
  }, []);

  // ============================================================
  // SECTION DATA UPDATE HANDLER
  // Called by every section component when a field changes.
  // Delegates to useCompanies.updateCompany which handles both
  // Supabase and localStorage persistence.
  // ============================================================
  const handleSectionChange = useCallback(
    (sectionKey, updatedData) => {
      if (!activeCompanyId) return;
      updateCompany(activeCompanyId, sectionKey, updatedData);
    },
    [activeCompanyId, updateCompany]
  );

  // ============================================================
  // AI RESEARCH RESULT HANDLER
  // Stores AI output per section in company.aiResearch
  // ============================================================
  const handleAiResult = useCallback(
    (sectionId, text) => {
      if (!activeCompanyId) return;
      updateCompany(activeCompanyId, 'aiResearch', { [sectionId]: text });
    },
    [activeCompanyId, updateCompany]
  );

  // ============================================================
  // AI AUTO-FILL HANDLER
  // Takes structured JSON from the autofill API and merges it
  // into the section's existing data. Only overwrites fields that
  // the AI returned non-empty values for — preserves user edits.
  //
  // Now also accepts a third argument: confidenceData — a map of
  // field keys to confidence levels ("verified"|"likely"|"inferred"|"unknown").
  // Stored in company.confidenceData[sectionId] for ConfidenceBadge rendering.
  // ============================================================
  const handleAutoFill = useCallback(
    (sectionId, aiData, confidenceData) => {
      if (!activeCompanyId || !aiData) return;

      // Get the current section data
      const currentData = company?.[sectionId] || {};

      // Merge AI data into current data — only overwrite empty fields
      // or fields that the user hasn't manually edited.
      // AI returns "" for unknown fields, so we skip those.
      const merged = { ...currentData };
      for (const [key, value] of Object.entries(aiData)) {
        if (value !== '' && value !== null && value !== undefined) {
          // Overwrite the field with AI data (even if user had something there)
          // because the user explicitly clicked "Auto-Fill"
          merged[key] = value;
        }
      }

      // Update the company section with merged data
      handleSectionChange(sectionId, merged);

      // ---- Store confidence metadata alongside section data ----
      // company.confidenceData is a top-level object keyed by sectionId,
      // each value is { fieldKey: "verified"|"likely"|"inferred"|"unknown" }.
      // Stored as a separate key so it doesn't pollute actual field data.
      if (confidenceData && Object.keys(confidenceData).length > 0) {
        const existingConfidence = company?.confidenceData || {};
        updateCompany(activeCompanyId, 'confidenceData', {
          ...existingConfidence,
          [sectionId]: confidenceData,
        });
      }
    },
    [activeCompanyId, company, handleSectionChange, updateCompany]
  );

  // ============================================================
  // RESEARCH ALL SECTIONS HANDLER
  // Now calls each section INDIVIDUALLY so we can show per-section
  // progress instead of one opaque "waiting..." spinner.
  //
  // The onProgress callback is called after each section completes:
  //   onProgress({ section, sectionIndex, totalSections, filled, status })
  // This lets DashboardView render a live checklist of section progress.
  // ============================================================
  const handleResearchAll = useCallback(
    async (onProgress) => {
      if (!activeCompanyId || !company) return;

      const companyName = company.overview?.companyName || company.overview?.name || company.name || '';
      const companyUrl = company.overview?.websiteUrl || company.overview?.url || '';

      if (!companyName) {
        alert('Enter a company name in the Overview section first.');
        return;
      }

      // The 15 autofillable sections (matches AUTOFILL_SECTION_ORDER)
      const sections = [
        'overview', 'team', 'product', 'market', 'business', 'traction',
        'financial', 'competitive', 'ip', 'customers', 'investors',
        'regulatory', 'legal', 'israel', 'risks',
      ];

      let totalFilled = 0;
      let errors = 0;
      const allConfidence = {};

      for (let i = 0; i < sections.length; i++) {
        const sectionKey = sections[i];

        // Report progress: this section is starting
        if (onProgress) {
          onProgress({
            section: sectionKey,
            sectionIndex: i,
            totalSections: sections.length,
            status: 'researching',
          });
        }

        try {
          const response = await fetch('/api/ai/autofill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName,
              companyUrl,
              section: sectionKey,
              provider: settings?.provider,
              model: settings?.models?.[settings?.provider] || '',
              apiKeys: settings?.apiKeys || {},
            }),
          });

          const result = await response.json();

          if (response.ok && result.success && result.data) {
            // Merge AI data into the company section
            const currentData = company[sectionKey] || {};
            const merged = { ...currentData };
            let sectionFilled = 0;

            for (const [key, value] of Object.entries(result.data)) {
              if (value !== '' && value !== null && value !== undefined) {
                merged[key] = value;
                sectionFilled++;
                totalFilled++;
              }
            }

            handleSectionChange(sectionKey, merged);

            // Collect confidence data
            if (result.confidence) {
              allConfidence[sectionKey] = result.confidence;
            }

            // Report progress: section complete
            if (onProgress) {
              onProgress({
                section: sectionKey,
                sectionIndex: i,
                totalSections: sections.length,
                filled: sectionFilled,
                status: 'done',
              });
            }
          } else {
            errors++;
            if (onProgress) {
              onProgress({
                section: sectionKey,
                sectionIndex: i,
                totalSections: sections.length,
                status: 'error',
                error: result.error || 'Failed',
              });
            }
          }
        } catch (err) {
          errors++;
          if (onProgress) {
            onProgress({
              section: sectionKey,
              sectionIndex: i,
              totalSections: sections.length,
              status: 'error',
              error: err.message,
            });
          }
        }
      }

      // Persist all confidence metadata in one update
      if (Object.keys(allConfidence).length > 0) {
        const existingConfidence = company?.confidenceData || {};
        updateCompany(activeCompanyId, 'confidenceData', {
          ...existingConfidence,
          ...allConfidence,
        });
      }

      return { success: errors === 0, totalFilled, errors };
    },
    [activeCompanyId, company, settings, handleSectionChange, updateCompany]
  );

  // ============================================================
  // SETTINGS HANDLER
  // ============================================================
  const handleSaveSettings = useCallback(
    (newSettings) => {
      saveSettings(newSettings);
    },
    [saveSettings]
  );

  // ============================================================
  // DATA IMPORT/EXPORT
  // ============================================================
  const handleExportData = useCallback(() => {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      companies,
      settings,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepdiligence-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [companies, settings]);

  const handleImportData = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.companies) {
            await importCompanies(data.companies);
            if (data.companies.length > 0) {
              setActiveCompanyId(data.companies[0].id);
            }
          }
          if (data.settings) {
            saveSettings(data.settings);
          }
          alert(`Imported ${data.companies?.length || 0} companies successfully.`);
        } catch (err) {
          alert('Import failed: Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    },
    [importCompanies, saveSettings]
  );

  // ============================================================
  // CONTENT RENDERER — Maps activeTab to the right component
  // ============================================================
  const renderContent = () => {
    // No company selected — show welcome state
    if (!company && activeTab !== 'settings' && activeTab !== 'pipeline') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-blue)' }}>
            Welcome to DueDrill
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            AI-powered startup due diligence for smarter investment decisions.
          </p>
          <button
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent-blue)' }}
            onClick={() => setShowNewModal(true)}
          >
            + Create Your First Company
          </button>
        </div>
      );
    }

    // Special views (not section editors)
    if (activeTab === 'dashboard') {
      return <DashboardView company={company} onResearchAll={handleResearchAll} />;
    }
    if (activeTab === 'report') {
      return <ReportView company={company} />;
    }
    if (activeTab === 'pipeline') {
      if (!canAccess('pipeline')) return <UpgradePrompt feature="pipeline" currentPlan={plan} />;
      return (
        <PipelineView
          companies={companies}
          onCompanySelect={(id) => {
            setActiveCompanyId(id);
            setActiveTab('dashboard');
          }}
        />
      );
    }
    if (activeTab === 'comparison') {
      if (!canAccess('comparison')) return <UpgradePrompt feature="comparison" currentPlan={plan} />;
      return <ComparisonView companies={companies} />;
    }
    if (activeTab === 'timeline') {
      return <TimelineView company={company} onChange={handleSectionChange} />;
    }
    if (activeTab === 'scoring') {
      return (
        <ScoringModelEditor
          company={company}
          settings={settings}
          onSaveModel={(model) => {
            // Add the custom model to settings.scoringModels array
            const existing = settings?.scoringModels || [];
            saveSettings({ ...settings, scoringModels: [...existing, model] });
          }}
          onSelectModel={(modelId) => {
            // Store the selected scoring model ID on the company
            if (company && activeCompanyId) {
              updateCompany(activeCompanyId, 'scoringModelId', modelId);
            }
          }}
        />
      );
    }
    if (activeTab === 'references') {
      if (!canAccess('references')) return <UpgradePrompt feature="references" currentPlan={plan} />;
      return <ReferenceCheckView company={company} onChange={handleSectionChange} />;
    }
    // ============================================================
    // DECK UPLOAD — Premium feature (Fund+ plan)
    // ============================================================
    if (activeTab === 'deck') {
      if (!canAccess('deckUpload')) return <UpgradePrompt feature="deckUpload" currentPlan={plan} />;
      return (
        <div className="max-w-3xl">
          <DeckUploadPanel
            company={company}
            settings={settings}
            onAutoFill={handleAutoFill}
            onSaveResult={handleAiResult}
          />
        </div>
      );
    }
    // ============================================================
    // DATA INTEGRATIONS — Premium feature (Solo+ plan)
    // ============================================================
    if (activeTab === 'integrations') {
      if (!canAccess('integrations')) return <UpgradePrompt feature="integrations" currentPlan={plan} />;
      return (
        <IntegrationPanel
          company={company}
          settings={settings}
          onAutoFill={handleAutoFill}
        />
      );
    }
    if (activeTab === 'settings') {
      return (
        <SettingsView
          settings={settings}
          onSave={handleSaveSettings}
          onExport={handleExportData}
          onImport={handleImportData}
        />
      );
    }

    // Section editor — look up the component from the mapping
    // Pass confidenceData for the active section so FormField can show ConfidenceBadge
    const SectionComponent = SECTION_COMPONENTS[activeTab];
    if (SectionComponent && company) {
      return (
        <SectionComponent
          data={company[activeTab] || {}}
          onChange={handleSectionChange}
          company={company}
          settings={settings}
          onAiResult={handleAiResult}
          onAutoFill={handleAutoFill}
          confidenceData={company?.confidenceData?.[activeTab] || {}}
        />
      );
    }

    // Fallback
    return <DashboardView company={company} />;
  };

  // ============================================================
  // RENDER — Don't render until hydrated (avoids SSR mismatch)
  // ============================================================
  if (!isHydrated) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4 ai-loading">🔍</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading DueDrill...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <AppShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          companies={companies}
          activeCompanyId={activeCompanyId}
          onCompanyChange={handleCompanyChange}
          onNewCompany={() => setShowNewModal(true)}
          onDeleteCompany={handleDeleteCompany}
          overallScore={overallScore}
          completionBadges={completionBadges}
          user={user}
          onSignOut={signOut}
        >
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </AppShell>
      </ErrorBoundary>

      {/* ============================================================ */}
      {/* NEW COMPANY MODAL                                            */}
      {/* ============================================================ */}
      {showNewModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">New Company</h2>
            <input
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none mb-4"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              placeholder="Company name..."
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCompanyName.trim()) {
                  handleNewCompany(newCompanyName);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => {
                  setShowNewModal(false);
                  setNewCompanyName('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent-blue)' }}
                onClick={() => handleNewCompany(newCompanyName)}
                disabled={!newCompanyName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPANY VERIFICATION MODAL                                   */}
      {/* Shows 3-5 candidate matches so user confirms the RIGHT one   */}
      {/* before we spend API credits auto-filling 214 fields.         */}
      {/* ============================================================ */}
      {showVerifyModal && (
        <CompanyVerificationModal
          companyName={pendingCompanyName}
          companyUrl={pendingCompanyUrl}
          settings={settings}
          onConfirm={handleVerifiedCompany}
          onCancel={() => setShowVerifyModal(false)}
          onNoneMatch={handleNoVerificationMatch}
        />
      )}

      {/* ============================================================ */}
      {/* ONBOARDING WIZARD                                            */}
      {/* Full-screen overlay for first-time users with no companies.  */}
      {/* Guides them through creating their first company, then       */}
      {/* hands off to the verification modal for identity confirm.    */}
      {/* ============================================================ */}
      {showOnboarding && (
        <OnboardingWizard
          onCreateCompany={(name, url) => {
            // Dismiss the wizard, then trigger the normal new-company
            // verification flow so the user confirms the right entity.
            setShowOnboarding(false);
            setPendingCompanyName(name);
            setPendingCompanyUrl(url || '');
            setShowVerifyModal(true);
          }}
          onSkip={() => setShowOnboarding(false)}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}
