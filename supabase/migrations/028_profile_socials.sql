-- =============================================================================
-- Migration: 028_profile_socials.sql
-- Purpose:   Track core.profile_socials (the social media links on a user's profile)
--            as a migration and give it its index, updated_at trigger and RLS.
--
--              1. core.profile_socials — kept as is (CREATE TABLE IF NOT EXISTS)
--              2. Index on profile_id (every read filters by it)
--              3. updated_at trigger
--              4. RLS + grants
-- Schema:    core
--
-- Data model:
--   core.profiles ──< core.profile_socials
--
-- Access Matrix:
--   Table           | owner (profile_id = auth.uid()) | any other signed-in user
--   ----------------|---------------------------------|-------------------------
--   profile_socials | SELECT, INSERT, UPDATE, DELETE  | SELECT
--
-- Social links are shown on the public profile page, so every signed-in user can
-- read them; only the owner can change them.
-- Every statement is idempotent, so the file is safe to re-run.
-- =============================================================================


-- ─── 1. Table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.profile_socials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id UUID REFERENCES core.profiles (id) ON DELETE CASCADE,
  social_name TEXT,
  social_link TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ─── 2. Index ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profile_socials_profile_id
  ON core.profile_socials (profile_id);


-- ─── 3. updated_at trigger ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION core.set_profile_socials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profile_socials_updated_at ON core.profile_socials;
CREATE TRIGGER trigger_profile_socials_updated_at
BEFORE UPDATE ON core.profile_socials
FOR EACH ROW
EXECUTE FUNCTION core.set_profile_socials_updated_at();


-- ─── 4. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE core.profile_socials ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can view social links (they appear on profile pages)
DROP POLICY IF EXISTS "authenticated_profile_socials_select" ON core.profile_socials;
CREATE POLICY "authenticated_profile_socials_select"
ON core.profile_socials
FOR SELECT
TO authenticated
USING (true);

-- Owners add links only to their own profile
DROP POLICY IF EXISTS "owner_profile_socials_insert" ON core.profile_socials;
CREATE POLICY "owner_profile_socials_insert"
ON core.profile_socials
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Owners edit only their own links and cannot move them to another profile
DROP POLICY IF EXISTS "owner_profile_socials_update" ON core.profile_socials;
CREATE POLICY "owner_profile_socials_update"
ON core.profile_socials
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Owners remove only their own links
DROP POLICY IF EXISTS "owner_profile_socials_delete" ON core.profile_socials;
CREATE POLICY "owner_profile_socials_delete"
ON core.profile_socials
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON core.profile_socials TO authenticated;
GRANT ALL ON core.profile_socials TO service_role;
