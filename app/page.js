'use client';
// ============================================================
// DeepDiligence AI — Main Application Page
// Orchestrates state management, routing between views,
// company CRUD, and settings persistence.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================
// LAYOUT COMPONENTS
// ============================================================
import AppShell from '@/components/layout/AppShell';

// ============================================================
// VIEW COMPONENTS
// ============================================================
import DashboardView from '@/components/views/DashboardView';
import ReportView from '@/components/views/ReportView';
import SettingsView from '@/components/views/SettingsView';

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
// DATA LAYER
// ============================================================
import { createEmptyCompany } from '@/lib/schemas';
import { calculateOverallScore, calculateCompletionStats } from '@/lib/scoring';
import { SCORE_WEIGHTS } from '@/lib/constants';

// ============================================================
// LOCALSTORAGE KEYS — for client-side persistence
// Will be replaced by Supabase in Phase 2
// ============================================================
const STORAGE_KEY = 'deepdiligence_companies';
const SETTINGS_KEY = 'deepdiligence_settings';
const DEFAULT_SETTINGS = { provider: 'perplexity', apiKeys: {}, models: {} };

// ============================================================
// PERSISTENCE HELPERS — localStorage read/write
// ============================================================
function loadCompanies() {
  try {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveCompanies(companies) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

function loadSettings() {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(data);

    // Migration: convert old single-key format to multi-provider
    if (parsed.apiKey && !parsed.apiKeys) {
      const migrated = {
        provider: 'anthropic',
        apiKeys: { anthropic: parsed.apiKey },
        models: {
          anthropic: parsed.model || 'claude-sonnet-4-20250514',
        },
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return {
      provider: parsed.provider || 'perplexity',
      apiKeys: parsed.apiKeys || {},
      models: parsed.models || {},
    };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    // Only persist canonical keys — strip legacy fields
    const clean = {
      provider: settings.provider,
      apiKeys: settings.apiKeys,
      models: settings.models,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  } catch (e) {
    console.error('Settings save failed:', e);
  }
}

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
  // --- Core state ---
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  // --- Load persisted data on mount (client-side only) ---
  useEffect(() => {
    const loaded = loadCompanies();
    const loadedSettings = loadSettings();
    setCompanies(loaded);
    setSettings(loadedSettings);
    if (loaded.length > 0) {
      setActiveCompanyId(loaded[0].id);
    }
    setIsHydrated(true);
  }, []);

  // --- Auto-save companies whenever they change ---
  useEffect(() => {
    if (isHydrated && companies.length > 0) {
      saveCompanies(companies);
    }
  }, [companies, isHydrated]);

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

  // Create a new company and switch to it
  const handleNewCompany = useCallback(
    (name) => {
      if (!name?.trim()) return;
      const newCompany = createEmptyCompany(name.trim());
      setCompanies((prev) => [...prev, newCompany]);
      setActiveCompanyId(newCompany.id);
      setActiveTab('overview');
      setShowNewModal(false);
      setNewCompanyName('');
    },
    []
  );

  // Delete the active company (with confirmation)
  const handleDeleteCompany = useCallback(() => {
    if (!company) return;
    if (
      !window.confirm(
        `Delete "${company.overview?.name || 'Unnamed'}"? This cannot be undone.`
      )
    )
      return;

    setCompanies((prev) => {
      const updated = prev.filter((c) => c.id !== activeCompanyId);
      // Switch to the next available company or null
      if (updated.length > 0) {
        setActiveCompanyId(updated[0].id);
      } else {
        setActiveCompanyId(null);
      }
      return updated;
    });
    setActiveTab('dashboard');
  }, [company, activeCompanyId]);

  // Switch active company
  const handleCompanyChange = useCallback((companyId) => {
    setActiveCompanyId(companyId);
    setActiveTab('dashboard');
  }, []);

  // ============================================================
  // SECTION DATA UPDATE HANDLER
  // Called by every section component when a field changes
  // ============================================================
  const handleSectionChange = useCallback(
    (sectionKey, updatedData) => {
      if (!activeCompanyId) return;
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id !== activeCompanyId) return c;
          return {
            ...c,
            [sectionKey]: updatedData,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [activeCompanyId]
  );

  // ============================================================
  // AI RESEARCH RESULT HANDLER
  // Stores AI output per section in company.aiResearch
  // ============================================================
  const handleAiResult = useCallback(
    (sectionId, text) => {
      if (!activeCompanyId) return;
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id !== activeCompanyId) return c;
          return {
            ...c,
            aiResearch: { ...c.aiResearch, [sectionId]: text },
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [activeCompanyId]
  );

  // ============================================================
  // SETTINGS HANDLER
  // ============================================================
  const handleSaveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

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

  const handleImportData = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.companies) {
          setCompanies(data.companies);
          if (data.companies.length > 0) {
            setActiveCompanyId(data.companies[0].id);
          }
        }
        if (data.settings) {
          setSettings(data.settings);
          saveSettings(data.settings);
        }
        alert(`Imported ${data.companies?.length || 0} companies successfully.`);
      } catch (err) {
        alert('Import failed: Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }, []);

  // ============================================================
  // CONTENT RENDERER — Maps activeTab to the right component
  // ============================================================
  const renderContent = () => {
    // No company selected — show welcome state
    if (!company && activeTab !== 'settings') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-blue)' }}>
            Welcome to DeepDiligence AI
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
      return <DashboardView company={company} />;
    }
    if (activeTab === 'report') {
      return <ReportView company={company} />;
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
    const SectionComponent = SECTION_COMPONENTS[activeTab];
    if (SectionComponent && company) {
      return (
        <SectionComponent
          data={company[activeTab] || {}}
          onChange={handleSectionChange}
          company={company}
          settings={settings}
          onAiResult={handleAiResult}
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading DeepDiligence AI...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
      >
        {renderContent()}
      </AppShell>

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
    </>
  );
}
