'use client';

// ============================================================================
// components/ui/UpgradePrompt.js — Feature Gating Upgrade Prompt
// ============================================================================
// Shows when a user tries to access a premium feature they don't have.
// Displays what plan is required and links to the pricing page.
// Designed to be helpful, not annoying — explains the value clearly.
// ============================================================================

import React from 'react';

// ============ FEATURE DESCRIPTIONS ============
// Maps feature keys to human-readable names and the minimum plan required
const FEATURE_INFO = {
  aiAutoFill:    { label: 'AI Auto-Fill',           minPlan: 'Solo Investor ($49/mo)' },
  pdfExport:     { label: 'PDF Investment Memos',   minPlan: 'Solo Investor ($49/mo)' },
  comparison:    { label: 'Company Comparison',      minPlan: 'Solo Investor ($49/mo)' },
  integrations:  { label: 'Data Integrations',       minPlan: 'Solo Investor ($49/mo)' },
  customScoring: { label: 'Custom Scoring Models',   minPlan: 'Solo Investor ($49/mo)' },
  references:    { label: 'Reference Checks',        minPlan: 'Solo Investor ($49/mo)' },
  pipeline:      { label: 'Deal Pipeline',           minPlan: 'Solo Investor ($49/mo)' },
  deckUpload:    { label: 'Deck Upload & Analysis',  minPlan: 'Fund ($199/mo)' },
  peopleVerify:  { label: 'People Verification',     minPlan: 'Fund ($199/mo)' },
};

// ============ COMPONENT ============
export default function UpgradePrompt({ feature, currentPlan }) {
  const info = FEATURE_INFO[feature] || {
    label: feature,
    minPlan: 'a paid plan',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      {/* Lock icon */}
      <div className="text-5xl mb-4">🔒</div>

      <h3 className="text-[#e8e9ed] text-lg font-bold mb-2">
        {info.label} requires an upgrade
      </h3>

      <p className="text-[#9ca0b0] text-sm mb-6 leading-relaxed">
        This feature is available on the <strong className="text-[#4a7dff]">{info.minPlan}</strong> plan
        {currentPlan === 'free' ? '.' : ' or higher.'}
        {' '}Upgrade to unlock AI-powered research, PDF memos, and more.
      </p>

      <a
        href="/pricing"
        className={
          'inline-flex items-center justify-center gap-2 ' +
          'px-6 py-3 rounded-lg font-bold text-sm ' +
          'bg-[#4a7dff] text-white hover:bg-[#3d6be6] ' +
          'transition-all duration-200 shadow-lg shadow-[#4a7dff]/20'
        }
      >
        View Plans & Pricing
      </a>

      <p className="text-[#6b7084] text-xs mt-4">
        14-day money-back guarantee. Cancel anytime.
      </p>
    </div>
  );
}
