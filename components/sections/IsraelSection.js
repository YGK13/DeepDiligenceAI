'use client';

// ============================================================
// IsraelSection.js — Israel-Specific Due Diligence
// ============================================================
// Captures Israel-specific considerations for Israeli startups:
// dual-entity structure (IL/US), IIA (Innovation Authority)
// grants and obligations, Section 102 tax-advantaged options,
// transfer pricing, tax treaty usage, and US market strategy.
// Critical for any Israeli company raising from US investors.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for Israel-specific fields
// ============================================================

// Israel Entity Type — common Israeli corporate structures
const IL_ENTITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Ltd', label: 'Ltd' },
  { value: 'PBC', label: 'PBC' },
  { value: 'LLP', label: 'LLP' },
  { value: 'Other', label: 'Other' },
];

// US Entity Type — US corporate structure for Israeli companies
const US_ENTITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Delaware C-Corp', label: 'Delaware C-Corp' },
  { value: 'LLC', label: 'LLC' },
  { value: 'Other', label: 'Other' },
];

// IIA Grants — Israel Innovation Authority grant status
const IIA_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Active', label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'None', label: 'None' },
  { value: 'Applied', label: 'Applied' },
];

// Section 102 Options — Israeli tax-advantaged employee stock options
const SECTION_102_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Active', label: 'Active' },
  { value: 'Planned', label: 'Planned' },
  { value: 'None', label: 'None' },
  { value: 'N-A', label: 'N/A' },
];

// ============================================================
// IsraelSection Component
// ============================================================
export default function IsraelSection({ data, onChange, company, settings, onAiResult }) {
  // Helper to update a single field in the Israel section
  const u = (field, val) => onChange('israel', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for Israel-specific intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="israel"
        sectionLabel="Israel Nexus"
        settings={settings}
        onSaveResult={onAiResult}
      />

      <Card title="Israel Nexus" subtitle="Dual-entity structure, IIA grants, Section 102, transfer pricing, and US strategy">
        {/* --------------------------------------------------------
            Grid layout — entity structure and Israeli programs
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Israel Entity Name — name of the Israeli entity */}
          <FormField
            label="Israel Entity Name"
            value={data.israelEntityName || ''}
            onChange={(e) => u('israelEntityName', e.target.value)}
            placeholder="Acme Health Ltd."
          />

          {/* Israel Entity Type — corporate form of Israeli entity */}
          <FormField
            label="Israel Entity Type"
            value={data.israelEntityType || ''}
            onChange={(e) => u('israelEntityType', e.target.value)}
            options={IL_ENTITY_OPTIONS}
          />

          {/* US Entity Name — name of the US entity (if exists) */}
          <FormField
            label="US Entity Name"
            value={data.usEntityName || ''}
            onChange={(e) => u('usEntityName', e.target.value)}
            placeholder="Acme Health Inc."
          />

          {/* US Entity Type — corporate form of US entity */}
          <FormField
            label="US Entity Type"
            value={data.usEntityType || ''}
            onChange={(e) => u('usEntityType', e.target.value)}
            options={US_ENTITY_OPTIONS}
          />

          {/* IIA Grants — Israel Innovation Authority grant status */}
          <FormField
            label="IIA Grants"
            value={data.iiaGrants || ''}
            onChange={(e) => u('iiaGrants', e.target.value)}
            options={IIA_OPTIONS}
          />

          {/* R&D Center Location — where the R&D team is based in Israel */}
          <FormField
            label="R&D Center Location"
            value={data.rdCenterLocation || ''}
            onChange={(e) => u('rdCenterLocation', e.target.value)}
            placeholder="Tel Aviv, Haifa, Beer Sheva..."
          />

          {/* R&D Headcount — number of R&D employees in Israel */}
          <FormField
            label="R&D Headcount"
            value={data.rdHeadcount || ''}
            onChange={(e) => u('rdHeadcount', e.target.value)}
            placeholder="25"
          />

          {/* Section 102 Options — tax-advantaged stock options under Israeli tax law */}
          <FormField
            label="Section 102 Options"
            value={data.section102Options || ''}
            onChange={(e) => u('section102Options', e.target.value)}
            options={SECTION_102_OPTIONS}
          />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed Israel-specific analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* IIA Obligations — restrictions and repayment obligations from IIA grants */}
          <FormField
            label="IIA Obligations"
            value={data.iiaObligations || ''}
            onChange={(e) => u('iiaObligations', e.target.value)}
            type="textarea"
            placeholder="Royalty obligations, IP transfer restrictions, manufacturing requirements..."
            rows={3}
          />

          {/* Transfer Pricing Strategy — how intercompany transactions are priced */}
          <FormField
            label="Transfer Pricing Strategy"
            value={data.transferPricingStrategy || ''}
            onChange={(e) => u('transferPricingStrategy', e.target.value)}
            type="textarea"
            placeholder="Cost-plus, arm's length, advance pricing agreement..."
            rows={3}
          />

          {/* Tax Treaty Usage — leveraging US-Israel tax treaty benefits */}
          <FormField
            label="Tax Treaty Usage"
            value={data.taxTreatyUsage || ''}
            onChange={(e) => u('taxTreatyUsage', e.target.value)}
            type="textarea"
            placeholder="Withholding tax reduction, PE avoidance, treaty benefits..."
            rows={3}
          />

          {/* US Market Strategy — plan for entering/expanding in US market */}
          <FormField
            label="US Market Strategy"
            value={data.usMarketStrategy || ''}
            onChange={(e) => u('usMarketStrategy', e.target.value)}
            type="textarea"
            placeholder="Direct sales, partnerships, channel strategy for US market..."
            rows={3}
          />

          {/* US Presence — existing US operations and infrastructure */}
          <FormField
            label="US Presence"
            value={data.usPresence || ''}
            onChange={(e) => u('usPresence', e.target.value)}
            type="textarea"
            placeholder="US office location, US-based employees, US customers..."
            rows={3}
          />

          {/* Cultural Adaptation Plan — bridging Israeli and US business cultures */}
          <FormField
            label="Cultural Adaptation Plan"
            value={data.culturalAdaptationPlan || ''}
            onChange={(e) => u('culturalAdaptationPlan', e.target.value)}
            type="textarea"
            placeholder="US-style board governance, sales culture, customer success..."
            rows={3}
          />

          {/* US Hiring Plan — planned US hires for market expansion */}
          <FormField
            label="US Hiring Plan"
            value={data.usHiringPlan || ''}
            onChange={(e) => u('usHiringPlan', e.target.value)}
            type="textarea"
            placeholder="VP Sales (NYC), AEs, SDRs, CS managers..."
            rows={3}
          />

          {/* Dual Listing Consideration — potential for listing on both TASE and US exchange */}
          <FormField
            label="Dual Listing Consideration"
            value={data.dualListingConsideration || ''}
            onChange={(e) => u('dualListingConsideration', e.target.value)}
            type="textarea"
            placeholder="TASE dual listing plans, timeline, regulatory requirements..."
            rows={3}
          />

          {/* Israel Score — 0-10 overall Israel-specific assessment */}
          <FormField
            label="Israel Score"
            value={data.israelScore || 0}
            onChange={(e) => u('israelScore', Number(e.target.value))}
            type="score"
          />

          {/* Israel Notes — freeform observations */}
          <FormField
            label="Israel Notes"
            value={data.israelNotes || ''}
            onChange={(e) => u('israelNotes', e.target.value)}
            type="textarea"
            placeholder="Additional Israel-specific observations..."
            rows={3}
          />
        </div>
      </Card>
    </div>
  );
}
