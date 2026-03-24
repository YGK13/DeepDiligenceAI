'use client';

// ============================================================
// CompetitiveSection.js — Competitive Landscape Analysis
// ============================================================
// Maps the competitive environment: direct and indirect
// competitors, win rates, switching costs, advantages,
// weaknesses, and competitor funding intelligence.
// Understanding competitive dynamics is essential for
// evaluating defensibility and market positioning.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for competitive assessment
// ============================================================

// Switching Costs — how hard is it for customers to leave
const SWITCHING_COSTS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Very High', label: 'Very High' },
  { value: 'High', label: 'High' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Low', label: 'Low' },
  { value: 'None', label: 'None' },
];

// ============================================================
// CompetitiveSection Component
// ============================================================
export default function CompetitiveSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the competitive section
  const u = (field, val) => onChange('competitive', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for competitive intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="competitive"
        sectionLabel="Competitive Landscape"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Competitive Landscape" subtitle="Direct and indirect competitors, win rates, positioning, and moat">
        {/* --------------------------------------------------------
            Grid layout — key competitive metrics
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Win Rate — percentage of deals won against competitors */}
          <FormField
            label="Win Rate"
            value={data.winRate || ''}
            onChange={(e) => u('winRate', e.target.value)}
            placeholder="65%"
          confidence={confidenceData.winRate}
            />

          {/* Switching Costs — barrier to customer switching */}
          <FormField
            label="Switching Costs"
            value={data.switchingCosts || ''}
            onChange={(e) => u('switchingCosts', e.target.value)}
            options={SWITCHING_COSTS_OPTIONS}
          confidence={confidenceData.switchingCosts}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed competitive analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Direct Competitors — companies solving the same problem */}
          <FormField
            label="Direct Competitors"
            value={data.directCompetitors || ''}
            onChange={(e) => u('directCompetitors', e.target.value)}
            type="textarea"
            placeholder="List direct competitors with brief descriptions..."
            rows={4}
          confidence={confidenceData.directCompetitors}
            />

          {/* Indirect Competitors — alternative solutions or adjacent products */}
          <FormField
            label="Indirect Competitors"
            value={data.indirectCompetitors || ''}
            onChange={(e) => u('indirectCompetitors', e.target.value)}
            type="textarea"
            placeholder="Alternative solutions, adjacent products, DIY approaches..."
            rows={3}
          confidence={confidenceData.indirectCompetitors}
            />

          {/* Competitive Advantages — where the company wins */}
          <FormField
            label="Competitive Advantages"
            value={data.competitiveAdvantages || ''}
            onChange={(e) => u('competitiveAdvantages', e.target.value)}
            type="textarea"
            placeholder="Key differentiators and advantages over competitors..."
            rows={3}
          confidence={confidenceData.competitiveAdvantages}
            />

          {/* Competitive Weaknesses — where competitors have the edge */}
          <FormField
            label="Competitive Weaknesses"
            value={data.competitiveWeaknesses || ''}
            onChange={(e) => u('competitiveWeaknesses', e.target.value)}
            type="textarea"
            placeholder="Areas where competitors are stronger..."
            rows={3}
          confidence={confidenceData.competitiveWeaknesses}
            />

          {/* Market Positioning — how the company positions itself */}
          <FormField
            label="Market Positioning"
            value={data.marketPositioning || ''}
            onChange={(e) => u('marketPositioning', e.target.value)}
            type="textarea"
            placeholder="Premium/low-cost, niche/horizontal, enterprise/SMB..."
            rows={3}
          confidence={confidenceData.marketPositioning}
            />

          {/* Competitor Funding Intel — what competitors have raised */}
          <FormField
            label="Competitor Funding Intel"
            value={data.competitorFundingIntel || ''}
            onChange={(e) => u('competitorFundingIntel', e.target.value)}
            type="textarea"
            placeholder="Competitor A: $20M Series B (2024), Competitor B: $50M Series C..."
            rows={3}
          confidence={confidenceData.competitorFundingIntel}
            />

          {/* Competitive Score — 0-10 overall competitive assessment */}
          <FormField
            label="Competitive Score"
            value={data.competitiveScore || 0}
            onChange={(e) => u('competitiveScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.competitiveScore}
            />

          {/* Competitive Notes — freeform observations */}
          <FormField
            label="Competitive Notes"
            value={data.competitiveNotes || ''}
            onChange={(e) => u('competitiveNotes', e.target.value)}
            type="textarea"
            placeholder="Additional competitive landscape observations..."
            rows={3}
          confidence={confidenceData.competitiveNotes}
            />
        </div>
      </Card>
    </div>
  );
}
