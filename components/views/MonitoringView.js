'use client';
// ============================================================================
// components/views/MonitoringView.js — Company Monitoring & Alerts Dashboard
// ============================================================================
// Post-DD ongoing monitoring view. After initial due diligence is complete,
// VCs need to track portfolio companies for material events: funding rounds,
// executive changes, competitor moves, regulatory shifts, product launches,
// and press coverage.
//
// This view provides:
//   A. Active Alerts — unread alerts for the active company, sorted newest first
//   B. Monitoring Configuration — toggle switches for each monitoring category
//   C. Check Now — button to trigger an immediate monitoring scan via API
//   D. Alert History — filterable, searchable archive of all past alerts
//
// Props:
//   - companies: full array of companies (for potential cross-company features)
//   - company: the currently active company object
//   - settings: app settings (provider config, API keys)
//   - onChange: (sectionKey, updatedData) => void — saves data to company
//
// Dark theme colors: #1e2130, #2d3148, #e8e9ed, #4a7dff, #34d399, #f59e0b, #ef4444
// ============================================================================

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// CONSTANTS — Severity & Category Configurations
// ============================================================================

// Color mapping for alert severity levels — drives the visual urgency system.
// High = red (immediate action needed), Medium = amber (worth attention),
// Low = blue (informational, track for patterns).
const SEVERITY_COLORS = {
  high:   { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444', label: 'High' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b', label: 'Medium' },
  low:    { bg: 'rgba(74, 125, 255, 0.15)', border: '#4a7dff', text: '#4a7dff', label: 'Low' },
};

// Human-readable labels and icons for each monitoring category.
// These map to the monitoringConfig.categories keys in schemas.js.
const CATEGORY_CONFIG = {
  funding:    { label: 'Funding News',        icon: '💰', description: 'New rounds, valuations, investor changes' },
  leadership: { label: 'Leadership Changes',  icon: '👔', description: 'Executive hires, departures, board changes' },
  competitor: { label: 'Competitor Activity',  icon: '🎯', description: 'Competitor raises, launches, acquisitions' },
  regulatory: { label: 'Regulatory / Legal',   icon: '⚖️', description: 'Lawsuits, compliance issues, regulatory actions' },
  product:    { label: 'Product Launches',     icon: '🚀', description: 'New features, pivots, major releases' },
  press:      { label: 'Press / Media',        icon: '📰', description: 'Positive and negative media coverage' },
};

// ============================================================================
// HELPER: Format relative timestamps ("2 hours ago", "3 days ago")
// ============================================================================
function formatRelativeTime(isoString) {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    // For older dates, show the actual date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Unknown';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function MonitoringView({ companies, company, settings, onChange }) {
  // ============ LOCAL STATE ============
  const [isChecking, setIsChecking] = useState(false);       // loading state for Check Now
  const [checkingStatus, setCheckingStatus] = useState('');   // what's being checked right now
  const [checkResult, setCheckResult] = useState(null);       // result after check completes
  const [severityFilter, setSeverityFilter] = useState('all'); // filter for alert history
  const [categoryFilter, setCategoryFilter] = useState('all'); // filter for alert history
  const [searchQuery, setSearchQuery] = useState('');          // text search in alert history

  // ============ DERIVED DATA ============
  // Get monitoring config and alerts from the company, with safe defaults
  const monitoring = company?.monitoring || {
    enabled: false,
    categories: { funding: true, leadership: true, competitor: true, regulatory: true, product: true, press: true },
    lastChecked: null,
  };
  const alerts = company?.alerts || [];

  // Count unread alerts for the badge
  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.read && !a.dismissed).length,
    [alerts]
  );

  // Active (unread, undismissed) alerts sorted newest first
  const activeAlerts = useMemo(
    () => alerts
      .filter((a) => !a.dismissed && !a.read)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [alerts]
  );

  // All alerts (for history) — filtered by severity, category, and search
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        // Severity filter
        if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
        // Category filter
        if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
        // Text search — match against title, description, and source
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = (a.title || '').toLowerCase().includes(q);
          const matchesDesc = (a.description || '').toLowerCase().includes(q);
          const matchesSource = (a.source || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesSource) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [alerts, severityFilter, categoryFilter, searchQuery]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // ---- Toggle a monitoring category on/off ----
  const handleToggleCategory = useCallback((categoryKey) => {
    if (!company) return;
    const updated = {
      ...monitoring,
      categories: {
        ...monitoring.categories,
        [categoryKey]: !monitoring.categories[categoryKey],
      },
    };
    onChange('monitoring', updated);
  }, [company, monitoring, onChange]);

  // ---- Toggle master monitoring enabled/disabled ----
  const handleToggleEnabled = useCallback(() => {
    if (!company) return;
    onChange('monitoring', { ...monitoring, enabled: !monitoring.enabled });
  }, [company, monitoring, onChange]);

  // ---- Mark a single alert as read ----
  const handleMarkRead = useCallback((alertId) => {
    if (!company) return;
    const updatedAlerts = alerts.map((a) =>
      a.id === alertId ? { ...a, read: true } : a
    );
    onChange('alerts', updatedAlerts);
  }, [company, alerts, onChange]);

  // ---- Dismiss a single alert (soft delete — stays in history but hidden from active) ----
  const handleDismiss = useCallback((alertId) => {
    if (!company) return;
    const updatedAlerts = alerts.map((a) =>
      a.id === alertId ? { ...a, dismissed: true, read: true } : a
    );
    onChange('alerts', updatedAlerts);
  }, [company, alerts, onChange]);

  // ---- Mark all active alerts as read ----
  const handleMarkAllRead = useCallback(() => {
    if (!company || activeAlerts.length === 0) return;
    const updatedAlerts = alerts.map((a) => ({ ...a, read: true }));
    onChange('alerts', updatedAlerts);
  }, [company, alerts, activeAlerts, onChange]);

  // ============================================================================
  // CHECK NOW — Trigger an immediate monitoring scan via the API
  // ============================================================================
  const handleCheckNow = useCallback(async () => {
    if (!company || isChecking) return;

    setIsChecking(true);
    setCheckResult(null);
    setCheckingStatus('Scanning for recent news and events...');

    try {
      const companyName = company.overview?.companyName || company.overview?.name || company.name || '';
      const companyUrl = company.overview?.websiteUrl || '';

      if (!companyName) {
        setCheckResult({ error: 'No company name set. Go to Overview and add a company name first.' });
        setIsChecking(false);
        return;
      }

      // Build the list of enabled categories for the status message
      const enabledCategories = Object.entries(monitoring.categories)
        .filter(([, enabled]) => enabled)
        .map(([key]) => CATEGORY_CONFIG[key]?.label || key);
      setCheckingStatus(`Checking: ${enabledCategories.join(', ')}...`);

      // ---- Call the monitoring API ----
      const response = await fetch('/api/monitor/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyUrl,
          monitoringConfig: monitoring,
          provider: settings?.provider,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ---- Merge new alerts into existing alerts ----
        // Each alert gets a unique ID, read=false, dismissed=false
        const newAlerts = (result.alerts || []).map((alert) => ({
          ...alert,
          id: crypto.randomUUID(),
          read: false,
          dismissed: false,
        }));

        // Prepend new alerts to existing ones (newest first)
        const mergedAlerts = [...newAlerts, ...alerts];
        onChange('alerts', mergedAlerts);

        // Update lastChecked timestamp
        onChange('monitoring', {
          ...monitoring,
          lastChecked: result.checkedAt || new Date().toISOString(),
        });

        setCheckResult({
          success: true,
          count: newAlerts.length,
          provider: result.provider,
        });
      } else {
        setCheckResult({ error: result.error || 'Monitoring check failed. Try again.' });
      }
    } catch (err) {
      console.error('[MonitoringView] Check failed:', err);
      setCheckResult({ error: err.message || 'Network error. Check your connection.' });
    } finally {
      setIsChecking(false);
      setCheckingStatus('');
    }
  }, [company, isChecking, monitoring, alerts, settings, onChange]);

  // ============================================================================
  // RENDER — No company selected guard
  // ============================================================================
  if (!company) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#e8e9ed' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔔</div>
          <h2 className="text-xl font-semibold mb-2">Company Monitoring</h2>
          <p className="text-sm" style={{ color: '#8b8fa3' }}>
            Select or create a company to configure monitoring alerts.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER — Main Monitoring Dashboard
  // ============================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#e8e9ed' }}>
            🔔 Monitoring
            {unreadCount > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8b8fa3' }}>
            Track material events for {company.overview?.companyName || company.name || 'this company'}
            {monitoring.lastChecked && (
              <span> — Last checked: {formatRelativeTime(monitoring.lastChecked)}</span>
            )}
          </p>
        </div>

        {/* ---- Master toggle ---- */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: monitoring.enabled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(139, 143, 163, 0.15)',
            border: `1px solid ${monitoring.enabled ? '#34d399' : '#555'}`,
            color: monitoring.enabled ? '#34d399' : '#8b8fa3',
          }}
          onClick={handleToggleEnabled}
        >
          {monitoring.enabled ? '● Active' : '○ Inactive'}
        </button>
      </div>

      {/* ============ SECTION A: ACTIVE ALERTS ============ */}
      {/* Shows unread, undismissed alerts. This is the "inbox" view — what needs attention now. */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#e8e9ed' }}>
            Active Alerts
            {unreadCount > 0 && (
              <span className="text-sm font-normal ml-2" style={{ color: '#8b8fa3' }}>
                ({unreadCount} unread)
              </span>
            )}
          </h2>
          {activeAlerts.length > 0 && (
            <button
              className="text-xs px-3 py-1 rounded-md transition-all hover:opacity-80"
              style={{ background: 'rgba(74, 125, 255, 0.15)', color: '#4a7dff' }}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </button>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#8b8fa3' }}>
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm">No active alerts. All clear.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => {
              const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
              const cat = CATEGORY_CONFIG[alert.category] || { icon: '📋', label: alert.category };
              return (
                <div
                  key={alert.id}
                  className="rounded-lg p-4 flex gap-3 transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: sev.bg, borderLeft: `3px solid ${sev.border}` }}
                  onClick={() => handleMarkRead(alert.id)}
                >
                  {/* Severity + Category icon */}
                  <div className="flex-shrink-0 text-xl">{cat.icon}</div>

                  {/* Alert content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}
                      >
                        {sev.label}
                      </span>
                      <span className="text-xs" style={{ color: '#8b8fa3' }}>
                        {cat.label}
                      </span>
                      <span className="text-xs" style={{ color: '#555' }}>•</span>
                      <span className="text-xs" style={{ color: '#8b8fa3' }}>
                        {formatRelativeTime(alert.timestamp)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#e8e9ed' }}>
                      {alert.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: '#b0b3c6' }}>
                      {alert.description}
                    </p>
                    {alert.source && (
                      <p className="text-xs mt-1" style={{ color: '#6b6f85' }}>
                        Source: {alert.source}
                      </p>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    className="flex-shrink-0 text-xs px-2 py-1 rounded-md transition-all hover:opacity-80 self-start"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#8b8fa3' }}
                    onClick={(e) => {
                      e.stopPropagation(); // don't trigger the mark-read click
                      handleDismiss(alert.id);
                    }}
                    title="Dismiss this alert"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ SECTION B: MONITORING CONFIGURATION ============ */}
      {/* Toggle switches for each monitoring category. Each toggle maps to company.monitoring.categories */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#e8e9ed' }}>
          Monitoring Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const isEnabled = monitoring.categories?.[key] !== false; // default to true
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg p-3 transition-all cursor-pointer"
                style={{
                  background: isEnabled ? 'rgba(74, 125, 255, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isEnabled ? 'rgba(74, 125, 255, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}
                onClick={() => handleToggleCategory(key)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{config.icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#e8e9ed' }}>
                      {config.label}
                    </div>
                    <div className="text-xs" style={{ color: '#8b8fa3' }}>
                      {config.description}
                    </div>
                  </div>
                </div>

                {/* Toggle switch visual */}
                <div
                  className="w-10 h-5 rounded-full relative transition-all flex-shrink-0"
                  style={{
                    background: isEnabled ? '#4a7dff' : '#3a3d52',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                    style={{
                      background: '#fff',
                      left: isEnabled ? '22px' : '2px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ SECTION C: CHECK NOW BUTTON ============ */}
      {/* Triggers an immediate monitoring scan. Shows loading state + result count. */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e8e9ed' }}>
              Manual Check
            </h2>
            <p className="text-xs mt-1" style={{ color: '#8b8fa3' }}>
              Scan for recent news and material events right now
            </p>
          </div>

          <button
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{
              background: isChecking ? '#2d3148' : '#4a7dff',
              color: '#fff',
              cursor: isChecking ? 'not-allowed' : 'pointer',
            }}
            onClick={handleCheckNow}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <span className="animate-spin inline-block">⟳</span>
                Checking...
              </>
            ) : (
              <>🔍 Check for Updates</>
            )}
          </button>
        </div>

        {/* ---- Loading status ---- */}
        {isChecking && checkingStatus && (
          <div
            className="mt-3 text-xs px-3 py-2 rounded-md"
            style={{ background: 'rgba(74, 125, 255, 0.1)', color: '#4a7dff' }}
          >
            {checkingStatus}
          </div>
        )}

        {/* ---- Check result ---- */}
        {checkResult && !isChecking && (
          <div
            className="mt-3 text-sm px-3 py-2 rounded-md"
            style={{
              background: checkResult.success
                ? 'rgba(52, 211, 153, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              color: checkResult.success ? '#34d399' : '#ef4444',
            }}
          >
            {checkResult.success
              ? checkResult.count > 0
                ? `Found ${checkResult.count} new alert${checkResult.count > 1 ? 's' : ''}. Scroll up to review.`
                : 'No new alerts found. Everything looks quiet.'
              : `Error: ${checkResult.error}`}
          </div>
        )}
      </div>

      {/* ============ SECTION D: ALERT HISTORY ============ */}
      {/* Scrollable archive of ALL alerts with filters and search. */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#e8e9ed' }}>
          Alert History
          <span className="text-sm font-normal ml-2" style={{ color: '#8b8fa3' }}>
            ({alerts.length} total)
          </span>
        </h2>

        {/* ---- Filters row ---- */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Severity filter */}
          <select
            className="text-xs px-3 py-1.5 rounded-md outline-none"
            style={{
              background: '#2d3148',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e8e9ed',
            }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category filter */}
          <select
            className="text-xs px-3 py-1.5 rounded-md outline-none"
            style={{
              background: '#2d3148',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e8e9ed',
            }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => (
              <option key={key} value={key}>{conf.label}</option>
            ))}
          </select>

          {/* Text search */}
          <input
            className="text-xs px-3 py-1.5 rounded-md outline-none flex-1 min-w-[200px]"
            style={{
              background: '#2d3148',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e8e9ed',
            }}
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ---- Alert list ---- */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-6" style={{ color: '#8b8fa3' }}>
            <p className="text-sm">
              {alerts.length === 0
                ? 'No alerts yet. Click "Check for Updates" to scan for events.'
                : 'No alerts match your current filters.'}
            </p>
          </div>
        ) : (
          <div
            className="space-y-2 overflow-y-auto pr-1"
            style={{ maxHeight: '400px' }}
          >
            {filteredAlerts.map((alert) => {
              const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
              const cat = CATEGORY_CONFIG[alert.category] || { icon: '📋', label: alert.category };
              const isUnread = !alert.read;

              return (
                <div
                  key={alert.id}
                  className="rounded-lg p-3 flex gap-3 transition-all"
                  style={{
                    background: isUnread ? 'rgba(74, 125, 255, 0.06)' : 'rgba(255,255,255,0.02)',
                    borderLeft: `3px solid ${isUnread ? sev.border : '#3a3d52'}`,
                    opacity: alert.dismissed ? 0.5 : 1,
                  }}
                >
                  {/* Category icon */}
                  <div className="flex-shrink-0 text-base">{cat.icon}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[10px] font-bold uppercase px-1 py-0.5 rounded"
                        style={{ color: sev.text }}
                      >
                        {sev.label}
                      </span>
                      <span className="text-[10px]" style={{ color: '#6b6f85' }}>
                        {cat.label}
                      </span>
                      <span className="text-[10px]" style={{ color: '#444' }}>•</span>
                      <span className="text-[10px]" style={{ color: '#6b6f85' }}>
                        {formatRelativeTime(alert.timestamp)}
                      </span>
                      {isUnread && (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: '#4a7dff' }}
                          title="Unread"
                        />
                      )}
                      {alert.dismissed && (
                        <span className="text-[10px]" style={{ color: '#555' }}>
                          (dismissed)
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold" style={{ color: '#e8e9ed' }}>
                      {alert.title}
                    </h4>
                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: '#9b9eb3' }}>
                      {alert.description}
                    </p>
                    {alert.source && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
                        Source: {alert.source}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {isUnread && (
                      <button
                        className="text-[10px] px-2 py-0.5 rounded transition-all hover:opacity-80"
                        style={{ background: 'rgba(74, 125, 255, 0.15)', color: '#4a7dff' }}
                        onClick={() => handleMarkRead(alert.id)}
                        title="Mark as read"
                      >
                        Read
                      </button>
                    )}
                    {!alert.dismissed && (
                      <button
                        className="text-[10px] px-2 py-0.5 rounded transition-all hover:opacity-80"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#8b8fa3' }}
                        onClick={() => handleDismiss(alert.id)}
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
