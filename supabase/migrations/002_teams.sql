-- ============================================================
-- DueDrill — Migration 002: Team Collaboration
-- ============================================================
-- Adds multi-user team support so investors can share deal
-- flow, assign research tasks, and collaborate on DD within
-- a single workspace. Follows the ownership-based access model:
--   - One team per owner (1:1 owner → team)
--   - Members invited by email, join via 'pending' → 'active'
--   - Role hierarchy: owner > admin > member > viewer
--   - Companies can optionally belong to a team (team_id FK)
--   - RLS ensures team members see shared companies
-- ============================================================


-- ============================================================
-- 1. TEAMS TABLE — One row per investment team / fund
-- ============================================================
-- The team is the collaboration unit. An owner creates a team,
-- invites members, and associates companies with it.
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                              -- Display name (e.g., "Acme Ventures Fund I")
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- The user who created the team
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup for "which teams does this user own?"
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);


-- ============================================================
-- 2. TEAM MEMBERS TABLE — Junction table for team membership
-- ============================================================
-- Tracks who belongs to which team, their role, and whether
-- they've accepted their invitation yet. Supports invite-by-email
-- workflow where the invitee may not have a DueDrill account yet.
--
-- ROLE HIERARCHY:
--   owner  — full control, can delete team, manage all members
--   admin  — can invite/remove members, manage companies
--   member — can view and edit team companies
--   viewer — read-only access to team companies
--
-- STATUS FLOW:
--   pending  → user invited but hasn't accepted yet
--   active   → user accepted and is a full team member
--   removed  → user was removed from the team (soft delete)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL when invite is pending (user hasn't signed up yet)
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_email TEXT,                              -- Email used for the invitation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index: find all members of a team quickly
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
-- Find all teams a user belongs to
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
-- Look up pending invites by email (for matching when a new user signs up)
CREATE INDEX IF NOT EXISTS idx_team_members_invited_email ON team_members(invited_email);


-- ============================================================
-- 3. ADD team_id TO COMPANIES — Optional team association
-- ============================================================
-- A company can belong to a team (shared) or be personal (NULL).
-- This is nullable so existing companies remain personal by default.
-- When team_id is set, all team members can see the company
-- (subject to their role-based permissions via RLS).
-- ============================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Index for filtering companies by team
CREATE INDEX IF NOT EXISTS idx_companies_team_id ON companies(team_id);


-- ============================================================
-- 4. ROW LEVEL SECURITY — Teams
-- ============================================================
-- Policy: Only active team members can read their own team.
-- Owners/admins can update their team (e.g., rename).
-- ============================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- SELECT: Active team members (including owner) can view the team
CREATE POLICY "Team members can view their team"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'active'
    )
  );

-- INSERT: Any authenticated user can create a team
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Only owner can update team details (name, etc.)
CREATE POLICY "Team owner can update team"
  ON teams FOR UPDATE
  USING (auth.uid() = owner_id);

-- DELETE: Only owner can delete the team
CREATE POLICY "Team owner can delete team"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);


-- ============================================================
-- 5. ROW LEVEL SECURITY — Team Members
-- ============================================================
-- Policy: Team members can see other members in their team.
-- Owners and admins can invite (insert) and manage (update/delete) members.
-- ============================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Active members can see all members in their team
-- (including pending invites, so the UI can show "Pending" status)
CREATE POLICY "Team members can view team roster"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status = 'active'
    )
  );

-- INSERT: Owners and admins can invite new members
CREATE POLICY "Owners and admins can invite members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status = 'active'
        AND my_membership.role IN ('owner', 'admin')
    )
  );

-- UPDATE: Owners and admins can change roles / status
CREATE POLICY "Owners and admins can manage members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status = 'active'
        AND my_membership.role IN ('owner', 'admin')
    )
  );

-- DELETE: Owners and admins can remove members
CREATE POLICY "Owners and admins can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS my_membership
      WHERE my_membership.team_id = team_members.team_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status = 'active'
        AND my_membership.role IN ('owner', 'admin')
    )
  );


-- ============================================================
-- 6. UPDATED COMPANIES RLS — Team members can see team companies
-- ============================================================
-- The existing RLS policy "Users can view own companies" only checks
-- auth.uid() = user_id. We add a NEW policy that ALSO grants SELECT
-- access when the company's team_id matches a team the user belongs to.
-- PostgreSQL RLS is OR-based: if ANY policy grants access, the row
-- is visible. So existing personal-company access is preserved.
-- ============================================================

-- Team members can VIEW companies shared with their team
CREATE POLICY "Team members can view team companies"
  ON companies FOR SELECT
  USING (
    team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = companies.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'active'
    )
  );

-- Team admins/owners can UPDATE team companies
CREATE POLICY "Team admins can update team companies"
  ON companies FOR UPDATE
  USING (
    team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = companies.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'active'
        AND team_members.role IN ('owner', 'admin', 'member')
    )
  );


-- ============================================================
-- 7. TRIGGERS — Auto-update timestamps on team tables
-- ============================================================
-- Reuse the existing update_updated_at() function from migration 001.
-- ============================================================

CREATE TRIGGER trigger_teams_updated
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_team_members_updated
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
