-- =============================================================================
-- Migration: 077_company_team_members.sql
-- Purpose:   The "Team Members" section of the company profile: people the company lists with
--            a name, position and optional photo.
--              - Table employers.company_team_members
-- Schemas:   employers
--
-- Not employers.company_members: that table links *accounts* to a company (RBAC, 034). These rows
-- are display-only and need no account.
--
-- Access Matrix (same as employers.companies, 034):
--   Resource              | owner     | company member | provincial / municipal PESO, DOLE | admin
--   ----------------------|-----------|----------------|-----------------------------------|------
--   company_team_members  | full CRUD | read           | read                              | all
--
-- Privacy (RA 10173): names and photos are personal data the company supplies as controller; the
-- app asks the owner to list only people who agreed. Rows go with the company (ON DELETE CASCADE),
-- photos with the owner's media folder (069).
--
-- Storage: photos live in the owner's folder, media/<owner uid>/company-team/<file>, so 034's media
-- policies already apply. The trigger keeps photo_path inside that folder.
-- Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employers.company_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES employers.companies (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 120),
  position TEXT CHECK (position IS NULL OR length(position) <= 120),
  -- Path inside the 'media' bucket; NULL shows initials
  photo_path TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_team_members_company_idx
  ON employers.company_team_members (company_id, sort_order, created_at);

COMMENT ON TABLE employers.company_team_members IS
  'Team members shown on a company profile (display only, not accounts; see company_members)';


-- ─── 2. Trigger: updated_at + photo stays in the owner's folder ───────────

CREATE OR REPLACE FUNCTION employers.guard_company_team_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_owner UUID;
BEGIN
  NEW.updated_at = now();
  IF NEW.photo_path IS NOT NULL THEN
    SELECT profile_id INTO v_owner FROM employers.companies WHERE id = NEW.company_id;
    IF v_owner IS NULL OR NEW.photo_path NOT LIKE v_owner::TEXT || '/company-team/%' THEN
      RAISE EXCEPTION 'Team member photo must be in the company owner''s company-team folder'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_company_team_member ON employers.company_team_members;
CREATE TRIGGER trigger_guard_company_team_member
BEFORE INSERT OR UPDATE ON employers.company_team_members
FOR EACH ROW
EXECUTE FUNCTION employers.guard_company_team_member();


-- ─── 3. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE employers.company_team_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON employers.company_team_members FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON employers.company_team_members TO authenticated;

DROP POLICY IF EXISTS owner_all ON employers.company_team_members;
CREATE POLICY owner_all ON employers.company_team_members
FOR ALL TO authenticated
USING (employers.is_company_owner(company_id))
WITH CHECK (employers.is_company_owner(company_id));

DROP POLICY IF EXISTS member_select ON employers.company_team_members;
CREATE POLICY member_select ON employers.company_team_members
FOR SELECT TO authenticated
USING (employers.is_company_member(company_id));

DROP POLICY IF EXISTS staff_select ON employers.company_team_members;
CREATE POLICY staff_select ON employers.company_team_members
FOR SELECT TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole')));

DROP POLICY IF EXISTS admin_all ON employers.company_team_members;
CREATE POLICY admin_all ON employers.company_team_members
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

COMMIT;
