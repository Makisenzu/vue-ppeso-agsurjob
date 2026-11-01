-- =============================================================================
-- Migration: 092_job_vacancy_applicant_avatar.sql
-- Purpose:   The employer's applicants table shows each applicant's profile picture and course.
--
--            esmdd.search_job_vacancy_applications (089) also returns:
--              - avatar_path: the storage path of the applicant's latest core.profile_media row (the
--                public `media` bucket), or NULL without an account or a picture.
--              - course: the latest course (or level) of their NSRP educational background, the same
--                value the review sheet shows (latestGipCourse), or NULL.
--            Employers have no SELECT on core.profile_media (034), so both come through this SECURITY
--            DEFINER RPC, which already limits the rows to vacancies the caller may review
--            (esmdd.can_review_job_vacancy). Only the course is returned, not the whole education record.
--
-- Schema:    esmdd. Depends on 087, 089. Notified events: none.
-- Personal data: the profile picture and course of the applicant, shown only to the employers they
-- applied to (the review sheet already shows both).
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, INT, INT);

CREATE FUNCTION esmdd.search_job_vacancy_applications(
  p_job_vacancy_id UUID,
  p_search TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  municipality TEXT,
  avatar_path TEXT,
  course TEXT,
  stage TEXT,
  stage_id UUID,
  stage_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF NOT esmdd.can_review_job_vacancy(p_job_vacancy_id) THEN
    RAISE EXCEPTION 'You can only view the applicants of your own job postings' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ja.id,
    btrim(concat_ws(' ', a.first_name, a.middle_name, a.surname, a.suffix)),
    nullif(applicants.applicant_municipality(a.address), 'N/A')::TEXT,
    -- Latest profile picture, as the applicant's own avatar shows it
    (
      SELECT pm.path
      FROM core.profile_media pm
      WHERE pm.profile_id = a.profile_id
      ORDER BY pm.created_at DESC, pm.id
      LIMIT 1
    ),
    -- Latest education entry's course, else its level (an older single-object record: its course)
    CASE jsonb_typeof(a.educational_background::jsonb)
      WHEN 'array' THEN coalesce(
        nullif(btrim(a.educational_background::jsonb -> -1 ->> 'course'), ''),
        nullif(btrim(a.educational_background::jsonb -> -1 ->> 'level'), '')
      )
      WHEN 'object' THEN nullif(btrim(a.educational_background::jsonb ->> 'course'), '')
    END,
    ja.stage,
    ja.stage_id,
    st.stage_name,
    ja.created_at,
    ja.updated_at,
    count(*) OVER ()
  FROM esmdd.job_vacancy_applications ja
  JOIN applicants.applicants a ON a.id = ja.applicant_id
  LEFT JOIN esmdd.job_vacancy_stages st ON st.id = ja.stage_id
  WHERE ja.job_vacancy_id = p_job_vacancy_id
    AND (nullif(btrim(p_stage), '') IS NULL OR ja.stage = btrim(p_stage))
    -- Rejected applications keep their step but are listed under Not selected only
    AND (p_stage_id IS NULL OR (ja.stage_id = p_stage_id AND ja.stage <> 'rejected'))
    AND (
      nullif(btrim(p_search), '') IS NULL
      OR concat_ws(' ', a.first_name, a.middle_name, a.surname, a.suffix) ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY ja.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, INT, INT) TO authenticated;

COMMIT;
