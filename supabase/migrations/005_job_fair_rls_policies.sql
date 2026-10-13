-- =============================================================================
-- Migration: 005_job_fair_rls_policies.sql
-- Purpose:   Row Level Security for the Job Fair module tables:
--            esmdd.job_fairs, esmdd.job_vacancies, esmdd.hots
-- Schema:    esmdd
--
-- Access Matrix:
--   Table           | provincial_peso | municipal_peso / admin | other authenticated
--   ----------------|-----------------|------------------------|-------------------------
--   job_fairs       | full CRUD       | read                   | read (public event info)
--   job_vacancies   | full CRUD       | read                   | read (public listings)
--   hots            | full CRUD       | read                   | read own record only
--
-- Note: `hots` holds applicant PII (name, phone, email), so it is never exposed
-- to other authenticated users — an applicant can only see their own hire
-- record through `applicant_profile_id`.
-- =============================================================================


-- ─── 1. Enable Row Level Security ──────────────────────────────────────────

ALTER TABLE esmdd.job_fairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.job_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.hots ENABLE ROW LEVEL SECURITY;


-- ─── 2. esmdd.job_fairs ────────────────────────────────────────────────────

-- Policy: Provincial PESO full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_job_fairs_all" ON esmdd.job_fairs;
CREATE POLICY "provincial_peso_job_fairs_all"
ON esmdd.job_fairs
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

-- Policy: Any signed-in user can view job fair events
DROP POLICY IF EXISTS "authenticated_job_fairs_select" ON esmdd.job_fairs;
CREATE POLICY "authenticated_job_fairs_select"
ON esmdd.job_fairs
FOR SELECT
TO authenticated
USING (true);


-- ─── 3. esmdd.job_vacancies ────────────────────────────────────────────────

-- Policy: Provincial PESO full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_job_vacancies_all" ON esmdd.job_vacancies;
CREATE POLICY "provincial_peso_job_vacancies_all"
ON esmdd.job_vacancies
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

-- Policy: Any signed-in user can view job fair vacancies
DROP POLICY IF EXISTS "authenticated_job_vacancies_select" ON esmdd.job_vacancies;
CREATE POLICY "authenticated_job_vacancies_select"
ON esmdd.job_vacancies
FOR SELECT
TO authenticated
USING (true);


-- ─── 4. esmdd.hots (Hired on the Spot) ─────────────────────────────────────

-- Policy: Provincial PESO full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_hots_all" ON esmdd.hots;
CREATE POLICY "provincial_peso_hots_all"
ON esmdd.hots
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
DROP POLICY IF EXISTS "municipal_peso_and_admin_hots_select" ON esmdd.hots;
CREATE POLICY "municipal_peso_and_admin_hots_select"
ON esmdd.hots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

-- Policy: Applicants can view their own hire record
DROP POLICY IF EXISTS "applicant_own_hots_select" ON esmdd.hots;
CREATE POLICY "applicant_own_hots_select"
ON esmdd.hots
FOR SELECT
TO authenticated
USING (applicant_profile_id = auth.uid());


-- ─── 5. Grant permissions to Supabase roles ────────────────────────────────
-- Table privileges only open the door; the RLS policies above decide which
-- rows each role can actually read or write.

GRANT USAGE ON SCHEMA esmdd TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_fairs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_vacancies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.hots TO authenticated;

GRANT ALL ON esmdd.job_fairs TO service_role;
GRANT ALL ON esmdd.job_vacancies TO service_role;
GRANT ALL ON esmdd.hots TO service_role;
