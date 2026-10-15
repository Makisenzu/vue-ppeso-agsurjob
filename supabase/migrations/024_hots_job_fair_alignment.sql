-- =============================================================================
-- Migration: 024_hots_job_fair_alignment.sql
-- Purpose:   Align esmdd.hots (Hired on the Spot) with the job fair flow:
--
--              job_fairs ──< job_fair_participants ──< job_vacancies ──< hots
--
--            A hire is now recorded against a vacancy of a participating employer,
--            instead of free-text company / position fields.
--
--              1. Add hots.participant_id (FK → job_fair_participants)
--              2. Backfill participant_id / job_vacancy_id from the legacy columns
--              3. Make participant_id / job_vacancy_id required, add the FKs
--              4. Drop the legacy company_id / company_name / position_hired columns
--              5. Add optional hots.applicant_id (FK → applicants.applicants) and
--                 backfill it from applicant_profile_id
--              6. Trigger: derive job_fair_id / participant_id from the vacancy and
--                 keep hires within vacancy_count
-- Schema:    esmdd
--
-- Deletes stay RESTRICT (same intent as migration 007): hire records are applicant
-- outcomes, so a job fair, participant or vacancy with hires cannot be deleted until
-- those hires are handled explicitly.
--
-- The migration aborts (nothing is changed) if any existing hire cannot be matched
-- to a vacancy of a participant of its job fair; fix those rows first.
-- RLS (migration 005) is unchanged.
-- =============================================================================

BEGIN;


-- ─── 1. participant_id ─────────────────────────────────────────────────────

ALTER TABLE esmdd.hots
  ADD COLUMN IF NOT EXISTS participant_id UUID,
  ADD COLUMN IF NOT EXISTS job_vacancy_id UUID;


-- ─── 2. Backfill from the legacy columns ───────────────────────────────────

-- 2a. Rows that already point to a vacancy take its participant
UPDATE esmdd.hots h
SET participant_id = v.participant_id
FROM esmdd.job_vacancies v
WHERE h.job_vacancy_id = v.id
  AND h.participant_id IS NULL;

-- 2b / 2c use the legacy columns only if the live table still has them
-- (they are not present on every database), so they run as dynamic SQL.
DO $$
DECLARE
  has_company_id     BOOLEAN;
  has_company_name   BOOLEAN;
  has_position_hired BOOLEAN;
BEGIN
  SELECT
    bool_or(column_name = 'company_id'),
    bool_or(column_name = 'company_name'),
    bool_or(column_name = 'position_hired')
  INTO has_company_id, has_company_name, has_position_hired
  FROM information_schema.columns
  WHERE table_schema = 'esmdd' AND table_name = 'hots';

  -- 2b. Match the participant of the same job fair by company_id, then by
  --     business name — only when exactly one participant matches
  IF has_company_id THEN
    EXECUTE $sql$
      UPDATE esmdd.hots h
      SET participant_id = (
        SELECT p.id FROM esmdd.job_fair_participants p
        WHERE p.job_fair_id = h.job_fair_id AND p.company_id = h.company_id
      )
      WHERE h.participant_id IS NULL
        AND h.company_id IS NOT NULL
        AND (
          SELECT count(*) FROM esmdd.job_fair_participants p
          WHERE p.job_fair_id = h.job_fair_id AND p.company_id = h.company_id
        ) = 1
    $sql$;
  END IF;

  IF has_company_name THEN
    EXECUTE $sql$
      UPDATE esmdd.hots h
      SET participant_id = (
        SELECT p.id FROM esmdd.job_fair_participants p
        WHERE p.job_fair_id = h.job_fair_id
          AND lower(trim(p.business_name)) = lower(trim(h.company_name))
      )
      WHERE h.participant_id IS NULL
        AND (
          SELECT count(*) FROM esmdd.job_fair_participants p
          WHERE p.job_fair_id = h.job_fair_id
            AND lower(trim(p.business_name)) = lower(trim(h.company_name))
        ) = 1
    $sql$;
  END IF;

  -- 2c. Match the participant's vacancy by position title (exactly one match)
  IF has_position_hired THEN
    EXECUTE $sql$
      UPDATE esmdd.hots h
      SET job_vacancy_id = (
        SELECT v.id FROM esmdd.job_vacancies v
        WHERE v.participant_id = h.participant_id
          AND lower(trim(v.position_title)) = lower(trim(h.position_hired))
      )
      WHERE h.job_vacancy_id IS NULL
        AND h.participant_id IS NOT NULL
        AND (
          SELECT count(*) FROM esmdd.job_vacancies v
          WHERE v.participant_id = h.participant_id
            AND lower(trim(v.position_title)) = lower(trim(h.position_hired))
        ) = 1
    $sql$;
  END IF;
END $$;

-- 2d. Abort if anything is unmatched or inconsistent
DO $$
DECLARE
  unmatched INT;
BEGIN
  SELECT count(*) INTO unmatched
  FROM esmdd.hots h
  LEFT JOIN esmdd.job_vacancies v ON v.id = h.job_vacancy_id
  WHERE h.participant_id IS NULL
     OR v.id IS NULL
     OR v.participant_id <> h.participant_id
     OR v.job_fair_id <> h.job_fair_id;

  IF unmatched > 0 THEN
    RAISE EXCEPTION
      'hots alignment: % hire record(s) could not be matched to a vacancy of a participant of their job fair. Set job_vacancy_id on them and re-run.',
      unmatched;
  END IF;
END $$;


-- ─── 3. Required links + foreign keys ──────────────────────────────────────

ALTER TABLE esmdd.hots
  ALTER COLUMN participant_id SET NOT NULL,
  ALTER COLUMN job_vacancy_id SET NOT NULL;

ALTER TABLE esmdd.hots
  DROP CONSTRAINT IF EXISTS hots_participant_id_fkey,
  ADD CONSTRAINT hots_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES esmdd.job_fair_participants (id) ON DELETE RESTRICT;

ALTER TABLE esmdd.hots
  DROP CONSTRAINT IF EXISTS hots_job_vacancy_id_fkey,
  ADD CONSTRAINT hots_job_vacancy_id_fkey
    FOREIGN KEY (job_vacancy_id) REFERENCES esmdd.job_vacancies (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS hots_job_fair_id_idx ON esmdd.hots (job_fair_id);
CREATE INDEX IF NOT EXISTS hots_participant_id_idx ON esmdd.hots (participant_id);
CREATE INDEX IF NOT EXISTS hots_job_vacancy_id_idx ON esmdd.hots (job_vacancy_id);


-- ─── 4. Drop the legacy free-text columns ──────────────────────────────────
-- Company and position now come from job_fair_participants / job_vacancies.

ALTER TABLE esmdd.hots
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS position_hired;

COMMENT ON TABLE esmdd.hots IS
  'Hired on the Spot: an applicant hired at a job fair for a vacancy (job_vacancies) of a participating employer (job_fair_participants).';


-- ─── 5. Optional link to the applicant registry ────────────────────────────
-- Walk-in hires may not be in the registry, so applicant_id stays nullable and the
-- applicant_* name / contact columns remain the record of who was hired.
-- ON DELETE SET NULL: removing a registry entry keeps the hire record.

ALTER TABLE esmdd.hots
  ADD COLUMN IF NOT EXISTS applicant_id UUID;

ALTER TABLE esmdd.hots
  DROP CONSTRAINT IF EXISTS hots_applicant_id_fkey,
  ADD CONSTRAINT hots_applicant_id_fkey
    FOREIGN KEY (applicant_id) REFERENCES applicants.applicants (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS hots_applicant_id_idx ON esmdd.hots (applicant_id);

-- When applicant_id is set, the registry always wins: name, email, profile and
-- phone (first of contact_numbers) are overwritten from applicants.applicants.
-- The sent phone is kept only when the registry has none (column is NOT NULL).
-- Fires on every update so manual edits to the applicant_* columns are reverted.
CREATE OR REPLACE FUNCTION esmdd.hots_fill_applicant_from_registry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  registry applicants.applicants%ROWTYPE;
BEGIN
  IF NEW.applicant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO registry
  FROM applicants.applicants
  WHERE id = NEW.applicant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Applicant % does not exist in the registry', NEW.applicant_id;
  END IF;

  NEW.applicant_first_name    := registry.first_name;
  NEW.applicant_middle_name   := registry.middle_name;
  NEW.applicant_last_name     := registry.surname;
  NEW.applicant_email         := registry.email;
  NEW.applicant_profile_id    := registry.profile_id;
  NEW.applicant_contact_phone := COALESCE(
    NULLIF(trim(registry.contact_numbers[1]), ''),
    NEW.applicant_contact_phone
  );

  IF NEW.applicant_contact_phone IS NULL THEN
    RAISE EXCEPTION 'Applicant % has no contact number in the registry; enter one for this hire', NEW.applicant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hots_fill_applicant_from_registry ON esmdd.hots;
CREATE TRIGGER trg_hots_fill_applicant_from_registry
  BEFORE INSERT OR UPDATE ON esmdd.hots
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.hots_fill_applicant_from_registry();

-- Registry edits flow into linked hires. SECURITY DEFINER because whoever edits the
-- registry row (e.g. the applicant) may not be allowed to update esmdd.hots under RLS.
-- Re-setting applicant_id re-runs the fill trigger above without touching the
-- vacancy trigger (it only fires on job_vacancy_id / job_fair_id / participant_id).
CREATE OR REPLACE FUNCTION esmdd.hots_sync_from_registry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE esmdd.hots
  SET applicant_id = NEW.id
  WHERE applicant_id = NEW.id;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.hots_sync_from_registry() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_hots_sync_from_registry ON applicants.applicants;
CREATE TRIGGER trg_hots_sync_from_registry
  AFTER UPDATE OF first_name, middle_name, surname, email, profile_id, contact_numbers
  ON applicants.applicants
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.hots_sync_from_registry();

-- Backfill from the hired applicant's account (exactly one registry match);
-- the fill trigger overwrites their details from the registry
UPDATE esmdd.hots h
SET applicant_id = (
  SELECT a.id FROM applicants.applicants a
  WHERE a.profile_id = h.applicant_profile_id
)
WHERE h.applicant_id IS NULL
  AND h.applicant_profile_id IS NOT NULL
  AND (
    SELECT count(*) FROM applicants.applicants a
    WHERE a.profile_id = h.applicant_profile_id
  ) = 1;


-- ─── 6. Keep job fair / participant in step with the vacancy ───────────────
-- The client only needs to send job_vacancy_id; job_fair_id and participant_id
-- are copied from the vacancy. Hires per vacancy cannot exceed vacancy_count
-- (no limit when vacancy_count is NULL).

CREATE OR REPLACE FUNCTION esmdd.hots_sync_job_fair_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  vacancy esmdd.job_vacancies%ROWTYPE;
  hired   INT;
BEGIN
  -- Lock the vacancy so concurrent hires cannot exceed vacancy_count
  SELECT * INTO vacancy
  FROM esmdd.job_vacancies
  WHERE id = NEW.job_vacancy_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job vacancy % does not exist', NEW.job_vacancy_id;
  END IF;

  NEW.job_fair_id    := vacancy.job_fair_id;
  NEW.participant_id := vacancy.participant_id;

  IF vacancy.vacancy_count IS NOT NULL THEN
    SELECT count(*) INTO hired
    FROM esmdd.hots
    WHERE job_vacancy_id = NEW.job_vacancy_id
      AND id IS DISTINCT FROM NEW.id;

    IF hired >= vacancy.vacancy_count THEN
      RAISE EXCEPTION 'All % slot(s) of "%" are already filled', vacancy.vacancy_count, vacancy.position_title;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hots_sync_job_fair_links ON esmdd.hots;
CREATE TRIGGER trg_hots_sync_job_fair_links
  BEFORE INSERT OR UPDATE OF job_vacancy_id, job_fair_id, participant_id ON esmdd.hots
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.hots_sync_job_fair_links();

COMMIT;
