'use client';

// ============================================================
// RisksSection.js — Risk Assessment & Deal Breakers
// ============================================================
// Comprehensive risk evaluation across all dimensions:
// technical, market, execution, financial, regulatory,
// competitive, and team risks. Also captures risk mitigants
// and potential deal breakers.
// This section synthesizes risks identified across all other
// sections into a single consolidated risk view.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for risk assessment
// ============================================================

// Overall Risk Level — aggregate risk classification
const RISK_LEVEL_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Very Low', label: 'Very Low' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

// ============================================================
// RisksSection Component
// ============================================================
export default function RisksSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the risks section
  const u = (field, val) => onChange('risks', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for risk intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="risks"
        sectionLabel="Risk Assessment"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Risk Assessment" subtitle="Comprehensive risk evaluation, mitigants, and deal breakers">
        {/* --------------------------------------------------------
            Grid layout — overall risk classification
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Overall Risk Level — aggregate risk assessment */}
          <FormField
            label="Overall Risk Level"
            value={data.overallRiskLevel || ''}
            onChange={(e) => u('overallRiskLevel', e.target.value)}
            options={RISK_LEVEL_OPTIONS}
          confidence={confidenceData.overallRiskLevel}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed risk analysis by category
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Key Risks Top 5 — the most critical risks to the investment */}
          <FormField
            label="Key Risks (Top 5)"
            value={data.keyRisksTop5 || ''}
            onChange={(e) => u('keyRisksTop5', e.target.value)}
            type="textarea"
            placeholder="1. Risk one&#10;2. Risk two&#10;3. Risk three&#10;4. Risk four&#10;5. Risk five"
            rows={4}
          confidence={confidenceData.keyRisksTop5}
            />

          {/* Technical Risks — technology and engineering risks */}
          <FormField
            label="Technical Risks"
            value={data.technicalRisks || ''}
            onChange={(e) => u('technicalRisks', e.target.value)}
            type="textarea"
            placeholder="Scalability concerns, technical debt, key person dependency..."
            rows={3}
          confidence={confidenceData.technicalRisks}
            />

          {/* Market Risks — risks from market dynamics and timing */}
          <FormField
            label="Market Risks"
            value={data.marketRisks || ''}
            onChange={(e) => u('marketRisks', e.target.value)}
            type="textarea"
            placeholder="Market timing, competitive pressure, macro headwinds..."
            rows={3}
          confidence={confidenceData.marketRisks}
            />

          {/* Execution Risks — risks from team and operational challenges */}
          <FormField
            label="Execution Risks"
            value={data.executionRisks || ''}
            onChange={(e) => u('executionRisks', e.target.value)}
            type="textarea"
            placeholder="Hiring challenges, geographic expansion, product delivery..."
            rows={3}
          confidence={confidenceData.executionRisks}
            />

          {/* Financial Risks — risks from financial position and projections */}
          <FormField
            label="Financial Risks"
            value={data.financialRisks || ''}
            onChange={(e) => u('financialRisks', e.target.value)}
            type="textarea"
            placeholder="Runway concerns, burn rate, revenue concentration..."
            rows={3}
          confidence={confidenceData.financialRisks}
            />

          {/* Regulatory Risks — risks from regulatory environment */}
          <FormField
            label="Regulatory Risks"
            value={data.regulatoryRisks || ''}
            onChange={(e) => u('regulatoryRisks', e.target.value)}
            type="textarea"
            placeholder="FDA timeline, compliance requirements, regulatory changes..."
            rows={3}
          confidence={confidenceData.regulatoryRisks}
            />

          {/* Competitive Risks — risks from competitive landscape */}
          <FormField
            label="Competitive Risks"
            value={data.competitiveRisks || ''}
            onChange={(e) => u('competitiveRisks', e.target.value)}
            type="textarea"
            placeholder="Well-funded competitors, market incumbents, tech giants..."
            rows={3}
          confidence={confidenceData.competitiveRisks}
            />

          {/* Team Risks — risks related to the team */}
          <FormField
            label="Team Risks"
            value={data.teamRisks || ''}
            onChange={(e) => u('teamRisks', e.target.value)}
            type="textarea"
            placeholder="Key person risk, founder dynamics, hiring challenges..."
            rows={3}
          confidence={confidenceData.teamRisks}
            />

          {/* Risk Mitigants — factors that reduce identified risks */}
          <FormField
            label="Risk Mitigants"
            value={data.riskMitigants || ''}
            onChange={(e) => u('riskMitigants', e.target.value)}
            type="textarea"
            placeholder="Protective provisions, milestone-based funding, board controls..."
            rows={3}
          confidence={confidenceData.riskMitigants}
            />

          {/* Deal Breakers — issues that would kill the deal */}
          <FormField
            label="Deal Breakers"
            value={data.dealBreakers || ''}
            onChange={(e) => u('dealBreakers', e.target.value)}
            type="textarea"
            placeholder="Non-negotiable issues: fraud, litigation, IP disputes, cap table..."
            rows={3}
          confidence={confidenceData.dealBreakers}
            />

          {/* Risk Score — 0-10 overall risk assessment (higher = less risky) */}
          <FormField
            label="Risk Score"
            value={data.riskScore || 0}
            onChange={(e) => u('riskScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.riskScore}
            />

          {/* Risk Notes — freeform observations */}
          <FormField
            label="Risk Notes"
            value={data.riskNotes || ''}
            onChange={(e) => u('riskNotes', e.target.value)}
            type="textarea"
            placeholder="Additional risk observations and analysis..."
            rows={3}
          confidence={confidenceData.riskNotes}
            />
        </div>
      </Card>
    </div>
  );
}
