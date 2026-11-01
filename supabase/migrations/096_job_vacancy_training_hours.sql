-- =============================================================================
-- Migration: 096_job_vacancy_training_hours.sql
-- Purpose:   The training a vacancy asks for is entered as a number of hours; the app shows it as
--            "Eight (8) hours of relevant training". Replaces 095's free-text column.
--
--            1. esmdd.job_vacancies.training_hours SMALLINT (1–1000, NULL when none)
--            2. Values typed into 095's `training` that start with a number are carried over; then
--               `training` is dropped.
--            3. esmdd.save_job_vacancy (089 / 095, the employer posting page) saves
--               p_vacancy->>'training_hours'.
--
-- Schema:    esmdd. Depends on 089, 095. Notified events: none. Personal data: none.
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE esmdd.job_vacancies
  ADD COLUMN IF NOT EXISTS training_hours SMALLINT;

ALTER TABLE esmdd.job_vacancies DROP CONSTRAINT IF EXISTS job_vacancies_training_hours_range;
ALTER TABLE esmdd.job_vacancies
  ADD CONSTRAINT job_vacancies_training_hours_range CHECK (training_hours IS NULL OR training_hours BETWEEN 1 AND 1000);

COMMENT ON COLUMN esmdd.job_vacancies.training_hours IS
  'Hours of relevant training the vacancy asks for; NULL when none (096).';

-- Carry over 095's text where it starts with a number ("8 hours of ..."), then drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'esmdd' AND table_name = 'job_vacancies' AND column_name = 'training'
  ) THEN
    UPDATE esmdd.job_vacancies
    SET training_hours = least(greatest(substring(training FROM '^\s*(\d{1,4})')::INT, 1), 1000)
    WHERE training_hours IS NULL AND training ~ '^\s*\d{1,4}';

    ALTER TABLE esmdd.job_vacancies DROP CONSTRAINT IF EXISTS job_vacancies_training_length;
    ALTER TABLE esmdd.job_vacancies DROP COLUMN training;
  END IF;
END;
$$;

/*
 * The employer posting page: the 088 save (vacancy, skills, requirements), the hiring steps (089) and the
 * training hours, in one transaction. Returns the vacancy id.
 */
CREATE OR REPLACE FUNCTION esmdd.save_job_vacancy(
  p_job_vacancy_id UUID,
  p_establishment_id UUID,
  p_vacancy JSONB,
  p_skills JSONB,
  p_requirements JSONB,
  p_stages JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_hours INT := nullif(p_vacancy ->> 'training_hours', '')::INT;
BEGIN
  IF v_hours IS NOT NULL AND (v_hours < 1 OR v_hours > 1000) THEN
    RAISE EXCEPTION 'Training hours must be between 1 and 1000' USING ERRCODE = '22023';
  END IF;
  PERFORM esmdd.assert_job_vacancy_stages(p_stages);

  v_id := esmdd.save_job_vacancy(p_job_vacancy_id, p_establishment_id, p_vacancy, p_skills, p_requirements);
  PERFORM esmdd.set_job_vacancy_stages(v_id, p_stages);

  UPDATE esmdd.job_vacancies SET training_hours = v_hours WHERE id = v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB, JSONB) TO authenticated;

COMMIT;
