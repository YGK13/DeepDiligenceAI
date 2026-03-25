'use client';

// ============================================================
// FinancialSection.js — Financial Health & Fundraising History
// ============================================================
// Tracks the company's fundraising history, current financial
// position (burn rate, runway, cash), and forward projections.
// Understanding financial health is critical for timing and
// sizing investment decisions.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// FinancialSection Component
// ============================================================
export default function FinancialSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the financial section
  const u = (field, val) => onChange('financial', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for financial intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="financial"
        sectionLabel="Financials"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Financials" subtitle="Fundraising history, burn rate, runway, and financial projections" sectionId="financial">
        {/* --------------------------------------------------------
            Grid layout — key financial metrics
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Last Round Size — amount raised in most recent round */}
          <FormField
            label="Last Round Size"
            value={data.lastRoundSize || ''}
            onChange={(e) => u('lastRoundSize', e.target.value)}
            placeholder="$5M"
          confidence={confidenceData.lastRoundSize}
            />

          {/* Last Round Date — when the last round closed */}
          <FormField
            label="Last Round Date"
            value={data.lastRoundDate || ''}
            onChange={(e) => u('lastRoundDate', e.target.value)}
            type="date"
          confidence={confidenceData.lastRoundDate}
            />

          {/* Last Valuation — pre-money valuation at last round */}
          <FormField
            label="Last Valuation"
            value={data.lastValuation || ''}
            onChange={(e) => u('lastValuation', e.target.value)}
            placeholder="$25M pre"
          confidence={confidenceData.lastValuation}
            />

          {/* Total Raised — cumulative capital raised to date */}
          <FormField
            label="Total Raised"
            value={data.totalRaised || ''}
            onChange={(e) => u('totalRaised', e.target.value)}
            placeholder="$8.5M"
          confidence={confidenceData.totalRaised}
            />

          {/* Monthly Burn Rate — how fast cash is being spent */}
          <FormField
            label="Monthly Burn Rate"
            value={data.monthlyBurnRate || ''}
            onChange={(e) => u('monthlyBurnRate', e.target.value)}
            placeholder="$280K"
          confidence={confidenceData.monthlyBurnRate}
            />

          {/* Runway — months of cash remaining at current burn */}
          <FormField
            label="Runway (months)"
            value={data.runway || ''}
            onChange={(e) => u('runway', e.target.value)}
            placeholder="14 months"
          confidence={confidenceData.runway}
            />

          {/* Cash on Hand — current cash balance */}
          <FormField
            label="Cash on Hand"
            value={data.cashOnHand || ''}
            onChange={(e) => u('cashOnHand', e.target.value)}
            placeholder="$3.9M"
          confidence={confidenceData.cashOnHand}
            />

          {/* Break-Even Target — when the company expects profitability */}
          <FormField
            label="Break-Even Target"
            value={data.breakEvenTarget || ''}
            onChange={(e) => u('breakEvenTarget', e.target.value)}
            placeholder="Q3 2027"
          confidence={confidenceData.breakEvenTarget}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed financial analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Use of Funds — how the raised capital will be deployed */}
          <FormField
            label="Use of Funds"
            value={data.useOfFunds || ''}
            onChange={(e) => u('useOfFunds', e.target.value)}
            type="textarea"
            placeholder="40% R&D, 30% Sales & Marketing, 20% G&A, 10% Reserve..."
            rows={3}
          confidence={confidenceData.useOfFunds}
            />

          {/* Revenue Projection — forward-looking revenue forecasts */}
          <FormField
            label="Revenue Projection"
            value={data.revenueProjection || ''}
            onChange={(e) => u('revenueProjection', e.target.value)}
            type="textarea"
            placeholder="2025: $5M ARR, 2026: $12M ARR, 2027: $28M ARR..."
            rows={3}
          confidence={confidenceData.revenueProjection}
            />

          {/* Cap Table Summary — ownership breakdown */}
          <FormField
            label="Cap Table Summary"
            value={data.capTableSummary || ''}
            onChange={(e) => u('capTableSummary', e.target.value)}
            type="textarea"
            placeholder="Founders: 60%, Seed investors: 20%, ESOP: 15%, Advisors: 5%..."
            rows={3}
          confidence={confidenceData.capTableSummary}
            />

          {/* Financial Score — 0-10 overall financial assessment */}
          <FormField
            label="Financial Score"
            value={data.financialScore || 0}
            onChange={(e) => u('financialScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.financialScore}
            />

          {/* Financial Notes — freeform observations */}
          <FormField
            label="Financial Notes"
            value={data.financialNotes || ''}
            onChange={(e) => u('financialNotes', e.target.value)}
            type="textarea"
            placeholder="Additional financial observations and analysis..."
            rows={3}
          confidence={confidenceData.financialNotes}
            />
        </div>
      </Card>
    </div>
  );
}
