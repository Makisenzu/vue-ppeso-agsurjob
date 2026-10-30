-- =============================================================================
-- Migration: 090_job_vacancy_delete_cascade.sql
-- Purpose:   Deleting a job posting deletes everything that belongs to it, applicants included.
--            Before this, the delete failed ("A posting with applicants or hires cannot be deleted"):
--              - 087's guard trigger refused a vacancy with applications
--              - 089's job_vacancy_applications.stage_id (ON DELETE RESTRICT) refused the cascade
--                through job_vacancy_stages
--            Still refused, on purpose: a vacancy PESO listed in a job fair and recorded hires against
--            (hots.job_fair_vacancy_id, NOT NULL, ON DELETE RESTRICT since 039). HOTS are government records
--            PESO reports on; the employer closes such a posting instead.
--
--            1. The guard is replaced by a notification: each applicant hears that the posting was
--               removed and their application closed (BACKEND.md §17). Their application and its
--               documents then cascade away (087).
--            2. stage_id is checked at commit (DEFERRABLE), after the cascade removed both the steps
--               and the applications at them. Removing a step that still holds applicants still fails.
--            3. Applicant files: the document rows go with the vacancy, but the files sit in each
--               applicant's folder of the private documents bucket, which the employer can't touch.
--               Deleting a document row someone else uploaded leaves a cleanup ticket
--               (esmdd.job_application_file_cleanups) that lets the person who deleted it remove that
--               one file; the app removes the files right after the delete and closes the tickets.
--
-- Notified events (BACKEND.md §17, .agents/DATABASE.md §9):
--   | Event                                       | Recipient           | type               |
--   |---------------------------------------------|---------------------|--------------------|
--   | A job posting with applications is deleted  | each applicant      | application_status |
--
-- Personal data (PRIVACY.md): the cleanup tickets hold storage paths only (<uploader uid>/<file>), no
-- names; they are deleted once the file is removed.
-- Schema:    esmdd, system, storage. Depends on 087, 089. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Notify applicants instead of refusing the delete ────────────────────

DROP TRIGGER IF EXISTS trg_job_vacancies_guard_applications ON esmdd.job_vacancies;
DROP FUNCTION IF EXISTS esmdd.guard_job_vacancy_with_applications();

CREATE OR REPLACE FUNCTION system.notify_job_vacancy_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company TEXT;
  v_job TEXT;
  v_applicant UUID;
BEGIN
  SELECT coalesce(nullif(btrim(c.company_name), ''), e.business_name)
  INTO v_company
  FROM employers.establishments e
  LEFT JOIN employers.companies c ON c.id = e.company_id
  WHERE e.id = OLD.establishment_id;

  v_job := coalesce(OLD.position_title, 'A job') || CASE WHEN v_company IS NULL THEN '' ELSE ' at ' || v_company END;

  FOR v_applicant IN
    SELECT ja.applicant_id FROM esmdd.job_vacancy_applications ja WHERE ja.job_vacancy_id = OLD.id
  LOOP
    PERFORM system.notify(
      system.applicant_profile_id(v_applicant),
      'application_status',
      'Job Posting Removed',
      'The employer removed the ' || v_job || ' posting, so your application to it was closed.'
    );
  END LOOP;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION system.notify_job_vacancy_removed() FROM PUBLIC, anon, authenticated;

-- BEFORE DELETE: the applications are still there to read
DROP TRIGGER IF EXISTS trg_job_vacancies_notify_removed ON esmdd.job_vacancies;
CREATE TRIGGER trg_job_vacancies_notify_removed
  BEFORE DELETE ON esmdd.job_vacancies
  FOR EACH ROW
  EXECUTE FUNCTION system.notify_job_vacancy_removed();


-- ─── 2. Hiring step link checked at commit ──────────────────────────────────

ALTER TABLE esmdd.job_vacancy_applications DROP CONSTRAINT IF EXISTS job_vacancy_applications_stage_id_fkey;
ALTER TABLE esmdd.job_vacancy_applications
  ADD CONSTRAINT job_vacancy_applications_stage_id_fkey
  FOREIGN KEY (stage_id) REFERENCES esmdd.job_vacancy_stages (id)
  ON DELETE NO ACTION
  DEFERRABLE INITIALLY DEFERRED;


-- ─── 3. Applicant files: cleanup tickets ────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_application_file_cleanups (
  path          TEXT         PRIMARY KEY,
  requested_by  UUID         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE esmdd.job_application_file_cleanups IS
  'Files of deleted job application documents that the person who deleted them may still remove from storage (090).';

-- No client policies: only the trigger and the functions below (SECURITY DEFINER) touch it
ALTER TABLE esmdd.job_application_file_cleanups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON esmdd.job_application_file_cleanups FROM anon, authenticated;
GRANT ALL ON esmdd.job_application_file_cleanups TO service_role;

-- A document row deleted by someone other than its uploader (the employer deleting the posting, or
-- an admin): its file may now be removed by that person. Applicants remove their own files anyway (034).
CREATE OR REPLACE FUNCTION esmdd.queue_job_application_file_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.uploaded_by IS DISTINCT FROM auth.uid() THEN
    INSERT INTO esmdd.job_application_file_cleanups (path, requested_by)
    VALUES (OLD.path, auth.uid())
    ON CONFLICT (path) DO UPDATE SET requested_by = EXCLUDED.requested_by, created_at = now();
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.queue_job_application_file_cleanup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancy_application_documents_cleanup ON esmdd.job_vacancy_application_documents;
CREATE TRIGGER trg_job_vacancy_application_documents_cleanup
  AFTER DELETE ON esmdd.job_vacancy_application_documents
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.queue_job_application_file_cleanup();

CREATE OR REPLACE FUNCTION esmdd.can_cleanup_job_application_file(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM esmdd.job_application_file_cleanups f
    WHERE f.path = p_path AND f.requested_by = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION esmdd.can_cleanup_job_application_file(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.can_cleanup_job_application_file(TEXT) TO authenticated;

DROP POLICY IF EXISTS documents_job_application_cleanup_delete ON storage.objects;
CREATE POLICY documents_job_application_cleanup_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (SELECT esmdd.can_cleanup_job_application_file(name)));

-- Closes the caller's tickets once their files are removed
CREATE OR REPLACE FUNCTION esmdd.finish_job_application_file_cleanup(p_paths TEXT[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM esmdd.job_application_file_cleanups
  WHERE requested_by = (SELECT auth.uid()) AND path = ANY (p_paths);
$$;

REVOKE ALL ON FUNCTION esmdd.finish_job_application_file_cleanup(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.finish_job_application_file_cleanup(TEXT[]) TO authenticated;

COMMIT;
