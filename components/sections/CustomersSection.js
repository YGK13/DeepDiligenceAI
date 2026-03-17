'use client';

// ============================================================
// CustomersSection.js — Customer Base & Partnerships
// ============================================================
// Evaluates the quality and depth of the customer base:
// concentration risk, reference-ability, pipeline quality,
// key logos, case studies, and strategic partnerships.
// Strong customer relationships validate product-market fit.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for customer assessment
// ============================================================

// Customer Concentration — revenue dependency on top customers
const CONCENTRATION_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Diversified <10%', label: 'Diversified <10%' },
  { value: 'Moderate 10-25%', label: 'Moderate 10-25%' },
  { value: 'Concentrated 25-50%', label: 'Concentrated 25-50%' },
  { value: 'High Risk >50%', label: 'High Risk >50%' },
];

// Referenceable Customers — can customers vouch for the product?
const REFERENCEABLE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Multiple Strong', label: 'Multiple Strong' },
  { value: 'A Few', label: 'A Few' },
  { value: 'Limited', label: 'Limited' },
  { value: 'None Yet', label: 'None Yet' },
];

// Pipeline Quality — quality of the sales pipeline
const PIPELINE_QUALITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Enterprise Logos', label: 'Enterprise Logos' },
  { value: 'Strong Mid-Market', label: 'Strong Mid-Market' },
  { value: 'SMB Heavy', label: 'SMB Heavy' },
  { value: 'Early-Thin', label: 'Early-Thin' },
  { value: 'Not Assessed', label: 'Not Assessed' },
];

// ============================================================
// CustomersSection Component
// ============================================================
export default function CustomersSection({ data, onChange, company, settings, onAiResult }) {
  // Helper to update a single field in the customers section
  const u = (field, val) => onChange('customers', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for customer intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="customers"
        sectionLabel="Customers & Partnerships"
        settings={settings}
        onSaveResult={onAiResult}
      />

      <Card title="Customers & Partnerships" subtitle="Customer base quality, key logos, case studies, and partnerships">
        {/* --------------------------------------------------------
            Grid layout — customer classification
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Customer Concentration — revenue distribution across customers */}
          <FormField
            label="Customer Concentration"
            value={data.customerConcentration || ''}
            onChange={(e) => u('customerConcentration', e.target.value)}
            options={CONCENTRATION_OPTIONS}
          />

          {/* Referenceable Customers — availability of customer references */}
          <FormField
            label="Referenceable Customers"
            value={data.referenceableCustomers || ''}
            onChange={(e) => u('referenceableCustomers', e.target.value)}
            options={REFERENCEABLE_OPTIONS}
          />

          {/* Pipeline Quality — caliber of companies in the sales pipeline */}
          <FormField
            label="Pipeline Quality"
            value={data.pipelineQuality || ''}
            onChange={(e) => u('pipelineQuality', e.target.value)}
            options={PIPELINE_QUALITY_OPTIONS}
          />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed customer information
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Key Customers — most important current customers */}
          <FormField
            label="Key Customers"
            value={data.keyCustomers || ''}
            onChange={(e) => u('keyCustomers', e.target.value)}
            type="textarea"
            placeholder="List key customers with contract sizes and use cases..."
            rows={4}
          />

          {/* Customer Logos — notable brand names using the product */}
          <FormField
            label="Customer Logos"
            value={data.customerLogos || ''}
            onChange={(e) => u('customerLogos', e.target.value)}
            type="textarea"
            placeholder="Notable logos: Fortune 500, healthcare systems, etc..."
            rows={3}
          />

          {/* Case Studies — documented customer success stories */}
          <FormField
            label="Case Studies"
            value={data.caseStudies || ''}
            onChange={(e) => u('caseStudies', e.target.value)}
            type="textarea"
            placeholder="Customer X: 40% reduction in Y, $Z savings..."
            rows={3}
          />

          {/* Strategic Partnerships — partnerships that create strategic value */}
          <FormField
            label="Strategic Partnerships"
            value={data.strategicPartnerships || ''}
            onChange={(e) => u('strategicPartnerships', e.target.value)}
            type="textarea"
            placeholder="Technology partners, integration partners, GTM partners..."
            rows={3}
          />

          {/* Channel Partners — distribution and reseller relationships */}
          <FormField
            label="Channel Partners"
            value={data.channelPartners || ''}
            onChange={(e) => u('channelPartners', e.target.value)}
            type="textarea"
            placeholder="Resellers, system integrators, referral partners..."
            rows={3}
          />

          {/* Customer Score — 0-10 overall customer assessment */}
          <FormField
            label="Customer Score"
            value={data.customerScore || 0}
            onChange={(e) => u('customerScore', Number(e.target.value))}
            type="score"
          />

          {/* Customer Notes — freeform observations */}
          <FormField
            label="Customer Notes"
            value={data.customerNotes || ''}
            onChange={(e) => u('customerNotes', e.target.value)}
            type="textarea"
            placeholder="Additional customer and partnership observations..."
            rows={3}
          />
        </div>
      </Card>
    </div>
  );
}
