'use client';

// ============================================================
// TractionSection.js — Traction & Key Metrics
// ============================================================
// Captures the company's growth metrics: ARR, MRR growth,
// user counts, retention, churn, NRR, NPS, and pipeline.
// Traction is the strongest signal of product-market fit.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// TractionSection Component
// ============================================================
export default function TractionSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {}, lastResearched }) {
  // Helper to update a single field in the traction section
  const u = (field, val) => onChange('traction', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for traction and metrics intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="traction"
        sectionLabel="Traction & Metrics"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Traction & Metrics" subtitle="Revenue, growth rates, user engagement, retention, and pipeline" sectionId="traction" lastResearched={lastResearched}>
        {/* --------------------------------------------------------
            Grid layout — all quantitative traction metrics
            These are the numbers investors care about most
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Current ARR — Annual Recurring Revenue run rate */}
          <FormField
            label="Current ARR"
            value={data.currentArr || ''}
            onChange={(e) => u('currentArr', e.target.value)}
            placeholder="$2.4M"
          confidence={confidenceData.currentArr}
            />

          {/* MRR Growth Rate — month-over-month growth percentage */}
          <FormField
            label="MRR Growth Rate"
            value={data.mrrGrowthRate || ''}
            onChange={(e) => u('mrrGrowthRate', e.target.value)}
            placeholder="15% MoM"
          confidence={confidenceData.mrrGrowthRate}
            />

          {/* Total Revenue LTM — last twelve months total revenue */}
          <FormField
            label="Total Revenue LTM"
            value={data.totalRevenueLtm || ''}
            onChange={(e) => u('totalRevenueLtm', e.target.value)}
            placeholder="$1.8M"
          confidence={confidenceData.totalRevenueLtm}
            />

          {/* YoY Revenue Growth — year-over-year revenue growth */}
          <FormField
            label="YoY Revenue Growth"
            value={data.yoyRevenueGrowth || ''}
            onChange={(e) => u('yoyRevenueGrowth', e.target.value)}
            placeholder="240%"
          confidence={confidenceData.yoyRevenueGrowth}
            />

          {/* Total Users — all registered users */}
          <FormField
            label="Total Users"
            value={data.totalUsers || ''}
            onChange={(e) => u('totalUsers', e.target.value)}
            placeholder="12,000"
          confidence={confidenceData.totalUsers}
            />

          {/* Active Users — users who have engaged recently */}
          <FormField
            label="Active Users"
            value={data.activeUsers || ''}
            onChange={(e) => u('activeUsers', e.target.value)}
            placeholder="8,400"
          confidence={confidenceData.activeUsers}
            />

          {/* DAU — Daily Active Users */}
          <FormField
            label="DAU"
            value={data.dau || ''}
            onChange={(e) => u('dau', e.target.value)}
            placeholder="3,200"
          confidence={confidenceData.dau}
            />

          {/* MAU — Monthly Active Users */}
          <FormField
            label="MAU"
            value={data.mau || ''}
            onChange={(e) => u('mau', e.target.value)}
            placeholder="7,800"
          confidence={confidenceData.mau}
            />

          {/* Retention Rate — percentage of users retained over time */}
          <FormField
            label="Retention Rate"
            value={data.retentionRate || ''}
            onChange={(e) => u('retentionRate', e.target.value)}
            placeholder="94%"
          confidence={confidenceData.retentionRate}
            />

          {/* Churn Rate — monthly customer churn */}
          <FormField
            label="Churn Rate"
            value={data.churnRate || ''}
            onChange={(e) => u('churnRate', e.target.value)}
            placeholder="2% monthly"
          confidence={confidenceData.churnRate}
            />

          {/* Net Revenue Retention — NRR including expansion (>100% = net expansion) */}
          <FormField
            label="Net Revenue Retention"
            value={data.netRevenueRetention || ''}
            onChange={(e) => u('netRevenueRetention', e.target.value)}
            placeholder="125%"
          confidence={confidenceData.netRevenueRetention}
            />

          {/* NPS Score — Net Promoter Score (customer satisfaction) */}
          <FormField
            label="NPS Score"
            value={data.npsScore || ''}
            onChange={(e) => u('npsScore', e.target.value)}
            placeholder="72"
          confidence={confidenceData.npsScore}
            />

          {/* Pipeline Value — total value of sales pipeline */}
          <FormField
            label="Pipeline Value"
            value={data.pipelineValue || ''}
            onChange={(e) => u('pipelineValue', e.target.value)}
            placeholder="$4.2M"
          confidence={confidenceData.pipelineValue}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — score and notes
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Traction Score — 0-10 overall traction assessment */}
          <FormField
            label="Traction Score"
            value={data.tractionScore || 0}
            onChange={(e) => u('tractionScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.tractionScore}
            />

          {/* Traction Notes — freeform observations */}
          <FormField
            label="Traction Notes"
            value={data.tractionNotes || ''}
            onChange={(e) => u('tractionNotes', e.target.value)}
            type="textarea"
            placeholder="Additional traction observations, growth trajectory analysis..."
            rows={3}
          confidence={confidenceData.tractionNotes}
            />
        </div>
      </Card>
    </div>
  );
}
