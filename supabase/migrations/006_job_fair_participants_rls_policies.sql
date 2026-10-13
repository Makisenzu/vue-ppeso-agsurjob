-- =============================================================================
-- Migration: 006_job_fair_participants_rls_policies.sql
-- Purpose:   Row Level Security for esmdd.job_fair_participants
-- Schema:    esmdd
--
-- Access Matrix:
--   Table                  | provincial_peso | municipal_peso / admin | other authenticated
--   -----------------------|-----------------|------------------------|---------------------
--   job_fair_participants  | full CRUD       | read                   | none
--
-- Note: participant rows hold employer contact details (names, phone numbers,
-- email, TIN), so they are limited to PESO staff and admins rather than all
-- signed-in users. Public vacancy listings remain readable via job_vacancies.
-- =============================================================================


-- ─── 1. Enable Row Level Security ──────────────────────────────────────────

ALTER TABLE esmdd.job_fair_participants ENABLE ROW LEVEL SECURITY;


-- ─── 2. esmdd.job_fair_participants ────────────────────────────────────────

-- Policy: Provincial PESO full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_job_fair_participants_all" ON esmdd.job_fair_participants;
CREATE POLICY "provincial_peso_job_fair_participants_all"
ON esmdd.job_fair_participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'provincial_peso'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'provincial_peso'
  )
);

-- Policy: Municipal PESO and Admin read-only access
DROP POLICY IF EXISTS "municipal_peso_and_admin_job_fair_participants_select" ON esmdd.job_fair_participants;
CREATE POLICY "municipal_peso_and_admin_job_fair_participants_select"
ON esmdd.job_fair_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);


-- ─── 3. Grant permissions to Supabase roles ────────────────────────────────

GRANT USAGE ON SCHEMA esmdd TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_fair_participants TO authenticated;
GRANT ALL ON esmdd.job_fair_participants TO service_role;
