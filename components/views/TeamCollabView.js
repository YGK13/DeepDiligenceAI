'use client';

// ============================================================================
// components/views/TeamCollabView.js — Team Collaboration & Member Management
// ============================================================================
// Lets investors create a team, invite colleagues (analysts, partners, admins),
// manage roles, and share deal flow across the fund. This is the backbone of
// multi-user collaboration in DueDrill.
//
// FEATURES:
//   - Create team (name input + button) — shown only if user has no team
//   - Team name display + inline edit (owner only)
//   - Member table: Name, Email, Role (badge), Status (badge), Actions
//   - Invite member: email + role selector + invite button
//   - Role badges: owner=purple, admin=blue, member=green, viewer=gray
//   - Remove member (owner/admin only, with confirmation dialog)
//   - Change role dropdown (owner only)
//   - Pending invites section with Resend / Revoke buttons
//   - Empty state when no team exists
//   - Graceful fallback when Supabase is not configured
//
// Props:
//   user — current authenticated user object (from useSupabaseAuth)
//
// Data flow:
//   All reads/writes go through the Supabase browser client.
//   Falls back to a "Teams require cloud mode" message when Supabase
//   is not configured (localStorage-only mode can't do multi-user).
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/helpers';

// ============================================================================
// ROLE CONFIGURATION — colors and labels for each team role
// ============================================================================
// Purple for owners (top of hierarchy), blue for admins (management),
// green for members (worker bees), gray for viewers (read-only).
// These colors match the DueDrill dark theme palette.
// ============================================================================
const ROLE_CONFIG = {
  owner:  { label: 'Owner',  color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  admin:  { label: 'Admin',  color: '#4a7dff', bg: 'rgba(74, 125, 255, 0.15)' },
  member: { label: 'Member', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  viewer: { label: 'Viewer', color: '#9ca0b0', bg: 'rgba(156, 160, 176, 0.15)' },
};

// Status badge styling — active is green, pending is amber, removed is red
const STATUS_CONFIG = {
  active:  { label: 'Active',  color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  removed: { label: 'Removed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

// Roles available when inviting a new member (owner is never assignable)
const INVITE_ROLES = [
  { value: 'admin',  label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TeamCollabView({ user }) {
  // ==========================================================================
  // STATE
  // ==========================================================================
  const [team, setTeam] = useState(null);           // The user's team object
  const [members, setMembers] = useState([]);        // All team_members rows
  const [loading, setLoading] = useState(true);      // Initial data fetch
  const [error, setError] = useState(null);          // Error message string

  // --- Team creation form ---
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  // --- Team name editing (owner only) ---
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // --- Invite member form ---
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  // --- Remove member confirmation ---
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  // ==========================================================================
  // SUPABASE CLIENT — null if not configured (local-only mode)
  // ==========================================================================
  const supabase = useMemo(() => createClient(), []);

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================
  // Figure out the current user's role in the team (if any)
  const myMembership = useMemo(
    () => members.find((m) => m.user_id === user?.id && m.status === 'active'),
    [members, user]
  );
  const myRole = myMembership?.role || null;
  const isOwner = myRole === 'owner';
  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';

  // Split members into active vs pending for separate rendering sections
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active'),
    [members]
  );
  const pendingMembers = useMemo(
    () => members.filter((m) => m.status === 'pending'),
    [members]
  );

  // ==========================================================================
  // FETCH TEAM DATA — loads the user's team + members on mount
  // ==========================================================================
  const fetchTeamData = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Step 1: Find teams where user is an active member
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (membershipError) throw membershipError;

      // If user has no team membership, check if they own a team
      let teamId = membershipData?.[0]?.team_id;

      if (!teamId) {
        const { data: ownedTeams, error: ownedError } = await supabase
          .from('teams')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);

        if (ownedError) throw ownedError;
        teamId = ownedTeams?.[0]?.id;
      }

      if (!teamId) {
        // User has no team — show creation form
        setTeam(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch the team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Step 3: Fetch all members of this team (including pending invites)
      // Join with profiles to get name/email for active members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          role,
          invited_email,
          status,
          created_at,
          updated_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('team_id', teamId)
        .neq('status', 'removed')
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // ==========================================================================
  // CREATE TEAM — creates a new team and adds the creator as owner
  // ==========================================================================
  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim() || !supabase || !user) return;

    setCreating(true);
    setError(null);

    try {
      // Step 1: Create the team row
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({ name: newTeamName.trim(), owner_id: user.id })
        .select()
        .single();

      if (teamError) throw teamError;

      // Step 2: Add the creator as owner member (active immediately)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'owner',
          invited_email: user.email,
          status: 'active',
        });

      if (memberError) throw memberError;

      // Refresh data to show the new team
      setNewTeamName('');
      await fetchTeamData();
    } catch (err) {
      console.error('Failed to create team:', err);
      setError(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  }, [newTeamName, supabase, user, fetchTeamData]);

  // ==========================================================================
  // UPDATE TEAM NAME — owner can rename the team
  // ==========================================================================
  const handleSaveTeamName = useCallback(async () => {
    if (!editName.trim() || !supabase || !team) return;

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('teams')
        .update({ name: editName.trim() })
        .eq('id', team.id);

      if (updateError) throw updateError;

      setTeam((prev) => ({ ...prev, name: editName.trim() }));
      setEditingName(false);
    } catch (err) {
      console.error('Failed to update team name:', err);
      setError(err.message || 'Failed to update team name');
    }
  }, [editName, supabase, team]);

  // ==========================================================================
  // INVITE MEMBER — sends an invite (creates a pending team_members row)
  // ==========================================================================
  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !supabase || !team) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if already a member or pending
    const alreadyExists = members.some(
      (m) =>
        (m.invited_email?.toLowerCase() === inviteEmail.trim().toLowerCase() ||
          m.profiles?.email?.toLowerCase() === inviteEmail.trim().toLowerCase()) &&
        m.status !== 'removed'
    );
    if (alreadyExists) {
      setError('This person is already a member or has a pending invite');
      return;
    }

    setInviting(true);
    setError(null);

    try {
      const { error: inviteError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          role: inviteRole,
          invited_email: inviteEmail.trim().toLowerCase(),
          status: 'pending',
        });

      if (inviteError) throw inviteError;

      setInviteEmail('');
      setInviteRole('member');
      await fetchTeamData();
    } catch (err) {
      console.error('Failed to invite member:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole, supabase, team, members, fetchTeamData]);

  // ==========================================================================
  // CHANGE ROLE — owner can change any member's role
  // ==========================================================================
  const handleChangeRole = useCallback(
    async (memberId, newRole) => {
      if (!supabase || !team) return;

      try {
        setError(null);
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ role: newRole })
          .eq('id', memberId);

        if (updateError) throw updateError;

        // Update local state immediately for responsive UI
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } catch (err) {
        console.error('Failed to change role:', err);
        setError(err.message || 'Failed to change role');
      }
    },
    [supabase, team]
  );

  // ==========================================================================
  // REMOVE MEMBER — owner/admin can remove a member (soft delete via status)
  // ==========================================================================
  const handleRemoveMember = useCallback(
    async (memberId) => {
      if (!supabase || !team) return;

      try {
        setError(null);
        const { error: removeError } = await supabase
          .from('team_members')
          .update({ status: 'removed' })
          .eq('id', memberId);

        if (removeError) throw removeError;

        setConfirmRemoveId(null);
        // Remove from local state
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } catch (err) {
        console.error('Failed to remove member:', err);
        setError(err.message || 'Failed to remove member');
      }
    },
    [supabase, team]
  );

  // ==========================================================================
  // REVOKE INVITE — remove a pending invite before it's accepted
  // ==========================================================================
  const handleRevokeInvite = useCallback(
    async (memberId) => {
      if (!supabase) return;

      try {
        setError(null);
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('id', memberId);

        if (deleteError) throw deleteError;

        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } catch (err) {
        console.error('Failed to revoke invite:', err);
        setError(err.message || 'Failed to revoke invite');
      }
    },
    [supabase]
  );

  // ==========================================================================
  // RESEND INVITE — placeholder for re-sending invitation email
  // In a real app, this would call an API route to trigger an email.
  // For now, it updates the timestamp to signal a "resend" happened.
  // ==========================================================================
  const handleResendInvite = useCallback(
    async (memberId) => {
      if (!supabase) return;

      try {
        setError(null);
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', memberId);

        if (updateError) throw updateError;

        // Visual feedback — briefly show success
        alert('Invite resent successfully');
      } catch (err) {
        console.error('Failed to resend invite:', err);
        setError(err.message || 'Failed to resend invite');
      }
    },
    [supabase]
  );

  // ==========================================================================
  // RENDER: NOT CONFIGURED — Supabase not set up
  // ==========================================================================
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-5xl mb-4">👥</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#e8e9ed' }}>
          Teams Require Cloud Mode
        </h2>
        <p className="text-sm max-w-md" style={{ color: '#9ca0b0' }}>
          Team collaboration requires Supabase to be configured. Set your{' '}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#2d3148', color: '#4a7dff' }}
          >
            NEXT_PUBLIC_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#2d3148', color: '#4a7dff' }}
          >
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{' '}
          environment variables to enable multi-user features.
        </p>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: NOT AUTHENTICATED — user not logged in
  // ==========================================================================
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#e8e9ed' }}>
          Sign In Required
        </h2>
        <p className="text-sm" style={{ color: '#9ca0b0' }}>
          Please sign in to access team collaboration features.
        </p>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: LOADING STATE
  // ==========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#9ca0b0' }}>
          Loading team data...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: NO TEAM — show creation form
  // ==========================================================================
  if (!team) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8e9ed' }}>
            Create Your Team
          </h2>
          <p className="text-sm" style={{ color: '#9ca0b0' }}>
            Set up a team workspace to collaborate on due diligence with your
            partners, analysts, and associates.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
          >
            {error}
          </div>
        )}

        {/* Creation form */}
        <div
          className="p-6 rounded-xl border"
          style={{ background: '#1e2130', borderColor: '#2d3148' }}
        >
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: '#9ca0b0' }}
          >
            Team Name
          </label>
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="e.g., Acme Ventures Fund I"
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{
              background: '#0f1117',
              borderColor: '#2d3148',
              color: '#e8e9ed',
              focusRingColor: '#4a7dff',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateTeam();
            }}
          />
          <button
            className="w-full mt-4 px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#4a7dff' }}
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: TEAM EXISTS — show full management UI
  // ==========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ================================================================
          ERROR BANNER — shows at the top whenever an operation fails
          ================================================================ */}
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {/* ================================================================
          TEAM HEADER — name + edit capability for owner
          ================================================================ */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: '#1e2130', borderColor: '#2d3148' }}
      >
        <div className="flex items-center justify-between">
          {editingName ? (
            // Inline edit mode — input + save/cancel
            <div className="flex items-center gap-3 flex-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: '#0f1117',
                  borderColor: '#2d3148',
                  color: '#e8e9ed',
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTeamName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: '#34d399' }}
                onClick={handleSaveTeamName}
              >
                Save
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: '#2d3148', color: '#9ca0b0' }}
                onClick={() => setEditingName(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            // Display mode — team name + edit button
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold" style={{ color: '#e8e9ed' }}>
                {team.name}
              </h2>
              {isOwner && (
                <button
                  className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: '#2d3148', color: '#9ca0b0' }}
                  onClick={() => {
                    setEditName(team.name);
                    setEditingName(true);
                  }}
                  title="Rename team"
                >
                  Edit
                </button>
              )}
            </div>
          )}

          {/* Member count badge */}
          <div
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(74, 125, 255, 0.15)', color: '#4a7dff' }}
          >
            {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ================================================================
          INVITE MEMBER FORM — visible to owners and admins only
          ================================================================ */}
      {isAdminOrOwner && (
        <div
          className="p-6 rounded-xl border"
          style={{ background: '#1e2130', borderColor: '#2d3148' }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: '#e8e9ed' }}
          >
            Invite Team Member
          </h3>
          <div className="flex gap-3">
            {/* Email input */}
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                background: '#0f1117',
                borderColor: '#2d3148',
                color: '#e8e9ed',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInvite();
              }}
            />

            {/* Role selector */}
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2.5 rounded-lg border text-sm focus:outline-none"
              style={{
                background: '#0f1117',
                borderColor: '#2d3148',
                color: '#e8e9ed',
              }}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Invite button */}
            <button
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#4a7dff' }}
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          ACTIVE MEMBERS TABLE
          ================================================================ */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: '#1e2130', borderColor: '#2d3148' }}
      >
        <div className="p-4 border-b" style={{ borderColor: '#2d3148' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#e8e9ed' }}>
            Team Members
          </h3>
        </div>

        {activeMembers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: '#9ca0b0' }}>
              No active members yet. Invite your first team member above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#9ca0b0', borderBottom: '1px solid #2d3148' }}
                >
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                  const statusConfig = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;
                  const memberName =
                    member.profiles?.full_name || member.invited_email || 'Unknown';
                  const memberEmail =
                    member.profiles?.email || member.invited_email || '';
                  const isSelf = member.user_id === user?.id;

                  return (
                    <tr
                      key={member.id}
                      className="border-t transition-colors hover:opacity-90"
                      style={{ borderColor: '#2d3148' }}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-medium"
                          style={{ color: '#e8e9ed' }}
                        >
                          {memberName}
                          {isSelf && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: '#9ca0b0' }}
                            >
                              (you)
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#9ca0b0' }}>
                          {memberEmail}
                        </span>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        {/* Owner can change roles of non-owner, non-self members */}
                        {isOwner && !isSelf && member.role !== 'owner' ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleChangeRole(member.id, e.target.value)
                            }
                            className="px-2 py-1 rounded text-xs font-medium focus:outline-none"
                            style={{
                              background: roleConfig.bg,
                              color: roleConfig.color,
                              border: 'none',
                            }}
                          >
                            {['admin', 'member', 'viewer'].map((r) => (
                              <option key={r} value={r}>
                                {ROLE_CONFIG[r].label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: roleConfig.bg,
                              color: roleConfig.color,
                            }}
                          >
                            {roleConfig.label}
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: statusConfig.bg,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {/* Only owner/admin can remove, and you can't remove yourself or another owner */}
                        {isAdminOrOwner &&
                          !isSelf &&
                          member.role !== 'owner' && (
                            <>
                              {confirmRemoveId === member.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span
                                    className="text-xs"
                                    style={{ color: '#ef4444' }}
                                  >
                                    Remove?
                                  </span>
                                  <button
                                    className="px-2 py-1 rounded text-xs font-medium text-white"
                                    style={{ background: '#ef4444' }}
                                    onClick={() =>
                                      handleRemoveMember(member.id)
                                    }
                                  >
                                    Yes
                                  </button>
                                  <button
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{
                                      background: '#2d3148',
                                      color: '#9ca0b0',
                                    }}
                                    onClick={() => setConfirmRemoveId(null)}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="px-3 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                  }}
                                  onClick={() =>
                                    setConfirmRemoveId(member.id)
                                  }
                                >
                                  Remove
                                </button>
                              )}
                            </>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================
          PENDING INVITES SECTION — shows unaccepted invitations
          ================================================================ */}
      {pendingMembers.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: '#1e2130', borderColor: '#2d3148' }}
        >
          <div className="p-4 border-b" style={{ borderColor: '#2d3148' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#e8e9ed' }}>
              Pending Invites ({pendingMembers.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#9ca0b0', borderBottom: '1px solid #2d3148' }}
                >
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Invited</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingMembers.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;

                  return (
                    <tr
                      key={member.id}
                      className="border-t"
                      style={{ borderColor: '#2d3148' }}
                    >
                      {/* Email */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#e8e9ed' }}>
                          {member.invited_email}
                        </span>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: roleConfig.bg,
                            color: roleConfig.color,
                          }}
                        >
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Invited timestamp */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#9ca0b0' }}>
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions: Resend + Revoke */}
                      <td className="px-4 py-3 text-right">
                        {isAdminOrOwner && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="px-3 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                              style={{
                                background: 'rgba(74, 125, 255, 0.15)',
                                color: '#4a7dff',
                              }}
                              onClick={() => handleResendInvite(member.id)}
                            >
                              Resend
                            </button>
                            <button
                              className="px-3 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                              }}
                              onClick={() => handleRevokeInvite(member.id)}
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
