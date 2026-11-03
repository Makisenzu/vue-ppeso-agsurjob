-- =============================================================================
-- Migration: 106_job_fair_vacancy_qualifications.sql
-- Purpose:   Applicants see the qualifications of a confirmed company's job fair vacancies.
--            esmdd.list_job_fair_vacancies (105) also returns the posting's id, description and
--            qualifications (course / strand, eligibility, license, certification, training hours,
--            other qualifications). Skills (084) and documents to submit (088) are read by
--            job_vacancy_id from their own tables, which every signed-in user may already read.
--
--            Still only Confirmed / Attended participants and their open offers.
--
-- Access: unchanged (SECURITY DEFINER read, EXECUTE to authenticated).
-- Personal data: none. Notified events: none. Depends on 096, 105. Safe to re-run.
-- Then run `npm run types:gen`.
-- =============================================================================

BEGIN;

-- The return type changes, so the old function goes first
DROP FUNCTION IF EXISTS esmdd.list_job_fair_vacancies(UUID);

CREATE FUNCTION esmdd.list_job_fair_vacancies(p_job_fair_id UUID)
RETURNS TABLE (
  id UUID,
  participant_id UUID,
  job_vacancy_id UUID,
  position_title TEXT,
  job_description TEXT,
  nature_of_work TEXT,
  salary TEXT,
  place_of_work TEXT,
  educational_level TEXT,
  course_shs_strand TEXT,
  work_experience_months INT,
  eligibility TEXT,
  license TEXT,
  certification TEXT,
  training_hours INT,
  other_qualifications TEXT[],
  opening_count INT,
  accepts_pwd BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.id,
    v.participant_id,
    j.id,
    j.position_title::TEXT,
    j.job_description::TEXT,
    j.nature_of_work::TEXT,
    j.salary::TEXT,
    j.place_of_work::TEXT,
    j.educational_level::TEXT,
    j.course_shs_strand::TEXT,
    j.work_experience_months::INT,
    j.eligibility::TEXT,
    j.license::TEXT,
    j.certification::TEXT,
    j.training_hours::INT,
    j.other_qualifications::TEXT[],
    v.vacancy_count::INT,
    coalesce(j.accepts_pwd, false)::BOOLEAN
  FROM esmdd.job_fair_vacancies v
  JOIN esmdd.job_vacancies j ON j.id = v.job_vacancy_id
  JOIN esmdd.job_fair_participants p ON p.id = v.participant_id
  WHERE v.job_fair_id = p_job_fair_id
    AND v.status = 'open'
    AND p.status IN ('Confirmed', 'Attended')
  ORDER BY j.position_title;
$$;

REVOKE ALL ON FUNCTION esmdd.list_job_fair_vacancies(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.list_job_fair_vacancies(UUID) TO authenticated;

COMMIT;
