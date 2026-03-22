'use client';

// ============================================================
// OverviewSection.js — Company Overview & Deal Source
// ============================================================
// Captures the foundational information about a target company:
// name, website, founding year, HQ location, stage, sector,
// employee count, key URLs, deal source, and a brief pitch.
// This is typically the first section filled in during diligence.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for this section
// ============================================================

// Company stage — from earliest to latest
const STAGE_OPTIONS = [
  { value: '', label: 'Select Stage...' },
  { value: 'Pre-Seed', label: 'Pre-Seed' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C', label: 'Series C' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Pre-IPO', label: 'Pre-IPO' },
];

// Sector classification — covers major tech verticals
const SECTOR_OPTIONS = [
  { value: '', label: 'Select Sector...' },
  { value: 'Health Tech', label: 'Health Tech' },
  { value: 'HR Tech', label: 'HR Tech' },
  { value: 'FinTech', label: 'FinTech' },
  { value: 'EdTech', label: 'EdTech' },
  { value: 'Enterprise SaaS', label: 'Enterprise SaaS' },
  { value: 'AI-ML', label: 'AI-ML' },
  { value: 'Cybersecurity', label: 'Cybersecurity' },
  { value: 'BioTech', label: 'BioTech' },
  { value: 'MedTech', label: 'MedTech' },
  { value: 'CleanTech', label: 'CleanTech' },
  { value: 'PropTech', label: 'PropTech' },
  { value: 'InsurTech', label: 'InsurTech' },
  { value: 'Other', label: 'Other' },
];

// How the deal was sourced — important for tracking deal flow quality
const DEAL_SOURCE_OPTIONS = [
  { value: '', label: 'Select Source...' },
  { value: 'Inbound', label: 'Inbound' },
  { value: 'Network Referral', label: 'Network Referral' },
  { value: 'Conference', label: 'Conference' },
  { value: 'Cold Outreach', label: 'Cold Outreach' },
  { value: 'Accelerator', label: 'Accelerator' },
  { value: 'Angel Group', label: 'Angel Group' },
  { value: 'Co-Investor', label: 'Co-Investor' },
  { value: 'Other', label: 'Other' },
];

// ============================================================
// OverviewSection Component
// ============================================================
// Props:
//   data       — object containing all overview field values
//   onChange    — callback(sectionKey, updatedData) to persist changes
//   company    — company name string for AI research context
//   settings   — app settings (API keys, preferences) passed to AI panel
//   onAiResult — callback when AI research returns data for this section
// ============================================================
export default function OverviewSection({ data, onChange, company, settings, onAiResult, onAutoFill }) {
  // Helper to update a single field within the overview section data
  // Merges the new field value into the existing data object
  const u = (field, val) => onChange('overview', { ...data, [field]: val });

  return (
    <div>
      {/* --------------------------------------------------------
          AI Research Panel — lets the user trigger AI-powered
          research specifically for this section's data points
          -------------------------------------------------------- */}
      <AIResearchPanel
        company={company}
        sectionId="overview"
        sectionLabel="Company Overview"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      {/* --------------------------------------------------------
          Main form card — all overview fields
          -------------------------------------------------------- */}
      <Card title="Company Overview" subtitle="Basic company information, stage, sector, and deal source">
        {/* --------------------------------------------------------
            Grid layout — short text fields arranged in responsive grid
            1 col on mobile, 2 on tablet, 3 on desktop
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Company Name — the legal or commonly known name */}
          <FormField
            label="Company Name"
            value={data.companyName || ''}
            onChange={(e) => u('companyName', e.target.value)}
            placeholder="Acme Health"
          />

          {/* Website URL — company's primary web presence */}
          <FormField
            label="Website URL"
            value={data.websiteUrl || ''}
            onChange={(e) => u('websiteUrl', e.target.value)}
            placeholder="https://acmehealth.com"
          />

          {/* Year Founded — when the company was incorporated */}
          <FormField
            label="Year Founded"
            value={data.yearFounded || ''}
            onChange={(e) => u('yearFounded', e.target.value)}
            placeholder="2021"
          />

          {/* HQ City — city where the company is headquartered */}
          <FormField
            label="HQ City"
            value={data.hqCity || ''}
            onChange={(e) => u('hqCity', e.target.value)}
            placeholder="Tel Aviv"
          />

          {/* HQ Country — country of headquarters */}
          <FormField
            label="HQ Country"
            value={data.hqCountry || ''}
            onChange={(e) => u('hqCountry', e.target.value)}
            placeholder="Israel"
          />

          {/* Stage — current funding / maturity stage */}
          <FormField
            label="Stage"
            value={data.stage || ''}
            onChange={(e) => u('stage', e.target.value)}
            options={STAGE_OPTIONS}
          />

          {/* Sector — primary industry vertical */}
          <FormField
            label="Sector"
            value={data.sector || ''}
            onChange={(e) => u('sector', e.target.value)}
            options={SECTOR_OPTIONS}
          />

          {/* Sub-Sector — more specific classification within the sector */}
          <FormField
            label="Sub-Sector"
            value={data.subSector || ''}
            onChange={(e) => u('subSector', e.target.value)}
            placeholder="Digital Therapeutics"
          />

          {/* Employee Count — total headcount */}
          <FormField
            label="Employee Count"
            value={data.employeeCount || ''}
            onChange={(e) => u('employeeCount', e.target.value)}
            placeholder="45"
          />

          {/* LinkedIn URL — company LinkedIn page */}
          <FormField
            label="LinkedIn URL"
            value={data.linkedinUrl || ''}
            onChange={(e) => u('linkedinUrl', e.target.value)}
            placeholder="https://linkedin.com/company/..."
          />

          {/* Crunchbase URL — company Crunchbase profile */}
          <FormField
            label="Crunchbase URL"
            value={data.crunchbaseUrl || ''}
            onChange={(e) => u('crunchbaseUrl', e.target.value)}
            placeholder="https://crunchbase.com/organization/..."
          />

          {/* Deal Source — how this deal entered the pipeline */}
          <FormField
            label="Deal Source"
            value={data.dealSource || ''}
            onChange={(e) => u('dealSource', e.target.value)}
            options={DEAL_SOURCE_OPTIONS}
          />

          {/* Referred By — name of the person who referred the deal */}
          <FormField
            label="Referred By"
            value={data.referredBy || ''}
            onChange={(e) => u('referredBy', e.target.value)}
            placeholder="John Smith"
          />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — longer text inputs
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Elevator Pitch — 2-3 sentence description of what the company does */}
          <FormField
            label="Elevator Pitch"
            value={data.elevatorPitch || ''}
            onChange={(e) => u('elevatorPitch', e.target.value)}
            type="textarea"
            placeholder="Describe the company's value proposition in 2-3 sentences..."
            rows={3}
          />

          {/* One-Line Summary — ultra-concise description for reports */}
          <FormField
            label="One-Line Summary"
            value={data.oneLineSummary || ''}
            onChange={(e) => u('oneLineSummary', e.target.value)}
            placeholder="AI-powered digital therapeutics platform for chronic disease management"
          />
        </div>
      </Card>
    </div>
  );
}
