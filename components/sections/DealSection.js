'use client';

// ============================================================
// DealSection.js — Deal Terms & Investment Structure
// ============================================================
// Captures the specific deal terms: round size, valuation,
// instrument type, allocation, ownership target, board rights,
// liquidation preferences, anti-dilution, and other key terms.
// This is where the rubber meets the road — the actual
// investment terms being negotiated.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for deal terms
// ============================================================

// Instrument Type — type of investment instrument
const INSTRUMENT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Priced Round', label: 'Priced Round' },
  { value: 'SAFE', label: 'SAFE' },
  { value: 'Convertible Note', label: 'Convertible Note' },
  { value: 'KISS', label: 'KISS' },
  { value: 'Other', label: 'Other' },
];

// Lead Investor Committed — has a lead investor been secured?
const LEAD_COMMITTED_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Yes', label: 'Yes' },
  { value: 'Verbal', label: 'Verbal' },
  { value: 'In Discussion', label: 'In Discussion' },
  { value: 'No', label: 'No' },
];

// Board Seat — do we get a board seat?
const BOARD_SEAT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Yes', label: 'Yes' },
  { value: 'Observer', label: 'Observer' },
  { value: 'No', label: 'No' },
  { value: 'TBD', label: 'TBD' },
];

// ============================================================
// DealSection Component
// ============================================================
export default function DealSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the deal section
  const u = (field, val) => onChange('deal', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for deal terms intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="deal"
        sectionLabel="Deal Terms"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Deal Terms" subtitle="Investment structure, valuation, allocation, and key legal terms" sectionId="deal">
        {/* --------------------------------------------------------
            Grid layout — core deal parameters
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Round Name — name of the funding round */}
          <FormField
            label="Round Name"
            value={data.roundName || ''}
            onChange={(e) => u('roundName', e.target.value)}
            placeholder="Series A"
          confidence={confidenceData.roundName}
            />

          {/* Target Raise — total amount the company is raising */}
          <FormField
            label="Target Raise"
            value={data.targetRaise || ''}
            onChange={(e) => u('targetRaise', e.target.value)}
            placeholder="$10M"
          confidence={confidenceData.targetRaise}
            />

          {/* Pre-Money Valuation — valuation before this round's investment */}
          <FormField
            label="Pre-Money Valuation"
            value={data.preMoneyValuation || ''}
            onChange={(e) => u('preMoneyValuation', e.target.value)}
            placeholder="$40M"
          confidence={confidenceData.preMoneyValuation}
            />

          {/* Instrument Type — investment vehicle being used */}
          <FormField
            label="Instrument Type"
            value={data.instrumentType || ''}
            onChange={(e) => u('instrumentType', e.target.value)}
            options={INSTRUMENT_OPTIONS}
          confidence={confidenceData.instrumentType}
            />

          {/* Lead Investor Committed — has a lead been secured */}
          <FormField
            label="Lead Investor Committed"
            value={data.leadInvestorCommitted || ''}
            onChange={(e) => u('leadInvestorCommitted', e.target.value)}
            options={LEAD_COMMITTED_OPTIONS}
          confidence={confidenceData.leadInvestorCommitted}
            />

          {/* Our Allocation — our investment amount in this round */}
          <FormField
            label="Our Allocation"
            value={data.ourAllocation || ''}
            onChange={(e) => u('ourAllocation', e.target.value)}
            placeholder="$250K"
          confidence={confidenceData.ourAllocation}
            />

          {/* Ownership Target — target ownership percentage post-investment */}
          <FormField
            label="Ownership Target"
            value={data.ownershipTarget || ''}
            onChange={(e) => u('ownershipTarget', e.target.value)}
            placeholder="0.8%"
          confidence={confidenceData.ownershipTarget}
            />

          {/* Board Seat — whether we get board representation */}
          <FormField
            label="Board Seat"
            value={data.boardSeat || ''}
            onChange={(e) => u('boardSeat', e.target.value)}
            options={BOARD_SEAT_OPTIONS}
          confidence={confidenceData.boardSeat}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed deal terms and conditions
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Pro-Rata Rights — right to maintain ownership in future rounds */}
          <FormField
            label="Pro-Rata Rights"
            value={data.proRataRights || ''}
            onChange={(e) => u('proRataRights', e.target.value)}
            type="textarea"
            placeholder="Pro-rata rights terms, thresholds, and conditions..."
            rows={3}
          confidence={confidenceData.proRataRights}
            />

          {/* Liquidation Preference — priority and multiple in a liquidation event */}
          <FormField
            label="Liquidation Preference"
            value={data.liquidationPreference || ''}
            onChange={(e) => u('liquidationPreference', e.target.value)}
            type="textarea"
            placeholder="1x non-participating preferred, seniority stack..."
            rows={3}
          confidence={confidenceData.liquidationPreference}
            />

          {/* Anti-Dilution — protection against down rounds */}
          <FormField
            label="Anti-Dilution"
            value={data.antiDilution || ''}
            onChange={(e) => u('antiDilution', e.target.value)}
            type="textarea"
            placeholder="Broad-based weighted average, narrow-based, full ratchet..."
            rows={3}
          confidence={confidenceData.antiDilution}
            />

          {/* Drag-Along — rights to force minority shareholders to sell */}
          <FormField
            label="Drag-Along"
            value={data.dragAlong || ''}
            onChange={(e) => u('dragAlong', e.target.value)}
            type="textarea"
            placeholder="Drag-along thresholds, conditions, and protections..."
            rows={3}
          confidence={confidenceData.dragAlong}
            />

          {/* Tag-Along — rights for minority shareholders to join a sale */}
          <FormField
            label="Tag-Along"
            value={data.tagAlong || ''}
            onChange={(e) => u('tagAlong', e.target.value)}
            type="textarea"
            placeholder="Tag-along rights, co-sale provisions..."
            rows={3}
          confidence={confidenceData.tagAlong}
            />

          {/* Vesting Schedule — equity vesting terms for this deal */}
          <FormField
            label="Vesting Schedule"
            value={data.vestingSchedule || ''}
            onChange={(e) => u('vestingSchedule', e.target.value)}
            type="textarea"
            placeholder="4-year vest, 1-year cliff, monthly thereafter..."
            rows={3}
          confidence={confidenceData.vestingSchedule}
            />

          {/* ESOP Size — employee stock option pool allocation */}
          <FormField
            label="ESOP Size"
            value={data.esopSize || ''}
            onChange={(e) => u('esopSize', e.target.value)}
            type="textarea"
            placeholder="15% pre-money, 10% post-money, expansion plans..."
            rows={3}
          confidence={confidenceData.esopSize}
            />

          {/* Key Terms & Conditions — other material terms */}
          <FormField
            label="Key Terms & Conditions"
            value={data.keyTermsConditions || ''}
            onChange={(e) => u('keyTermsConditions', e.target.value)}
            type="textarea"
            placeholder="Information rights, ROFR, pay-to-play, protective provisions..."
            rows={4}
          confidence={confidenceData.keyTermsConditions}
            />

          {/* Deal Score — 0-10 overall deal terms assessment */}
          <FormField
            label="Deal Score"
            value={data.dealScore || 0}
            onChange={(e) => u('dealScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.dealScore}
            />

          {/* Deal Notes — freeform observations */}
          <FormField
            label="Deal Notes"
            value={data.dealNotes || ''}
            onChange={(e) => u('dealNotes', e.target.value)}
            type="textarea"
            placeholder="Additional deal terms observations and negotiation notes..."
            rows={3}
          confidence={confidenceData.dealNotes}
            />
        </div>
      </Card>
    </div>
  );
}
