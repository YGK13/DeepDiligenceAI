'use client';

// ============================================================
// IPSection.js — Intellectual Property Assessment
// ============================================================
// Evaluates the company's IP portfolio: patents (filed, granted,
// pending), trade secrets, proprietary data, open source risk,
// IP assignment status, and freedom to operate.
// IP strength directly impacts defensibility and valuation.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for IP assessment
// ============================================================

// IP Assignment — is all IP properly assigned to the company entity?
const IP_ASSIGNMENT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Yes-Fully Assigned', label: 'Yes-Fully Assigned' },
  { value: 'Partially', label: 'Partially' },
  { value: 'No', label: 'No' },
  { value: 'Unknown', label: 'Unknown' },
];

// Freedom to Operate — risk of infringing third-party IP
const FTO_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Clear', label: 'Clear' },
  { value: 'Minor Risks', label: 'Minor Risks' },
  { value: 'Significant Concerns', label: 'Significant Concerns' },
  { value: 'Not Assessed', label: 'Not Assessed' },
];

// ============================================================
// IPSection Component
// ============================================================
export default function IPSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the IP section
  const u = (field, val) => onChange('ip', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for IP intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="ip"
        sectionLabel="Intellectual Property"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Intellectual Property" subtitle="Patents, trade secrets, proprietary data, and IP risks">
        {/* --------------------------------------------------------
            Grid layout — patent counts and IP classification
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Patents Filed — total patent applications submitted */}
          <FormField
            label="Patents Filed"
            value={data.patentsFiled || ''}
            onChange={(e) => u('patentsFiled', e.target.value)}
            placeholder="3"
          confidence={confidenceData.patentsFiled}
            />

          {/* Patents Granted — patents already approved */}
          <FormField
            label="Patents Granted"
            value={data.patentsGranted || ''}
            onChange={(e) => u('patentsGranted', e.target.value)}
            placeholder="1"
          confidence={confidenceData.patentsGranted}
            />

          {/* Patents Pending — patents awaiting approval */}
          <FormField
            label="Patents Pending"
            value={data.patentsPending || ''}
            onChange={(e) => u('patentsPending', e.target.value)}
            placeholder="2"
          confidence={confidenceData.patentsPending}
            />

          {/* IP Jurisdiction — where patents are filed */}
          <FormField
            label="IP Jurisdiction"
            value={data.ipJurisdiction || ''}
            onChange={(e) => u('ipJurisdiction', e.target.value)}
            placeholder="US, IL, PCT"
          confidence={confidenceData.ipJurisdiction}
            />

          {/* IP Assignment Complete? — has all IP been properly transferred to the company */}
          <FormField
            label="IP Assignment Complete?"
            value={data.ipAssignment || ''}
            onChange={(e) => u('ipAssignment', e.target.value)}
            options={IP_ASSIGNMENT_OPTIONS}
          confidence={confidenceData.ipAssignment}
            />

          {/* Freedom to Operate — risk assessment for third-party IP conflicts */}
          <FormField
            label="Freedom to Operate"
            value={data.freedomToOperate || ''}
            onChange={(e) => u('freedomToOperate', e.target.value)}
            options={FTO_OPTIONS}
          confidence={confidenceData.freedomToOperate}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed IP analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Trade Secrets — proprietary knowledge not covered by patents */}
          <FormField
            label="Trade Secrets"
            value={data.tradeSecrets || ''}
            onChange={(e) => u('tradeSecrets', e.target.value)}
            type="textarea"
            placeholder="Proprietary algorithms, processes, or know-how..."
            rows={3}
          confidence={confidenceData.tradeSecrets}
            />

          {/* Proprietary Data Assets — unique datasets that create value */}
          <FormField
            label="Proprietary Data Assets"
            value={data.proprietaryDataAssets || ''}
            onChange={(e) => u('proprietaryDataAssets', e.target.value)}
            type="textarea"
            placeholder="Training datasets, clinical data, user behavior data..."
            rows={3}
          confidence={confidenceData.proprietaryDataAssets}
            />

          {/* Open Source Risk — risks from OSS dependencies or licensing */}
          <FormField
            label="Open Source Risk"
            value={data.openSourceRisk || ''}
            onChange={(e) => u('openSourceRisk', e.target.value)}
            type="textarea"
            placeholder="GPL dependencies, copyleft license exposure, SBOM status..."
            rows={3}
          confidence={confidenceData.openSourceRisk}
            />

          {/* IP Score — 0-10 overall IP assessment */}
          <FormField
            label="IP Score"
            value={data.ipScore || 0}
            onChange={(e) => u('ipScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.ipScore}
            />

          {/* IP Notes — freeform observations */}
          <FormField
            label="IP Notes"
            value={data.ipNotes || ''}
            onChange={(e) => u('ipNotes', e.target.value)}
            type="textarea"
            placeholder="Additional IP observations and assessment..."
            rows={3}
          confidence={confidenceData.ipNotes}
            />
        </div>
      </Card>
    </div>
  );
}
