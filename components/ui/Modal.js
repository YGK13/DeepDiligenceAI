'use client';

// ============================================================
// Modal.js — Portal-Based Modal Dialog Component
// ============================================================
// A dark-themed modal that renders via createPortal at the
// document root. Features an overlay backdrop, centered content
// card, title bar, scrollable body, and footer action buttons.
// Closes on overlay click. Renders nothing when not open.
// ============================================================

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ============================================================
// Modal Component
// ============================================================
// Props:
//   isOpen   — boolean controlling visibility
//   onClose  — callback invoked when the modal should close
//              (triggered by overlay click)
//   title    — optional string displayed in the modal header
//   children — modal body content (forms, text, etc.)
//   actions  — optional React node for footer buttons
//              (e.g., Save/Cancel button group)
// ============================================================
export default function Modal({ isOpen, onClose, title, children, actions }) {
  // ----------------------------------------------------------
  // Portal mount point state
  // We need to wait for the component to mount on the client
  // before we can access document.body for createPortal
  // ----------------------------------------------------------
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ----------------------------------------------------------
  // Prevent background scrolling while modal is open
  // ----------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup: restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ----------------------------------------------------------
  // Don't render anything if modal is closed or not yet mounted
  // ----------------------------------------------------------
  if (!isOpen || !mounted) {
    return null;
  }

  // ----------------------------------------------------------
  // Handle overlay click — close the modal
  // We stop propagation on the inner card click to prevent
  // the overlay handler from firing when clicking inside
  // ----------------------------------------------------------
  const handleOverlayClick = () => {
    onClose?.();
  };

  const handleCardClick = (e) => {
    // Prevent clicks inside the modal card from bubbling up
    // to the overlay and triggering a close
    e.stopPropagation();
  };

  // ----------------------------------------------------------
  // Modal JSX — rendered via portal at document.body
  // ----------------------------------------------------------
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={handleOverlayClick}
    >
      {/* ======================================================
          Modal Card — centered, max-width constrained
          ====================================================== */}
      <div
        className="
          w-full max-w-lg
          bg-[#1e2130]
          border border-[#2d3148]
          rounded-lg
          shadow-2xl
          flex flex-col
          max-h-[85vh]
        "
        onClick={handleCardClick}
      >
        {/* ----------------------------------------------------
            Header — title + close button
            ---------------------------------------------------- */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d3148]">
            <h2 className="text-[16px] font-semibold text-[#e8e9ed]">
              {title}
            </h2>

            {/* Close button (X) */}
            <button
              onClick={onClose}
              className="
                p-1 rounded-md
                text-[#6b7084] hover:text-[#e8e9ed]
                hover:bg-[#252836]
                transition-colors duration-150
                cursor-pointer
              "
              aria-label="Close modal"
            >
              {/* SVG X icon — 20x20px */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------
            Body — scrollable content area
            ---------------------------------------------------- */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* ----------------------------------------------------
            Footer — action buttons (only rendered if provided)
            ---------------------------------------------------- */}
        {actions && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2d3148]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  // Render the modal at the document root via portal
  // This ensures the modal sits above all other content
  // regardless of DOM nesting or z-index stacking contexts
  return createPortal(modalContent, document.body);
}
