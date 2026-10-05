-- ==============================================================================
-- Migration: 004_applicants_peso_policy.sql
-- Description: Grants Provincial PESO, Municipal PESO, and Admin full UPDATE 
--              and SELECT permissions on applicants.applicants so inline editing works.
-- ==============================================================================

-- 1. Ensure RLS is enabled on applicants.applicants
ALTER TABLE applicants.applicants ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if already present
DROP POLICY IF EXISTS "peso_and_admin_update_applicants" ON applicants.applicants;

-- 3. Policy: Provincial PESO, Municipal PESO, and Admin can update applicant records
CREATE POLICY "peso_and_admin_update_applicants"
ON applicants.applicants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'municipal_peso', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'municipal_peso', 'admin')
  )
);

-- 4. Policy: Provincial PESO, Municipal PESO, and Admin can select all applicant records
DROP POLICY IF EXISTS "peso_and_admin_select_applicants" ON applicants.applicants;
CREATE POLICY "peso_and_admin_select_applicants"
ON applicants.applicants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'municipal_peso', 'admin')
  )
  OR auth.uid() = profile_id
);
