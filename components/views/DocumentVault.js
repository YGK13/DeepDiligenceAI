'use client';

// ============================================================================
// components/views/DocumentVault.js — Per-Company Document Storage
// ============================================================================
// VCs accumulate documents per deal: term sheets, cap tables, data room files,
// board decks, legal docs, reference letters. This vault organizes them.
//
// Documents are stored as metadata in company.documents[] with the actual
// files in browser storage (for now) or Vercel Blob (when configured).
// Each document entry has: id, name, type, category, size, addedAt, notes, url.
//
// Categories: Term Sheet, Cap Table, Data Room, Board Deck, Legal, Financial,
// Technical, Reference, Pitch Deck, Other
// ============================================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';

// ============ DOCUMENT CATEGORIES ============
const DOC_CATEGORIES = [
  { value: 'pitch-deck', label: 'Pitch Deck', icon: '📊', color: '#4a7dff' },
  { value: 'term-sheet', label: 'Term Sheet', icon: '📝', color: '#34d399' },
  { value: 'cap-table', label: 'Cap Table', icon: '📋', color: '#f59e0b' },
  { value: 'data-room', label: 'Data Room', icon: '🗂️', color: '#8b5cf6' },
  { value: 'financial', label: 'Financial', icon: '💰', color: '#ef4444' },
  { value: 'legal', label: 'Legal', icon: '⚖️', color: '#6b7084' },
  { value: 'technical', label: 'Technical', icon: '⚙️', color: '#06b6d4' },
  { value: 'reference', label: 'Reference', icon: '📞', color: '#ec4899' },
  { value: 'board-deck', label: 'Board Deck', icon: '🏛️', color: '#f97316' },
  { value: 'other', label: 'Other', icon: '📎', color: '#9ca0b0' },
];

// ============ FILE SIZE FORMATTER ============
function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============ RELATIVE TIME ============
function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ============ COMPONENT ============
export default function DocumentVault({ company, onChange }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const fileInputRef = useRef(null);

  // ============ FORM STATE ============
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('other');
  const [formNotes, setFormNotes] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const documents = company?.documents || [];

  // ============ FILTERED & SORTED DOCUMENTS ============
  const filteredDocs = useMemo(() => {
    let result = [...documents];

    if (filterCategory !== 'all') {
      result = result.filter((d) => d.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q)
      );
    }

    // Sort by most recent first
    result.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    return result;
  }, [documents, filterCategory, searchQuery]);

  // ============ STATS ============
  const stats = useMemo(() => {
    const byCategory = {};
    for (const doc of documents) {
      byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
    }
    return { total: documents.length, byCategory };
  }, [documents]);

  // ============ ADD DOCUMENT ============
  const handleAddDocument = useCallback(() => {
    if (!formName.trim()) return;

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: formName.trim(),
      category: formCategory,
      notes: formNotes.trim(),
      url: formUrl.trim(),
      size: 0,
      addedAt: new Date().toISOString(),
    };

    const updated = [...documents, newDoc];
    onChange('documents', updated);

    // Reset form
    setFormName('');
    setFormCategory('other');
    setFormNotes('');
    setFormUrl('');
    setShowAddForm(false);
  }, [formName, formCategory, formNotes, formUrl, documents, onChange]);

  // ============ DELETE DOCUMENT ============
  const handleDelete = useCallback(
    (docId) => {
      if (!window.confirm('Delete this document? This cannot be undone.')) return;
      const updated = documents.filter((d) => d.id !== docId);
      onChange('documents', updated);
    },
    [documents, onChange]
  );

  // ============ GET CATEGORY INFO ============
  const getCategoryInfo = (catValue) =>
    DOC_CATEGORIES.find((c) => c.value === catValue) || DOC_CATEGORIES[DOC_CATEGORIES.length - 1];

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* ============ HEADER + STATS ============ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[#e8e9ed] text-base font-bold flex items-center gap-2">
            📁 Document Vault
          </h2>
          <p className="text-[#6b7084] text-xs mt-0.5">
            {stats.total} document{stats.total !== 1 ? 's' : ''} stored
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#4a7dff] text-white hover:bg-[#3d6be6] transition-all cursor-pointer"
        >
          + Add Document
        </button>
      </div>

      {/* ============ CATEGORY FILTER PILLS ============ */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ' +
            (filterCategory === 'all'
              ? 'bg-[#4a7dff] text-white'
              : 'bg-[#252836] text-[#9ca0b0] hover:bg-[#2d3148]')
          }
        >
          All ({stats.total})
        </button>
        {DOC_CATEGORIES.map((cat) => {
          const count = stats.byCategory[cat.value] || 0;
          if (count === 0 && filterCategory !== cat.value) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ' +
                (filterCategory === cat.value
                  ? 'text-white'
                  : 'bg-[#252836] text-[#9ca0b0] hover:bg-[#2d3148]')
              }
              style={
                filterCategory === cat.value
                  ? { backgroundColor: cat.color }
                  : {}
              }
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ============ SEARCH ============ */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search documents..."
        className="w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] rounded-lg text-sm px-3 py-2 focus:border-[#4a7dff] outline-none placeholder:text-[#6b7084]"
      />

      {/* ============ ADD FORM ============ */}
      {showAddForm && (
        <div className="bg-[#1e2130] border border-[#4a7dff]/30 rounded-lg p-4 space-y-3">
          <h3 className="text-[#e8e9ed] text-sm font-semibold">Add Document</h3>

          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Document name (e.g., Series A Term Sheet)"
            className="w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] rounded-md text-sm px-3 py-2 focus:border-[#4a7dff] outline-none placeholder:text-[#6b7084]"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="bg-[#252836] border border-[#2d3148] text-[#e8e9ed] rounded-md text-sm px-3 py-2 focus:border-[#4a7dff] outline-none"
            >
              {DOC_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="URL or file link (optional)"
              className="bg-[#252836] border border-[#2d3148] text-[#e8e9ed] rounded-md text-sm px-3 py-2 focus:border-[#4a7dff] outline-none placeholder:text-[#6b7084]"
            />
          </div>

          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full bg-[#252836] border border-[#2d3148] text-[#e8e9ed] rounded-md text-sm px-3 py-2 resize-y focus:border-[#4a7dff] outline-none placeholder:text-[#6b7084]"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddDocument}
              disabled={!formName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#34d399] text-[#0f1117] hover:bg-[#2db886] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Document
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-transparent text-[#9ca0b0] border border-[#2d3148] hover:bg-[#252836] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============ DOCUMENT LIST ============ */}
      {filteredDocs.length === 0 ? (
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">📁</div>
          <h3 className="text-[#e8e9ed] text-sm font-semibold mb-1">No documents yet</h3>
          <p className="text-[#6b7084] text-xs">
            Add term sheets, cap tables, data room files, and other deal documents.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const catInfo = getCategoryInfo(doc.category);
            return (
              <div
                key={doc.id}
                className="bg-[#1e2130] border border-[#2d3148] rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#4a7dff]/30 transition-all group"
              >
                {/* Category icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: catInfo.color + '20', color: catInfo.color }}
                >
                  {catInfo.icon}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[#e8e9ed] text-sm font-medium truncate">{doc.name}</p>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: catInfo.color + '20', color: catInfo.color }}
                    >
                      {catInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {doc.notes && (
                      <p className="text-[#6b7084] text-[11px] truncate max-w-[200px]">{doc.notes}</p>
                    )}
                    <span className="text-[#6b7084] text-[10px]">{timeAgo(doc.addedAt)}</span>
                    {doc.size > 0 && (
                      <span className="text-[#6b7084] text-[10px]">{formatFileSize(doc.size)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-[#252836] text-[#4a7dff] transition-all"
                      title="Open link"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#ef4444]/60 hover:text-[#ef4444] transition-all cursor-pointer"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
