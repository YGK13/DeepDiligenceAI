'use client';
// ============================================================
// OnboardingWizard — First-time user onboarding for DueDrill
// ============================================================
// 3-step wizard that guides new users through creating their
// first company. Shows only once (localStorage flag), then
// never again. Full-screen overlay matching the app's dark theme.
//
// Props:
//   onCreateCompany(name, url) — fires when user submits company
//   onSkip()                   — fires when user clicks "skip"
//   onComplete()               — fires after step 3 animation
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================
// THEME CONSTANTS — matches the DueDrill dark palette
// ============================================================
const THEME = {
  bg: '#0f1117',
  card: '#1e2130',
  border: '#2d3148',
  text: '#e8e9ed',
  secondary: '#9ca0b0',
  accent: '#4a7dff',
  green: '#34d399',
};

// ============================================================
// LOCALSTORAGE KEY — checked on mount to avoid re-showing
// ============================================================
const ONBOARDED_KEY = 'duedrill_onboarded';

// ============================================================
// FEATURE LIST — shown in Step 1 to communicate value
// ============================================================
const FEATURES = [
  {
    icon: '📊',
    label: '16 DD sections auto-filled',
    desc: 'Overview, team, product, market, financials, and 11 more',
  },
  {
    icon: '🤖',
    label: 'AI-powered research',
    desc: 'Pulls data from public sources and structures it for you',
  },
  {
    icon: '⭐',
    label: 'Automated scoring',
    desc: 'Instant risk/opportunity scores across every dimension',
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function OnboardingWizard({ onCreateCompany, onSkip, onComplete }) {
  // --- Wizard step: 1 = welcome, 2 = enter company, 3 = researching ---
  const [step, setStep] = useState(1);

  // --- Form state for step 2 ---
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');

  // --- Animation state for step 3 progress bar ---
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  // ============================================================
  // MARK ONBOARDED — sets localStorage flag so wizard won't
  // show again on future visits.
  // ============================================================
  const markOnboarded = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      // localStorage may be unavailable in private browsing —
      // fail silently, worst case the wizard shows again.
    }
  }, []);

  // ============================================================
  // SKIP HANDLER — user wants to explore on their own
  // ============================================================
  const handleSkip = useCallback(() => {
    markOnboarded();
    onSkip?.();
  }, [markOnboarded, onSkip]);

  // ============================================================
  // SUBMIT HANDLER — user enters a company name in step 2
  // ============================================================
  const handleSubmit = useCallback(() => {
    if (!companyName.trim()) return;

    // Move to step 3 (the "researching" animation)
    setStep(3);

    // Fire the callback so page.js opens the verification modal
    onCreateCompany?.(companyName.trim(), companyUrl.trim());

    // Animate the progress bar for 2.5 seconds, then complete
    let p = 0;
    timerRef.current = setInterval(() => {
      p += 2;
      setProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current);
        markOnboarded();
        // Small delay so user sees 100% before wizard closes
        setTimeout(() => {
          onComplete?.();
        }, 400);
      }
    }, 50); // 50ms * 50 ticks = 2500ms total
  }, [companyName, companyUrl, onCreateCompany, onComplete, markOnboarded]);

  // --- Clean up interval on unmount ---
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ============================================================
  // STEP INDICATOR — 3 dots showing current progress
  // ============================================================
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          style={{
            width: s === step ? 32 : 10,
            height: 10,
            borderRadius: 5,
            background: s === step ? THEME.accent : s < step ? THEME.green : THEME.border,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );

  // ============================================================
  // STEP 1: Welcome — value prop + CTA
  // ============================================================
  const renderStep1 = () => (
    <div
      style={{
        opacity: step === 1 ? 1 : 0,
        transform: step === 1 ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.4s ease',
        pointerEvents: step === 1 ? 'auto' : 'none',
        position: step === 1 ? 'relative' : 'absolute',
      }}
    >
      {/* ---- Hero text ---- */}
      <h1
        className="text-3xl font-bold text-center mb-3"
        style={{ color: THEME.text }}
      >
        Welcome to DueDrill
      </h1>
      <p
        className="text-center mb-8 text-base leading-relaxed max-w-md mx-auto"
        style={{ color: THEME.secondary }}
      >
        AI-powered startup due diligence that fills 16 sections automatically.
        Enter a company name and get a complete analysis in minutes.
      </p>

      {/* ---- Feature cards ---- */}
      <div className="flex flex-col gap-3 mb-8 max-w-md mx-auto">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-lg"
            style={{
              background: THEME.card,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
            <div>
              <div className="font-semibold text-sm" style={{ color: THEME.text }}>
                {f.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: THEME.secondary }}>
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---- CTA button ---- */}
      <div className="flex flex-col items-center gap-3">
        <button
          className="px-8 py-3 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90"
          style={{ background: THEME.accent }}
          onClick={() => setStep(2)}
        >
          Let's analyze your first company
        </button>
        <button
          className="text-sm transition-all hover:underline"
          style={{ color: THEME.secondary }}
          onClick={handleSkip}
        >
          I'll explore on my own
        </button>
      </div>
    </div>
  );

  // ============================================================
  // STEP 2: Company entry form
  // ============================================================
  const renderStep2 = () => (
    <div
      style={{
        opacity: step === 2 ? 1 : 0,
        transform: step === 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s ease',
        pointerEvents: step === 2 ? 'auto' : 'none',
        position: step === 2 ? 'relative' : 'absolute',
      }}
    >
      <h2
        className="text-2xl font-bold text-center mb-2"
        style={{ color: THEME.text }}
      >
        Enter a Company
      </h2>
      <p
        className="text-center mb-8 text-sm"
        style={{ color: THEME.secondary }}
      >
        We'll verify the company, then auto-fill all 16 diligence sections with AI.
      </p>

      {/* ---- Form fields ---- */}
      <div className="max-w-sm mx-auto flex flex-col gap-4 mb-8">
        {/* Company name — required */}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: THEME.secondary }}
          >
            Company Name *
          </label>
          <input
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
            style={{
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
              color: THEME.text,
            }}
            placeholder="e.g. Stripe, Figma, Notion..."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && companyName.trim()) handleSubmit();
            }}
            autoFocus
          />
        </div>

        {/* Website URL — optional */}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: THEME.secondary }}
          >
            Website URL <span style={{ color: THEME.secondary, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
            style={{
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
              color: THEME.text,
            }}
            placeholder="https://example.com"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && companyName.trim()) handleSubmit();
            }}
          />
        </div>
      </div>

      {/* ---- Action buttons ---- */}
      <div className="flex flex-col items-center gap-3">
        <button
          className="px-8 py-3 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: THEME.accent }}
          onClick={handleSubmit}
          disabled={!companyName.trim()}
        >
          Next
        </button>
        <button
          className="text-sm transition-all hover:underline"
          style={{ color: THEME.secondary }}
          onClick={handleSkip}
        >
          I'll explore on my own
        </button>
      </div>
    </div>
  );

  // ============================================================
  // STEP 3: "Researching..." with animated progress bar
  // ============================================================
  const renderStep3 = () => (
    <div
      style={{
        opacity: step === 3 ? 1 : 0,
        transform: step === 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s ease',
        pointerEvents: step === 3 ? 'auto' : 'none',
        position: step === 3 ? 'relative' : 'absolute',
      }}
    >
      <h2
        className="text-2xl font-bold text-center mb-2"
        style={{ color: THEME.text }}
      >
        Researching...
      </h2>
      <p
        className="text-center mb-2 text-sm"
        style={{ color: THEME.secondary }}
      >
        Setting up <span style={{ color: THEME.accent, fontWeight: 600 }}>{companyName}</span>
      </p>
      <p
        className="text-center mb-8 text-xs"
        style={{ color: THEME.secondary }}
      >
        We'll verify the company first, then auto-fill all sections.
      </p>

      {/* ---- Progress bar ---- */}
      <div className="max-w-sm mx-auto mb-6">
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: THEME.border }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.green})`,
              transition: 'width 0.1s linear',
            }}
          />
        </div>
        <div
          className="text-xs text-center mt-2"
          style={{ color: THEME.secondary }}
        >
          {progress < 100 ? `${progress}%` : 'Done!'}
        </div>
      </div>

      {/* ---- Animated spinner ---- */}
      <div className="flex justify-center">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `3px solid ${THEME.border}`,
            borderTopColor: THEME.accent,
            animation: progress < 100 ? 'onboarding-spin 0.8s linear infinite' : 'none',
          }}
        />
      </div>
    </div>
  );

  // ============================================================
  // RENDER — full-screen fixed overlay
  // ============================================================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: THEME.bg }}
    >
      {/* Inline keyframes for the spinner animation */}
      <style>{`
        @keyframes onboarding-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ---- Card container ---- */}
      <div
        className="w-full max-w-lg rounded-2xl p-8 relative"
        style={{
          background: THEME.card,
          border: `1px solid ${THEME.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ---- Step indicator dots ---- */}
        <StepIndicator />

        {/* ---- Step content (only the active step is visible) ---- */}
        {renderStep1()}
        {renderStep2()}
        {renderStep3()}
      </div>
    </div>
  );
}
