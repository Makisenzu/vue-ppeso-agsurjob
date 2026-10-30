-- =============================================================================
-- Migration: 084_job_vacancy_skills.sql
-- Purpose:   Skills needed per vacancy, for matching applicants to job postings.
--
--              esmdd.job_vacancies ──< esmdd.job_vacancy_skills
--
--            1. esmdd.job_vacancy_skills: one row per skill of a vacancy. skill_key is the
--               normalized name (lower case, single spaces) that matching joins on, unique per
--               vacancy. is_required: must-have (true) or nice-to-have (false).
--            2. esmdd.can_manage_job_vacancy(): the same "who may write this vacancy" rule as the
--               job_vacancies policies (039): admin / provincial PESO, or the owner of the company
--               that the vacancy's establishment belongs to.
--            3. esmdd.save_job_vacancy(): creates or updates a vacancy and replaces its skills in one
--               transaction (the employer Job Posting page). SECURITY INVOKER, so the job_vacancies
--               RLS still decides who may write.
--
--            Applicant side of matching (not changed here): NSRP other_skills / other_skills_specified,
--            applicants.applicant_skills and vocational trainings, normalized the same way.
--
-- Schema:    esmdd
-- Notified events: none (the owner edits their own posting; system.notify skips self-changes).
--
-- Access Matrix:
--   Resource            | admin / provincial_peso | municipal_peso / dole | company_owner         | other authenticated
--   --------------------|-------------------------|-----------------------|-----------------------|--------------------
--   job_vacancy_skills  | full CRUD               | read                  | CRUD own establishment | read
--
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_vacancy_id UUID NOT NULL REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL CHECK (char_length(btrim(skill_name)) BETWEEN 2 AND 80),
  skill_key TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(skill_name), '\s+', ' ', 'g'))) STORED,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_vacancy_skills_unique_key UNIQUE (job_vacancy_id, skill_key)
);

-- job_vacancy_id is the leading column of the unique index; matching looks skills up by key
CREATE INDEX IF NOT EXISTS idx_job_vacancy_skills_skill_key ON esmdd.job_vacancy_skills (skill_key);


-- ─── 2. Who may write a vacancy ─────────────────────────────────────────────
-- SECURITY DEFINER so the check reads establishments without their RLS (same as the 039 policies)

CREATE OR REPLACE FUNCTION esmdd.can_manage_job_vacancy(p_job_vacancy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT core.has_role('admin', 'provincial_peso')
    OR EXISTS (
      SELECT 1
      FROM esmdd.job_vacancies v
      JOIN employers.establishments e ON e.id = v.establishment_id
      WHERE v.id = p_job_vacancy_id
        AND e.company_id IS NOT NULL
        AND employers.is_company_owner(e.company_id)
    );
$$;

REVOKE ALL ON FUNCTION esmdd.can_manage_job_vacancy(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.can_manage_job_vacancy(UUID) TO authenticated;


-- ─── 3. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE esmdd.job_vacancy_skills ENABLE ROW LEVEL SECURITY;

-- Like job_vacancies: every signed-in user can see what a vacancy asks for
DROP POLICY IF EXISTS authenticated_select ON esmdd.job_vacancy_skills;
CREATE POLICY authenticated_select ON esmdd.job_vacancy_skills
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS manager_insert ON esmdd.job_vacancy_skills;
CREATE POLICY manager_insert ON esmdd.job_vacancy_skills
FOR INSERT TO authenticated
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_update ON esmdd.job_vacancy_skills;
CREATE POLICY manager_update ON esmdd.job_vacancy_skills
FOR UPDATE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)))
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_delete ON esmdd.job_vacancy_skills;
CREATE POLICY manager_delete ON esmdd.job_vacancy_skills
FOR DELETE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

REVOKE ALL ON esmdd.job_vacancy_skills FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_vacancy_skills TO authenticated;
GRANT ALL ON esmdd.job_vacancy_skills TO service_role;


-- ─── 4. Save a vacancy with its skills ──────────────────────────────────────
/*
 * p_job_vacancy_id NULL creates the vacancy for p_establishment_id; otherwise updates it.
 * p_vacancy: the form's job_vacancies columns. p_skills: [{ "skill_name": text, "is_required": bool }],
 * 1 to 30 entries; duplicates (same skill_key) keep the first. Returns the vacancy id.
 */
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
  v_skill_count INT;
BEGIN
  v := jsonb_populate_record(NULL::esmdd.job_vacancies, p_vacancy);

  IF v.position_title IS NULL OR btrim(v.position_title) = '' THEN
    RAISE EXCEPTION 'Position title is required' USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT lower(regexp_replace(btrim(s.skill_name), '\s+', ' ', 'g')))
  INTO v_skill_count
  FROM jsonb_to_recordset(COALESCE(p_skills, '[]'::jsonb)) AS s (skill_name TEXT, is_required BOOLEAN)
  WHERE s.skill_name IS NOT NULL AND btrim(s.skill_name) <> '';

  IF v_skill_count < 1 OR v_skill_count > 30 THEN
    RAISE EXCEPTION 'A vacancy needs 1 to 30 skills' USING ERRCODE = '22023';
  END IF;

  IF p_job_vacancy_id IS NULL THEN
    INSERT INTO esmdd.job_vacancies (
      establishment_id, created_by, position_title, job_description, nature_of_work, vacancy_count,
      salary, place_of_work, educational_level, course_shs_strand, work_experience_months,
      eligibility, license, certification, language_dialect_spoken, other_qualifications,
      accepts_pwd, pwd_disabilities, pwd_other_disability, accepts_returning_ofw,
      posting_date, valid_until, status
    )
    VALUES (
      p_establishment_id, (SELECT auth.uid()), btrim(v.position_title), v.job_description,
      COALESCE(v.nature_of_work, 'Permanent'), COALESCE(v.vacancy_count, 1),
      v.salary, v.place_of_work, v.educational_level, v.course_shs_strand, v.work_experience_months,
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

    -- RLS hides rows the caller may not update: report it instead of saving nothing
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'You cannot edit this vacancy' USING ERRCODE = '42501';
    END IF;

    DELETE FROM esmdd.job_vacancy_skills WHERE job_vacancy_id = v_id;
  END IF;

  INSERT INTO esmdd.job_vacancy_skills (job_vacancy_id, skill_name, is_required)
  SELECT DISTINCT ON (lower(regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g')))
    v_id,
    regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g'),
    COALESCE((s.elem ->> 'is_required')::BOOLEAN, true)
  FROM jsonb_array_elements(p_skills) WITH ORDINALITY AS s (elem, ord)
  WHERE COALESCE(btrim(s.elem ->> 'skill_name'), '') <> ''
  ORDER BY lower(regexp_replace(btrim(s.elem ->> 'skill_name'), '\s+', ' ', 'g')), s.ord;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB) TO authenticated;

COMMIT;
