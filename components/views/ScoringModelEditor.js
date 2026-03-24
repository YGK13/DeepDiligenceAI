'use client';

// ============================================================================
// components/views/ScoringModelEditor.js — Custom Scoring Model Editor
// ============================================================================
// P1 FEATURE: Lets VCs customize how companies are scored. Every fund has
// a different thesis — a deep-tech fund weights IP at 25%, a growth fund
// weights traction at 30%. This editor lets them:
//
// 1. Select from pre-built templates (Seed, Series A, Growth, Deep Tech, etc.)
// 2. Adjust weights with visual sliders (must sum to 100%)
// 3. See live score preview comparing old vs new weights
// 4. Save custom models for reuse across companies
//
// Props:
//   company       — active company (for live score preview)
//   settings      — settings object (stores custom scoring models)
//   onSaveModel   — callback(model) to persist a custom model
//   onSelectModel — callback(modelId) to apply a model to the current company
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  SCORING_TEMPLATES,
  SCORING_CATEGORIES,
  calculateScoreWithModel,
  normalizeWeights,
  validateWeights,
} from '@/lib/scoring-models';

// ============ COMPONENT ============
export default function ScoringModelEditor({
  company,
  settings,
  onSaveModel,
  onSelectModel,
}) {
  // ============ STATE ============
  const [activeTemplateId, setActiveTemplateId] = useState('balanced');
  const [customWeights, setCustomWeights] = useState(
    () => ({ ...SCORING_TEMPLATES.balanced.weights })
  );
  const [customName, setCustomName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // User's saved custom models from settings
  const customModels = settings?.scoringModels || [];

  // ============ ALL AVAILABLE MODELS (templates + custom) ============
  const allModels = useMemo(() => {
    const builtIn = Object.values(SCORING_TEMPLATES);
    return [...builtIn, ...customModels];
  }, [customModels]);

  // ============ LIVE SCORE PREVIEW ============
  // Calculate the company's score under current custom weights
  const currentScore = useMemo(
    () => calculateScoreWithModel(company, customWeights),
    [company, customWeights]
  );

  // Calculate score under the balanced (default) model for comparison
  const defaultScore = useMemo(
    () => calculateScoreWithModel(company, SCORING_TEMPLATES.balanced.weights),
    [company]
  );

  // ============ WEIGHT SUM ============
  const weightSum = useMemo(
    () => Object.values(customWeights).reduce((a, b) => a + b, 0),
    [customWeights]
  );
  const isValid = Math.abs(weightSum - 1.0) < 0.01;

  // ============ SELECT A TEMPLATE ============
  const handleSelectTemplate = useCallback((templateId) => {
    const model = SCORING_TEMPLATES[templateId] || customModels.find(m => m.id === templateId);
    if (model) {
      setActiveTemplateId(templateId);
      setCustomWeights({ ...model.weights });
    }
  }, [customModels]);

  // ============ ADJUST A SINGLE WEIGHT ============
  const handleWeightChange = useCallback((categoryId, newValue) => {
    setCustomWeights((prev) => ({
      ...prev,
      [categoryId]: Math.round(newValue * 100) / 100,
    }));
  }, []);

  // ============ AUTO-NORMALIZE ============
  const handleNormalize = useCallback(() => {
    setCustomWeights((prev) => normalizeWeights(prev));
  }, []);

  // ============ SAVE CUSTOM MODEL ============
  const handleSave = useCallback(() => {
    if (!customName.trim()) return;
    if (!isValid) {
      handleNormalize(); // auto-fix before saving
    }

    const newModel = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      description: 'Custom scoring model',
      stage: 'Custom',
      editable: true,
      weights: normalizeWeights(customWeights),
    };

    if (onSaveModel) {
      onSaveModel(newModel);
    }

    setSavedMessage(`"${newModel.name}" saved!`);
    setTimeout(() => setSavedMessage(''), 3000);
    setShowSaveForm(false);
    setCustomName('');
  }, [customName, customWeights, isValid, handleNormalize, onSaveModel]);

  // ============ APPLY TO CURRENT COMPANY ============
  const handleApply = useCallback(() => {
    if (onSelectModel) {
      onSelectModel(activeTemplateId);
    }
  }, [activeTemplateId, onSelectModel]);

  // ============ RENDER ============
  return (
    <div className="space-y-6 max-w-4xl">
      {/* ============ HEADER ============ */}
      <div>
        <h2 className="text-[#e8e9ed] text-xl font-bold mb-1">
          Custom Scoring Models
        </h2>
        <p className="text-[#6b7084] text-sm">
          Adjust how DueDrill scores companies to match your investment thesis.
          Different stages and strategies demand different weight distributions.
        </p>
      </div>

      {/* ============ TEMPLATE SELECTOR ============ */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-5">
        <h3 className="text-[#e8e9ed] text-sm font-semibold mb-3">
          Select a Scoring Template
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {allModels.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelectTemplate(model.id)}
              className={
                'text-left px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer ' +
                (activeTemplateId === model.id
                  ? 'border-[#4a7dff] bg-[#4a7dff]/10 text-[#e8e9ed]'
                  : 'border-[#2d3148] bg-[#252836] text-[#9ca0b0] hover:border-[#4a7dff]/50')
              }
            >
              <p className="font-semibold mb-0.5">{model.name}</p>
              <p className="text-[10px] text-[#6b7084]">{model.stage}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ============ LIVE SCORE COMPARISON ============ */}
      {company && (
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-5">
          <h3 className="text-[#e8e9ed] text-sm font-semibold mb-3">
            Live Score Preview — {company.overview?.companyName || company.name || 'Current Company'}
          </h3>
          <div className="flex items-center gap-8">
            {/* Default score */}
            <div className="text-center">
              <p className="text-[#6b7084] text-[10px] uppercase tracking-wider mb-1">Default</p>
              <div className="text-3xl font-bold text-[#9ca0b0]">{defaultScore}</div>
            </div>

            {/* Arrow */}
            <div className="text-[#6b7084] text-xl">→</div>

            {/* Custom score */}
            <div className="text-center">
              <p className="text-[#4a7dff] text-[10px] uppercase tracking-wider mb-1">Custom</p>
              <div className={
                'text-3xl font-bold ' +
                (currentScore >= 7 ? 'text-[#34d399]' :
                 currentScore >= 4 ? 'text-[#f59e0b]' :
                 'text-[#ef4444]')
              }>
                {currentScore}
              </div>
            </div>

            {/* Delta */}
            <div className="text-center">
              <p className="text-[#6b7084] text-[10px] uppercase tracking-wider mb-1">Change</p>
              <div className={
                'text-xl font-bold ' +
                (currentScore > defaultScore ? 'text-[#34d399]' :
                 currentScore < defaultScore ? 'text-[#ef4444]' :
                 'text-[#6b7084]')
              }>
                {currentScore > defaultScore ? '+' : ''}
                {(currentScore - defaultScore).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ WEIGHT EDITOR ============ */}
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#e8e9ed] text-sm font-semibold">
            Weight Distribution
          </h3>
          <div className="flex items-center gap-3">
            {/* Weight sum indicator */}
            <span className={
              'text-xs font-mono px-2 py-1 rounded ' +
              (isValid
                ? 'bg-[#34d399]/10 text-[#34d399]'
                : 'bg-[#ef4444]/10 text-[#ef4444]')
            }>
              Total: {(weightSum * 100).toFixed(1)}%
            </span>

            {/* Auto-normalize button */}
            {!isValid && (
              <button
                onClick={handleNormalize}
                className="text-xs text-[#4a7dff] hover:text-[#3d6be6] cursor-pointer underline"
              >
                Auto-normalize to 100%
              </button>
            )}
          </div>
        </div>

        {/* ============ WEIGHT SLIDERS ============ */}
        <div className="space-y-3">
          {SCORING_CATEGORIES.map((cat) => {
            const weight = customWeights[cat.id] || 0;
            const pct = (weight * 100).toFixed(1);

            return (
              <div key={cat.id} className="flex items-center gap-3">
                {/* Category label */}
                <div className="w-40 flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs">{cat.icon}</span>
                  <span className="text-[#9ca0b0] text-xs">{cat.label}</span>
                </div>

                {/* Slider */}
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={weight}
                    onChange={(e) => handleWeightChange(cat.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #4a7dff 0%, #4a7dff ${weight * 200}%, #2d3148 ${weight * 200}%, #2d3148 100%)`,
                    }}
                  />
                </div>

                {/* Percentage display */}
                <div className="w-14 text-right">
                  <span className={
                    'text-xs font-mono font-bold ' +
                    (weight >= 0.15 ? 'text-[#4a7dff]' :
                     weight >= 0.05 ? 'text-[#9ca0b0]' :
                     'text-[#6b7084]')
                  }>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ ACTION BUTTONS ============ */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Save as custom model */}
        {!showSaveForm ? (
          <button
            onClick={() => setShowSaveForm(true)}
            className={
              'px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ' +
              'bg-[#4a7dff] text-white hover:bg-[#3d6be6]'
            }
          >
            Save as Custom Model
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Model name (e.g., 'My Growth Fund')"
              className={
                'px-3 py-2 rounded-lg text-sm bg-[#252836] border border-[#2d3148] ' +
                'text-[#e8e9ed] outline-none focus:border-[#4a7dff] w-64 ' +
                'placeholder:text-[#6b7084]'
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) handleSave();
              }}
            />
            <button
              onClick={handleSave}
              disabled={!customName.trim()}
              className={
                'px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ' +
                (customName.trim()
                  ? 'bg-[#34d399] text-[#0f1117] hover:bg-[#2db886]'
                  : 'bg-[#34d399]/30 text-white/50 cursor-not-allowed')
              }
            >
              Save
            </button>
            <button
              onClick={() => { setShowSaveForm(false); setCustomName(''); }}
              className="text-[#6b7084] text-xs hover:text-[#9ca0b0] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Apply to current company */}
        {company && onSelectModel && (
          <button
            onClick={handleApply}
            className={
              'px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ' +
              'bg-[#252836] text-[#e8e9ed] border border-[#2d3148] hover:border-[#4a7dff]'
            }
          >
            Apply to {company.overview?.companyName || 'Company'}
          </button>
        )}

        {/* Saved confirmation */}
        {savedMessage && (
          <span className="text-[#34d399] text-sm font-medium animate-pulse">
            ✓ {savedMessage}
          </span>
        )}
      </div>
    </div>
  );
}
