'use client';

// ============================================================================
// components/views/NotesView.js — Deal Notes & Meeting Log
// ============================================================================
// VCs take notes during founder calls, IC meetings, and back-channel
// references. These notes need to live alongside the DD data, not in a
// separate tool. This view provides two sections:
//
//   1. MEETING NOTES — structured entries with date, type, attendees,
//      notes (textarea), and action items with checkboxes.
//   2. QUICK NOTES — simple timestamped text entries for jotting down
//      thoughts, reminders, or observations on the fly.
//
// Props:
//   company  — full company data object (needs company.notes, company.meetings)
//   onChange — function(sectionKey, updatedData) to persist changes
//
// Data is stored as:
//   company.notes    — array of { id, text, createdAt }
//   company.meetings — array of { id, date, type, attendees, notes,
//                       actionItems: [{ id, text, done }], createdAt }
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Meeting type options — the kinds of meetings VCs have during DD
const MEETING_TYPES = [
  { value: 'founder-call',   label: 'Founder Call',   color: '#4a7dff', bg: 'rgba(74, 125, 255, 0.15)' },
  { value: 'ic-meeting',     label: 'IC Meeting',     color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  { value: 'board-meeting',  label: 'Board Meeting',  color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { value: 'reference-call', label: 'Reference Call', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { value: 'site-visit',     label: 'Site Visit',     color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)' },
  { value: 'demo',           label: 'Demo',           color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' },
  { value: 'other',          label: 'Other',          color: '#9ca0b0', bg: 'rgba(156, 160, 176, 0.15)' },
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
  border: '#2d3148',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
};

// ============================================================================
// HELPER: format date for display
// ============================================================================
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// HELPER: format timestamp for quick notes
// ============================================================================
function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// MEETING TYPE BADGE — colored pill showing meeting type
// ============================================================================
function MeetingTypeBadge({ type }) {
  const config = MEETING_TYPES.find((t) => t.value === type) || MEETING_TYPES[6];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        letterSpacing: '0.3px',
      }}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// ACTION ITEM ROW — single action item with checkbox + text
// ============================================================================
function ActionItemRow({ item, onToggle, onDelete }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '4px 0',
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item.id)}
        style={{
          marginTop: '3px',
          accentColor: COLORS.accentGreen,
          cursor: 'pointer',
          width: '16px',
          height: '16px',
        }}
      />
      {/* Action text */}
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          color: item.done ? COLORS.textSecondary : COLORS.textPrimary,
          textDecoration: item.done ? 'line-through' : 'none',
          opacity: item.done ? 0.7 : 1,
          lineHeight: '1.4',
        }}
      >
        {item.text}
      </span>
      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        title="Remove action item"
        style={{
          background: 'none',
          border: 'none',
          color: COLORS.textSecondary,
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 2px',
          opacity: 0.5,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.target.style.opacity = 1)}
        onMouseLeave={(e) => (e.target.style.opacity = 0.5)}
      >
        ✕
      </button>
    </div>
  );
}

// ============================================================================
// MEETING CARD — single meeting entry with expand/collapse
// ============================================================================
function MeetingCard({ meeting, isExpanded, onToggleExpand, onToggleAction, onDeleteAction, onDelete }) {
  // Count completed vs total action items for progress display
  const totalActions = (meeting.actionItems || []).length;
  const doneActions = (meeting.actionItems || []).filter((a) => a.done).length;

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ============ CARD HEADER — always visible, click to expand ============ */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Expand/collapse chevron */}
          <span
            style={{
              fontSize: '12px',
              color: COLORS.textSecondary,
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
          {/* Meeting date */}
          <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textPrimary, minWidth: '100px' }}>
            {formatDate(meeting.date)}
          </span>
          {/* Meeting type badge */}
          <MeetingTypeBadge type={meeting.type} />
          {/* Attendees preview */}
          {meeting.attendees && (
            <span style={{ fontSize: '12px', color: COLORS.textSecondary, marginLeft: '4px' }}>
              {meeting.attendees}
            </span>
          )}
        </div>
        {/* Action items counter (if any) */}
        {totalActions > 0 && (
          <span
            style={{
              fontSize: '11px',
              color: doneActions === totalActions ? COLORS.accentGreen : COLORS.textSecondary,
              fontWeight: 500,
            }}
          >
            {doneActions}/{totalActions} actions
          </span>
        )}
      </div>

      {/* ============ CARD BODY — shown when expanded ============ */}
      {isExpanded && (
        <div
          style={{
            padding: '0 18px 16px 18px',
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          {/* Notes content */}
          {meeting.notes && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Notes
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: COLORS.textPrimary,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  background: COLORS.bgInput,
                  padding: '12px',
                  borderRadius: '6px',
                }}
              >
                {meeting.notes}
              </div>
            </div>
          )}

          {/* Action items list */}
          {totalActions > 0 && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Action Items
              </div>
              <div style={{ background: COLORS.bgInput, padding: '10px 12px', borderRadius: '6px' }}>
                {meeting.actionItems.map((item) => (
                  <ActionItemRow
                    key={item.id}
                    item={item}
                    onToggle={onToggleAction}
                    onDelete={onDeleteAction}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Delete meeting button */}
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(meeting.id);
              }}
              style={{
                background: COLORS.dangerBg,
                border: 'none',
                color: COLORS.danger,
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.target.style.opacity = 0.8)}
              onMouseLeave={(e) => (e.target.style.opacity = 1)}
            >
              Delete Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADD MEETING FORM — inline form to create a new meeting entry
// ============================================================================
function AddMeetingForm({ onSave, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('founder-call');
  const [attendees, setAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [actionText, setActionText] = useState('');
  const [actionItems, setActionItems] = useState([]);

  // Add a new action item to the local list
  const handleAddAction = useCallback(() => {
    const trimmed = actionText.trim();
    if (!trimmed) return;
    setActionItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed, done: false },
    ]);
    setActionText('');
  }, [actionText]);

  // Remove a local action item
  const handleRemoveAction = useCallback((id) => {
    setActionItems((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Save the meeting
  const handleSave = useCallback(() => {
    if (!date) return;
    onSave({
      id: crypto.randomUUID(),
      date,
      type,
      attendees: attendees.trim(),
      notes: notes.trim(),
      actionItems,
      createdAt: new Date().toISOString(),
    });
  }, [date, type, attendees, notes, actionItems, onSave]);

  // Shared input styles
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: COLORS.bgInput,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    color: COLORS.textPrimary,
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: COLORS.textSecondary,
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.accentBlue}`,
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.textPrimary, marginBottom: '16px' }}>
        New Meeting Entry
      </div>

      {/* ============ Row 1: Date + Type ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              ...inputStyle,
              colorScheme: 'dark',
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Meeting Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {MEETING_TYPES.map((mt) => (
              <option key={mt.value} value={mt.value}>
                {mt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============ Row 2: Attendees ============ */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Attendees (comma-separated)</label>
        <input
          type="text"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder="e.g. John Smith, Sarah Lee, Mike Chen"
          style={inputStyle}
        />
      </div>

      {/* ============ Row 3: Notes ============ */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Meeting notes, observations, key takeaways..."
          rows={5}
          style={{
            ...inputStyle,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.5',
          }}
        />
      </div>

      {/* ============ Row 4: Action Items ============ */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Action Items</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAction();
              }
            }}
            placeholder="Add an action item and press Enter..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={handleAddAction}
            disabled={!actionText.trim()}
            style={{
              padding: '10px 16px',
              background: actionText.trim() ? COLORS.accentBlue : COLORS.bgInput,
              color: actionText.trim() ? '#fff' : COLORS.textSecondary,
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: actionText.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            + Add
          </button>
        </div>
        {/* Render local action items */}
        {actionItems.length > 0 && (
          <div style={{ background: COLORS.bgInput, padding: '10px 12px', borderRadius: '6px' }}>
            {actionItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <span style={{ fontSize: '13px', color: COLORS.textPrimary, flex: 1 }}>{item.text}</span>
                <button
                  onClick={() => handleRemoveAction(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textSecondary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    opacity: 0.5,
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = 1)}
                  onMouseLeave={(e) => (e.target.style.opacity = 0.5)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ Form buttons ============ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 20px',
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textSecondary,
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!date}
          style={{
            padding: '8px 20px',
            background: COLORS.accentBlue,
            border: 'none',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: date ? 'pointer' : 'default',
            opacity: date ? 1 : 0.5,
            transition: 'opacity 0.15s',
          }}
        >
          Save Meeting
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: NotesView
// ============================================================================
export default function NotesView({ company, onChange }) {
  // ============ LOCAL UI STATE ============
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [expandedMeetingId, setExpandedMeetingId] = useState(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [hoveredNoteId, setHoveredNoteId] = useState(null);
  const [activeSection, setActiveSection] = useState('meetings'); // 'meetings' | 'quicknotes'

  // ============ DATA: meetings and quick notes from company ============
  const meetings = useMemo(() => {
    const raw = company?.meetings || [];
    // Sort newest first by date (or createdAt as fallback)
    return [...raw].sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [company?.meetings]);

  const quickNotes = useMemo(() => {
    const raw = company?.notes || [];
    // Sort newest first by createdAt
    return [...raw].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [company?.notes]);

  // ============ MEETING HANDLERS ============

  // Save a new meeting
  const handleSaveMeeting = useCallback(
    (meeting) => {
      const updated = [...(company?.meetings || []), meeting];
      onChange('meetings', updated);
      setShowMeetingForm(false);
    },
    [company?.meetings, onChange]
  );

  // Delete a meeting
  const handleDeleteMeeting = useCallback(
    (meetingId) => {
      const updated = (company?.meetings || []).filter((m) => m.id !== meetingId);
      onChange('meetings', updated);
      if (expandedMeetingId === meetingId) setExpandedMeetingId(null);
    },
    [company?.meetings, onChange, expandedMeetingId]
  );

  // Toggle an action item's done status within a meeting
  const handleToggleAction = useCallback(
    (meetingId, actionId) => {
      const updated = (company?.meetings || []).map((m) => {
        if (m.id !== meetingId) return m;
        return {
          ...m,
          actionItems: (m.actionItems || []).map((a) =>
            a.id === actionId ? { ...a, done: !a.done } : a
          ),
        };
      });
      onChange('meetings', updated);
    },
    [company?.meetings, onChange]
  );

  // Delete an action item from a meeting
  const handleDeleteAction = useCallback(
    (meetingId, actionId) => {
      const updated = (company?.meetings || []).map((m) => {
        if (m.id !== meetingId) return m;
        return {
          ...m,
          actionItems: (m.actionItems || []).filter((a) => a.id !== actionId),
        };
      });
      onChange('meetings', updated);
    },
    [company?.meetings, onChange]
  );

  // Toggle expand/collapse for a meeting card
  const handleToggleExpand = useCallback(
    (meetingId) => {
      setExpandedMeetingId((prev) => (prev === meetingId ? null : meetingId));
    },
    []
  );

  // ============ QUICK NOTE HANDLERS ============

  // Add a quick note
  const handleAddQuickNote = useCallback(() => {
    const trimmed = quickNoteText.trim();
    if (!trimmed) return;
    const newNote = {
      id: crypto.randomUUID(),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    const updated = [...(company?.notes || []), newNote];
    onChange('notes', updated);
    setQuickNoteText('');
  }, [quickNoteText, company?.notes, onChange]);

  // Delete a quick note
  const handleDeleteQuickNote = useCallback(
    (noteId) => {
      const updated = (company?.notes || []).filter((n) => n.id !== noteId);
      onChange('notes', updated);
    },
    [company?.notes, onChange]
  );

  // ============ EMPTY STATE ============
  if (!company) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.textSecondary }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📓</div>
          <div style={{ fontSize: '15px', fontWeight: 500 }}>Select a company to view notes</div>
        </div>
      </div>
    );
  }

  // ============ STATS for the section header ============
  const totalMeetings = meetings.length;
  const totalNotes = quickNotes.length;
  const totalOpenActions = meetings.reduce(
    (sum, m) => sum + (m.actionItems || []).filter((a) => !a.done).length,
    0
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* ============ PAGE HEADER ============ */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
          Notes & Meetings
        </h2>
        <p style={{ fontSize: '13px', color: COLORS.textSecondary, marginTop: '4px' }}>
          Track meeting notes, action items and quick observations for this deal.
        </p>
        {/* Quick stats row */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
          <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>
            <span style={{ fontWeight: 700, color: COLORS.accentBlue, fontSize: '16px' }}>{totalMeetings}</span>{' '}
            {totalMeetings === 1 ? 'meeting' : 'meetings'}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>
            <span style={{ fontWeight: 700, color: COLORS.accentGreen, fontSize: '16px' }}>{totalNotes}</span>{' '}
            {totalNotes === 1 ? 'note' : 'notes'}
          </div>
          {totalOpenActions > 0 && (
            <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>
              <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '16px' }}>{totalOpenActions}</span>{' '}
              open {totalOpenActions === 1 ? 'action' : 'actions'}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION TABS ============ */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          background: COLORS.bgCard,
          borderRadius: '8px',
          padding: '4px',
          width: 'fit-content',
        }}
      >
        {[
          { id: 'meetings', label: 'Meeting Notes', count: totalMeetings },
          { id: 'quicknotes', label: 'Quick Notes', count: totalNotes },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: activeSection === tab.id ? COLORS.accentBlue : 'transparent',
              color: activeSection === tab.id ? '#fff' : COLORS.textSecondary,
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ============================================================================
          SECTION: MEETING NOTES
          ============================================================================ */}
      {activeSection === 'meetings' && (
        <div>
          {/* Add Meeting button */}
          {!showMeetingForm && (
            <button
              onClick={() => setShowMeetingForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: COLORS.accentBlue,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.target.style.opacity = 0.9)}
              onMouseLeave={(e) => (e.target.style.opacity = 1)}
            >
              + Add Meeting
            </button>
          )}

          {/* Add meeting form (inline) */}
          {showMeetingForm && (
            <AddMeetingForm
              onSave={handleSaveMeeting}
              onCancel={() => setShowMeetingForm(false)}
            />
          )}

          {/* Meeting cards list */}
          {meetings.length === 0 && !showMeetingForm ? (
            <div
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📓</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, marginBottom: '4px' }}>
                No meeting notes yet
              </div>
              <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>
                Click "Add Meeting" to log your first call, IC session or reference check.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  isExpanded={expandedMeetingId === meeting.id}
                  onToggleExpand={() => handleToggleExpand(meeting.id)}
                  onToggleAction={(actionId) => handleToggleAction(meeting.id, actionId)}
                  onDeleteAction={(actionId) => handleDeleteAction(meeting.id, actionId)}
                  onDelete={handleDeleteMeeting}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          SECTION: QUICK NOTES
          ============================================================================ */}
      {activeSection === 'quicknotes' && (
        <div>
          {/* Quick note input */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <input
              type="text"
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickNote();
                }
              }}
              placeholder="Jot down a quick note..."
              style={{
                flex: 1,
                padding: '10px 14px',
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                color: COLORS.textPrimary,
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.accentBlue)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
            />
            <button
              onClick={handleAddQuickNote}
              disabled={!quickNoteText.trim()}
              style={{
                padding: '10px 20px',
                background: quickNoteText.trim() ? COLORS.accentBlue : COLORS.bgInput,
                color: quickNoteText.trim() ? '#fff' : COLORS.textSecondary,
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: quickNoteText.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>

          {/* Quick notes list */}
          {quickNotes.length === 0 ? (
            <div
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>💭</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, marginBottom: '4px' }}>
                No quick notes yet
              </div>
              <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>
                Type a thought, observation or reminder and hit Enter.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {quickNotes.map((note) => (
                <div
                  key={note.id}
                  onMouseEnter={() => setHoveredNoteId(note.id)}
                  onMouseLeave={() => setHoveredNoteId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Timestamp */}
                  <span
                    style={{
                      fontSize: '11px',
                      color: COLORS.textSecondary,
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                      minWidth: '110px',
                    }}
                  >
                    {formatTimestamp(note.createdAt)}
                  </span>
                  {/* Note text */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      color: COLORS.textPrimary,
                      lineHeight: '1.4',
                    }}
                  >
                    {note.text}
                  </span>
                  {/* Delete button — visible on hover */}
                  <button
                    onClick={() => handleDeleteQuickNote(note.id)}
                    title="Delete note"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: COLORS.danger,
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: '2px 4px',
                      opacity: hoveredNoteId === note.id ? 1 : 0,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
