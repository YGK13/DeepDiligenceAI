'use client';

// ============================================================================
// components/ui/NotificationBell.js — Bell icon + dropdown for TopBar
// ============================================================================
// Renders a bell icon with an unread-count badge. Clicking it opens a
// dropdown panel showing the last 20 notifications (newest first).
//
// Props:
//   notifications   — array of notification objects from lib/notifications.js
//   onMarkRead      — callback(notificationId) to mark a single item read
//   onMarkAllRead   — callback() to mark all notifications read
//   onClearAll      — callback() to remove all notifications
//   onNavigate      — callback(actionUrl) to handle in-app navigation
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { NOTIFICATION_ICONS, SEVERITY_COLORS, relativeTime } from '@/lib/notifications';

// ============ CONSTANTS ============
const MAX_VISIBLE = 20; // Show at most 20 notifications in the dropdown

// ============ COMPONENT ============
export default function NotificationBell({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onNavigate,
}) {
  // ---------- State ----------
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // ---------- Derived ----------
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications
    .slice() // clone so we don't mutate props
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_VISIBLE);

  // ---------- Close on click outside ----------
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    // Use mousedown so the click registers before the button's onClick
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ---------- Close on Escape ----------
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // ---------- Handle notification click ----------
  const handleNotificationClick = useCallback(
    (notification) => {
      // Mark as read
      if (!notification.read && onMarkRead) {
        onMarkRead(notification.id);
      }
      // Navigate if actionUrl is provided
      if (notification.actionUrl && onNavigate) {
        onNavigate(notification.actionUrl);
      }
      setIsOpen(false);
    },
    [onMarkRead, onNavigate]
  );

  return (
    <div className="relative">
      {/* ============ BELL BUTTON ============ */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Notifications"
        className={
          'relative flex items-center justify-center w-9 h-9 rounded-lg ' +
          'bg-[#252836] border border-[#2d3148] ' +
          'hover:bg-[#2d3148] ' +
          'focus:outline-none focus:ring-2 focus:ring-[#4a7dff]/50 ' +
          'transition-colors duration-150'
        }
      >
        {/* Bell SVG icon */}
        <svg
          className="w-[18px] h-[18px] text-[#9ca0b0]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* ---- Unread badge ---- */}
        {/* Red circle with count, positioned at top-right corner of the bell */}
        {unreadCount > 0 && (
          <span
            className={
              'absolute -top-1 -right-1 flex items-center justify-center ' +
              'min-w-[18px] h-[18px] px-1 rounded-full ' +
              'bg-[#ef4444] text-white text-[10px] font-bold leading-none'
            }
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ============ DROPDOWN PANEL ============ */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={
            'absolute right-0 top-full mt-2 z-50 ' +
            'w-[360px] max-h-[480px] ' +
            'bg-[#1e2130] border border-[#2d3148] rounded-xl shadow-2xl ' +
            'flex flex-col overflow-hidden'
          }
        >
          {/* ---- Header row ---- */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3148]">
            <h3 className="text-sm font-semibold text-[#e8e9ed]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-[#9ca0b0]">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  if (onMarkAllRead) onMarkAllRead();
                }}
                className="text-xs text-[#4a7dff] hover:text-[#6b9aff] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* ---- Notification list ---- */}
          <div className="flex-1 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-3xl mb-2">🔔</span>
                <p className="text-sm text-[#6b7084]">No notifications</p>
              </div>
            ) : (
              visibleNotifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={
                    'w-full text-left flex items-start gap-3 px-4 py-3 ' +
                    'hover:bg-[#252836] transition-colors duration-100 ' +
                    'border-b border-[#2d3148]/50 last:border-b-0'
                  }
                >
                  {/* ---- Icon ---- */}
                  <span className="text-lg mt-0.5 shrink-0">
                    {NOTIFICATION_ICONS[notif.type] || '📌'}
                  </span>

                  {/* ---- Content ---- */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Unread dot */}
                      {!notif.read && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: SEVERITY_COLORS[notif.severity] || '#4a7dff' }}
                        />
                      )}
                      <span className="text-sm font-medium text-[#e8e9ed] truncate">
                        {notif.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#9ca0b0] mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-[#6b7084] mt-1 block">
                      {relativeTime(notif.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ---- Footer row ---- */}
          {visibleNotifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#2d3148] text-center">
              <button
                onClick={() => {
                  if (onClearAll) onClearAll();
                  setIsOpen(false);
                }}
                className="text-xs text-[#ef4444] hover:text-[#ff6b6b] transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
