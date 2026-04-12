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
// GLOBAL SEARCH — cross-company search & filter overlay
// ============================================================
import GlobalSearch from '@/components/search/GlobalSearch';

// ============================================================
// VIEW COMPONENTS
// ============================================================
import DashboardView from '@/components/views/DashboardView';
import ReportView from '@/components/views/ReportView';
import ComparisonView from '@/components/views/ComparisonView';
import PipelineView from '@/components/views/PipelineView';
import AnalyticsView from '@/components/views/AnalyticsView';
import TimelineView from '@/components/views/TimelineView';
import ScoringModelEditor from '@/components/views/ScoringModelEditor';
import SettingsView from '@/components/views/SettingsView';
import ReferenceCheckView from '@/components/views/ReferenceCheckView';
import ContactsView from '@/components/views/ContactsView';
import DeckUploadPanel from '@/components/deck/DeckUploadPanel';
import IntegrationPanel from '@/components/integrations/IntegrationPanel';
import DocumentVault from '@/components/views/DocumentVault';
import MonitoringView from '@/components/views/MonitoringView';
import BulkOperationsView from '@/components/views/BulkOperationsView';
import TeamCollabView from '@/components/views/TeamCollabView';
import ActivityLogView from '@/components/views/ActivityLogView';
import NotesView from '@/components/views/NotesView';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import KeyboardShortcutsHelp from '@/components/ui/KeyboardShortcutsHelp';
import ToastNotification from '@/components/ui/ToastNotification';
import LoadingView from '@/components/ui/LoadingView';

// ============================================================
// NOTIFICATIONS — in-app notification system
// ============================================================
import { createNotification } from '@/lib/notifications';

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
import { SECTION_SCORE_FIELDS } from '@/lib/constants';
import { createActivity } from '@/lib/activity';

// ============================================================
// DEMO COMPANY — pre-loaded realistic data for first-time users
// ============================================================
import { createDemoCompany } from '@/lib/demo-company';

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

  // --- Global search overlay state ---
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // --- Onboarding wizard state ---
  // Shown once for first-time users with no companies.
  // After completion or skip, localStorage flag prevents re-showing.
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Global Activity Log state ---
  // Top-level audit trail separate from per-company logs.
  // Persisted to localStorage under 'duedrill_activity_log'.
  const [activityLog, setActivityLog] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('duedrill_activity_log');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Helper to add an activity and persist to localStorage
  const logActivity = useCallback((type, details = {}) => {
    const activity = createActivity(type, details);
    setActivityLog((prev) => {
      const updated = [activity, ...prev].slice(0, 2000); // cap at 2000 entries
      try {
        localStorage.setItem('duedrill_activity_log', JSON.stringify(updated));
      } catch {
        // Silently fail if localStorage is full
      }
      return updated;
    });
  }, []);

  // ============================================================
  // NOTIFICATION STATE — persistent bell notifications
  // Stored in localStorage under 'duedrill_notifications'.
  // ============================================================
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('duedrill_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // ---- Persist notifications to localStorage whenever they change ----
  useEffect(() => {
    try {
      localStorage.setItem('duedrill_notifications', JSON.stringify(notifications));
    } catch {
      // Silently fail if localStorage is full
    }
  }, [notifications]);

  // ---- Toast state (ephemeral — not persisted) ----
  const [toasts, setToasts] = useState([]);

  // ---- Notification helpers ----
  // Add a notification to the bell AND optionally show a toast
  const addNotification = useCallback((params, { showToast = true } = {}) => {
    const notif = createNotification(params);
    setNotifications((prev) => [notif, ...prev].slice(0, 100)); // cap at 100
    if (showToast) {
      setToasts((prev) => [...prev, notif]);
    }
    return notif;
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const markNotificationRead = useCallback((notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Navigate when clicking a notification (parse actionUrl as tab switch)
  const handleNotificationNavigate = useCallback((actionUrl) => {
    if (!actionUrl) return;
    // actionUrl format: "tab:dashboard" or "tab:overview" or "company:id:tab"
    if (actionUrl.startsWith('tab:')) {
      setActiveTab(actionUrl.replace('tab:', ''));
    } else if (actionUrl.startsWith('company:')) {
      const parts = actionUrl.split(':');
      if (parts[1]) setActiveCompanyId(parts[1]);
      if (parts[2]) setActiveTab(parts[2]);
    }
  }, []);

  // --- Derived loading state ---
  // We're "hydrated" when all async data loads have finished.
  // This prevents flash-of-empty-content on first render.
  const isHydrated = !authLoading && !companiesLoading && !settingsLoading && !subLoading;

  // ============================================================
  // GLOBAL SEARCH — Cmd+K / Ctrl+K keyboard shortcut
  // Opens the search overlay from anywhere in the app.
  // ============================================================
  useEffect(() => {
    const handleSearchShortcut = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleSearchShortcut);
    return () => document.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  // ============================================================
  // KEYBOARD SHORTCUTS HELP — press "?" to toggle help overlay
  // ============================================================
  useEffect(() => {
    const handleHelpShortcut = (e) => {
      // Only trigger when no input is focused and no modifier keys
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleHelpShortcut);
    return () => document.removeEventListener('keydown', handleHelpShortcut);
  }, []);

  // ============================================================
  // SEARCH NAVIGATION — when user clicks a search result,
  // switch to that company + section tab
  // ============================================================
  const handleSearchNavigate = useCallback((companyId, sectionId) => {
    setActiveCompanyId(companyId);
    setActiveTab(sectionId || 'dashboard');
    setShowSearch(false);
  }, []);

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
    async (candidate, deckFile) => {
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

      // ============ DECK ANALYSIS (if file attached) ============
      // Fire-and-forget: upload and analyze the deck in the background.
      // Results get stored in company.deckAnalysis by the deck API.
      // This runs alongside the auto-fill research, not blocking it.
      if (deckFile) {
        try {
          const formData = new FormData();
          formData.append('file', deckFile);
          formData.append('companyId', newCompany.id);
          formData.append('companyName', candidate.name);
          fetch('/api/deck/upload', {
            method: 'POST',
            body: formData,
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.analysis) {
                // Store deck analysis on the company
                updateCompany(newCompany.id, 'deckAnalysis', data.analysis);
              }
            }
          }).catch(() => {}); // Non-critical — don't block company creation
        } catch {
          // Silently fail — deck analysis is optional
        }
      }

      // --- Log activity: company created ---
      logActivity('company-created', {
        companyName: candidate.name,
        companyId: newCompany.id,
      });
    },
    [createCompany, updateCompany, logActivity]
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

        // --- Log activity: company created (unverified) ---
        logActivity('company-created', {
          companyName: pendingCompanyName,
          companyId: newCompany.id,
        });
      }
    },
    [pendingCompanyName, createCompany, updateCompany, logActivity]
  );

  // Delete the active company (with confirmation)
  const handleDeleteCompany = useCallback(async () => {
    if (!company) return;
    const companyName = company.overview?.companyName || company.overview?.name || 'Unnamed';
    if (
      !window.confirm(
        `Delete "${companyName}"? This cannot be undone.`
      )
    )
      return;

    // --- Log activity: company deleted (before actually deleting) ---
    logActivity('company-deleted', {
      companyName,
      companyId: activeCompanyId,
    });

    await deleteCompany(activeCompanyId);

    // Switch to the next available company or null
    const remaining = companies.filter((c) => c.id !== activeCompanyId);
    if (remaining.length > 0) {
      setActiveCompanyId(remaining[0].id);
    } else {
      setActiveCompanyId(null);
    }
    setActiveTab('dashboard');
  }, [company, activeCompanyId, companies, deleteCompany, logActivity]);

  // Switch active company
  const handleCompanyChange = useCallback((companyId) => {
    setActiveCompanyId(companyId);
    setActiveTab('dashboard');
  }, []);

  // ============================================================
  // LOAD DEMO COMPANY — inject pre-populated NovaTech AI
  // Creates a fully-filled demo company so first-time users can
  // explore every feature (scoring, reports, pipeline, etc.)
  // before committing their own data.
  // ============================================================
  const handleLoadDemo = useCallback(() => {
    const demo = createDemoCompany();

    // Add the demo company to the companies array via setCompanies
    // (this triggers the auto-save to localStorage via useCompanies)
    setCompanies((prev) => {
      // Prevent duplicate demo companies
      const filtered = prev.filter((c) => c.id !== 'demo-company-novatech');
      return [...filtered, demo];
    });

    // Select the demo company and navigate to the dashboard
    setActiveCompanyId(demo.id);
    setActiveTab('dashboard');

    // Mark demo as loaded so we don't re-prompt
    try {
      localStorage.setItem('duedrill_demo_loaded', 'true');
    } catch {
      // Silently fail if localStorage is unavailable
    }

    // Close onboarding if it's showing
    setShowOnboarding(false);
  }, [setCompanies]);

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

      // --- Log activity: section edited ---
      // Derive the company name from the current companies array
      const comp = companies.find((c) => c.id === activeCompanyId);
      const companyName = comp?.overview?.companyName || comp?.overview?.name || comp?.name || 'Unknown';
      logActivity('section-edited', {
        companyName,
        companyId: activeCompanyId,
        sectionKey,
      });
    },
    [activeCompanyId, updateCompany, companies, logActivity]
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

      // ---- Extract suggestedScore before merging fields ----
      // The AI returns suggestedScore as a top-level integer in the section data.
      // We pull it out and apply it to the correct score field (e.g., teamCompleteness).
      const suggestedScore = aiData.suggestedScore;

      for (const [key, value] of Object.entries(aiData)) {
        // Skip suggestedScore — it's metadata, not a form field
        if (key === 'suggestedScore') continue;
        if (value !== '' && value !== null && value !== undefined) {
          // Overwrite the field with AI data (even if user had something there)
          // because the user explicitly clicked "Auto-Fill"
          merged[key] = value;
        }
      }

      // ---- Apply AI-suggested score to the section's score field ----
      // e.g., for team section: merged.teamCompleteness = 7
      // Only apply if we got a valid integer 1-10 from the AI
      const scoreField = SECTION_SCORE_FIELDS[sectionId];
      if (scoreField && suggestedScore != null && Number.isInteger(suggestedScore) && suggestedScore >= 1 && suggestedScore <= 10) {
        merged[scoreField] = suggestedScore;
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

      // ---- Update lastResearched timestamp for this section ----
      // Tracks when each section was last auto-filled so FreshnessIndicator
      // can show how stale the data is (green/yellow/red dot in Card headers).
      const existingTimestamps = company?.lastResearched || {};
      updateCompany(activeCompanyId, 'lastResearched', {
        ...existingTimestamps,
        [sectionId]: new Date().toISOString(),
      });

      // --- Log activity: AI auto-fill completed for a section ---
      const compName = company?.overview?.companyName || company?.overview?.name || 'Unknown';
      logActivity('ai-autofill', {
        companyName: compName,
        companyId: activeCompanyId,
        sectionKey: sectionId,
      });
    },
    [activeCompanyId, company, handleSectionChange, updateCompany, logActivity]
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

            // ---- Extract suggestedScore before merging fields ----
            const suggestedScore = result.data.suggestedScore;

            for (const [key, value] of Object.entries(result.data)) {
              // Skip suggestedScore — it's metadata, not a form field
              if (key === 'suggestedScore') continue;
              if (value !== '' && value !== null && value !== undefined) {
                merged[key] = value;
                sectionFilled++;
                totalFilled++;
              }
            }

            // ---- Apply AI-suggested score to the section's score field ----
            // e.g., for market section: merged.marketScore = 6
            const scoreField = SECTION_SCORE_FIELDS[sectionKey];
            if (scoreField && suggestedScore != null && Number.isInteger(suggestedScore) && suggestedScore >= 1 && suggestedScore <= 10) {
              merged[scoreField] = suggestedScore;
              sectionFilled++;
              totalFilled++;
            }

            handleSectionChange(sectionKey, merged);

            // ---- Update lastResearched timestamp for this section ----
            // So FreshnessIndicator shows "Fresh" green dot after research
            const prevTimestamps = company?.lastResearched || {};
            updateCompany(activeCompanyId, 'lastResearched', {
              ...prevTimestamps,
              [sectionKey]: new Date().toISOString(),
            });

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

      // --- Log activity: AI research completed for all sections ---
      const researchCompanyName = company?.overview?.companyName || company?.overview?.name || 'Unknown';
      logActivity('ai-research', {
        companyName: researchCompanyName,
        companyId: activeCompanyId,
        totalFilled,
        errors,
      });

      // ---- Fire notification: AI research complete ----
      const companyLabel = company?.overview?.companyName || 'Company';
      if (errors === 0) {
        addNotification({
          type: 'research-complete',
          title: 'AI Research Complete',
          message: `All ${sections.length} sections researched for ${companyLabel}. ${totalFilled} fields filled.`,
          severity: 'success',
          actionUrl: `company:${activeCompanyId}:dashboard`,
        });
      } else {
        addNotification({
          type: 'research-complete',
          title: 'AI Research Finished',
          message: `Research for ${companyLabel} done with ${errors} error(s). ${totalFilled} fields filled.`,
          severity: 'warning',
          actionUrl: `company:${activeCompanyId}:dashboard`,
        });
      }

      return { success: errors === 0, totalFilled, errors };
    },
    [activeCompanyId, company, settings, handleSectionChange, updateCompany, logActivity, addNotification]
  );

  // ============================================================
  // RETRY FAILED SECTIONS HANDLER
  // ============================================================
  // Called by DashboardView's RetryPanel to re-research only the
  // sections that failed during the initial "Research This Company"
  // pass. Takes an array of section keys and an onProgress callback.
  // Returns { success, totalFilled, errors } just like handleResearchAll.
  // ============================================================
  const handleRetrySections = useCallback(
    async (sectionKeys, onProgress) => {
      if (!activeCompanyId || !company || !sectionKeys?.length) return;

      const companyName = company.overview?.companyName || company.overview?.name || company.name || '';
      const companyUrl = company.overview?.websiteUrl || company.overview?.url || '';

      let totalFilled = 0;
      let errors = 0;

      for (let i = 0; i < sectionKeys.length; i++) {
        const sectionKey = sectionKeys[i];

        // Report progress: this section is starting
        if (onProgress) {
          onProgress({
            section: sectionKey,
            sectionIndex: i,
            totalSections: sectionKeys.length,
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
            const currentData = company[sectionKey] || {};
            const merged = { ...currentData };
            let sectionFilled = 0;

            const suggestedScore = result.data.suggestedScore;

            for (const [key, value] of Object.entries(result.data)) {
              if (key === 'suggestedScore') continue;
              if (value !== '' && value !== null && value !== undefined) {
                merged[key] = value;
                sectionFilled++;
                totalFilled++;
              }
            }

            const scoreField = SECTION_SCORE_FIELDS[sectionKey];
            if (scoreField && suggestedScore != null && Number.isInteger(suggestedScore) && suggestedScore >= 1 && suggestedScore <= 10) {
              merged[scoreField] = suggestedScore;
              sectionFilled++;
              totalFilled++;
            }

            handleSectionChange(sectionKey, merged);

            // ---- Update lastResearched timestamp ----
            const prevTimestamps = company?.lastResearched || {};
            updateCompany(activeCompanyId, 'lastResearched', {
              ...prevTimestamps,
              [sectionKey]: new Date().toISOString(),
            });

            // Report progress: section complete
            if (onProgress) {
              onProgress({
                section: sectionKey,
                sectionIndex: i,
                totalSections: sectionKeys.length,
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
                totalSections: sectionKeys.length,
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
              totalSections: sectionKeys.length,
              status: 'error',
              error: err.message,
            });
          }
        }
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

    // ---- Fire notification: export ready ----
    addNotification({
      type: 'export-ready',
      title: 'Export Ready',
      message: `Exported ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'} to JSON.`,
      severity: 'success',
    });
  }, [companies, settings, addNotification]);

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
    // No company selected — show welcome state with demo option
    if (!company && activeTab !== 'settings' && activeTab !== 'pipeline' && activeTab !== 'analytics' && activeTab !== 'bulk' && activeTab !== 'teamCollab' && activeTab !== 'activity') {
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

          {/* ============================================================
              DEMO COMPANY BUTTON — lets users explore with pre-loaded data
              Only shows if no demo has been loaded yet
              ============================================================ */}
          <button
            className="mt-3 px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            onClick={handleLoadDemo}
          >
            or Load Demo Company (NovaTech AI)
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
            Explore all features with realistic pre-filled data
          </p>
        </div>
      );
    }

    // Special views (not section editors)
    if (activeTab === 'dashboard') {
      return <DashboardView company={company} onResearchAll={handleResearchAll} onRetrySections={handleRetrySections} onNavigate={setActiveTab} />;
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
    if (activeTab === 'analytics') {
      return <AnalyticsView companies={companies} />;
    }
    // ============================================================
    // MONITORING — Post-DD company monitoring & alerts dashboard
    // ============================================================
    if (activeTab === 'monitoring') {
      return (
        <MonitoringView
          companies={companies}
          company={company}
          settings={settings}
          onChange={handleSectionChange}
          onAlert={(alert) => {
            // Fire a notification when monitoring detects an alert
            addNotification({
              type: 'monitoring-alert',
              title: alert.title || 'Monitoring Alert',
              message: alert.message || 'A monitoring alert was triggered.',
              severity: alert.severity || 'warning',
              actionUrl: 'tab:monitoring',
            });
          }}
        />
      );
    }
    // ============================================================
    // BULK ACTIONS — Batch operations on multiple companies
    // ============================================================
    if (activeTab === 'bulk') {
      return (
        <BulkOperationsView
          companies={companies}
          settings={settings}
          onResearchCompany={async (companyId) => {
            // Delegate to the existing per-company research flow
            const comp = companies.find((c) => c.id === companyId);
            if (!comp) return;
            const companyName = comp.overview?.companyName || comp.overview?.name || comp.name || '';
            const companyUrl = comp.overview?.websiteUrl || comp.overview?.url || '';
            const response = await fetch('/api/ai/autofill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyName,
                companyUrl,
                section: 'overview',
                provider: settings?.provider,
                model: settings?.models?.[settings?.provider] || '',
                apiKeys: settings?.apiKeys || {},
              }),
            });
            return response.json();
          }}
          onDeleteCompany={async (companyId) => {
            await deleteCompany(companyId);
          }}
          onUpdateCompany={(companyId, key, value) => {
            updateCompany(companyId, key, value);
          }}
          onExport={(companyIds) => {
            // Trigger JSON export for the selected companies
            const selected = companies.filter((c) => companyIds.includes(c.id));
            const exportData = {
              version: '1.0.0',
              exportedAt: new Date().toISOString(),
              companies: selected,
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `duedrill-bulk-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
      );
    }
    if (activeTab === 'teamCollab') {
      return <TeamCollabView user={user} />;
    }
    // ============================================================
    // ACTIVITY LOG — Global audit trail across all companies
    // ============================================================
    if (activeTab === 'activity') {
      return <ActivityLogView activityLog={activityLog} companies={companies} />;
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
    // CONTACTS — Per-company contact & relationship management
    // ============================================================
    if (activeTab === 'contacts') {
      return <ContactsView company={company} onChange={handleSectionChange} />;
    }
    // ============================================================
    // NOTES — Deal notes & meeting log
    // ============================================================
    if (activeTab === 'notes') {
      return <NotesView company={company} onChange={handleSectionChange} />;
    }
    // ============================================================
    // DOCUMENT VAULT — Per-company document storage
    // ============================================================
    if (activeTab === 'documents') {
      return <DocumentVault company={company} onChange={handleSectionChange} />;
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
          companies={companies}
          currentCompany={company}
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
          lastResearched={company?.lastResearched?.[activeTab]}
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
    return <LoadingView />;
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
          onOpenSearch={() => setShowSearch(true)}
          notifications={notifications}
          onMarkNotificationRead={markNotificationRead}
          onMarkAllNotificationsRead={markAllNotificationsRead}
          onClearAllNotifications={clearAllNotifications}
          onNotificationNavigate={handleNotificationNavigate}
        >
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </AppShell>
      </ErrorBoundary>

      {/* ============================================================ */}
      {/* TOAST NOTIFICATIONS — real-time popup alerts (top-right)      */}
      {/* Rendered via portal to document.body for z-index safety.     */}
      {/* ============================================================ */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

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
          onLoadDemo={handleLoadDemo}
        />
      )}

      {/* ============================================================ */}
      {/* GLOBAL SEARCH OVERLAY                                        */}
      {/* Full-screen modal for cross-company search & filter.         */}
      {/* Triggered by Cmd+K / Ctrl+K or the search icon in TopBar.   */}
      {/* ============================================================ */}
      {showSearch && (
        <GlobalSearch
          companies={companies}
          onNavigate={handleSearchNavigate}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* ============================================================ */}
      {/* KEYBOARD SHORTCUTS HELP — press ? to toggle                  */}
      {/* ============================================================ */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </>
  );
}
