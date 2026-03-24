'use client';

// ============================================================
// BusinessSection.js — Business Model & Unit Economics
// ============================================================
// Evaluates how the company makes money: revenue model, pricing,
// contract values, margins, LTV/CAC, and expansion strategies.
// Strong unit economics are a prerequisite for sustainable growth.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Revenue model options — how the company generates revenue
// ============================================================
const REVENUE_MODEL_OPTIONS = [
  { value: '', label: 'Select Model...' },
  { value: 'SaaS-Subscription', label: 'SaaS-Subscription' },
  { value: 'SaaS-Usage', label: 'SaaS-Usage' },
  { value: 'Marketplace', label: 'Marketplace' },
  { value: 'Transaction Fee', label: 'Transaction Fee' },
  { value: 'Licensing', label: 'Licensing' },
  { value: 'Freemium', label: 'Freemium' },
  { value: 'Hardware+Software', label: 'Hardware+Software' },
  { value: 'Services+Platform', label: 'Services+Platform' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Pre-Revenue', label: 'Pre-Revenue' },
];

// ============================================================
// BusinessSection Component
// ============================================================
export default function BusinessSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the business section
  const u = (field, val) => onChange('business', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for business model analysis */}
      <AIResearchPanel
        company={company}
        sectionId="business"
        sectionLabel="Business Model"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Business Model" subtitle="Revenue model, pricing, unit economics, and growth strategy">
        {/* --------------------------------------------------------
            Grid layout — business model and unit economics
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Revenue Model — primary revenue generation mechanism */}
          <FormField
            label="Revenue Model"
            value={data.revenueModel || ''}
            onChange={(e) => u('revenueModel', e.target.value)}
            options={REVENUE_MODEL_OPTIONS}
          confidence={confidenceData.revenueModel}
            />

          {/* Pricing Model — how the product is priced */}
          <FormField
            label="Pricing Model"
            value={data.pricingModel || ''}
            onChange={(e) => u('pricingModel', e.target.value)}
            placeholder="Per seat, per API call..."
          confidence={confidenceData.pricingModel}
            />

          {/* Avg Contract Value — average annual contract value */}
          <FormField
            label="Avg Contract Value"
            value={data.avgContractValue || ''}
            onChange={(e) => u('avgContractValue', e.target.value)}
            placeholder="$48K ARR"
          confidence={confidenceData.avgContractValue}
            />

          {/* Gross Margin — revenue minus COGS as percentage */}
          <FormField
            label="Gross Margin"
            value={data.grossMargin || ''}
            onChange={(e) => u('grossMargin', e.target.value)}
            placeholder="78%"
          confidence={confidenceData.grossMargin}
            />

          {/* LTV — Lifetime Value of a customer */}
          <FormField
            label="LTV"
            value={data.ltv || ''}
            onChange={(e) => u('ltv', e.target.value)}
            placeholder="$144K"
          confidence={confidenceData.ltv}
            />

          {/* CAC — Customer Acquisition Cost */}
          <FormField
            label="CAC"
            value={data.cac || ''}
            onChange={(e) => u('cac', e.target.value)}
            placeholder="$18K"
          confidence={confidenceData.cac}
            />

          {/* LTV:CAC Ratio — key SaaS health metric (>3:1 is healthy) */}
          <FormField
            label="LTV:CAC Ratio"
            value={data.ltvCacRatio || ''}
            onChange={(e) => u('ltvCacRatio', e.target.value)}
            placeholder="8:1"
          confidence={confidenceData.ltvCacRatio}
            />

          {/* Payback Period — months to recover CAC */}
          <FormField
            label="Payback Period"
            value={data.paybackPeriod || ''}
            onChange={(e) => u('paybackPeriod', e.target.value)}
            placeholder="6 months"
          confidence={confidenceData.paybackPeriod}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed business model analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Expansion Revenue — upsell, cross-sell, usage growth */}
          <FormField
            label="Expansion Revenue"
            value={data.expansionRevenue || ''}
            onChange={(e) => u('expansionRevenue', e.target.value)}
            type="textarea"
            placeholder="Describe upsell motions, seat expansion, usage growth..."
            rows={3}
          confidence={confidenceData.expansionRevenue}
            />

          {/* Revenue Concentration Risk — dependency on few customers */}
          <FormField
            label="Revenue Concentration Risk"
            value={data.revenueConcentrationRisk || ''}
            onChange={(e) => u('revenueConcentrationRisk', e.target.value)}
            type="textarea"
            placeholder="Top customer % of revenue, customer diversification..."
            rows={3}
          confidence={confidenceData.revenueConcentrationRisk}
            />

          {/* Channel Strategy — how the company reaches customers */}
          <FormField
            label="Channel Strategy"
            value={data.channelStrategy || ''}
            onChange={(e) => u('channelStrategy', e.target.value)}
            type="textarea"
            placeholder="Direct sales, partner channels, self-serve, PLG..."
            rows={3}
          confidence={confidenceData.channelStrategy}
            />

          {/* Business Model Score — 0-10 overall assessment */}
          <FormField
            label="Business Model Score"
            value={data.businessScore || 0}
            onChange={(e) => u('businessScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.businessScore}
            />

          {/* Business Model Notes — freeform observations */}
          <FormField
            label="Business Model Notes"
            value={data.businessNotes || ''}
            onChange={(e) => u('businessNotes', e.target.value)}
            type="textarea"
            placeholder="Additional business model observations..."
            rows={3}
          confidence={confidenceData.businessNotes}
            />
        </div>
      </Card>
    </div>
  );
}
