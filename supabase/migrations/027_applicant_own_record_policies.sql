-- ==============================================================================
-- Migration: 027_applicant_own_record_policies.sql
-- Description: Lets an applicant create and update their own applicants.applicants
--              record. Signup now stores only the NSRP personal-information section;
--              the applicant completes the rest on /app/complete-profile, which the
--              router guard requires before the portal can be used.
--              SELECT of the own row is already covered by
--              "peso_and_admin_select_applicants" (migration 004).
-- ==============================================================================

ALTER TABLE applicants.applicants ENABLE ROW LEVEL SECURITY;

-- 1. Applicants insert only a record linked to their own profile
DROP POLICY IF EXISTS "applicant_own_applicants_insert" ON applicants.applicants;
CREATE POLICY "applicant_own_applicants_insert"
ON applicants.applicants
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'applicant'
  )
);

-- 2. Applicants update only their own record and cannot re-link it to another profile
DROP POLICY IF EXISTS "applicant_own_applicants_update" ON applicants.applicants;
CREATE POLICY "applicant_own_applicants_update"
ON applicants.applicants
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
