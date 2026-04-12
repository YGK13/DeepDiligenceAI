'use client';
// ============================================================
// ProductTour — Interactive guided walkthrough for DueDrill
// ============================================================
// Step-based overlay tour that spotlights key UI elements and
// shows tooltip callouts explaining each feature. Uses a CSS
// box-shadow trick: a positioned element with a massive spread
// creates the dimming overlay while leaving a "hole" for the
// target element. Smooth 300ms transitions between steps.
//
// Persists completion to localStorage so the tour only shows
// once automatically. Can be re-triggered from Settings.
//
// Props:
//   onComplete — callback when user finishes the tour
//   onSkip     — callback when user clicks "Skip Tour"
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// THEME CONSTANTS — DueDrill dark palette
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
// TOUR STEPS CONFIGURATION
// ============================================================
// Each step defines:
//   title          — bold heading for the tooltip
//   description    — explanatory text
//   targetSelector — CSS selector for the spotlight target element
//   position       — where the tooltip sits relative to the target
//                     ('top' | 'bottom' | 'left' | 'right' | 'center')
//   isCenter       — if true, show a centered card (no spotlight)
// ============================================================
const TOUR_STEPS = [
  {
    title: 'Welcome to DueDrill',
    description:
      'AI-powered startup due diligence that fills 200+ fields automatically. ' +
      'Let us show you the key features in 60 seconds.',
    targetSelector: null,
    position: 'center',
    isCenter: true,
  },
  {
    title: 'Enter a Company',
    description:
      'Click "New Company" to start a due diligence report. ' +
      'DueDrill verifies the company identity before spending any API credits.',
    targetSelector: '[data-tour="new-company"]',
    position: 'bottom',
  },
  {
    title: 'AI Auto-Fill',
    description:
      'One click researches the company across the web and auto-fills all 15 sections ' +
      'with real data: team, product, market, financials and more.',
    targetSelector: '[data-tour="research-button"]',
    position: 'top',
  },
  {
    title: '16 DD Sections',
    description:
      'The sidebar organizes your due diligence into 16 structured sections: ' +
      'from Team and Product to Legal, Risks and Deal Terms.',
    targetSelector: '[data-tour="sidebar-nav"]',
    position: 'right',
  },
  {
    title: 'Weighted Scoring',
    description:
      'Every section contributes to an overall weighted score (0-100). ' +
      'Team is weighted highest at 18% because founders are the #1 predictor of success.',
    targetSelector: '[data-tour="score-badge"]',
    position: 'bottom',
  },
  {
    title: 'Export PDF Memo',
    description:
      'Generate a professional investment memo as a PDF. ' +
      'Share it with your partners or IC committee in one click.',
    targetSelector: '[data-tour="nav-report"]',
    position: 'right',
  },
  {
    title: 'Compare Deals',
    description:
      'Stack multiple companies side-by-side to compare scores, ' +
      'strengths and weaknesses across every section.',
    targetSelector: '[data-tour="nav-comparison"]',
    position: 'right',
  },
  {
    title: 'You\'re All Set!',
    description:
      'Start by adding your first company or explore the demo. ' +
      'You can re-run this tour anytime from Settings.',
    targetSelector: null,
    position: 'center',
    isCenter: true,
  },
];

// ============================================================
// STORAGE KEY — tracks whether user has completed the tour
// ============================================================
const TOUR_COMPLETED_KEY = 'duedrill_tour_completed';

// ============================================================
// COMPONENT
// ============================================================
export default function ProductTour({ onComplete, onSkip }) {
  // ---- Current step index (0-based) ----
  const [currentStep, setCurrentStep] = useState(0);

  // ---- Position and size of the spotlight target element ----
  // null when the step has no target (centered cards)
  const [targetRect, setTargetRect] = useState(null);

  // ---- Controls the fade-in/out transition ----
  const [isVisible, setIsVisible] = useState(false);

  // ---- Ref for the tooltip element (used for positioning calculations) ----
  const tooltipRef = useRef(null);

  // ---- Ref for tracking animation frame cleanup ----
  const rafRef = useRef(null);

  // ============================================================
  // FADE IN ON MOUNT
  // ============================================================
  useEffect(() => {
    // Small delay so the CSS transition actually triggers
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // MEASURE TARGET ELEMENT — runs whenever currentStep changes
  // ============================================================
  useEffect(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    // Find the target element in the DOM
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // Element not found (maybe it's hidden or not rendered yet)
      // Fall back to centered display
      setTargetRect(null);
      return;
    }

    // Scroll the element into view if it's off-screen
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    // Measure after scroll settles
    const measureTarget = () => {
      const rect = el.getBoundingClientRect();
      // Add some padding around the spotlight (8px on each side)
      setTargetRect({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        // Store the original rect center for tooltip positioning
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      });
    };

    // Delay measurement slightly to let scroll finish
    const timer = setTimeout(measureTarget, 350);

    // Also re-measure on resize (responsive support)
    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measureTarget);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentStep]);

  // ============================================================
  // KEYBOARD NAVIGATION — arrow keys, Escape, Enter
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // NAVIGATION HANDLERS
  // ============================================================
  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Tour complete: persist to localStorage and notify parent
      handleComplete();
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    // Mark tour as completed so it doesn't show again
    try {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } catch {
      // Silently fail
    }
    setIsVisible(false);
    setTimeout(() => {
      if (onSkip) onSkip();
    }, 300);
  }, [onSkip]);

  const handleComplete = useCallback(() => {
    // Mark tour as completed
    try {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } catch {
      // Silently fail
    }
    setIsVisible(false);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 300);
  }, [onComplete]);

  // ============================================================
  // TOOLTIP POSITION CALCULATOR
  // ============================================================
  // Computes the absolute CSS position for the tooltip based on
  // the target element's rect and the step's preferred position.
  // Falls back to 'bottom' on mobile (<640px viewport).
  const getTooltipStyle = useCallback(() => {
    const step = TOUR_STEPS[currentStep];

    // Centered cards: no target, just center on screen
    if (!targetRect || step?.isCenter) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const tooltipWidth = 340;
    const tooltipGap = 16; // gap between tooltip and target
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // On mobile, always position below the target
    const isMobile = viewportWidth < 640;
    const pos = isMobile ? 'bottom' : (step?.position || 'bottom');

    let style = { position: 'fixed' };

    switch (pos) {
      case 'top':
        // Tooltip above the target, horizontally centered
        style.bottom = `${viewportHeight - targetRect.top + tooltipGap}px`;
        style.left = `${Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 16))}px`;
        break;

      case 'bottom':
        // Tooltip below the target, horizontally centered
        style.top = `${targetRect.top + targetRect.height + tooltipGap}px`;
        style.left = `${Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 16))}px`;
        break;

      case 'left':
        // Tooltip to the left of the target, vertically centered
        style.top = `${Math.max(16, targetRect.top + targetRect.height / 2 - 60)}px`;
        style.right = `${viewportWidth - targetRect.left + tooltipGap}px`;
        break;

      case 'right':
        // Tooltip to the right of the target, vertically centered
        style.top = `${Math.max(16, targetRect.top + targetRect.height / 2 - 60)}px`;
        style.left = `${targetRect.left + targetRect.width + tooltipGap}px`;
        // If it would overflow the right edge, flip to bottom
        if (targetRect.left + targetRect.width + tooltipGap + tooltipWidth > viewportWidth) {
          style = {
            position: 'fixed',
            top: `${targetRect.top + targetRect.height + tooltipGap}px`,
            left: `${Math.max(16, Math.min(targetRect.left, viewportWidth - tooltipWidth - 16))}px`,
          };
        }
        break;

      default:
        style.top = `${targetRect.top + targetRect.height + tooltipGap}px`;
        style.left = `${Math.max(16, targetRect.left)}px`;
    }

    return style;
  }, [currentStep, targetRect]);

  // ============================================================
  // RENDER
  // ============================================================
  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const showSpotlight = targetRect && !step?.isCenter;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 300ms ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* ============================================================ */}
      {/* OVERLAY — semi-transparent dark background                    */}
      {/* When there's a spotlight target, the overlay uses a clip-path */}
      {/* or box-shadow technique to create a "hole" around the target. */}
      {/* ============================================================ */}

      {showSpotlight ? (
        // ---- SPOTLIGHT MODE: box-shadow creates the dimming effect ----
        // A positioned div with border-radius matches the target, and a
        // massive box-shadow spreads outward to cover the entire viewport.
        // The element itself is transparent, creating the "hole" effect.
        <div
          style={{
            position: 'fixed',
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            transition: 'all 300ms ease-in-out',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      ) : (
        // ---- NO SPOTLIGHT: plain dark overlay for centered cards ----
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            transition: 'opacity 300ms ease-in-out',
          }}
        />
      )}

      {/* ============================================================ */}
      {/* CLICK CATCHER — clicking the overlay background skips tour   */}
      {/* ============================================================ */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 10000 }}
        onClick={handleSkip}
      />

      {/* ============================================================ */}
      {/* TOOLTIP / CARD — the actual tour content                     */}
      {/* ============================================================ */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...getTooltipStyle(),
          zIndex: 10001,
          width: step?.isCenter ? '420px' : '340px',
          maxWidth: 'calc(100vw - 32px)',
          transition: 'all 300ms ease-in-out',
        }}
      >
        <div
          className="rounded-xl p-5 shadow-2xl"
          style={{
            background: THEME.card,
            border: `1px solid ${THEME.border}`,
          }}
        >
          {/* ---- Step title ---- */}
          <h3
            className="text-lg font-bold mb-2"
            style={{ color: THEME.text }}
          >
            {step?.title}
          </h3>

          {/* ---- Step description ---- */}
          <p
            className="text-sm leading-relaxed mb-4"
            style={{ color: THEME.secondary }}
          >
            {step?.description}
          </p>

          {/* ============================================================ */}
          {/* NAVIGATION CONTROLS — Previous, Next/Done, Skip             */}
          {/* ============================================================ */}
          <div className="flex items-center justify-between">
            {/* Left side: Skip button (hidden on last step) */}
            <div>
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
                  style={{
                    color: THEME.secondary,
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = THEME.text)}
                  onMouseLeave={(e) => (e.target.style.color = THEME.secondary)}
                >
                  Skip Tour
                </button>
              )}
            </div>

            {/* Right side: Previous + Next/Done buttons */}
            <div className="flex items-center gap-2">
              {/* Previous button (hidden on first step) */}
              {!isFirstStep && (
                <button
                  onClick={handlePrevious}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
                  style={{
                    color: THEME.text,
                    background: THEME.bg,
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  Previous
                </button>
              )}

              {/* Next / Done button */}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-150"
                style={{
                  background: isLastStep ? THEME.green : THEME.accent,
                  color: isLastStep ? THEME.bg : '#ffffff',
                }}
                onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                {isFirstStep
                  ? 'Start Tour'
                  : isLastStep
                    ? 'Start Using DueDrill'
                    : 'Next'}
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* STEP INDICATOR DOTS — shows progress through the tour        */}
          {/* ============================================================ */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className="transition-all duration-300"
                style={{
                  width: idx === currentStep ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background:
                    idx === currentStep
                      ? THEME.accent
                      : idx < currentStep
                        ? THEME.green
                        : THEME.border,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* ---- Step counter text ---- */}
          <p
            className="text-center mt-2 text-xs"
            style={{ color: THEME.secondary, opacity: 0.6 }}
          >
            {currentStep + 1} of {TOUR_STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}
