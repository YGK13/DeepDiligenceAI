'use client';

// ============================================================
// ProductSection.js — Product & Technology Assessment
// ============================================================
// Evaluates the product's maturity, technical architecture,
// defensibility (moat), AI/ML usage, scalability, and roadmap.
// Critical for understanding the technical risk profile.
// ============================================================

import React from 'react';
import FormField from '@/components/ui/FormField';
import AIResearchPanel from '@/components/ai/AIResearchPanel';
import Card from '@/components/ui/Card';

// ============================================================
// Select dropdown options for product assessment
// ============================================================

// Product Stage — from concept through mature GA
const PRODUCT_STAGE_OPTIONS = [
  { value: '', label: 'Select Stage...' },
  { value: 'Concept', label: 'Concept' },
  { value: 'Prototype', label: 'Prototype' },
  { value: 'Beta', label: 'Beta' },
  { value: 'GA-Early', label: 'GA-Early' },
  { value: 'GA-Mature', label: 'GA-Mature' },
  { value: 'Platform', label: 'Platform' },
];

// Moat Type — what makes the product defensible
const MOAT_TYPE_OPTIONS = [
  { value: '', label: 'Select Moat...' },
  { value: 'Network Effects', label: 'Network Effects' },
  { value: 'Proprietary Data', label: 'Proprietary Data' },
  { value: 'Regulatory Barriers', label: 'Regulatory Barriers' },
  { value: 'IP-Patents', label: 'IP-Patents' },
  { value: 'Switching Costs', label: 'Switching Costs' },
  { value: 'Brand', label: 'Brand' },
  { value: 'Scale', label: 'Scale' },
  { value: 'None Identified', label: 'None Identified' },
];

// AI/ML Usage — how central AI is to the product
const AI_ML_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Core Product', label: 'Core Product' },
  { value: 'Major Feature', label: 'Major Feature' },
  { value: 'Minor Feature', label: 'Minor Feature' },
  { value: 'Wrapper-API', label: 'Wrapper-API' },
  { value: 'None', label: 'None' },
];

// Scalability — how well the architecture can grow
const SCALABILITY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Highly Scalable', label: 'Highly Scalable' },
  { value: 'Scalable', label: 'Scalable' },
  { value: 'Moderate Constraints', label: 'Moderate Constraints' },
  { value: 'Scaling Challenges', label: 'Scaling Challenges' },
  { value: 'Not Assessed', label: 'Not Assessed' },
];

// ============================================================
// ProductSection Component
// ============================================================
export default function ProductSection({ data, onChange, company, settings, onAiResult, onAutoFill, confidenceData = {} }) {
  // Helper to update a single field in the product section
  const u = (field, val) => onChange('product', { ...data, [field]: val });

  return (
    <div>
      {/* AI Research Panel for product/technology intelligence */}
      <AIResearchPanel
        company={company}
        sectionId="product"
        sectionLabel="Product & Technology"
        settings={settings}
        onSaveResult={onAiResult}
        onAutoFill={onAutoFill}
      />

      <Card title="Product & Technology" subtitle="Product maturity, tech stack, defensibility, and roadmap">
        {/* --------------------------------------------------------
            Grid layout — product classification fields
            -------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Product Stage — current maturity level */}
          <FormField
            label="Product Stage"
            value={data.productStage || ''}
            onChange={(e) => u('productStage', e.target.value)}
            options={PRODUCT_STAGE_OPTIONS}
          confidence={confidenceData.productStage}
            />

          {/* Demo URL — link to live demo or sandbox */}
          <FormField
            label="Demo URL"
            value={data.demoUrl || ''}
            onChange={(e) => u('demoUrl', e.target.value)}
            placeholder="https://demo.acmehealth.com"
          confidence={confidenceData.demoUrl}
            />

          {/* Moat Type — primary competitive moat */}
          <FormField
            label="Moat Type"
            value={data.moatType || ''}
            onChange={(e) => u('moatType', e.target.value)}
            options={MOAT_TYPE_OPTIONS}
          confidence={confidenceData.moatType}
            />

          {/* AI/ML Usage — how AI is used in the product */}
          <FormField
            label="AI/ML Usage"
            value={data.aiMlUsage || ''}
            onChange={(e) => u('aiMlUsage', e.target.value)}
            options={AI_ML_OPTIONS}
          confidence={confidenceData.aiMlUsage}
            />

          {/* Scalability — architecture scalability assessment */}
          <FormField
            label="Scalability"
            value={data.scalability || ''}
            onChange={(e) => u('scalability', e.target.value)}
            options={SCALABILITY_OPTIONS}
          confidence={confidenceData.scalability}
            />
        </div>

        {/* --------------------------------------------------------
            Below-grid fields — detailed product information
            -------------------------------------------------------- */}
        <div className="mt-4 space-y-3">
          {/* Product Description — what the product does and for whom */}
          <FormField
            label="Product Description"
            value={data.productDescription || ''}
            onChange={(e) => u('productDescription', e.target.value)}
            type="textarea"
            placeholder="Describe what the product does, who uses it, and how..."
            rows={4}
          confidence={confidenceData.productDescription}
            />

          {/* Tech Stack — languages, frameworks, infrastructure */}
          <FormField
            label="Tech Stack"
            value={data.techStack || ''}
            onChange={(e) => u('techStack', e.target.value)}
            type="textarea"
            placeholder="React, Node.js, Python, AWS, PostgreSQL, Redis..."
            rows={3}
          confidence={confidenceData.techStack}
            />

          {/* Moat Description — narrative explanation of defensibility */}
          <FormField
            label="Moat Description"
            value={data.moatDescription || ''}
            onChange={(e) => u('moatDescription', e.target.value)}
            type="textarea"
            placeholder="Why is this defensible? What would it take to replicate?"
            rows={3}
          confidence={confidenceData.moatDescription}
            />

          {/* Technical Differentiator — what's unique about the technology */}
          <FormField
            label="Technical Differentiator"
            value={data.technicalDifferentiator || ''}
            onChange={(e) => u('technicalDifferentiator', e.target.value)}
            type="textarea"
            placeholder="Key technical innovations or unique approaches..."
            rows={3}
          confidence={confidenceData.technicalDifferentiator}
            />

          {/* Technical Debt — known debt and its impact */}
          <FormField
            label="Technical Debt"
            value={data.technicalDebt || ''}
            onChange={(e) => u('technicalDebt', e.target.value)}
            type="textarea"
            placeholder="Known technical debt, legacy systems, refactoring needs..."
            rows={3}
          confidence={confidenceData.technicalDebt}
            />

          {/* Product Roadmap — planned features and milestones */}
          <FormField
            label="Product Roadmap"
            value={data.productRoadmap || ''}
            onChange={(e) => u('productRoadmap', e.target.value)}
            type="textarea"
            placeholder="Next 6-18 months: key milestones, features, releases..."
            rows={4}
          confidence={confidenceData.productRoadmap}
            />

          {/* Integrations — third-party systems the product connects to */}
          <FormField
            label="Integrations"
            value={data.integrations || ''}
            onChange={(e) => u('integrations', e.target.value)}
            type="textarea"
            placeholder="Salesforce, Epic, Workday, Slack..."
            rows={3}
          confidence={confidenceData.integrations}
            />

          {/* Product Score — 0-10 overall product assessment */}
          <FormField
            label="Product Score"
            value={data.productScore || 0}
            onChange={(e) => u('productScore', Number(e.target.value))}
            type="score"
          confidence={confidenceData.productScore}
            />

          {/* Product Notes — freeform observations */}
          <FormField
            label="Product Notes"
            value={data.productNotes || ''}
            onChange={(e) => u('productNotes', e.target.value)}
            type="textarea"
            placeholder="Additional product and technology observations..."
            rows={3}
          confidence={confidenceData.productNotes}
            />
        </div>
      </Card>
    </div>
  );
}
