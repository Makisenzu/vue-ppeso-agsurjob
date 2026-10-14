-- =============================================================================
-- Migration: 017_fix_spes_requirement_rls.sql
-- Purpose:   Fix "new row violates row-level security policy for table
--            applicant_requirements" when an applicant submits a SPES form with
--            documentary requirement attachments.
--              1. SECURITY DEFINER helpers for the SPES form ownership checks, so the
--                 policies no longer depend on applicants.spes_form RLS inside a subquery
--              2. Re-create the applicant SPES policies of migration 014 on
--                 applicant_requirements / applicant_requirement_media (idempotent)
-- Schema:    applicants
--
-- Access Matrix (unchanged from 014):
--   Table                          | admin / provincial / municipal PESO | applicant
--   -------------------------------|-------------------------------------|------------------------------------
--   applicant_requirements (SPES)  | full CRUD                           | read own; write while form is Pending
--   applicant_requirement_media    | full CRUD                           | read own; write while form is Pending
-- =============================================================================


-- ─── 1. Ownership helpers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.owns_spes_form(p_form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applicants.spes_form f
    WHERE f.id = p_form_id
      AND f.profile_id = auth.uid()
  );
$$;

-- Applicants may only change the attachments of a form PESO has not reviewed yet
CREATE OR REPLACE FUNCTION applicants.can_edit_spes_form(p_form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applicants.spes_form f
    WHERE f.id = p_form_id
      AND f.profile_id = auth.uid()
      AND f.status = 'Pending'
  );
$$;

REVOKE ALL ON FUNCTION applicants.owns_spes_form(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION applicants.can_edit_spes_form(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION applicants.owns_spes_form(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.can_edit_spes_form(uuid) TO authenticated;


-- ─── 2. Row Level Security ─────────────────────────────────────────────────

GRANT USAGE ON SCHEMA applicants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON applicants.applicant_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON applicants.applicant_requirement_media TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA applicants TO authenticated;

-- applicants.applicant_requirements -----------------------------------------

DROP POLICY IF EXISTS "applicant_own_spes_requirements_all" ON applicants.applicant_requirements;
CREATE POLICY "applicant_own_spes_requirements_all"
ON applicants.applicant_requirements
FOR ALL
TO authenticated
USING (spes_form_id IS NOT NULL AND applicants.owns_spes_form(spes_form_id))
WITH CHECK (spes_form_id IS NOT NULL AND applicants.can_edit_spes_form(spes_form_id));

-- applicants.applicant_requirement_media ------------------------------------

DROP POLICY IF EXISTS "applicant_own_spes_requirement_media_all" ON applicants.applicant_requirement_media;
CREATE POLICY "applicant_own_spes_requirement_media_all"
ON applicants.applicant_requirement_media
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applicants.applicant_requirements r
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND r.spes_form_id IS NOT NULL
      AND applicants.owns_spes_form(r.spes_form_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applicants.applicant_requirements r
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND r.spes_form_id IS NOT NULL
      AND applicants.can_edit_spes_form(r.spes_form_id)
  )
);


-- ─── Diagnostics (run manually if the error persists) ─────────────────────
-- A RESTRICTIVE policy is AND-ed with every permissive one and would still block
-- the insert:
--
--   SELECT tablename, policyname, permissive, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'applicants'
--     AND tablename IN ('applicant_requirements', 'applicant_requirement_media');
