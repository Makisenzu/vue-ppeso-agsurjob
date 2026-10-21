-- =============================================================================
-- Migration: 037_establishments_nsrp_form2.sql
-- Purpose:   NSRP Form 2 (Establishment Registration) as one reusable record per establishment.
--            NSRP Form 1 is applicants.applicants; Form 2 used to be re-typed into
--            esmdd.job_fair_participants for every job fair. Now an establishment fills (or PESO
--            encodes) Form 2 once, and every recruitment activity (job fair, LRA, SRA, ...) links
--            to it through establishment_id.
--
--              - Table employers.establishments (same columns / enums as job_fair_participants)
--              - Trigger employers.guard_establishment_review (staff-only review fields)
--              - esmdd.job_fair_participants.establishment_id (nullable link, no backfill)
-- Schema:    employers, esmdd
--
-- Two ways in:
--   self_registered  a company account (company_owner) files Form 2 for its own company;
--                    company_id is set, one Form 2 per company
--   peso_encoded     Provincial PESO encodes an establishment, with or without an app account
--                    (walk-ins at a job fair, LRA / SRA partners); company_id may stay NULL
--
-- Access Matrix:
--   Resource        | admin / provincial_peso | municipal_peso / dole | company_owner        | company_member
--   ----------------|-------------------------|-----------------------|----------------------|---------------
--   establishments  | full CRUD + review      | read                  | insert / update own  | read own
--
-- Review: status 'Pending' -> 'Verified' / 'Rejected' is staff-only. Any edit by the company
-- sends the row back to 'Pending' so PESO re-checks the changed data.
-- =============================================================================

BEGIN;


-- ─── 1. Table: employers.establishments ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS employers.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- App account of the establishment, when it has one (one Form 2 per company)
  company_id UUID
    REFERENCES employers.companies (id) ON DELETE SET NULL,

  -- Establishment details
  business_name TEXT NOT NULL CHECK (length(btrim(business_name)) > 0),
  trade_name TEXT,
  acronym TEXT,
  tin TEXT,
  employer_category esmdd.employer_category_enum NOT NULL,
  public_employer_type esmdd.public_employer_type_enum,
  private_employer_type esmdd.private_employer_type_enum,
  is_main_office BOOLEAN NOT NULL DEFAULT true,
  total_workforce esmdd.total_workforce_enum,
  industry_line TEXT,

  -- Address (same keys as job_fair_participants)
  street TEXT,
  barangay TEXT,
  city_municipality TEXT,
  province TEXT,

  -- Contact
  owner_president_name TEXT,
  contact_person_name TEXT,
  contact_person_position TEXT,
  telephone_number TEXT,
  mobile_number TEXT,
  fax_number TEXT,
  email_address TEXT
    CHECK (email_address IS NULL OR email_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- Registration / review
  source TEXT NOT NULL DEFAULT 'peso_encoded'
    CHECK (source IN ('self_registered', 'peso_encoded')),
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  remarks TEXT,
  reviewed_by UUID
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only the employer type of the chosen category may be filled
  CONSTRAINT establishments_employer_type_check CHECK (
    (employer_category = 'Public' AND private_employer_type IS NULL)
    OR (employer_category = 'Private' AND public_employer_type IS NULL)
  )
);

COMMENT ON TABLE employers.establishments IS
  'NSRP Form 2 (Establishment Registration): one row per establishment, reused by job fairs, LRA and SRA.';

-- One Form 2 per app-registered company
CREATE UNIQUE INDEX IF NOT EXISTS uq_establishments_company_id
  ON employers.establishments (company_id)
  WHERE company_id IS NOT NULL;

-- Lookups: PESO search by name / TIN, review queue, municipality reports.
-- TIN is not unique: branches share the main office's TIN.
CREATE INDEX IF NOT EXISTS idx_establishments_business_name
  ON employers.establishments (lower(business_name));
CREATE INDEX IF NOT EXISTS idx_establishments_tin
  ON employers.establishments (tin)
  WHERE tin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_establishments_status
  ON employers.establishments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_establishments_city_municipality
  ON employers.establishments (city_municipality);


-- ─── 2. Trigger: timestamps + staff-only review fields ──────────────────────

CREATE OR REPLACE FUNCTION employers.guard_establishment_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_staff BOOLEAN := core.has_role('provincial_peso', 'admin');
BEGIN
  NEW.updated_at := now();

  IF NOT v_is_staff THEN
    -- Companies file their own Form 2; review fields stay with PESO
    IF TG_OP = 'INSERT' THEN
      NEW.source := 'self_registered';
      NEW.created_by := auth.uid();
    ELSE
      NEW.company_id := OLD.company_id;
      NEW.source := OLD.source;
      NEW.created_by := OLD.created_by;
    END IF;
    NEW.status := 'Pending';
    NEW.remarks := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.remarks END;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  -- Staff: stamp who reviewed and when, clear it when sent back to Pending
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Pending' THEN
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    ELSE
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_establishments_guard_review ON employers.establishments;
CREATE TRIGGER trg_establishments_guard_review
BEFORE INSERT OR UPDATE ON employers.establishments
FOR EACH ROW
EXECUTE FUNCTION employers.guard_establishment_review();

REVOKE ALL ON FUNCTION employers.guard_establishment_review() FROM PUBLIC, anon, authenticated;


-- ─── 3. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE employers.establishments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all ON employers.establishments;
CREATE POLICY admin_all ON employers.establishments
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS provincial_peso_all ON employers.establishments;
CREATE POLICY provincial_peso_all ON employers.establishments
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS oversight_select ON employers.establishments;
CREATE POLICY oversight_select ON employers.establishments
FOR SELECT TO authenticated
USING ((SELECT core.has_role('municipal_peso', 'dole')));

-- Owners and members read their company's Form 2
DROP POLICY IF EXISTS company_select ON employers.establishments;
CREATE POLICY company_select ON employers.establishments
FOR SELECT TO authenticated
USING (company_id IS NOT NULL AND employers.is_company_member(company_id));

-- Only the owner files / edits it, and only for a company they own
DROP POLICY IF EXISTS company_owner_insert ON employers.establishments;
CREATE POLICY company_owner_insert ON employers.establishments
FOR INSERT TO authenticated
WITH CHECK (company_id IS NOT NULL AND employers.is_company_owner(company_id));

DROP POLICY IF EXISTS company_owner_update ON employers.establishments;
CREATE POLICY company_owner_update ON employers.establishments
FOR UPDATE TO authenticated
USING (company_id IS NOT NULL AND employers.is_company_owner(company_id))
WITH CHECK (company_id IS NOT NULL AND employers.is_company_owner(company_id));

-- No company DELETE policy: removing a Form 2 would orphan activity history; PESO deletes.

REVOKE ALL ON employers.establishments FROM anon;
GRANT USAGE ON SCHEMA employers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employers.establishments TO authenticated;
GRANT ALL ON employers.establishments TO service_role;


-- ─── 4. Link job fair participants to their Form 2 ──────────────────────────
-- Nullable and not backfilled: existing participants keep their typed-in columns. New ones
-- can pick an establishment and copy its fields; LRA / SRA tables should get the same column.

ALTER TABLE esmdd.job_fair_participants
  ADD COLUMN IF NOT EXISTS establishment_id UUID
    REFERENCES employers.establishments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_fair_participants_establishment_id
  ON esmdd.job_fair_participants (establishment_id)
  WHERE establishment_id IS NOT NULL;

-- An establishment joins a job fair once
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_fair_participants_fair_establishment
  ON esmdd.job_fair_participants (job_fair_id, establishment_id)
  WHERE establishment_id IS NOT NULL;

COMMIT;
