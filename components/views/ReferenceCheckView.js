'use client';

// ============================================================================
// components/views/ReferenceCheckView.js — Back-Channel Reference Check Tracker
// ============================================================================
// One of the most critical parts of real VC due diligence that no tool handles
// well: tracking back-channel reference calls on founders and key team members.
//
// VCs know that the best signal comes from people who've WORKED with the
// founders — former colleagues, investors, customers, competitors. This view
// gives a structured way to track those conversations, score the feedback,
// and surface red flags before committing capital.
//
// THREE MAJOR SECTIONS:
//   1. Summary Stats — total references, completed count, avg scores, red flags
//   2. Reference List — table/card list with status badges and quick actions
//   3. Reference Detail Form — structured assessment with scores, notes, quotes
//
// Props:
//   company  — full company data object (needs company.references array)
//   onChange — function(sectionKey, updatedData) to persist changes
//
// Data is stored in company.references as an array of reference objects,
// persisted via onChange('references', updatedReferencesArray).
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Status options for each reference — tracks where we are in the outreach process
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { value: 'completed', label: 'Completed', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { value: 'declined',  label: 'Declined',  color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { value: 'no-response', label: 'No Response', color: '#9ca0b0', bg: 'rgba(156, 160, 176, 0.15)' },
];

// Contact method options — how we're reaching this reference
const CONTACT_METHODS = [
  { value: 'phone',    label: 'Phone Call' },
  { value: 'email',    label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'in-person', label: 'In Person' },
  { value: 'video',    label: 'Video Call' },
];

// Relationship types — how this reference knows the founder/team
const RELATIONSHIP_TYPES = [
  { value: 'former-colleague',  label: 'Former Colleague' },
  { value: 'former-investor',   label: 'Former Investor' },
  { value: 'former-boss',       label: 'Former Manager/Boss' },
  { value: 'former-report',     label: 'Former Direct Report' },
  { value: 'customer',          label: 'Customer' },
  { value: 'competitor',        label: 'Competitor' },
  { value: 'board-member',      label: 'Board Member' },
  { value: 'advisor',           label: 'Advisor' },
  { value: 'co-founder',        label: 'Former Co-Founder' },
  { value: 'industry-expert',   label: 'Industry Expert' },
  { value: 'other',             label: 'Other' },
];

// "Would they invest/work with again?" options
const REINVEST_OPTIONS = [
  { value: 'yes',   label: 'Yes',   color: '#34d399' },
  { value: 'no',    label: 'No',    color: '#ef4444' },
  { value: 'maybe', label: 'Maybe', color: '#f59e0b' },
];

// Dark theme color palette — consistent with the rest of DueDrill
const COLORS = {
  bgPrimary: '#0f1117',
  bgCard: '#1e2130',
  bgInput: '#2d3148',
  textPrimary: '#e8e9ed',
  textSecondary: '#9ca0b0',
  accentBlue: '#4a7dff',
  accentGreen: '#34d399',
  accentYellow: '#f59e0b',
  accentRed: '#ef4444',
  border: 'rgba(255,255,255,0.08)',
};

// ============================================================================
// HELPER: Create a new empty reference object
// ============================================================================
// Factory function ensures every reference has all fields with defaults.
// Uses crypto.randomUUID() for unique IDs, same pattern as createEmptyCompany.
function createEmptyReference() {
  return {
    id: crypto.randomUUID(),
    // --- Person info ---
    personName: '',
    personTitle: '',
    personCompany: '',
    // --- Relationship ---
    relationship: '',            // One of RELATIONSHIP_TYPES values
    teamMemberName: '',          // Which founder/team member this reference is about
    // --- Contact & scheduling ---
    contactMethod: 'phone',      // One of CONTACT_METHODS values
    date: '',                    // Date of the call/meeting
    status: 'scheduled',         // One of STATUS_OPTIONS values
    // --- Structured scores (1-5 scale) ---
    technicalCompetence: 0,      // 0 means not yet rated
    leadershipAbility: 0,
    integrityTrust: 0,
    wouldReinvest: '',           // 'yes' | 'no' | 'maybe' | ''
    // --- Qualitative feedback ---
    notes: '',                   // Free-form notes
    redFlags: '',                // Concerns or red flags raised
    keyQuotes: '',               // Direct quotes that matter
    // --- Timestamps ---
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// HELPER: Get status badge config by value
// ============================================================================
function getStatusConfig(statusValue) {
  return STATUS_OPTIONS.find((s) => s.value === statusValue) || STATUS_OPTIONS[3];
}

// ============================================================================
// SUB-COMPONENT: StarRating — Interactive 1-5 star selector
// ============================================================================
// Renders 5 clickable stars. Filled stars up to the current value.
// onClick(newValue) fires when user clicks a star.
// WHY stars instead of a slider? Stars are the universal UX for quick
// subjective ratings — faster than typing a number, more intuitive than a slider.
function StarRating({ value, onChange, label }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              color: star <= value ? '#f59e0b' : '#2d3148',
              transition: 'color 0.15s',
              padding: 2,
            }}
            title={`${star} / 5`}
          >
            ★
          </button>
        ))}
        {value > 0 && (
          <span style={{ fontSize: 12, color: COLORS.textSecondary, marginLeft: 6 }}>
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: StatusBadge — Colored pill showing reference status
// ============================================================================
function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        letterSpacing: 0.3,
      }}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// SUB-COMPONENT: SummaryStats — Top-level metrics bar
// ============================================================================
// Shows total references, completed count, average scores, and red flag count.
// Red flags get a warning indicator when count > 0.
function SummaryStats({ references }) {
  const stats = useMemo(() => {
    const total = references.length;
    const completed = references.filter((r) => r.status === 'completed').length;
    const scheduled = references.filter((r) => r.status === 'scheduled').length;

    // Only average scores from completed references that have been rated (score > 0)
    const rated = references.filter((r) => r.status === 'completed');
    let avgTechnical = 0;
    let avgLeadership = 0;
    let avgIntegrity = 0;
    let ratedCount = 0;

    rated.forEach((r) => {
      if (r.technicalCompetence > 0 || r.leadershipAbility > 0 || r.integrityTrust > 0) {
        avgTechnical += r.technicalCompetence || 0;
        avgLeadership += r.leadershipAbility || 0;
        avgIntegrity += r.integrityTrust || 0;
        ratedCount++;
      }
    });

    if (ratedCount > 0) {
      avgTechnical = (avgTechnical / ratedCount).toFixed(1);
      avgLeadership = (avgLeadership / ratedCount).toFixed(1);
      avgIntegrity = (avgIntegrity / ratedCount).toFixed(1);
    }

    // Count references with non-empty redFlags text — these are concerns
    const redFlagCount = references.filter((r) => r.redFlags && r.redFlags.trim().length > 0).length;

    return { total, completed, scheduled, avgTechnical, avgLeadership, avgIntegrity, ratedCount, redFlagCount };
  }, [references]);

  // Stat card renderer — keeps the JSX DRY
  const StatCard = ({ label, value, accent, icon }) => (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: '16px 20px',
        flex: '1 1 0',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || COLORS.textPrimary }}>
        {value}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
      <StatCard label="Total References" value={stats.total} icon="📞" />
      <StatCard label="Completed" value={stats.completed} accent={COLORS.accentGreen} icon="✅" />
      <StatCard label="Scheduled" value={stats.scheduled} accent={COLORS.accentYellow} icon="📅" />
      <StatCard
        label="Avg Scores (T/L/I)"
        value={stats.ratedCount > 0 ? `${stats.avgTechnical} / ${stats.avgLeadership} / ${stats.avgIntegrity}` : '—'}
        icon="⭐"
      />
      <StatCard
        label="Red Flags"
        value={stats.redFlagCount}
        accent={stats.redFlagCount > 0 ? COLORS.accentRed : COLORS.textSecondary}
        icon={stats.redFlagCount > 0 ? '🚩' : '✓'}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ReferenceCard — Single reference row in the list
// ============================================================================
// Clickable card that shows key info at a glance. Clicking opens the detail form.
function ReferenceCard({ reference, onEdit, onDelete }) {
  // Find the relationship label for display
  const relLabel = RELATIONSHIP_TYPES.find((r) => r.value === reference.relationship)?.label || reference.relationship || '—';
  const contactLabel = CONTACT_METHODS.find((c) => c.value === reference.contactMethod)?.label || reference.contactMethod || '—';

  return (
    <div
      onClick={() => onEdit(reference.id)}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.accentBlue; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
    >
      {/* Left: Person info */}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 2 }}>
          {reference.personName || 'Unnamed Reference'}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
          {reference.personTitle && reference.personCompany
            ? `${reference.personTitle} @ ${reference.personCompany}`
            : reference.personTitle || reference.personCompany || '—'}
        </div>
      </div>

      {/* Relationship */}
      <div style={{ flex: '0 0 140px', fontSize: 12, color: COLORS.textSecondary }}>
        {relLabel}
      </div>

      {/* About (team member) */}
      <div style={{ flex: '0 0 120px', fontSize: 12, color: COLORS.textSecondary }}>
        {reference.teamMemberName || '—'}
      </div>

      {/* Contact method & date */}
      <div style={{ flex: '0 0 100px', fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>
        {contactLabel}
        {reference.date && (
          <div style={{ fontSize: 11, marginTop: 2 }}>{reference.date}</div>
        )}
      </div>

      {/* Status badge */}
      <div style={{ flex: '0 0 100px', textAlign: 'center' }}>
        <StatusBadge status={reference.status} />
      </div>

      {/* Red flag indicator — visible only when there's content */}
      <div style={{ flex: '0 0 30px', textAlign: 'center' }}>
        {reference.redFlags && reference.redFlags.trim() ? (
          <span title="Has red flags" style={{ fontSize: 16 }}>🚩</span>
        ) : null}
      </div>

      {/* Delete button — stops propagation so clicking doesn't open edit */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(reference.id);
        }}
        title="Delete reference"
        style={{
          flex: '0 0 30px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: COLORS.textSecondary,
          padding: 4,
          borderRadius: 4,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.accentRed; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textSecondary; }}
      >
        ✕
      </button>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ReferenceDetailForm — Full edit form for a single reference
// ============================================================================
// Shown when adding a new reference or editing an existing one.
// Contains all structured assessment fields: scores, notes, red flags, quotes.
function ReferenceDetailForm({ reference, onSave, onCancel }) {
  // Local state for the form — we don't persist until Save is clicked
  const [form, setForm] = useState({ ...reference });

  // Generic field updater
  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Shared input styles — DRY across all text inputs
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bgInput,
    color: COLORS.textPrimary,
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: 500,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239ca0b0'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 32,
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: 80,
    resize: 'vertical',
    fontFamily: 'inherit',
  };

  // Two-column grid for the form layout
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  };

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
      }}
    >
      {/* ============ FORM HEADER ============ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
          {reference.personName ? `Edit: ${reference.personName}` : 'Add New Reference'}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: 'transparent',
              color: COLORS.textSecondary,
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: COLORS.accentBlue,
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Save Reference
          </button>
        </div>
      </div>

      {/* ============ PERSON INFORMATION ============ */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: COLORS.accentBlue, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Person Information
        </h4>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              style={inputStyle}
              value={form.personName}
              onChange={(e) => updateField('personName', e.target.value)}
              placeholder="e.g., Sarah Chen"
            />
          </div>
          <div>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              value={form.personTitle}
              onChange={(e) => updateField('personTitle', e.target.value)}
              placeholder="e.g., VP Engineering"
            />
          </div>
          <div>
            <label style={labelStyle}>Company</label>
            <input
              style={inputStyle}
              value={form.personCompany}
              onChange={(e) => updateField('personCompany', e.target.value)}
              placeholder="e.g., Stripe"
            />
          </div>
          <div>
            <label style={labelStyle}>Reference About (Team Member)</label>
            <input
              style={inputStyle}
              value={form.teamMemberName}
              onChange={(e) => updateField('teamMemberName', e.target.value)}
              placeholder="e.g., John Smith (CEO)"
            />
          </div>
        </div>
      </div>

      {/* ============ RELATIONSHIP & CONTACT ============ */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: COLORS.accentBlue, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Relationship & Contact
        </h4>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Relationship to Team Member</label>
            <select
              style={selectStyle}
              value={form.relationship}
              onChange={(e) => updateField('relationship', e.target.value)}
            >
              <option value="">Select relationship...</option>
              {RELATIONSHIP_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Contact Method</label>
            <select
              style={selectStyle}
              value={form.contactMethod}
              onChange={(e) => updateField('contactMethod', e.target.value)}
            >
              {CONTACT_METHODS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              style={inputStyle}
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              style={selectStyle}
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============ STRUCTURED ASSESSMENT ============ */}
      {/* Only show assessment fields for completed or scheduled references.
          No point rating someone who declined or didn't respond. */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: COLORS.accentBlue, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Structured Assessment
        </h4>
        <div style={gridStyle}>
          <div>
            <StarRating
              label="Technical Competence"
              value={form.technicalCompetence}
              onChange={(val) => updateField('technicalCompetence', val)}
            />
          </div>
          <div>
            <StarRating
              label="Leadership Ability"
              value={form.leadershipAbility}
              onChange={(val) => updateField('leadershipAbility', val)}
            />
          </div>
          <div>
            <StarRating
              label="Integrity / Trustworthiness"
              value={form.integrityTrust}
              onChange={(val) => updateField('integrityTrust', val)}
            />
          </div>
          <div>
            <label style={labelStyle}>Would They Invest / Work With Again?</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {REINVEST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('wouldReinvest', opt.value)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: `2px solid ${form.wouldReinvest === opt.value ? opt.color : COLORS.border}`,
                    background: form.wouldReinvest === opt.value ? `${opt.color}20` : 'transparent',
                    color: form.wouldReinvest === opt.value ? opt.color : COLORS.textSecondary,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ QUALITATIVE FEEDBACK ============ */}
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: COLORS.accentBlue, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Qualitative Feedback
        </h4>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={textareaStyle}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="General notes from the conversation — context, impressions, follow-up items..."
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...labelStyle, color: COLORS.accentRed }}>Red Flags / Concerns</label>
          <textarea
            style={{ ...textareaStyle, borderColor: form.redFlags?.trim() ? 'rgba(239, 68, 68, 0.3)' : COLORS.border }}
            value={form.redFlags}
            onChange={(e) => updateField('redFlags', e.target.value)}
            placeholder="Anything concerning — hesitations, negative signals, inconsistencies with what founders told you..."
          />
        </div>
        <div>
          <label style={labelStyle}>Key Quotes</label>
          <textarea
            style={textareaStyle}
            value={form.keyQuotes}
            onChange={(e) => updateField('keyQuotes', e.target.value)}
            placeholder='Direct quotes that matter — things the reference said that you want to remember. e.g., "Best technical leader I have ever worked with" or "I would not trust them with my money."'
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: ReferenceCheckView
// ============================================================================
export default function ReferenceCheckView({ company, onChange }) {
  // The references array from the company object — default to empty array
  const references = company?.references || [];

  // --- UI state ---
  // editingId: null = list view, 'new' = adding new, <uuid> = editing existing
  const [editingId, setEditingId] = useState(null);

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================
  // All handlers follow the same pattern: build the updated array,
  // then call onChange('references', updatedArray) to persist.

  // Save a new or edited reference
  const handleSave = useCallback(
    (updatedRef) => {
      let updatedArray;

      if (editingId === 'new') {
        // Adding a new reference — append to the array
        updatedArray = [...references, updatedRef];
      } else {
        // Editing an existing reference — replace in-place by ID
        updatedArray = references.map((r) => (r.id === updatedRef.id ? updatedRef : r));
      }

      onChange('references', updatedArray);
      setEditingId(null); // Return to list view
    },
    [editingId, references, onChange]
  );

  // Delete a reference with confirmation
  const handleDelete = useCallback(
    (refId) => {
      const ref = references.find((r) => r.id === refId);
      const name = ref?.personName || 'this reference';
      if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

      const updatedArray = references.filter((r) => r.id !== refId);
      onChange('references', updatedArray);

      // If we were editing the deleted reference, close the form
      if (editingId === refId) {
        setEditingId(null);
      }
    },
    [references, onChange, editingId]
  );

  // Start adding a new reference
  const handleAddNew = useCallback(() => {
    setEditingId('new');
  }, []);

  // Get the reference being edited (or a fresh empty one for 'new')
  const editingReference = useMemo(() => {
    if (editingId === 'new') return createEmptyReference();
    if (editingId) return references.find((r) => r.id === editingId) || null;
    return null;
  }, [editingId, references]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* ============ PAGE HEADER ============ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
            📞 Reference Checks
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
            Back-channel reference calls on founders and key team members — the signal no pitch deck gives you.
          </p>
        </div>
        {/* Add Reference button — always visible unless the detail form is open */}
        {editingId === null && (
          <button
            onClick={handleAddNew}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: COLORS.accentBlue,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            + Add Reference
          </button>
        )}
      </div>

      {/* ============ SUMMARY STATS ============ */}
      <SummaryStats references={references} />

      {/* ============ DETAIL FORM (shown when editing/adding) ============ */}
      {editingReference && (
        <ReferenceDetailForm
          reference={editingReference}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* ============ REFERENCE LIST ============ */}
      {editingId === null && (
        <div>
          {/* Column headers for the card list */}
          {references.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '8px 18px',
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              <div style={{ flex: '1 1 auto' }}>Person</div>
              <div style={{ flex: '0 0 140px' }}>Relationship</div>
              <div style={{ flex: '0 0 120px' }}>About</div>
              <div style={{ flex: '0 0 100px', textAlign: 'center' }}>Contact</div>
              <div style={{ flex: '0 0 100px', textAlign: 'center' }}>Status</div>
              <div style={{ flex: '0 0 30px' }}></div>
              <div style={{ flex: '0 0 30px' }}></div>
            </div>
          )}

          {/* Reference cards */}
          {references.map((ref) => (
            <ReferenceCard
              key={ref.id}
              reference={ref}
              onEdit={setEditingId}
              onDelete={handleDelete}
            />
          ))}

          {/* Empty state */}
          {references.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 8 }}>
                No References Yet
              </h3>
              <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
                Start tracking back-channel reference calls. Talk to former colleagues, investors,
                and customers to get the real story on the founding team.
              </p>
              <button
                onClick={handleAddNew}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: COLORS.accentBlue,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add First Reference
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
