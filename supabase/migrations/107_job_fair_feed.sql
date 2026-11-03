-- =============================================================================
-- Migration: 107_job_fair_feed.sql
-- Purpose:   The applicant / employer Job Fairs page is a newsfeed of PESO's job fair posts.
--            esmdd.list_job_fair_events (105) also returns when PESO posted the fair (created_at)
--            and the paths of its image attachments (009, oldest first) so the post shows them.
--            Upcoming / ongoing fairs are listed newest post first; past ones by date, latest first.
--
--            Images live in the public 'job-fair-attachments' bucket that PESO already uploads to
--            from the job fair form; PDFs are left out of the feed.
--
-- Access: unchanged (SECURITY DEFINER read, EXECUTE to authenticated).
-- Personal data: none. Notified events: none. Depends on 009, 105. Safe to re-run.
-- Then run `npm run types:gen`.
-- =============================================================================

BEGIN;

-- The return type changes, so the old function goes first
DROP FUNCTION IF EXISTS esmdd.list_job_fair_events(BOOLEAN, UUID);

CREATE FUNCTION esmdd.list_job_fair_events(
  p_include_past BOOLEAN DEFAULT false,
  p_job_fair_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  status_remarks TEXT,
  company_count INT,
  opening_count INT,
  my_registration_status TEXT,
  my_participant_id UUID,
  my_participant_status TEXT,
  created_at TIMESTAMPTZ,
  image_paths TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH fairs AS (
    SELECT f.*, esmdd.job_fair_live_status(f) AS live_status
    FROM esmdd.job_fairs f
    WHERE p_job_fair_id IS NULL OR f.id = p_job_fair_id
  ),
  me_applicant AS (
    SELECT a.id FROM applicants.applicants a WHERE a.profile_id = auth.uid()
  ),
  me_establishment AS (
    SELECT e.id
    FROM employers.establishments e
    WHERE e.company_id IS NOT NULL AND employers.is_company_member(e.company_id)
  )
  SELECT
    f.id,
    f.title::TEXT,
    f.description::TEXT,
    f.location::TEXT,
    f.latitude::DOUBLE PRECISION,
    f.longitude::DOUBLE PRECISION,
    f.start_date::TEXT,
    f.end_date::TEXT,
    f.live_status::TEXT,
    f.status_remarks::TEXT,
    (
      SELECT count(*)::INT FROM esmdd.job_fair_participants p
      WHERE p.job_fair_id = f.id AND p.status IN ('Confirmed', 'Attended')
    ),
    (
      SELECT coalesce(sum(coalesce(v.vacancy_count, 1)), 0)::INT
      FROM esmdd.job_fair_vacancies v
      JOIN esmdd.job_fair_participants p ON p.id = v.participant_id
      WHERE v.job_fair_id = f.id AND v.status = 'open' AND p.status IN ('Confirmed', 'Attended')
    ),
    (
      SELECT j.status::TEXT FROM esmdd.job_fair_applicants j
      WHERE j.job_fair_id = f.id AND j.applicant_id IN (SELECT ma.id FROM me_applicant ma)
      LIMIT 1
    ),
    mp.id,
    mp.status::TEXT,
    f.created_at::TIMESTAMPTZ,
    coalesce(
      (
        SELECT array_agg(att.path::TEXT ORDER BY att.created_at, att.id)
        FROM esmdd.job_fair_attachments att
        WHERE att.job_fair_id = f.id AND att.mime_type LIKE 'image/%'
      ),
      ARRAY[]::TEXT[]
    )
  FROM fairs f
  LEFT JOIN LATERAL (
    SELECT p.id, p.status FROM esmdd.job_fair_participants p
    WHERE p.job_fair_id = f.id AND p.establishment_id IN (SELECT me.id FROM me_establishment me)
    LIMIT 1
  ) mp ON true
  WHERE p_job_fair_id IS NOT NULL
     OR (NOT p_include_past AND f.live_status IN ('Upcoming', 'Ongoing'))
     OR (p_include_past AND f.live_status IN ('Completed', 'Cancelled'))
  ORDER BY
    CASE WHEN p_include_past THEN NULL ELSE f.created_at END DESC,
    CASE WHEN p_include_past THEN f.start_date END DESC
  LIMIT CASE WHEN p_include_past THEN 50 ELSE 200 END;
$$;

REVOKE ALL ON FUNCTION esmdd.list_job_fair_events(BOOLEAN, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.list_job_fair_events(BOOLEAN, UUID) TO authenticated;

-- The feed reads each fair's images
CREATE INDEX IF NOT EXISTS idx_job_fair_attachments_fair_created
  ON esmdd.job_fair_attachments (job_fair_id, created_at);

COMMIT;
