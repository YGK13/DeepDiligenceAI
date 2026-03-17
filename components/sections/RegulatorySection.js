'use client';

// ============================================================
// RegulatorySection.js — Regulatory & Compliance Assessment
// ============================================================
// Evaluates the company's regulatory posture: FDA status,
// HIPAA/GDPR/SOC 2 compliance, other approvals, compliance
// frameworks, and regulatory risk assessment.
// Regulatory requirements can make or break health tech,
// fintech, and other regulated-industry companies.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for regulatory assessment
// ============================================================

// FDA Status — where the company stands in the FDA approval process
const FDA_STATUS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Not Applicable', label: 'Not Applicable' },
  { value: 'Pre-Submission', label: 'Pre-Submission' },
  { value: '510k Filed', label: '510k Filed' },
  { value: '510k Cleared', label: '510k Cleared' },
  { value: 'PMA Filed', label: 'PMA Filed' },
  { value: 'PMA Approved', label: 'PMA Approved' },
  { value: 'De Novo', label: 'De Novo' },
  { value: 'Exempt', label: 'Exempt' },
];

// Shared compliance status options — used for HIPAA, GDPR, SOC 2
const COMPLIANCE_STATUS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Compliant', label: 'Compliant' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Not Required', label: 'Not Required' },
  { value: 'Not Assessed', label: 'Not Assessed' },
];

// ============================================================
// RegulatorySection Component
// ============================================================
export default function RegulatorySection({ data, onChange, company, settings, onAiResult }) {
  // Helper to update a single field in the regulatory section
  const u = (field, val) => onChange('regulatory', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for regulatory intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="regulatory"
        sectionLabel="Regulatory & Compliance"
        settings={settings}
        onSaveResult={onAiResult}
      />

      <Card title="Regulatory & Compliance" subtitle="FDA status, data privacy compliance, and regulatory risk assessment">
        {/* --------------------------------------------------------
            Grid layout — regulatory status fields
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* FDA Status — current FDA approval status */}
          <FormField
            label="FDA Status"
            value={data.fdaStatus || ''}
            onChange={(e) => u('fdaStatus', e.target.value)}
            options={FDA_STATUS_OPTIONS}
          />

          {/* FDA Pathway — specific FDA pathway being pursued */}
          <FormField
            label="FDA Pathway"
            value={data.fdaPathway || ''}
            onChange={(e) => u('fdaPathway', e.target.value)}
            placeholder="510(k), PMA, De Novo..."
          />

          {/* FDA Timeline — expected timeline for FDA clearance/approval */}
          <FormField
            label="FDA Timeline"
            value={data.fdaTimeline || ''}
            onChange={(e) => u('fdaTimeline', e.target.value)}
            placeholder="Q2 2027"
          />

          {/* HIPAA Compliance — health data privacy compliance */}
          <FormField
            label="HIPAA Compliance"
            value={data.hipaaCompliance || ''}
            onChange={(e) => u('hipaaCompliance', e.target.value)}
            options={COMPLIANCE_STATUS_OPTIONS}
          />

          {/* GDPR Compliance — EU data privacy compliance */}
          <FormField
            label="GDPR Compliance"
            value={data.gdprCompliance || ''}
            onChange={(e) => u('gdprCompliance', e.target.value)}
            options={COMPLIANCE_STATUS_OPTIONS}
          />

          {/* SOC 2 Compliance — security and availability controls */}
          <FormField
            label="SOC 2 Compliance"
            value={data.soc2Compliance || ''}
            onChange={(e) => u('soc2Compliance', e.target.value)}
            options={COMPLIANCE_STATUS_OPTIONS}
          />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed regulatory analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Other Regulatory Approvals — non-FDA regulatory clearances */}
          <FormField
            label="Other Regulatory Approvals"
            value={data.otherRegulatoryApprovals || ''}
            onChange={(e) => u('otherRegulatoryApprovals', e.target.value)}
            type="textarea"
            placeholder="CE Mark, ISO 13485, state licenses, other certifications..."
            rows={3}
          />

          {/* Compliance Frameworks — standards and frameworks adopted */}
          <FormField
            label="Compliance Frameworks"
            value={data.complianceFrameworks || ''}
            onChange={(e) => u('complianceFrameworks', e.target.value)}
            type="textarea"
            placeholder="HITRUST, ISO 27001, NIST, FedRAMP..."
            rows={3}
          />

          {/* Regulatory Risks — risks from regulatory changes or failures */}
          <FormField
            label="Regulatory Risks"
            value={data.regulatoryRisks || ''}
            onChange={(e) => u('regulatoryRisks', e.target.value)}
            type="textarea"
            placeholder="Pending regulation changes, enforcement actions, compliance gaps..."
            rows={3}
          />

          {/* Regulatory Burden Assessment — cost and complexity of compliance */}
          <FormField
            label="Regulatory Burden Assessment"
            value={data.regulatoryBurdenAssessment || ''}
            onChange={(e) => u('regulatoryBurdenAssessment', e.target.value)}
            type="textarea"
            placeholder="Ongoing compliance costs, team needed, timeline impact..."
            rows={3}
          />

          {/* Regulatory Score — 0-10 overall regulatory assessment */}
          <FormField
            label="Regulatory Score"
            value={data.regulatoryScore || 0}
            onChange={(e) => u('regulatoryScore', Number(e.target.value))}
            type="score"
          />

          {/* Regulatory Notes — freeform observations */}
          <FormField
            label="Regulatory Notes"
            value={data.regulatoryNotes || ''}
            onChange={(e) => u('regulatoryNotes', e.target.value)}
            type="textarea"
            placeholder="Additional regulatory and compliance observations..."
            rows={3}
          />
        </div>
      </Card>
    </div>
  );
}
