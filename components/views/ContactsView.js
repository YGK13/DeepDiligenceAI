'use client';

// ============================================================================
// components/views/ContactsView.js — Contact & Relationship Management
// ============================================================================
// VCs don't just track companies — they track PEOPLE. Founders, co-investors,
// board members, advisors, LPs, introducers. Who introduced whom, who's
// connected to which deal. This is the contact graph.
//
// FEATURES:
//   - Contact list with table/card view (name, title, type badge, relationship)
//   - Add contact form (slide-out panel with all fields)
//   - Edit contact (click to edit inline via slide-out)
//   - Delete contact (with confirmation)
//   - Filter by type (founder, investor, advisor, board, introducer)
//   - Search contacts by name or company
//   - Color-coded type badges
//   - Quick actions: mailto link, LinkedIn external link
//   - Empty state with helpful onboarding message
//
// Props:
//   company  — full company data object (needs company.contacts array)
//   onChange — function(sectionKey, updatedData) to persist changes
//
// Data is stored in company.contacts as an array of contact objects,
// persisted via onChange('contacts', updatedContactsArray).
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Contact type options — the role this person plays in the deal
const CONTACT_TYPES = [
  { value: 'founder',    label: 'Founder',    color: '#4a7dff', bg: 'rgba(74, 125, 255, 0.15)' },
  { value: 'investor',   label: 'Investor',   color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { value: 'advisor',    label: 'Advisor',    color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  { value: 'board',      label: 'Board',      color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { value: 'introducer', label: 'Introducer', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)' },
  { value: 'other',      label: 'Other',      color: '#9ca0b0', bg: 'rgba(156, 160, 176, 0.15)' },
];

// Relationship warmth — how close the connection is
const RELATIONSHIP_OPTIONS = [
  { value: 'warm',      label: 'Warm',      color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { value: 'cold',      label: 'Cold',      color: '#9ca0b0', bg: 'rgba(156, 160, 176, 0.15)' },
  { value: 'connected', label: 'Connected', color: '#4a7dff', bg: 'rgba(74, 125, 255, 0.15)' },
  { value: 'met',       label: 'Met',       color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
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
// HELPER: Create a new empty contact object
// ============================================================================
// Factory function ensures every contact has all fields with defaults.
// Uses crypto.randomUUID() for unique IDs, same pattern as createEmptyCompany.
function createEmptyContact() {
  return {
    id: crypto.randomUUID(),
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    linkedin: '',
    type: 'other',              // founder/investor/advisor/board/introducer/other
    relationship: 'cold',       // warm/cold/connected/met
    notes: '',
    addedAt: new Date().toISOString(),
    lastContactedAt: '',
  };
}

// ============================================================================
// HELPER: Get type badge config by value
// ============================================================================
function getTypeBadge(typeValue) {
  return CONTACT_TYPES.find((t) => t.value === typeValue) || CONTACT_TYPES[5]; // default to 'other'
}

// ============================================================================
// HELPER: Get relationship badge config by value
// ============================================================================
function getRelationshipBadge(relValue) {
  return RELATIONSHIP_OPTIONS.find((r) => r.value === relValue) || RELATIONSHIP_OPTIONS[1]; // default to 'cold'
}

// ============================================================================
// HELPER: Format date for display (short human-readable)
// ============================================================================
function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ============================================================================
// SUB-COMPONENT: Badge — renders a small colored pill
// ============================================================================
function Badge({ label, color, bg }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        color: color,
        background: bg,
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// ============================================================================
// SUB-COMPONENT: EmptyState — shown when no contacts exist
// ============================================================================
function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: COLORS.textPrimary,
          marginBottom: '8px',
        }}
      >
        No contacts yet
      </h3>
      <p
        style={{
          fontSize: '14px',
          color: COLORS.textSecondary,
          maxWidth: '420px',
          lineHeight: '1.6',
          marginBottom: '24px',
        }}
      >
        Add founders, investors, advisors, board members, and key people
        connected to this deal. Track relationships, communication history,
        and who introduced whom.
      </p>
      <button
        onClick={onAdd}
        style={{
          padding: '10px 24px',
          borderRadius: '8px',
          border: 'none',
          background: COLORS.accentBlue,
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Add First Contact
      </button>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ContactForm — slide-out panel for add/edit
// ============================================================================
function ContactForm({ contact, onSave, onCancel, isNew }) {
  // Local state for form fields — initialized from the contact prop
  const [form, setForm] = useState({ ...contact });

  // Generic field change handler
  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Save handler — validates name is present, then calls onSave
  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) {
      alert('Contact name is required.');
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      // Update lastContactedAt if it was set during editing
      ...(form.lastContactedAt === '' ? {} : { lastContactedAt: form.lastContactedAt }),
    });
  }, [form, onSave]);

  // ---- Shared input style ----
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bgInput,
    color: COLORS.textPrimary,
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: COLORS.textSecondary,
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const fieldGroup = { marginBottom: '16px' };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '480px',
        maxWidth: '100vw',
        background: COLORS.bgCard,
        borderLeft: `1px solid ${COLORS.border}`,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* ============ HEADER ============ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0,
          }}
        >
          {isNew ? '+ Add Contact' : 'Edit Contact'}
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: COLORS.textSecondary,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* ============ FORM BODY (scrollable) ============ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}
      >
        {/* ---- Name (required) ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Name *</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Sarah Chen"
            autoFocus
          />
        </div>

        {/* ---- Title ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. CEO & Co-Founder"
          />
        </div>

        {/* ---- Company ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Company</label>
          <input
            style={inputStyle}
            value={form.company}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </div>

        {/* ---- Type & Relationship (side by side) ---- */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Relationship</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.relationship}
              onChange={(e) => handleChange('relationship', e.target.value)}
            >
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---- Email ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            style={inputStyle}
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="sarah@acme.com"
          />
        </div>

        {/* ---- Phone ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Phone</label>
          <input
            type="tel"
            style={inputStyle}
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* ---- LinkedIn ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>LinkedIn URL</label>
          <input
            type="url"
            style={inputStyle}
            value={form.linkedin}
            onChange={(e) => handleChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/sarahchen"
          />
        </div>

        {/* ---- Last Contacted ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Last Contacted</label>
          <input
            type="date"
            style={{ ...inputStyle, colorScheme: 'dark' }}
            value={form.lastContactedAt ? form.lastContactedAt.slice(0, 10) : ''}
            onChange={(e) =>
              handleChange(
                'lastContactedAt',
                e.target.value ? new Date(e.target.value).toISOString() : ''
              )
            }
          />
        </div>

        {/* ---- Notes ---- */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: '100px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="How do you know this person? What's their role in the deal? Key context..."
          />
        </div>
      </div>

      {/* ============ FOOTER ACTIONS ============ */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 24px',
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: `1px solid ${COLORS.border}`,
            background: 'transparent',
            color: COLORS.textSecondary,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: COLORS.accentBlue,
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isNew ? 'Add Contact' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ContactRow — single row in the contacts table
// ============================================================================
function ContactRow({ contact, onEdit, onDelete }) {
  const typeBadge = getTypeBadge(contact.type);
  const relBadge = getRelationshipBadge(contact.relationship);

  return (
    <tr
      style={{
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => onEdit(contact)}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* ---- Name + Title ---- */}
      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
        <div style={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: '13px' }}>
          {contact.name}
        </div>
        {contact.title && (
          <div style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '2px' }}>
            {contact.title}
          </div>
        )}
      </td>

      {/* ---- Company ---- */}
      <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.textSecondary }}>
        {contact.company || '—'}
      </td>

      {/* ---- Type badge ---- */}
      <td style={{ padding: '12px 16px' }}>
        <Badge label={typeBadge.label} color={typeBadge.color} bg={typeBadge.bg} />
      </td>

      {/* ---- Relationship badge ---- */}
      <td style={{ padding: '12px 16px' }}>
        <Badge label={relBadge.label} color={relBadge.color} bg={relBadge.bg} />
      </td>

      {/* ---- Last Contacted ---- */}
      <td style={{ padding: '12px 16px', fontSize: '12px', color: COLORS.textSecondary }}>
        {formatDate(contact.lastContactedAt)}
      </td>

      {/* ---- Quick Actions (email, LinkedIn, delete) ---- */}
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {/* Email icon — opens mailto link */}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              title={`Email ${contact.name}`}
              onClick={(e) => e.stopPropagation()} // don't trigger row edit
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(74, 125, 255, 0.12)',
                color: COLORS.accentBlue,
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ✉
            </a>
          )}

          {/* LinkedIn icon — opens profile in new tab */}
          {contact.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              title={`LinkedIn: ${contact.name}`}
              onClick={(e) => e.stopPropagation()} // don't trigger row edit
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(74, 125, 255, 0.12)',
                color: COLORS.accentBlue,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              in
            </a>
          )}

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // don't trigger row edit
              onDelete(contact.id);
            }}
            title="Delete contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: COLORS.accentRed,
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN COMPONENT: ContactsView
// ============================================================================
export default function ContactsView({ company, onChange }) {
  // --- Local UI state ---
  const [showForm, setShowForm] = useState(false);        // slide-out panel visible?
  const [editingContact, setEditingContact] = useState(null); // contact being edited (null = new)
  const [searchQuery, setSearchQuery] = useState('');     // search input
  const [typeFilter, setTypeFilter] = useState('all');    // type filter dropdown

  // --- Derive contacts from company data ---
  const contacts = useMemo(() => company?.contacts || [], [company]);

  // ============================================================================
  // FILTERED + SEARCHED CONTACTS
  // ============================================================================
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.type === typeFilter);
    }

    // Apply search query (matches name or company, case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q)
      );
    }

    // Sort by addedAt (newest first)
    result.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    return result;
  }, [contacts, typeFilter, searchQuery]);

  // ============================================================================
  // SUMMARY STATS — counts by type
  // ============================================================================
  const stats = useMemo(() => {
    const byType = {};
    CONTACT_TYPES.forEach((t) => (byType[t.value] = 0));
    contacts.forEach((c) => {
      if (byType[c.type] !== undefined) byType[c.type]++;
      else byType['other']++;
    });
    return { total: contacts.length, byType };
  }, [contacts]);

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  // Open form for adding a new contact
  const handleAdd = useCallback(() => {
    setEditingContact(null);
    setShowForm(true);
  }, []);

  // Open form for editing an existing contact
  const handleEdit = useCallback((contact) => {
    setEditingContact(contact);
    setShowForm(true);
  }, []);

  // Save (add or update) a contact
  const handleSave = useCallback(
    (contactData) => {
      let updated;
      if (editingContact) {
        // Update existing contact — replace in array
        updated = contacts.map((c) => (c.id === contactData.id ? contactData : c));
      } else {
        // Add new contact — prepend to array
        updated = [contactData, ...contacts];
      }
      onChange('contacts', updated);
      setShowForm(false);
      setEditingContact(null);
    },
    [contacts, editingContact, onChange]
  );

  // Delete a contact (with confirmation)
  const handleDelete = useCallback(
    (contactId) => {
      const target = contacts.find((c) => c.id === contactId);
      if (!target) return;
      if (!window.confirm(`Delete contact "${target.name}"? This cannot be undone.`)) return;
      const updated = contacts.filter((c) => c.id !== contactId);
      onChange('contacts', updated);
    },
    [contacts, onChange]
  );

  // Close the form panel
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingContact(null);
  }, []);

  // ============================================================================
  // RENDER — No contacts: empty state
  // ============================================================================
  if (contacts.length === 0 && !showForm) {
    return (
      <div>
        <EmptyState onAdd={handleAdd} />
      </div>
    );
  }

  // ============================================================================
  // RENDER — Main contacts view
  // ============================================================================
  return (
    <div style={{ position: 'relative' }}>
      {/* ============ HEADER: Title + Add Button ============ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
            }}
          >
            Contacts & Relationships
          </h2>
          <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: '4px 0 0' }}>
            {stats.total} contact{stats.total !== 1 ? 's' : ''} tracked for this deal
          </p>
        </div>
        <button
          onClick={handleAdd}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: 'none',
            background: COLORS.accentBlue,
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Add Contact
        </button>
      </div>

      {/* ============ STAT BADGES — counts by type ============ */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        {CONTACT_TYPES.map((t) => (
          <div
            key={t.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              fontSize: '12px',
            }}
          >
            <span style={{ color: t.color, fontWeight: 700 }}>{stats.byType[t.value] || 0}</span>
            <span style={{ color: COLORS.textSecondary }}>{t.label}s</span>
          </div>
        ))}
      </div>

      {/* ============ SEARCH + FILTER BAR ============ */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search input */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgInput,
              color: COLORS.textPrimary,
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Type filter dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
            background: COLORS.bgInput,
            color: COLORS.textPrimary,
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '140px',
          }}
        >
          <option value="all">All Types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* ============ CONTACTS TABLE ============ */}
      <div
        style={{
          background: COLORS.bgCard,
          borderRadius: '12px',
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
        }}
      >
        {filteredContacts.length === 0 ? (
          // No results after filtering
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: COLORS.textSecondary,
              fontSize: '14px',
            }}
          >
            No contacts match your search or filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Company
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Relationship
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Last Contacted
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      width: '120px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ BACKDROP — dims main content when form is open ============ */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
          }}
          onClick={handleCancel}
        />
      )}

      {/* ============ SLIDE-OUT FORM PANEL ============ */}
      {showForm && (
        <ContactForm
          contact={editingContact || createEmptyContact()}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={!editingContact}
        />
      )}
    </div>
  );
}
