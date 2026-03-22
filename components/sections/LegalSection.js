'use client';

// ============================================================
// LegalSection.js — Legal Structure & Risk Assessment
// ============================================================
// Evaluates the company's legal structure, jurisdiction,
// option pool, litigation, IP assignments, employment
// agreements, material contracts, and legal risks.
// Legal issues can derail deals at the last minute if
// not identified and addressed during diligence.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// LegalSection Component
// ============================================================
export default function LegalSection({ data, onChange, company, settings, onAiResult, onAutoFill }) {
  // Helper to update a single field in the legal section
  const u = (field, val) => onChange('legal', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for legal intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="legal"
        sectionLabel="Legal Structure"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Legal Structure" subtitle="Corporate structure, litigation, IP assignments, contracts, and legal risks">
        {/* --------------------------------------------------------
            Grid layout — corporate structure basics
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Corporate Structure — entity type and incorporation details */}
          <FormField
            label="Corporate Structure"
            value={data.corporateStructure || ''}
            onChange={(e) => u('corporateStructure', e.target.value)}
            placeholder="Delaware C-Corp, Israeli Ltd..."
          />

          {/* Jurisdiction — where the company is legally domiciled */}
          <FormField
            label="Jurisdiction"
            value={data.jurisdiction || ''}
            onChange={(e) => u('jurisdiction', e.target.value)}
            placeholder="Delaware, Israel..."
          />

          {/* Option Pool — employee stock option pool size */}
          <FormField
            label="Option Pool"
            value={data.optionPool || ''}
            onChange={(e) => u('optionPool', e.target.value)}
            placeholder="15% ESOP..."
          />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed legal analysis
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Pending Litigation — any active or threatened lawsuits */}
          <FormField
            label="Pending Litigation"
            value={data.pendingLitigation || ''}
            onChange={(e) => u('pendingLitigation', e.target.value)}
            type="textarea"
            placeholder="Active lawsuits, threatened claims, arbitration proceedings..."
            rows={3}
          />

          {/* IP Assignments — status of IP ownership transfers */}
          <FormField
            label="IP Assignments"
            value={data.ipAssignments || ''}
            onChange={(e) => u('ipAssignments', e.target.value)}
            type="textarea"
            placeholder="Founder IP assignment status, contractor IP agreements..."
            rows={3}
          />

          {/* Employment Agreements — key employment contract terms */}
          <FormField
            label="Employment Agreements"
            value={data.employmentAgreements || ''}
            onChange={(e) => u('employmentAgreements', e.target.value)}
            type="textarea"
            placeholder="Key employee contract terms, at-will status, severance..."
            rows={3}
          />

          {/* Non-Compete Status — restrictions on founders/key employees */}
          <FormField
            label="Non-Compete Status"
            value={data.nonCompeteStatus || ''}
            onChange={(e) => u('nonCompeteStatus', e.target.value)}
            type="textarea"
            placeholder="Founder non-competes, key employee restrictions..."
            rows={3}
          />

          {/* Material Contracts — significant business agreements */}
          <FormField
            label="Material Contracts"
            value={data.materialContracts || ''}
            onChange={(e) => u('materialContracts', e.target.value)}
            type="textarea"
            placeholder="Key customer contracts, vendor agreements, licensing deals..."
            rows={3}
          />

          {/* Outstanding Warrants — any warrant instruments issued */}
          <FormField
            label="Outstanding Warrants"
            value={data.outstandingWarrants || ''}
            onChange={(e) => u('outstandingWarrants', e.target.value)}
            type="textarea"
            placeholder="Warrant holders, strike prices, expiration dates..."
            rows={3}
          />

          {/* Legal Risks — overall legal risk assessment */}
          <FormField
            label="Legal Risks"
            value={data.legalRisks || ''}
            onChange={(e) => u('legalRisks', e.target.value)}
            type="textarea"
            placeholder="Identified legal risks and their potential impact..."
            rows={3}
          />

          {/* Legal Score — 0-10 overall legal assessment */}
          <FormField
            label="Legal Score"
            value={data.legalScore || 0}
            onChange={(e) => u('legalScore', Number(e.target.value))}
            type="score"
          />

          {/* Legal Notes — freeform observations */}
          <FormField
            label="Legal Notes"
            value={data.legalNotes || ''}
            onChange={(e) => u('legalNotes', e.target.value)}
            type="textarea"
            placeholder="Additional legal observations and assessment..."
            rows={3}
          />
        </div>
      </Card>
    </div>
  );
}
