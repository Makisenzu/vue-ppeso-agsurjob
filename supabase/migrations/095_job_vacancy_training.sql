-- =============================================================================
-- Migration: 095_job_vacancy_training.sql
-- Purpose:   A vacancy can ask for training, e.g. "8 hours of relevant training" (as civil service
--            qualification standards do), next to education, experience and eligibility.
--
--            1. esmdd.job_vacancies.training TEXT (optional, up to 300 characters)
--            2. esmdd.save_job_vacancy (089, the employer posting page) also saves p_vacancy->>'training'.
--               The 088 / 085 saves it wraps are unchanged; the training is written right after them in
--               the same transaction. PESO's forms don't send it, so their vacancies keep it empty.
--
-- Schema:    esmdd. Depends on 084, 085, 088, 089. Notified events: none. Personal data: none.
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE esmdd.job_vacancies
  ADD COLUMN IF NOT EXISTS training TEXT;

ALTER TABLE esmdd.job_vacancies DROP CONSTRAINT IF EXISTS job_vacancies_training_length;
ALTER TABLE esmdd.job_vacancies
  ADD CONSTRAINT job_vacancies_training_length CHECK (training IS NULL OR char_length(training) <= 300);

COMMENT ON COLUMN esmdd.job_vacancies.training IS
  'Training the vacancy asks for, e.g. "8 hours of relevant training"; NULL when none (095).';

/*
 * The employer posting page: the 088 save (vacancy, skills, requirements), the hiring steps (089) and the
 * training, in one transaction. Returns the vacancy id.
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
BEGIN
  PERFORM esmdd.assert_job_vacancy_stages(p_stages);

  v_id := esmdd.save_job_vacancy(p_job_vacancy_id, p_establishment_id, p_vacancy, p_skills, p_requirements);
  PERFORM esmdd.set_job_vacancy_stages(v_id, p_stages);

  UPDATE esmdd.job_vacancies
  SET training = nullif(btrim(p_vacancy ->> 'training'), '')
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB, JSONB) TO authenticated;

COMMIT;
