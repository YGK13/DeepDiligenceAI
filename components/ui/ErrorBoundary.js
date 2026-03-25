'use client';

// ============================================================================
// components/ui/ErrorBoundary.js — React Error Boundary
// ============================================================================
// Catches JavaScript errors in child component tree and displays a fallback UI
// instead of crashing the entire app. CRITICAL for production SaaS — a single
// bad API response or corrupted data should not take down a paying user's session.
//
// React error boundaries MUST be class components (hooks don't support them).
// ============================================================================

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // ============ CATCH ERRORS ============
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging — in production, send to error tracking service
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  // ============ RESET HANDLER ============
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  // ============ RENDER ============
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-[#e8e9ed] text-lg font-bold mb-2">
            Something went wrong
          </h3>
          <p className="text-[#9ca0b0] text-sm mb-2 max-w-md">
            An unexpected error occurred. Your data is safe — try refreshing or click below to recover.
          </p>
          {this.state.error && (
            <p className="text-[#ef4444]/70 text-xs mb-4 font-mono max-w-lg break-all">
              {this.state.error.message || String(this.state.error)}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#4a7dff] text-white hover:bg-[#3d6be6] transition-all cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#252836] text-[#9ca0b0] border border-[#2d3148] hover:bg-[#2d3148] transition-all cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
