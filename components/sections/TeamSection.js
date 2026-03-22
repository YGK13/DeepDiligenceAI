'use client';

// ============================================================
// TeamSection.js — Founding Team & Key Personnel Assessment
// ============================================================
// Evaluates the founding team's background, domain expertise,
// prior exits, team completeness, and key hiring needs.
// Team quality is often the #1 factor in early-stage investing.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for team assessment
// ============================================================

// Founder-Market Fit — how well founders match the problem space
const FOUNDER_FIT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Exceptional', label: 'Exceptional' },
  { value: 'Strong', label: 'Strong' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Weak', label: 'Weak' },
  { value: 'Unclear', label: 'Unclear' },
];

// ============================================================
// TeamSection Component
// ============================================================
export default function TeamSection({ data, onChange, company, settings, onAiResult, onAutoFill }) {
  // Helper to update a single field in the team section
  const u = (field, val) => onChange('team', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for team-related intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="team"
        sectionLabel="Team & Founders"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Team & Founders" subtitle="Founding team backgrounds, key hires, advisors, and board composition">
        {/* --------------------------------------------------------
            Grid layout — founder details and team metrics
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CEO Name */}
          <FormField
            label="CEO Name"
            value={data.ceoName || ''}
            onChange={(e) => u('ceoName', e.target.value)}
            placeholder="Jane Doe"
          />

          {/* CEO Background — prior roles, companies, achievements */}
          <FormField
            label="CEO Background"
            value={data.ceoBackground || ''}
            onChange={(e) => u('ceoBackground', e.target.value)}
            placeholder="Ex-Google, 2x founder..."
          />

          {/* CEO LinkedIn — for direct profile verification */}
          <FormField
            label="CEO LinkedIn"
            value={data.ceoLinkedin || ''}
            onChange={(e) => u('ceoLinkedin', e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />

          {/* CTO Name */}
          <FormField
            label="CTO Name"
            value={data.ctoName || ''}
            onChange={(e) => u('ctoName', e.target.value)}
            placeholder="John Smith"
          />

          {/* CTO Background — technical pedigree, publications, prior roles */}
          <FormField
            label="CTO Background"
            value={data.ctoBackground || ''}
            onChange={(e) => u('ctoBackground', e.target.value)}
            placeholder="Ex-8200, PhD CS Technion..."
          />

          {/* CTO LinkedIn */}
          <FormField
            label="CTO LinkedIn"
            value={data.ctoLinkedin || ''}
            onChange={(e) => u('ctoLinkedin', e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />

          {/* Total Team Size — full headcount including founders */}
          <FormField
            label="Total Team Size"
            value={data.totalTeamSize || ''}
            onChange={(e) => u('totalTeamSize', e.target.value)}
            placeholder="45"
          />

          {/* Engineering Team Size — developers, data scientists, DevOps */}
          <FormField
            label="Engineering Team Size"
            value={data.engineeringTeamSize || ''}
            onChange={(e) => u('engineeringTeamSize', e.target.value)}
            placeholder="22"
          />

          {/* Previous Exits — any prior successful exits by the founding team */}
          <FormField
            label="Previous Exits"
            value={data.previousExits || ''}
            onChange={(e) => u('previousExits', e.target.value)}
            placeholder="Company X acquired by Y for $Z"
          />

          {/* Founder-Market Fit — qualitative assessment */}
          <FormField
            label="Founder-Market Fit"
            value={data.founderMarketFit || ''}
            onChange={(e) => u('founderMarketFit', e.target.value)}
            options={FOUNDER_FIT_OPTIONS}
          />

          {/* Founder Vesting — vesting structure for founder equity */}
          <FormField
            label="Founder Vesting"
            value={data.founderVesting || ''}
            onChange={(e) => u('founderVesting', e.target.value)}
            placeholder="4yr/1yr cliff"
          />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed team information
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Co-Founders — all co-founders with their roles */}
          <FormField
            label="Co-Founders"
            value={data.coFounders || ''}
            onChange={(e) => u('coFounders', e.target.value)}
            type="textarea"
            placeholder="List all co-founders with their roles and backgrounds..."
            rows={3}
          />

          {/* Key Hires Needed — critical gaps in the team */}
          <FormField
            label="Key Hires Needed"
            value={data.keyHiresNeeded || ''}
            onChange={(e) => u('keyHiresNeeded', e.target.value)}
            type="textarea"
            placeholder="VP Sales, Head of Regulatory..."
            rows={3}
          />

          {/* Advisors — advisory board members and their relevance */}
          <FormField
            label="Advisors"
            value={data.advisors || ''}
            onChange={(e) => u('advisors', e.target.value)}
            type="textarea"
            placeholder="Name - Role - Relevance to business..."
            rows={3}
          />

          {/* Board Members — current board composition */}
          <FormField
            label="Board Members"
            value={data.boardMembers || ''}
            onChange={(e) => u('boardMembers', e.target.value)}
            type="textarea"
            placeholder="List board members, their affiliations, and roles..."
            rows={3}
          />

          {/* Domain Expertise — collective domain knowledge of the team */}
          <FormField
            label="Domain Expertise"
            value={data.domainExpertise || ''}
            onChange={(e) => u('domainExpertise', e.target.value)}
            type="textarea"
            placeholder="Key domain expertise areas the team brings..."
            rows={3}
          />

          {/* Team Score — 0-10 score slider for team completeness */}
          <FormField
            label="Team Score"
            value={data.teamCompleteness || 0}
            onChange={(e) => u('teamCompleteness', Number(e.target.value))}
            type="score"
          />

          {/* Team Notes — freeform notes on team assessment */}
          <FormField
            label="Team Notes"
            value={data.teamNotes || ''}
            onChange={(e) => u('teamNotes', e.target.value)}
            type="textarea"
            placeholder="Additional observations about the team..."
            rows={3}
          />
        </div>
      </Card>
    </div>
  );
}
