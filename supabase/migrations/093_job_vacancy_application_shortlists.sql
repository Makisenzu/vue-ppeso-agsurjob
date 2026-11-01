-- =============================================================================
-- Migration: 093_job_vacancy_application_shortlists.sql
-- Purpose:   The employer can shortlist applicants of a vacancy: a private mark for the ones they want
--            to look at again, apart from the hiring steps.
--
--              esmdd.job_vacancy_applications ──< esmdd.job_vacancy_application_shortlists (0 or 1)
--
--            1. esmdd.job_vacancy_application_shortlists: one row per shortlisted application, shared by
--               the company (owner and members see and change the same shortlist). A table of its own,
--               not a column on the application, because applicants read their own application row
--               (087 applicant_own_select) and must not see the employer's shortlist.
--               applicant_id and job_vacancy_id are copied from the application by a trigger, for the
--               access check, the audit trail and the erasure cascade.
--            2. RLS: only the vacancy's reviewers (esmdd.can_review_job_vacancy, 087) read, add and remove.
--            3. esmdd.search_job_vacancy_applications (092) also returns is_shortlisted and takes
--               p_shortlisted to list only the shortlisted ones.
--
-- Access Matrix:
--   Resource                              | admin / provincial_peso | company owner / members (own vacancy) | applicant
--   --------------------------------------|-------------------------|---------------------------------------|----------
--   job_vacancy_application_shortlists    | read, add, remove       | read, add, remove                     | none
--
-- Notified events: none. Shortlisting is the employer's internal note; the applicant only hears about
-- hiring step changes (089).
--
-- Personal data (PRIVACY.md): an employer's mark on someone's application. Audited like the application
-- (§5.1); deleted with the application or the applicant (ON DELETE CASCADE, so erasure follows 069 / 073).
-- Depends on 087, 089, 092. After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Shortlist ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_application_shortlists (
  application_id  UUID         PRIMARY KEY REFERENCES esmdd.job_vacancy_applications (id) ON DELETE CASCADE,
  job_vacancy_id  UUID         NOT NULL REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  applicant_id    UUID         NOT NULL REFERENCES applicants.applicants (id) ON DELETE CASCADE,
  shortlisted_by  UUID         REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE esmdd.job_vacancy_application_shortlists IS
  'Applications the employer shortlisted; private to the vacancy''s reviewers (093).';

CREATE INDEX IF NOT EXISTS idx_job_vacancy_application_shortlists_vacancy
  ON esmdd.job_vacancy_application_shortlists (job_vacancy_id);
CREATE INDEX IF NOT EXISTS idx_job_vacancy_application_shortlists_applicant
  ON esmdd.job_vacancy_application_shortlists (applicant_id);

-- The vacancy and applicant always come from the application, and the one shortlisting is the caller
CREATE OR REPLACE FUNCTION esmdd.fill_job_vacancy_application_shortlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT ja.job_vacancy_id, ja.applicant_id
  INTO NEW.job_vacancy_id, NEW.applicant_id
  FROM esmdd.job_vacancy_applications ja
  WHERE ja.id = NEW.application_id;

  IF NEW.job_vacancy_id IS NULL THEN
    RAISE EXCEPTION 'This application could not be found' USING ERRCODE = 'P0002';
  END IF;

  NEW.shortlisted_by := auth.uid();
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.fill_job_vacancy_application_shortlist() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancy_application_shortlists_fill ON esmdd.job_vacancy_application_shortlists;
CREATE TRIGGER trg_job_vacancy_application_shortlists_fill
  BEFORE INSERT ON esmdd.job_vacancy_application_shortlists
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.fill_job_vacancy_application_shortlist();

-- Employer marks on someone's application are audited (PRIVACY.md §5.1)
DROP TRIGGER IF EXISTS trg_audit_personal_data ON esmdd.job_vacancy_application_shortlists;
CREATE TRIGGER trg_audit_personal_data
  AFTER INSERT OR DELETE ON esmdd.job_vacancy_application_shortlists
  FOR EACH ROW EXECUTE FUNCTION system.audit_personal_data_change('applicant_id', 'applicant');


-- ─── 2. RLS: the vacancy's reviewers only ───────────────────────────────────

ALTER TABLE esmdd.job_vacancy_application_shortlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviewer_select ON esmdd.job_vacancy_application_shortlists;
CREATE POLICY reviewer_select ON esmdd.job_vacancy_application_shortlists
FOR SELECT TO authenticated
USING ((SELECT esmdd.can_review_job_vacancy(job_vacancy_id)));

-- Checked after the fill trigger, so job_vacancy_id is the application's own
DROP POLICY IF EXISTS reviewer_insert ON esmdd.job_vacancy_application_shortlists;
CREATE POLICY reviewer_insert ON esmdd.job_vacancy_application_shortlists
FOR INSERT TO authenticated
WITH CHECK ((SELECT esmdd.can_review_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS reviewer_delete ON esmdd.job_vacancy_application_shortlists;
CREATE POLICY reviewer_delete ON esmdd.job_vacancy_application_shortlists
FOR DELETE TO authenticated
USING ((SELECT esmdd.can_review_job_vacancy(job_vacancy_id)));

REVOKE ALL ON esmdd.job_vacancy_application_shortlists FROM anon;
GRANT SELECT, INSERT, DELETE ON esmdd.job_vacancy_application_shortlists TO authenticated;
GRANT ALL ON esmdd.job_vacancy_application_shortlists TO service_role;


-- ─── 3. Applicants list: is_shortlisted and the shortlisted-only filter ─────

DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, INT, INT);
DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT);

CREATE FUNCTION esmdd.search_job_vacancy_applications(
  p_job_vacancy_id UUID,
  p_search TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_shortlisted BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  municipality TEXT,
  avatar_path TEXT,
  course TEXT,
  is_shortlisted BOOLEAN,
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
    -- Latest profile picture, as the applicant's own avatar shows it (092)
    (
      SELECT pm.path
      FROM core.profile_media pm
      WHERE pm.profile_id = a.profile_id
      ORDER BY pm.created_at DESC, pm.id
      LIMIT 1
    ),
    -- Latest education entry's course, else its level (092)
    CASE jsonb_typeof(a.educational_background::jsonb)
      WHEN 'array' THEN coalesce(
        nullif(btrim(a.educational_background::jsonb -> -1 ->> 'course'), ''),
        nullif(btrim(a.educational_background::jsonb -> -1 ->> 'level'), '')
      )
      WHEN 'object' THEN nullif(btrim(a.educational_background::jsonb ->> 'course'), '')
    END,
    sl.application_id IS NOT NULL,
    ja.stage,
    ja.stage_id,
    st.stage_name,
    ja.created_at,
    ja.updated_at,
    count(*) OVER ()
  FROM esmdd.job_vacancy_applications ja
  JOIN applicants.applicants a ON a.id = ja.applicant_id
  LEFT JOIN esmdd.job_vacancy_stages st ON st.id = ja.stage_id
  LEFT JOIN esmdd.job_vacancy_application_shortlists sl ON sl.application_id = ja.id
  WHERE ja.job_vacancy_id = p_job_vacancy_id
    AND (nullif(btrim(p_stage), '') IS NULL OR ja.stage = btrim(p_stage))
    -- Rejected applications keep their step but are listed under Not selected only
    AND (p_stage_id IS NULL OR (ja.stage_id = p_stage_id AND ja.stage <> 'rejected'))
    AND (NOT coalesce(p_shortlisted, FALSE) OR sl.application_id IS NOT NULL)
    AND (
      nullif(btrim(p_search), '') IS NULL
      OR concat_ws(' ', a.first_name, a.middle_name, a.surname, a.suffix) ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY ja.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT) TO authenticated;

COMMIT;
