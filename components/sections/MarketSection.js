'use client';

// ============================================================
// MarketSection.js — Market Size & Dynamics Assessment
// ============================================================
// Evaluates the total addressable market (TAM/SAM/SOM),
// growth rates, geographic focus, timing, and market dynamics.
// Understanding market size and trajectory is critical for
// sizing the return potential of any investment.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for market timing
// ============================================================

// Market Timing — is the company entering at the right time?
const MARKET_TIMING_OPTIONS = [
  { value: '', label: 'Select Timing...' },
  { value: 'Too Early', label: 'Too Early' },
  { value: 'Early Mover', label: 'Early Mover' },
  { value: 'Right Time', label: 'Right Time' },
  { value: 'Crowded', label: 'Crowded' },
  { value: 'Late', label: 'Late' },
];

// ============================================================
// MarketSection Component
// ============================================================
export default function MarketSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the market section
  const u = (field, val) => onChange('market', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for market intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="market"
        sectionLabel="Market Opportunity"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Market Opportunity" subtitle="TAM/SAM/SOM, growth rates, timing, and market dynamics" sectionId="market">
        {/* --------------------------------------------------------
            Grid layout — market sizing and classification
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* TAM — Total Addressable Market */}
          <FormField
            label="TAM (Total Addressable Market)"
            value={data.tam || ''}
            onChange={(e) => u('tam', e.target.value)}
            placeholder="$50B"
          confidence={confidenceData.tam}
            />

          {/* SAM — Serviceable Addressable Market */}
          <FormField
            label="SAM (Serviceable Addressable Market)"
            value={data.sam || ''}
            onChange={(e) => u('sam', e.target.value)}
            placeholder="$8B"
          confidence={confidenceData.sam}
            />

          {/* SOM — Serviceable Obtainable Market */}
          <FormField
            label="SOM (Serviceable Obtainable Market)"
            value={data.som || ''}
            onChange={(e) => u('som', e.target.value)}
            placeholder="$500M"
          confidence={confidenceData.som}
            />

          {/* Market Growth Rate — annual growth rate */}
          <FormField
            label="Market Growth Rate"
            value={data.marketGrowthRate || ''}
            onChange={(e) => u('marketGrowthRate', e.target.value)}
            placeholder="18% CAGR"
          confidence={confidenceData.marketGrowthRate}
            />

          {/* Geographic Focus — primary and expansion markets */}
          <FormField
            label="Geographic Focus"
            value={data.geographicFocus || ''}
            onChange={(e) => u('geographicFocus', e.target.value)}
            placeholder="US → EU → APAC"
          confidence={confidenceData.geographicFocus}
            />

          {/* Market Timing — when is the company entering relative to the market cycle */}
          <FormField
            label="Market Timing"
            value={data.marketTiming || ''}
            onChange={(e) => u('marketTiming', e.target.value)}
            options={MARKET_TIMING_OPTIONS}
          confidence={confidenceData.marketTiming}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — market narrative and dynamics
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Target Customer Profile — who is the ideal buyer */}
          <FormField
            label="Target Customer Profile"
            value={data.targetCustomerProfile || ''}
            onChange={(e) => u('targetCustomerProfile', e.target.value)}
            type="textarea"
            placeholder="Describe the ideal customer: size, industry, pain points, budget..."
            rows={3}
          confidence={confidenceData.targetCustomerProfile}
            />

          {/* Market Dynamics — forces shaping the market */}
          <FormField
            label="Market Dynamics"
            value={data.marketDynamics || ''}
            onChange={(e) => u('marketDynamics', e.target.value)}
            type="textarea"
            placeholder="Key market forces, consolidation trends, regulatory shifts..."
            rows={3}
          confidence={confidenceData.marketDynamics}
            />

          {/* Tailwinds — factors accelerating market growth */}
          <FormField
            label="Tailwinds"
            value={data.tailwinds || ''}
            onChange={(e) => u('tailwinds', e.target.value)}
            type="textarea"
            placeholder="Regulatory changes, demographic shifts, technology adoption..."
            rows={3}
          confidence={confidenceData.tailwinds}
            />

          {/* Headwinds — factors that could slow growth */}
          <FormField
            label="Headwinds"
            value={data.headwinds || ''}
            onChange={(e) => u('headwinds', e.target.value)}
            type="textarea"
            placeholder="Budget constraints, regulatory uncertainty, market saturation..."
            rows={3}
          confidence={confidenceData.headwinds}
            />

          {/* Market Score — 0-10 overall market assessment */}
          <FormField
            label="Market Score"
            value={data.marketScore || 0}
            onChange={(e) => u('marketScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.marketScore}
            />

          {/* Market Notes — freeform observations */}
          <FormField
            label="Market Notes"
            value={data.marketNotes || ''}
            onChange={(e) => u('marketNotes', e.target.value)}
            type="textarea"
            placeholder="Additional market observations and analysis..."
            rows={3}
          confidence={confidenceData.marketNotes}
            />
        </div>
      </Card>
    </div>
  );
}
