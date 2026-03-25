'use client';

// ============================================================
// InvestorsSection.js — Investor Syndicate & Cap Table
// ============================================================
// Evaluates the investor syndicate quality: lead investor,
// reputation tiers, follow-on likelihood, board composition,
// strategic value, and potential conflicts.
// Who invests alongside you matters as much as the deal itself.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for investor assessment
// ============================================================

// Investor Reputation — tier classification of lead investor
const REPUTATION_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Tier 1 Top 20', label: 'Tier 1 Top 20' },
  { value: 'Tier 2 Well Known', label: 'Tier 2 Well Known' },
  { value: 'Tier 3 Emerging', label: 'Tier 3 Emerging' },
  { value: 'Angels Only', label: 'Angels Only' },
  { value: 'Unknown', label: 'Unknown' },
];

// Follow-on Likelihood — will existing investors participate in future rounds?
const FOLLOWON_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Highly Likely', label: 'Highly Likely' },
  { value: 'Likely', label: 'Likely' },
  { value: 'Uncertain', label: 'Uncertain' },
  { value: 'Unlikely', label: 'Unlikely' },
  { value: 'N-A', label: 'N/A' },
];

// Pro-Rata Rights — who has the right to maintain ownership percentage
const PRORATA_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'All Investors', label: 'All Investors' },
  { value: 'Lead Only', label: 'Lead Only' },
  { value: 'None', label: 'None' },
  { value: 'Unknown', label: 'Unknown' },
];

// ============================================================
// InvestorsSection Component
// ============================================================
export default function InvestorsSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the investors section
  const u = (field, val) => onChange('investors', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for investor intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="investors"
        sectionLabel="Investors & Syndicate"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Investors & Syndicate" subtitle="Lead investor, syndicate quality, board composition, and strategic value" sectionId="investors">
        {/* --------------------------------------------------------
            Grid layout — investor classification
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Lead Investor — name of the lead investor in the round */}
          <FormField
            label="Lead Investor"
            value={data.leadInvestor || ''}
            onChange={(e) => u('leadInvestor', e.target.value)}
            placeholder="Sequoia, OurCrowd, JVP..."
          confidence={confidenceData.leadInvestor}
            />

          {/* Investor Reputation — tier classification */}
          <FormField
            label="Investor Reputation"
            value={data.investorReputation || ''}
            onChange={(e) => u('investorReputation', e.target.value)}
            options={REPUTATION_OPTIONS}
          confidence={confidenceData.investorReputation}
            />

          {/* Follow-on Likelihood — will they invest again? */}
          <FormField
            label="Follow-on Likelihood"
            value={data.followOnLikelihood || ''}
            onChange={(e) => u('followOnLikelihood', e.target.value)}
            options={FOLLOWON_OPTIONS}
          confidence={confidenceData.followOnLikelihood}
            />

          {/* Pro-Rata Rights — who can maintain their ownership stake */}
          <FormField
            label="Pro-Rata Rights"
            value={data.proRataRights || ''}
            onChange={(e) => u('proRataRights', e.target.value)}
            options={PRORATA_OPTIONS}
          confidence={confidenceData.proRataRights}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed investor information
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* All Investors — complete list of investors across all rounds */}
          <FormField
            label="All Investors"
            value={data.allInvestors || ''}
            onChange={(e) => u('allInvestors', e.target.value)}
            type="textarea"
            placeholder="List all investors by round: Seed: X, Y; Series A: Z..."
            rows={4}
          confidence={confidenceData.allInvestors}
            />

          {/* Board Composition — current board members and their affiliations */}
          <FormField
            label="Board Composition"
            value={data.boardComposition || ''}
            onChange={(e) => u('boardComposition', e.target.value)}
            type="textarea"
            placeholder="Founder seats, investor seats, independent directors..."
            rows={3}
          confidence={confidenceData.boardComposition}
            />

          {/* Investor Conflicts — potential conflicts of interest */}
          <FormField
            label="Investor Conflicts"
            value={data.investorConflicts || ''}
            onChange={(e) => u('investorConflicts', e.target.value)}
            type="textarea"
            placeholder="Competing portfolio companies, board conflicts..."
            rows={3}
          confidence={confidenceData.investorConflicts}
            />

          {/* Investor Strategic Value — what value investors bring beyond capital */}
          <FormField
            label="Investor Strategic Value"
            value={data.investorStrategicValue || ''}
            onChange={(e) => u('investorStrategicValue', e.target.value)}
            type="textarea"
            placeholder="Domain expertise, customer intros, hiring network, follow-on..."
            rows={3}
          confidence={confidenceData.investorStrategicValue}
            />

          {/* Investor Score — 0-10 overall investor assessment */}
          <FormField
            label="Investor Score"
            value={data.investorScore || 0}
            onChange={(e) => u('investorScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.investorScore}
            />

          {/* Investor Notes — freeform observations */}
          <FormField
            label="Investor Notes"
            value={data.investorNotes || ''}
            onChange={(e) => u('investorNotes', e.target.value)}
            type="textarea"
            placeholder="Additional investor and syndicate observations..."
            rows={3}
          confidence={confidenceData.investorNotes}
            />
        </div>
      </Card>
    </div>
  );
}
