-- =============================================================================
-- Migration: 011_spes_applicants_spes_form.sql
-- Purpose:   Wire the SPES process tables to the applicant SPES form and
--            secure them with Row Level Security.
--              1. esmdd.spes_applicants.spes_form_id → applicants.spes_form.id
--              2. esmdd.spes.application_id cascades with its SPES applicant
--              3. Column defaults for ids / timestamps / statuses
--              4. RLS for esmdd.spes_applicants and esmdd.spes
-- Schema:    esmdd
--
-- Access Matrix:
--   Table            | provincial_peso | municipal_peso / admin | applicant
--   -----------------|-----------------|------------------------|---------------------------
--   spes_applicants  | full CRUD       | read                   | read own (via spes_form)
--   spes             | full CRUD       | read                   | read own (via spes_form)
-- =============================================================================


-- ─── 1. spes_applicants → applicants.spes_form ─────────────────────────────

ALTER TABLE esmdd.spes_applicants
  ADD COLUMN IF NOT EXISTS spes_form_id uuid;

ALTER TABLE esmdd.spes_applicants
  DROP CONSTRAINT IF EXISTS spes_applicants_spes_form_id_fkey;
ALTER TABLE esmdd.spes_applicants
  ADD CONSTRAINT spes_applicants_spes_form_id_fkey
  FOREIGN KEY (spes_form_id) REFERENCES applicants.spes_form (id) ON DELETE CASCADE;

-- One SPES application record per submitted form
DROP INDEX IF EXISTS esmdd.spes_applicants_spes_form_id_key;
CREATE UNIQUE INDEX spes_applicants_spes_form_id_key
  ON esmdd.spes_applicants (spes_form_id);

-- Require the link once no legacy rows are missing it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM esmdd.spes_applicants WHERE spes_form_id IS NULL) THEN
    ALTER TABLE esmdd.spes_applicants ALTER COLUMN spes_form_id SET NOT NULL;
  END IF;
END $$;


-- ─── 2. spes.application_id cascades with its applicant ────────────────────

ALTER TABLE esmdd.spes DROP CONSTRAINT IF EXISTS spes_application_id_fkey;
ALTER TABLE esmdd.spes
  ADD CONSTRAINT spes_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES esmdd.spes_applicants (id) ON DELETE CASCADE;

-- One SPES deployment per applicant
DROP INDEX IF EXISTS esmdd.spes_application_id_key;
CREATE UNIQUE INDEX spes_application_id_key ON esmdd.spes (application_id);


-- ─── 3. Defaults ───────────────────────────────────────────────────────────

ALTER TABLE esmdd.spes_applicants
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'Pending';

ALTER TABLE esmdd.spes
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'Active';


-- ─── 4. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.spes_applicants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.spes TO authenticated;

ALTER TABLE esmdd.spes_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.spes ENABLE ROW LEVEL SECURITY;

-- esmdd.spes_applicants ------------------------------------------------------

DROP POLICY IF EXISTS "provincial_peso_spes_applicants_all" ON esmdd.spes_applicants;
CREATE POLICY "provincial_peso_spes_applicants_all"
ON esmdd.spes_applicants
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

DROP POLICY IF EXISTS "municipal_peso_and_admin_spes_applicants_select" ON esmdd.spes_applicants;
CREATE POLICY "municipal_peso_and_admin_spes_applicants_select"
ON esmdd.spes_applicants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

DROP POLICY IF EXISTS "applicant_own_spes_applicants_select" ON esmdd.spes_applicants;
CREATE POLICY "applicant_own_spes_applicants_select"
ON esmdd.spes_applicants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applicants.spes_form f
    WHERE f.id = spes_applicants.spes_form_id
      AND f.profile_id = auth.uid()
  )
);

-- esmdd.spes -----------------------------------------------------------------

DROP POLICY IF EXISTS "provincial_peso_spes_all" ON esmdd.spes;
CREATE POLICY "provincial_peso_spes_all"
ON esmdd.spes
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

DROP POLICY IF EXISTS "municipal_peso_and_admin_spes_select" ON esmdd.spes;
CREATE POLICY "municipal_peso_and_admin_spes_select"
ON esmdd.spes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

DROP POLICY IF EXISTS "applicant_own_spes_select" ON esmdd.spes;
CREATE POLICY "applicant_own_spes_select"
ON esmdd.spes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.spes_applicants a
    JOIN applicants.spes_form f ON f.id = a.spes_form_id
    WHERE a.id = spes.application_id
      AND f.profile_id = auth.uid()
  )
);
