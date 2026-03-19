'use client';
// ============================================================================
// lib/hooks/useCompanies.js — Companies CRUD Hook with Supabase + localStorage
// ============================================================================
// Provides a unified API for creating, reading, updating, and deleting
// companies. Automatically chooses between Supabase (when user is logged in)
// and localStorage (when user is null / Supabase not configured).
//
// DATA FLOW:
//   - When user IS logged in:
//       All operations go through Supabase. The `companies` table stores
//       each company as a row with the full company object in the `data`
//       JSONB column and AI research in the `ai_research` JSONB column.
//
//   - When user is NOT logged in:
//       Falls back to localStorage using the same keys as the existing
//       app (STORAGE_KEY = 'deepdiligence_companies'). This preserves
//       backward compatibility with the pre-Supabase version.
//
// ARCHITECTURE DECISION — WHY JSONB:
//   The company schema (see lib/schemas.js) has 16 sections with ~200 fields.
//   Normalizing this into relational columns would require constant migrations
//   as we add fields. JSONB gives us schema flexibility while keeping queries
//   fast (Postgres JSONB is indexed and binary-optimized).
//
// USAGE:
//   const { user } = useSupabaseAuth();
//   const { companies, loading, createCompany, updateCompany, deleteCompany, importCompanies } = useCompanies(user);
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';
import { createEmptyCompany } from '@/lib/schemas';


// ============================================================================
// LOCALSTORAGE KEY — must match the key used in app/page.js
// ============================================================================
const STORAGE_KEY = 'deepdiligence_companies';


// ============================================================================
// localStorage Helpers
// ============================================================================
// These mirror the existing persistence functions in app/page.js.
// They're duplicated here so this hook is self-contained and can be
// used as a drop-in replacement for the inline localStorage code.
// ============================================================================

/**
 * Load companies from localStorage.
 * Returns an empty array if nothing is stored or if parsing fails.
 */
function loadFromLocalStorage() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[useCompanies] localStorage load error:', err);
    return [];
  }
}

/**
 * Save companies array to localStorage.
 * Silently catches errors (e.g., quota exceeded) to avoid crashing the app.
 */
function saveToLocalStorage(companies) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  } catch (err) {
    console.error('[useCompanies] localStorage save error:', err);
  }
}


// ============================================================================
// useCompanies Hook
// ============================================================================
// Parameters:
//   user — The Supabase user object from useSupabaseAuth().
//           Pass null to force localStorage mode.
// ============================================================================
export function useCompanies(user) {
  // --- State: array of company objects ---
  const [companies, setCompanies] = useState([]);

  // --- State: loading indicator for initial data fetch ---
  const [loading, setLoading] = useState(true);

  // --- Determine persistence mode ---
  // We use Supabase ONLY when both conditions are met:
  //   1. Supabase env vars are configured
  //   2. A user is logged in (we need user_id for RLS)
  const useSupabase = isSupabaseConfigured() && !!user;

  // ============================================================================
  // Effect: Load companies on mount or when user/mode changes
  // ============================================================================
  // This effect fires when:
  //   - The component mounts
  //   - The user logs in or out (user changes)
  //   - The persistence mode changes (useSupabase flips)
  //
  // It loads ALL companies for the current user (Supabase mode) or
  // all companies from localStorage (local mode).
  // ============================================================================
  useEffect(() => {
    let cancelled = false; // Prevents state updates after unmount

    async function loadCompanies() {
      setLoading(true);

      if (useSupabase) {
        // ---- SUPABASE MODE: Fetch from the companies table ----
        try {
          const supabase = createClient();

          // Select all companies for this user, ordered by creation date.
          // RLS ensures we only get rows where user_id = auth.uid().
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: true });

          if (error) {
            console.error('[useCompanies] Supabase load error:', error.message);
            // Fall back to empty array — don't crash the app
            if (!cancelled) setCompanies([]);
          } else {
            // --- Transform Supabase rows back into the app's company format ---
            // Each Supabase row has: { id, user_id, name, data, ai_research, created_at, updated_at }
            // The app expects the full company object (overview, team, product, etc.)
            // which is stored inside the `data` JSONB column.
            // We merge the Supabase row metadata with the JSONB data to reconstruct
            // the complete company object that the UI components expect.
            const transformed = (data || []).map((row) => ({
              ...row.data,                          // Spread all section data (overview, team, etc.)
              id: row.id,                           // Use Supabase UUID as the canonical ID
              name: row.name || row.data?.name || '', // Top-level name for display
              aiResearch: row.ai_research || {},     // AI research results
              createdAt: row.created_at,            // Supabase timestamp
              updatedAt: row.updated_at,            // Supabase timestamp
            }));

            if (!cancelled) setCompanies(transformed);
          }
        } catch (err) {
          console.error('[useCompanies] Supabase load exception:', err);
          if (!cancelled) setCompanies([]);
        }
      } else {
        // ---- LOCAL MODE: Load from localStorage ----
        const loaded = loadFromLocalStorage();
        if (!cancelled) setCompanies(loaded);
      }

      if (!cancelled) setLoading(false);
    }

    loadCompanies();

    // Cleanup: if the effect re-fires before the async call finishes,
    // we set cancelled=true so the stale response doesn't overwrite state.
    return () => {
      cancelled = true;
    };
  }, [useSupabase, user?.id]); // Re-fetch when auth state changes

  // ============================================================================
  // Auto-save to localStorage in local mode
  // ============================================================================
  // In local mode, we persist to localStorage whenever companies change.
  // In Supabase mode, each CRUD operation writes directly to the DB,
  // so we don't need this auto-save.
  // ============================================================================
  useEffect(() => {
    if (!useSupabase && !loading) {
      saveToLocalStorage(companies);
    }
  }, [companies, useSupabase, loading]);

  // ============================================================================
  // createCompany(name) — Create a new company
  // ============================================================================
  // Creates an empty company using the schema factory (createEmptyCompany),
  // then either inserts it into Supabase or appends to local state.
  //
  // Returns the new company object (or null on failure).
  // ============================================================================
  const createCompany = useCallback(async (name) => {
    if (!name?.trim()) return null;

    // Create the full company object with all default fields
    const newCompany = createEmptyCompany(name.trim());

    if (useSupabase) {
      // ---- SUPABASE MODE ----
      try {
        const supabase = createClient();

        // Insert a new row. We store the full company object in `data`
        // and keep `name` as a top-level column for easy querying/display.
        // `ai_research` starts as an empty object.
        const { data, error } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            name: newCompany.name || newCompany.overview?.companyName || name.trim(),
            data: newCompany,           // Full company schema as JSONB
            ai_research: {},            // Empty AI research
          })
          .select()                     // Return the inserted row
          .single();                    // We expect exactly one row back

        if (error) {
          console.error('[useCompanies] Supabase create error:', error.message);
          return null;
        }

        // Transform the Supabase row into the app's company format
        const created = {
          ...data.data,
          id: data.id,
          name: data.name,
          aiResearch: data.ai_research || {},
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        // Add to local state so the UI updates immediately
        setCompanies((prev) => [...prev, created]);
        return created;
      } catch (err) {
        console.error('[useCompanies] Supabase create exception:', err);
        return null;
      }
    } else {
      // ---- LOCAL MODE ----
      // Just append to state — the auto-save effect handles persistence
      setCompanies((prev) => [...prev, newCompany]);
      return newCompany;
    }
  }, [useSupabase, user?.id]);

  // ============================================================================
  // updateCompany(id, sectionKey, data) — Update a section of a company
  // ============================================================================
  // Updates a specific section (e.g., 'overview', 'team', 'financial') within
  // a company's data. This is called by section components when fields change.
  //
  // In Supabase mode, we update the JSONB `data` column by merging the new
  // section data into the existing object. We also handle the special case
  // of 'aiResearch' which is stored in a separate column.
  //
  // Parameters:
  //   id         — The company UUID
  //   sectionKey — The section to update ('overview', 'team', 'aiResearch', etc.)
  //   sectionData — The updated section object
  // ============================================================================
  const updateCompany = useCallback(async (id, sectionKey, sectionData) => {
    if (!id || !sectionKey) return;

    if (useSupabase) {
      // ---- SUPABASE MODE ----
      try {
        const supabase = createClient();

        // First, fetch the current row to get the existing data
        // (we need to merge, not overwrite the entire JSONB column)
        const { data: existing, error: fetchError } = await supabase
          .from('companies')
          .select('data, ai_research')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('[useCompanies] Supabase fetch for update error:', fetchError.message);
          return;
        }

        // Build the update payload depending on what section changed
        const updatePayload = {};

        if (sectionKey === 'aiResearch') {
          // AI research is stored in a separate column (ai_research)
          // Merge the new research data with existing research
          updatePayload.ai_research = {
            ...(existing.ai_research || {}),
            ...sectionData,
          };
        } else {
          // Regular section data — merge into the `data` JSONB column
          const currentData = existing.data || {};
          updatePayload.data = {
            ...currentData,
            [sectionKey]: sectionData,
            updatedAt: new Date().toISOString(),
          };

          // Also update the top-level `name` if the overview section changed
          // (keeps the name column in sync for querying/display)
          if (sectionKey === 'overview' && sectionData.companyName) {
            updatePayload.name = sectionData.companyName;
          }
        }

        const { error: updateError } = await supabase
          .from('companies')
          .update(updatePayload)
          .eq('id', id);

        if (updateError) {
          console.error('[useCompanies] Supabase update error:', updateError.message);
          return;
        }

        // Update local state to reflect the change immediately
        setCompanies((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            if (sectionKey === 'aiResearch') {
              return {
                ...c,
                aiResearch: { ...(c.aiResearch || {}), ...sectionData },
                updatedAt: new Date().toISOString(),
              };
            }
            return {
              ...c,
              [sectionKey]: sectionData,
              updatedAt: new Date().toISOString(),
            };
          })
        );
      } catch (err) {
        console.error('[useCompanies] Supabase update exception:', err);
      }
    } else {
      // ---- LOCAL MODE ----
      // Update in-memory state — auto-save effect handles localStorage
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          if (sectionKey === 'aiResearch') {
            return {
              ...c,
              aiResearch: { ...(c.aiResearch || {}), ...sectionData },
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            ...c,
            [sectionKey]: sectionData,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }
  }, [useSupabase]);

  // ============================================================================
  // deleteCompany(id) — Delete a company
  // ============================================================================
  // Removes a company by ID from either Supabase or local state.
  // In Supabase mode, RLS ensures the user can only delete their own companies.
  // ============================================================================
  const deleteCompany = useCallback(async (id) => {
    if (!id) return;

    if (useSupabase) {
      // ---- SUPABASE MODE ----
      try {
        const supabase = createClient();

        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[useCompanies] Supabase delete error:', error.message);
          return;
        }

        // Remove from local state
        setCompanies((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error('[useCompanies] Supabase delete exception:', err);
      }
    } else {
      // ---- LOCAL MODE ----
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    }
  }, [useSupabase]);

  // ============================================================================
  // importCompanies(companiesArray) — Bulk import/upsert companies
  // ============================================================================
  // Imports an array of company objects (e.g., from a JSON export file).
  // In Supabase mode, uses upsert to handle both new and existing companies.
  // In local mode, replaces the entire companies array.
  //
  // Parameters:
  //   companiesArray — Array of full company objects (matching the schema)
  // ============================================================================
  const importCompanies = useCallback(async (companiesArray) => {
    if (!Array.isArray(companiesArray) || companiesArray.length === 0) return;

    if (useSupabase) {
      // ---- SUPABASE MODE ----
      try {
        const supabase = createClient();

        // Transform the app's company objects into Supabase row format.
        // Each company becomes a row with:
        //   - id: use existing ID if present, otherwise let Supabase generate one
        //   - user_id: the current authenticated user
        //   - name: top-level company name for display/search
        //   - data: the full company object as JSONB
        //   - ai_research: the AI research results as JSONB
        const rows = companiesArray.map((company) => ({
          ...(company.id ? { id: company.id } : {}),
          user_id: user.id,
          name: company.name || company.overview?.companyName || 'Unnamed',
          data: company,
          ai_research: company.aiResearch || {},
        }));

        // Upsert: insert new rows, update existing ones (matched by id).
        // onConflict: 'id' tells Supabase to update if a row with that ID exists.
        const { data, error } = await supabase
          .from('companies')
          .upsert(rows, { onConflict: 'id' })
          .select();

        if (error) {
          console.error('[useCompanies] Supabase import error:', error.message);
          return;
        }

        // Transform the returned rows back into the app's company format
        const transformed = (data || []).map((row) => ({
          ...row.data,
          id: row.id,
          name: row.name,
          aiResearch: row.ai_research || {},
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        // Replace local state with the imported companies
        setCompanies(transformed);
      } catch (err) {
        console.error('[useCompanies] Supabase import exception:', err);
      }
    } else {
      // ---- LOCAL MODE ----
      // Replace the entire companies array with the imported data
      setCompanies(companiesArray);
    }
  }, [useSupabase, user?.id]);

  // ============================================================================
  // Return value
  // ============================================================================
  // - companies:       Array of company objects (same shape as createEmptyCompany)
  // - loading:         True during initial data fetch
  // - createCompany:   async (name) => company | null
  // - updateCompany:   async (id, sectionKey, data) => void
  // - deleteCompany:   async (id) => void
  // - importCompanies: async (companiesArray) => void
  // ============================================================================
  return {
    companies,
    setCompanies,       // Exposed for direct state manipulation (e.g., reordering)
    loading,
    createCompany,
    updateCompany,
    deleteCompany,
    importCompanies,
  };
}
