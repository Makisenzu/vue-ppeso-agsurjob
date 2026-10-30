-- =============================================================================
-- Migration: 085_job_vacancy_matching_fields.sql
-- Purpose:   Every vacancy (job fair, LRA / SRA job order, company posting) carries what applicant
--            matching needs:
--              1. job_vacancies.related_courses TEXT[]: optional courses accepted besides
--                 course_shs_strand (names from core.courses, stored as text like course_shs_strand).
--              2. esmdd.set_job_vacancy_matching(): replaces a vacancy's skills and related courses.
--                 The PESO job fair and recruitment activity forms call it right after saving the vacancy.
--              3. esmdd.save_job_vacancy() (084) also saves related_courses.
--              Both require 1 to 30 skills with at least one must-have (is_required).
--
--            Existing vacancies keep no skills until they are edited; the forms require them from now on.
-- Schema:    esmdd
-- Depends on: 084_job_vacancy_skills.sql
-- Notified events: none.
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Related courses ─────────────────────────────────────────────────────

ALTER TABLE esmdd.job_vacancies
  ADD COLUMN IF NOT EXISTS related_courses TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE esmdd.job_vacancies DROP CONSTRAINT IF EXISTS job_vacancies_related_courses_max;
ALTER TABLE esmdd.job_vacancies
  ADD CONSTRAINT job_vacancies_related_courses_max CHECK (cardinality(related_courses) <= 10);

-- Course matching looks vacancies up by any accepted course
CREATE INDEX IF NOT EXISTS idx_job_vacancies_related_courses ON esmdd.job_vacancies USING GIN (related_courses);


-- ─── 2. Shared checks and writers (internal) ────────────────────────────────

/** Raises unless p_skills holds 1–30 distinct skills, at least one of them a must-have */
CREATE OR REPLACE FUNCTION esmdd.assert_job_vacancy_skills(p_skills JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_required INT;
BEGIN
  IF p_skills IS NULL OR jsonb_typeof(p_skills) <> 'array' THEN
    RAISE EXCEPTION 'A vacancy needs 1 to 30 skills' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(DISTINCT lower(regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g'))),
    count(*) FILTER (WHERE COALESCE((s.elem ->> 'is_required')::BOOLEAN, true))
  INTO v_count, v_required
  FROM jsonb_array_elements(p_skills) AS s (elem)
  WHERE COALESCE(btrim(s.elem ->> 'skill_name'), '') <> '';

  IF v_count < 1 OR v_count > 30 THEN
    RAISE EXCEPTION 'A vacancy needs 1 to 30 skills' USING ERRCODE = '22023';
  END IF;
  IF v_required < 1 THEN
    RAISE EXCEPTION 'Mark at least one skill as a must-have' USING ERRCODE = '22023';
  END IF;
END;
$$;

/** Replaces the skills of a vacancy (caller's RLS applies); duplicates keep the first */
CREATE OR REPLACE FUNCTION esmdd.replace_job_vacancy_skills(p_job_vacancy_id UUID, p_skills JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  DELETE FROM esmdd.job_vacancy_skills WHERE job_vacancy_id = p_job_vacancy_id;

  INSERT INTO esmdd.job_vacancy_skills (job_vacancy_id, skill_name, is_required)
  SELECT DISTINCT ON (lower(regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g')))
    p_job_vacancy_id,
    regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g'),
    COALESCE((s.elem ->> 'is_required')::BOOLEAN, true)
  FROM jsonb_array_elements(p_skills) WITH ORDINALITY AS s (elem, ord)
  WHERE COALESCE(btrim(s.elem ->> 'skill_name'), '') <> ''
  ORDER BY lower(regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g')), s.ord;
$$;

/** Trimmed, de-duplicated (case-insensitive) course names, blanks dropped */
CREATE OR REPLACE FUNCTION esmdd.clean_related_courses(p_courses TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(name ORDER BY ord), '{}')
  FROM (
    SELECT DISTINCT ON (lower(btrim(c.name))) btrim(c.name) AS name, c.ord
    FROM unnest(COALESCE(p_courses, '{}')) WITH ORDINALITY AS c (name, ord)
    WHERE btrim(c.name) <> ''
    ORDER BY lower(btrim(c.name)), c.ord
  ) cleaned;
$$;

REVOKE ALL ON FUNCTION esmdd.assert_job_vacancy_skills(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.replace_job_vacancy_skills(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.clean_related_courses(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.assert_job_vacancy_skills(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.replace_job_vacancy_skills(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.clean_related_courses(TEXT[]) TO authenticated;


-- ─── 3. PESO forms: skills and related courses of a saved vacancy ───────────

CREATE OR REPLACE FUNCTION esmdd.set_job_vacancy_matching(
  p_job_vacancy_id UUID,
  p_skills JSONB,
  p_related_courses TEXT[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM esmdd.assert_job_vacancy_skills(p_skills);

  UPDATE esmdd.job_vacancies
  SET related_courses = esmdd.clean_related_courses(p_related_courses), updated_at = now()
  WHERE id = p_job_vacancy_id
  RETURNING id INTO v_id;

  -- RLS hides rows the caller may not update
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'You cannot edit this vacancy' USING ERRCODE = '42501';
  END IF;

  PERFORM esmdd.replace_job_vacancy_skills(v_id, p_skills);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.set_job_vacancy_matching(UUID, JSONB, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.set_job_vacancy_matching(UUID, JSONB, TEXT[]) TO authenticated;


-- ─── 4. Employer form: save_job_vacancy (084) with related courses ──────────

CREATE OR REPLACE FUNCTION esmdd.save_job_vacancy(
  p_job_vacancy_id UUID,
  p_establishment_id UUID,
  p_vacancy JSONB,
  p_skills JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v esmdd.job_vacancies;
  v_id UUID;
BEGIN
  v := jsonb_populate_record(NULL::esmdd.job_vacancies, p_vacancy);

  IF v.position_title IS NULL OR btrim(v.position_title) = '' THEN
    RAISE EXCEPTION 'Position title is required' USING ERRCODE = '22023';
  END IF;
  PERFORM esmdd.assert_job_vacancy_skills(p_skills);

  IF p_job_vacancy_id IS NULL THEN
    INSERT INTO esmdd.job_vacancies (
      establishment_id, created_by, position_title, job_description, nature_of_work, vacancy_count,
      salary, place_of_work, educational_level, course_shs_strand, related_courses, work_experience_months,
      eligibility, license, certification, language_dialect_spoken, other_qualifications,
      accepts_pwd, pwd_disabilities, pwd_other_disability, accepts_returning_ofw,
      posting_date, valid_until, status
    )
    VALUES (
      p_establishment_id, (SELECT auth.uid()), btrim(v.position_title), v.job_description,
      COALESCE(v.nature_of_work, 'Permanent'), COALESCE(v.vacancy_count, 1),
      v.salary, v.place_of_work, v.educational_level, v.course_shs_strand,
      esmdd.clean_related_courses(v.related_courses), v.work_experience_months,
      v.eligibility, v.license, v.certification, v.language_dialect_spoken, v.other_qualifications,
      v.accepts_pwd, v.pwd_disabilities, v.pwd_other_disability, v.accepts_returning_ofw,
      v.posting_date, v.valid_until, COALESCE(v.status, 'open')
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE esmdd.job_vacancies SET
      position_title = btrim(v.position_title),
      job_description = v.job_description,
      nature_of_work = COALESCE(v.nature_of_work, nature_of_work),
      vacancy_count = COALESCE(v.vacancy_count, vacancy_count),
      salary = v.salary,
      place_of_work = v.place_of_work,
      educational_level = v.educational_level,
      course_shs_strand = v.course_shs_strand,
      related_courses = esmdd.clean_related_courses(v.related_courses),
      work_experience_months = v.work_experience_months,
      eligibility = v.eligibility,
      license = v.license,
      certification = v.certification,
      language_dialect_spoken = v.language_dialect_spoken,
      other_qualifications = v.other_qualifications,
      accepts_pwd = v.accepts_pwd,
      pwd_disabilities = v.pwd_disabilities,
      pwd_other_disability = v.pwd_other_disability,
      accepts_returning_ofw = v.accepts_returning_ofw,
      posting_date = v.posting_date,
      valid_until = v.valid_until,
      status = COALESCE(v.status, status),
      updated_at = now()
    WHERE id = p_job_vacancy_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'You cannot edit this vacancy' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM esmdd.replace_job_vacancy_skills(v_id, p_skills);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB) TO authenticated;

COMMIT;
