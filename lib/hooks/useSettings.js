'use client';
// ============================================================================
// lib/hooks/useSettings.js — User Settings Hook with Supabase + localStorage
// ============================================================================
// Manages the user's AI provider settings (API keys, model selections,
// preferred provider). Like useCompanies, this hook transparently switches
// between Supabase and localStorage based on auth state.
//
// SETTINGS SHAPE (consistent across both modes):
//   {
//     provider: 'perplexity',                    // Active AI provider
//     apiKeys: { perplexity: 'pplx-...', ... },  // API keys per provider
//     models:  { perplexity: 'sonar-pro', ... },  // Model prefs per provider
//   }
//
// SUPABASE TABLE: user_settings
//   - provider  (text)  — The active provider name
//   - api_keys  (jsonb) — Map of provider → API key
//   - models    (jsonb) — Map of provider → model name
//   - user_id   (uuid)  — FK to profiles, UNIQUE constraint (one row per user)
//
// SECURITY NOTE:
//   API keys stored in Supabase are protected by RLS — only the owning user
//   can read/write their own settings row. The ANON key cannot access other
//   users' API keys. For production, consider enabling column-level encryption.
//
// USAGE:
//   const { user } = useSupabaseAuth();
//   const { settings, loading, saveSettings } = useSettings(user);
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';


// ============================================================================
// CONSTANTS
// ============================================================================

// localStorage key — must match the key used in app/page.js
const SETTINGS_KEY = 'deepdiligence_settings';

// Default settings — used when no saved settings exist (first-time user).
// Perplexity is the default provider because it includes web search,
// which is ideal for due diligence research.
const DEFAULT_SETTINGS = {
  provider: 'perplexity',
  apiKeys: {},
  models: {},
};


// ============================================================================
// localStorage Helpers
// ============================================================================

/**
 * Load settings from localStorage with migration support.
 * Handles the old single-key format (apiKey + model) by converting it
 * to the new multi-provider format (apiKeys + models).
 */
function loadFromLocalStorage() {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);

    // --- Migration: old single-key format → new multi-provider format ---
    // The original app stored { apiKey: 'sk-...', model: 'claude-...' }.
    // The new format uses { apiKeys: { anthropic: 'sk-...' }, models: { ... } }.
    // If we detect the old format, migrate it and save the migrated version.
    if (parsed.apiKey && !parsed.apiKeys) {
      const migrated = {
        provider: 'anthropic',
        apiKeys: { anthropic: parsed.apiKey },
        models: { anthropic: parsed.model || 'claude-sonnet-4-20250514' },
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    // --- Normalize: ensure all expected keys exist ---
    return {
      provider: parsed.provider || 'perplexity',
      apiKeys: parsed.apiKeys || {},
      models: parsed.models || {},
    };
  } catch (err) {
    console.error('[useSettings] localStorage load error:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to localStorage.
 * Strips any legacy or unexpected fields to keep the stored data clean.
 */
function saveToLocalStorage(settings) {
  try {
    if (typeof window === 'undefined') return;
    const clean = {
      provider: settings.provider,
      apiKeys: settings.apiKeys,
      models: settings.models,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  } catch (err) {
    console.error('[useSettings] localStorage save error:', err);
  }
}


// ============================================================================
// useSettings Hook
// ============================================================================
// Parameters:
//   user — The Supabase user object from useSupabaseAuth().
//           Pass null to force localStorage mode.
// ============================================================================
export function useSettings(user) {
  // --- State: the current settings object ---
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  // --- State: loading indicator for initial data fetch ---
  const [loading, setLoading] = useState(true);

  // --- Determine persistence mode ---
  const useSupabase = isSupabaseConfigured() && !!user;

  // ============================================================================
  // Effect: Load settings on mount or when user/mode changes
  // ============================================================================
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);

      if (useSupabase) {
        // ---- SUPABASE MODE: Fetch from user_settings table ----
        try {
          const supabase = createClient();

          // The user_settings table has a UNIQUE constraint on user_id,
          // so there's at most one row per user. We use .maybeSingle()
          // instead of .single() because the row might not exist yet
          // (first-time user who hasn't saved settings).
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('[useSettings] Supabase load error:', error.message);
            if (!cancelled) setSettings({ ...DEFAULT_SETTINGS });
          } else if (data) {
            // --- Transform Supabase row into the app's settings format ---
            // Column names differ slightly: api_keys → apiKeys (camelCase)
            const loaded = {
              provider: data.provider || 'perplexity',
              apiKeys: data.api_keys || {},
              models: data.models || {},
            };
            if (!cancelled) setSettings(loaded);
          } else {
            // No settings row exists yet — use defaults
            if (!cancelled) setSettings({ ...DEFAULT_SETTINGS });
          }
        } catch (err) {
          console.error('[useSettings] Supabase load exception:', err);
          if (!cancelled) setSettings({ ...DEFAULT_SETTINGS });
        }
      } else {
        // ---- LOCAL MODE: Load from localStorage ----
        const loaded = loadFromLocalStorage();
        if (!cancelled) setSettings(loaded);
      }

      if (!cancelled) setLoading(false);
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [useSupabase, user?.id]);

  // ============================================================================
  // saveSettings(newSettings) — Persist settings
  // ============================================================================
  // Merges the provided settings with current state and saves them.
  // In Supabase mode, uses UPSERT (insert if no row exists, update if it does).
  // The UNIQUE constraint on user_id enables the upsert behavior.
  //
  // Parameters:
  //   newSettings — Partial or full settings object to merge and save.
  //                 Can include any combination of { provider, apiKeys, models }.
  // ============================================================================
  const saveSettings = useCallback(async (newSettings) => {
    // Merge new settings with current state to avoid losing fields
    // that weren't included in the update. For example, if the caller
    // only passes { provider: 'openai' }, we keep the existing apiKeys/models.
    const merged = {
      provider: newSettings.provider ?? settings.provider,
      apiKeys: newSettings.apiKeys ?? settings.apiKeys,
      models: newSettings.models ?? settings.models,
    };

    // Update local state immediately for responsive UI
    setSettings(merged);

    if (useSupabase) {
      // ---- SUPABASE MODE: Upsert into user_settings ----
      try {
        const supabase = createClient();

        // Upsert: insert a new row if none exists for this user_id,
        // or update the existing row. The onConflict targets the
        // UNIQUE constraint on user_id.
        const { error } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              provider: merged.provider,
              api_keys: merged.apiKeys,     // camelCase → snake_case for Supabase
              models: merged.models,
            },
            { onConflict: 'user_id' }       // Match on the UNIQUE user_id column
          );

        if (error) {
          console.error('[useSettings] Supabase save error:', error.message);
          // State is already updated — the user sees the change even if
          // the DB write failed. On next load, it'll revert to the DB state.
          // This is a trade-off: responsive UI vs. guaranteed persistence.
        }
      } catch (err) {
        console.error('[useSettings] Supabase save exception:', err);
      }
    } else {
      // ---- LOCAL MODE: Save to localStorage ----
      saveToLocalStorage(merged);
    }
  }, [useSupabase, user?.id, settings]);

  // ============================================================================
  // Return value
  // ============================================================================
  // - settings:     The current settings object { provider, apiKeys, models }
  // - loading:      True during initial data fetch
  // - saveSettings: async (newSettings) => void — persists merged settings
  // ============================================================================
  return {
    settings,
    loading,
    saveSettings,
  };
}
