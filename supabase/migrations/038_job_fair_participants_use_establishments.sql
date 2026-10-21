-- =============================================================================
-- Migration: 038_job_fair_participants_use_establishments.sql
-- Purpose:   NSRP Form 2 data lives only in employers.establishments (037).
--            esmdd.job_fair_participants becomes a link row: job fair + establishment +
--            participation status. Its copied Form 2 columns and company_id are dropped.
--
--              1. guard_establishment_review: PESO-encoded establishments start 'Verified';
--                 sessions without auth.uid() (migrations, SQL editor, service role) are trusted
--              2. Backfill: one establishment per distinct participant (merged by TIN digits,
--                 else business name + city/municipality), linked through establishment_id
--              3. Company policies on job_fair_participants / hots go through the establishment
--              4. establishment_id NOT NULL, unique per job fair, ON DELETE RESTRICT
--              5. Drop the duplicated columns (and the old (job_fair_id, company_id) unique, which
--                 with NULLS NOT DISTINCT allowed only one account-less participant per fair)
--              6. esmdd.add_job_fair_participant(): pick or create the establishment and add it
--                 to a job fair in one transaction
-- Schema:    employers, esmdd
--
-- DEPLOY TOGETHER WITH THE FRONTEND: every job fair participant read / form that selects
-- business_name, tin, address, contact or company_id from job_fair_participants must read them
-- from employers.establishments (via establishment_id) before this runs. Then re-run
-- `npm run types:gen`.
--
-- Unchanged: job_vacancies.participant_id and hots.participant_id (they reference the
-- participant row's id, which is kept). Data at the time of writing: 1 participant, 0 companies.
--
-- Note: 034_rbac_policy_rewrite.sql still creates the old company_id-based company_select
-- policies. Re-running 034 after this migration fails on those two lines; re-run 038's
-- section 3 instead, or update 034 if it is ever re-applied.
-- =============================================================================

BEGIN;


-- ─── 1. Review guard: PESO-encoded rows start Verified ──────────────────────

CREATE OR REPLACE FUNCTION employers.guard_establishment_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  -- No auth.uid(): migration / SQL editor / service role, which are trusted
  v_is_staff BOOLEAN := auth.uid() IS NULL OR core.has_role('provincial_peso', 'admin');
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

  -- Staff typed it in themselves, so it needs no separate review
  IF TG_OP = 'INSERT' AND NEW.source = 'peso_encoded' AND NEW.status = 'Pending' THEN
    NEW.status := 'Verified';
  END IF;

  -- Stamp who reviewed and when; clear it when sent back to Pending
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


-- ─── 2. Backfill establishments from existing participants ──────────────────

CREATE TEMP TABLE _participant_keys ON COMMIT DROP AS
SELECT
  p.id AS participant_id,
  COALESCE(
    NULLIF(regexp_replace(COALESCE(p.tin, ''), '\D', '', 'g'), ''),
    'name:' || lower(btrim(p.business_name)) || '|' || lower(btrim(COALESCE(p.city_municipality, '')))
  ) AS merge_key
FROM esmdd.job_fair_participants p
WHERE p.establishment_id IS NULL;

CREATE TEMP TABLE _establishment_map ON COMMIT DROP AS
SELECT DISTINCT merge_key, gen_random_uuid() AS establishment_id
FROM _participant_keys;

-- The most recently updated participant of each group supplies the Form 2 values
INSERT INTO employers.establishments (
  id, company_id, business_name, trade_name, acronym, tin,
  employer_category, public_employer_type, private_employer_type,
  is_main_office, total_workforce, industry_line,
  street, barangay, city_municipality, province,
  owner_president_name, contact_person_name, contact_person_position,
  telephone_number, mobile_number, fax_number, email_address,
  source, status, created_by
)
SELECT
  m.establishment_id,
  -- A company account can own only one establishment
  CASE
    WHEN src.company_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM employers.establishments e WHERE e.company_id = src.company_id)
     AND row_number() OVER (PARTITION BY src.company_id ORDER BY m.merge_key) = 1
    THEN src.company_id
  END,
  COALESCE(NULLIF(btrim(src.business_name), ''), '(unnamed establishment)'),
  src.trade_name, src.acronym, src.tin,
  src.employer_category,
  CASE WHEN src.employer_category = 'Public' THEN src.public_employer_type END,
  CASE WHEN src.employer_category = 'Private' THEN src.private_employer_type END,
  COALESCE(src.is_main_office, true), src.total_workforce, src.industry_line,
  src.street, src.barangay, src.city_municipality, src.province,
  src.owner_president_name, src.contact_person_name, src.contact_person_position,
  src.telephone_number, src.mobile_number, src.fax_number,
  CASE WHEN src.email_address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN src.email_address END,
  'peso_encoded', 'Verified', NULL
FROM _establishment_map m
JOIN LATERAL (
  SELECT p.*
  FROM esmdd.job_fair_participants p
  JOIN _participant_keys k ON k.participant_id = p.id
  WHERE k.merge_key = m.merge_key
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
  LIMIT 1
) src ON true;

UPDATE esmdd.job_fair_participants p
SET establishment_id = m.establishment_id
FROM _participant_keys k
JOIN _establishment_map m ON m.merge_key = k.merge_key
WHERE k.participant_id = p.id;


-- ─── 3. Company policies: through the establishment ─────────────────────────

DROP POLICY IF EXISTS company_select ON esmdd.job_fair_participants;
CREATE POLICY company_select ON esmdd.job_fair_participants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employers.establishments e
    WHERE e.id = job_fair_participants.establishment_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_member(e.company_id)
  )
);

DROP POLICY IF EXISTS company_select ON esmdd.hots;
CREATE POLICY company_select ON esmdd.hots
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.job_fair_participants p
    JOIN employers.establishments e ON e.id = p.establishment_id
    WHERE p.id = hots.participant_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_member(e.company_id)
  )
);


-- ─── 4. establishment_id: required, unique per job fair, kept on delete ─────

ALTER TABLE esmdd.job_fair_participants
  ALTER COLUMN establishment_id SET NOT NULL;

-- An establishment with job fair history can't be deleted out from under it
ALTER TABLE esmdd.job_fair_participants
  DROP CONSTRAINT IF EXISTS job_fair_participants_establishment_id_fkey,
  ADD CONSTRAINT job_fair_participants_establishment_id_fkey
    FOREIGN KEY (establishment_id) REFERENCES employers.establishments (id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS esmdd.uq_job_fair_participants_fair_establishment;
DROP INDEX IF EXISTS esmdd.idx_job_fair_participants_establishment_id;

ALTER TABLE esmdd.job_fair_participants
  DROP CONSTRAINT IF EXISTS job_fair_participants_fair_establishment_key,
  ADD CONSTRAINT job_fair_participants_fair_establishment_key UNIQUE (job_fair_id, establishment_id);

-- (job_fair_id, establishment_id) covers lookups by job fair; this one serves "which fairs did
-- this establishment join"
CREATE INDEX IF NOT EXISTS idx_job_fair_participants_establishment_id
  ON esmdd.job_fair_participants (establishment_id);


-- ─── 5. Drop the duplicated Form 2 columns ──────────────────────────────────

ALTER TABLE esmdd.job_fair_participants
  DROP CONSTRAINT IF EXISTS unique_job_fair_company;
DROP INDEX IF EXISTS esmdd.idx_job_fair_participants_company;

ALTER TABLE esmdd.job_fair_participants
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS business_name,
  DROP COLUMN IF EXISTS trade_name,
  DROP COLUMN IF EXISTS acronym,
  DROP COLUMN IF EXISTS tin,
  DROP COLUMN IF EXISTS employer_category,
  DROP COLUMN IF EXISTS public_employer_type,
  DROP COLUMN IF EXISTS private_employer_type,
  DROP COLUMN IF EXISTS is_main_office,
  DROP COLUMN IF EXISTS total_workforce,
  DROP COLUMN IF EXISTS industry_line,
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS barangay,
  DROP COLUMN IF EXISTS city_municipality,
  DROP COLUMN IF EXISTS province,
  DROP COLUMN IF EXISTS owner_president_name,
  DROP COLUMN IF EXISTS contact_person_name,
  DROP COLUMN IF EXISTS contact_person_position,
  DROP COLUMN IF EXISTS telephone_number,
  DROP COLUMN IF EXISTS mobile_number,
  DROP COLUMN IF EXISTS fax_number,
  DROP COLUMN IF EXISTS email_address;


-- ─── 6. RPC: add an establishment to a job fair ─────────────────────────────
-- Pass p_establishment_id to reuse an existing Form 2, or p_establishment (Form 2 fields as
-- JSON) to create one; both happen in one transaction. p_status defaults to 'Registered' (the
-- column default 'approved' predates the UI's status list). SECURITY INVOKER: RLS decides who may
-- call it (Provincial PESO / admin).

CREATE OR REPLACE FUNCTION esmdd.add_job_fair_participant(
  p_job_fair_id UUID,
  p_establishment_id UUID DEFAULT NULL,
  p_establishment JSONB DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS esmdd.job_fair_participants
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_establishment_id UUID := p_establishment_id;
  v_participant esmdd.job_fair_participants;
BEGIN
  IF (p_establishment_id IS NULL) = (p_establishment IS NULL) THEN
    RAISE EXCEPTION 'Pass either p_establishment_id or p_establishment, not both'
      USING ERRCODE = '22023';
  END IF;

  IF v_establishment_id IS NULL THEN
    INSERT INTO employers.establishments (
      business_name, trade_name, acronym, tin,
      employer_category, public_employer_type, private_employer_type,
      is_main_office, total_workforce, industry_line,
      street, barangay, city_municipality, province,
      owner_president_name, contact_person_name, contact_person_position,
      telephone_number, mobile_number, fax_number, email_address
    )
    SELECT
      r.business_name, r.trade_name, r.acronym, r.tin,
      r.employer_category, r.public_employer_type, r.private_employer_type,
      COALESCE(r.is_main_office, true), r.total_workforce, r.industry_line,
      r.street, r.barangay, r.city_municipality, r.province,
      r.owner_president_name, r.contact_person_name, r.contact_person_position,
      r.telephone_number, r.mobile_number, r.fax_number, r.email_address
    FROM jsonb_populate_record(NULL::employers.establishments, p_establishment) r
    RETURNING id INTO v_establishment_id;
  END IF;

  INSERT INTO esmdd.job_fair_participants (job_fair_id, establishment_id, status)
  VALUES (p_job_fair_id, v_establishment_id, COALESCE(NULLIF(btrim(p_status), ''), 'Registered'))
  RETURNING * INTO v_participant;

  RETURN v_participant;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.add_job_fair_participant(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.add_job_fair_participant(UUID, UUID, JSONB, TEXT) TO authenticated;

COMMIT;
