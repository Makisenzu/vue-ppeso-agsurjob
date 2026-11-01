-- =============================================================================
-- Migration: 101_job_vacancy_application_avatar.sql
-- Purpose:   The employer's review page shows the applicant's profile picture however it is opened.
--            Until now it borrowed the picture from the applicants list (092), so opening or reloading
--            the review page directly showed initials only.
--
--            esmdd.get_job_vacancy_application(): same as 089 (same checks, still logs the view), plus
--            avatar_path: the applicant's latest profile picture, picked the same way as the list (092).
--
-- Access: unchanged (the vacancy's reviewers only). Personal data: the same picture the list already
-- shows to these reviewers; nothing new is exposed. Notified events: none.
-- Depends on 087, 089, 092. After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION esmdd.get_job_vacancy_application(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_application esmdd.job_vacancy_applications%ROWTYPE;
  v_applicant applicants.applicants%ROWTYPE;
  v_avatar_path TEXT;
BEGIN
  SELECT * INTO v_application FROM esmdd.job_vacancy_applications WHERE id = p_application_id;
  IF NOT FOUND OR NOT esmdd.can_review_job_vacancy(v_application.job_vacancy_id) THEN
    RAISE EXCEPTION 'This application could not be found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_applicant FROM applicants.applicants WHERE id = v_application.applicant_id;

  -- Latest profile picture, as the applicants list picks it (092)
  SELECT pm.path INTO v_avatar_path
  FROM core.profile_media pm
  WHERE pm.profile_id = v_applicant.profile_id
  ORDER BY pm.created_at DESC, pm.id
  LIMIT 1;

  PERFORM system.write_audit_log(
    'VIEW',
    'applicants.applicants',
    v_applicant.id::TEXT,
    v_applicant.profile_id,
    NULL,
    jsonb_build_object('via', 'esmdd.job_vacancy_applications', 'application_id', v_application.id)
  );

  RETURN jsonb_build_object(
    'id', v_application.id,
    'job_vacancy_id', v_application.job_vacancy_id,
    'stage', v_application.stage,
    'stage_id', v_application.stage_id,
    'status_remarks', v_application.status_remarks,
    'created_at', v_application.created_at,
    'updated_at', v_application.updated_at,
    'avatar_path', v_avatar_path,
    'applicant', jsonb_build_object(
      'first_name', v_applicant.first_name,
      'middle_name', v_applicant.middle_name,
      'surname', v_applicant.surname,
      'suffix', v_applicant.suffix,
      'sex', v_applicant.sex,
      'date_of_birth', v_applicant.date_of_birth,
      'contact_numbers', v_applicant.contact_numbers,
      'email', v_applicant.email,
      'address', v_applicant.address,
      'educational_background', v_applicant.educational_background
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION esmdd.get_job_vacancy_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.get_job_vacancy_application(UUID) TO authenticated;

COMMIT;
