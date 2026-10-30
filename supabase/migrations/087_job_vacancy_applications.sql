-- =============================================================================
-- Migration: 087_job_vacancy_applications.sql
-- Purpose:   Applicants apply to an employer's job vacancy; the employer reviews the applicants of
--            each vacancy. The application follows the GIP flow (BACKEND.md §18): the NSRP form is
--            generated, the resume comes from the applicant's profile documents.
--
--              esmdd.job_vacancies ──< esmdd.job_vacancy_applications ──< esmdd.job_vacancy_application_documents
--              applicants.applicants ──<┘
--
--              1. esmdd.job_vacancy_applications: one application per applicant per vacancy, with its
--                 stage (applied → screening → interview → offered → hired, or rejected)
--              2. esmdd.job_vacancy_application_documents: one current file per required document
--              3. RLS: applicants read their own and upload while the stage is still 'applied'; the
--                 vacancy's reviewers (esmdd.can_review_job_vacancy: whoever may manage it per 084 —
--                 company owner, admin, Provincial PESO — and the company's members, 081) read the
--                 applications and their files and move the stage
--              4. RPCs:
--                   esmdd.search_open_job_vacancies()         open vacancies of verified companies (applicants)
--                   esmdd.apply_to_job_vacancy()              creates the application, notifies the company owner
--                   esmdd.search_job_vacancy_applications()   one page of a vacancy's applicants (employer)
--                   esmdd.job_vacancy_application_stats()     applicants per vacancy and stage, counted in SQL
--                   esmdd.get_job_vacancy_application()       one applicant's summary; logs the view (PRIVACY.md §5.2)
--              5. A vacancy with applicants can't be deleted by its company (close it instead)
--
-- Why new tables: jobs.job_applications (legacy) keys applicants and postings by int4, while
-- applicants.applicants and esmdd.job_vacancies use uuid (see 034, "Not owner-scoped yet"). Those
-- tables are left untouched; nothing in the app reads or writes them.
--
-- Access Matrix:
--   Resource                            | admin / provincial_peso | company owner / members (own vacancy) | applicant
--   ------------------------------------|-------------------------|---------------------------------------|--------------------------------
--   job_vacancy_applications            | read, update stage      | read, update stage                    | read own (created by the RPC)
--   job_vacancy_application_documents   | read                    | read                                  | read own; write own while 'applied'
--   documents bucket (those files)      | read                    | read (signed URL)                     | own folder (034)
--
-- Notified events (BACKEND.md §17, .agents/DATABASE.md §9):
--   | Event                                   | Recipient              | type               |
--   |-----------------------------------------|------------------------|--------------------|
--   | An applicant applies to a vacancy       | the company owner      | application_status |
--   | The stage of an application changes     | the applicant          | application_status |
--
-- Personal data (PRIVACY.md): the application links an applicant to a vacancy and carries their
-- files. Purpose and recipient are already in the Privacy Notice ("Employers, only when you apply
-- for ... their vacancy"), so no notice change. Audit trigger on the applications table; export and
-- erasure follow the applicant_id foreign key (073 / 069). Retention: not auto-purged yet; the DPO sets
-- the period (PRIVACY.md §7).
--
-- Storage path convention (same as 060): documents/<uploader auth.uid()>/<file>
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Applications ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_applications (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_vacancy_id  UUID         NOT NULL REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  applicant_id    UUID         NOT NULL REFERENCES applicants.applicants (id) ON DELETE CASCADE,
  stage           TEXT         NOT NULL DEFAULT 'applied'
                               CHECK (stage IN ('applied', 'screening', 'interview', 'offered', 'hired', 'rejected')),
  -- Why the employer rejected the application (BACKEND.md §17.8); shown to the applicant
  status_remarks  TEXT         CHECK (status_remarks IS NULL OR char_length(status_remarks) <= 1000),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT job_vacancy_applications_once UNIQUE (job_vacancy_id, applicant_id),
  CONSTRAINT job_vacancy_applications_rejected_remarks
    CHECK (stage <> 'rejected' OR nullif(btrim(status_remarks), '') IS NOT NULL)
);

COMMENT ON TABLE esmdd.job_vacancy_applications IS
  'An applicant''s application to an employer''s job vacancy (087).';

-- The employer's list: one vacancy's applicants by stage, newest first
CREATE INDEX IF NOT EXISTS idx_job_vacancy_applications_vacancy
  ON esmdd.job_vacancy_applications (job_vacancy_id, stage, created_at DESC);
-- The applicant's own applications (Application Status)
CREATE INDEX IF NOT EXISTS idx_job_vacancy_applications_applicant
  ON esmdd.job_vacancy_applications (applicant_id, created_at DESC);

CREATE OR REPLACE FUNCTION esmdd.set_job_vacancy_application_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_vacancy_applications_updated_at ON esmdd.job_vacancy_applications;
CREATE TRIGGER trg_job_vacancy_applications_updated_at
  BEFORE UPDATE ON esmdd.job_vacancy_applications
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_job_vacancy_application_updated_at();

-- The employer only moves the stage; who applied to what, and when, stays as it was
CREATE OR REPLACE FUNCTION esmdd.guard_job_vacancy_application_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.job_vacancy_id := OLD.job_vacancy_id;
  NEW.applicant_id := OLD.applicant_id;
  NEW.created_at := OLD.created_at;
  -- Remarks belong to a rejection only
  IF NEW.stage <> 'rejected' THEN
    NEW.status_remarks := NULL;
  ELSE
    NEW.status_remarks := nullif(btrim(NEW.status_remarks), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_vacancy_applications_guard_review ON esmdd.job_vacancy_applications;
CREATE TRIGGER trg_job_vacancy_applications_guard_review
  BEFORE UPDATE ON esmdd.job_vacancy_applications
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.guard_job_vacancy_application_review();

-- Employer changes to someone's application are audited (PRIVACY.md §5.1)
DROP TRIGGER IF EXISTS trg_audit_personal_data ON esmdd.job_vacancy_applications;
CREATE TRIGGER trg_audit_personal_data
  AFTER INSERT OR UPDATE OR DELETE ON esmdd.job_vacancy_applications
  FOR EACH ROW EXECUTE FUNCTION system.audit_personal_data_change('applicant_id', 'applicant');


-- ─── 2. Documents ───────────────────────────────────────────────────────────
-- Names must match JOB_APPLICATION_DOCUMENT_OPTIONS in src/types/common/jobVacancyApplication.ts

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_application_documents (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID         NOT NULL REFERENCES esmdd.job_vacancy_applications (id) ON DELETE CASCADE,
  document_name   TEXT         NOT NULL CHECK (document_name IN ('NSRP Form', 'Resume', 'Application Letter')),
  file_name       TEXT         NOT NULL CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 200),
  path            TEXT         NOT NULL,
  mime_type       TEXT,
  size            BIGINT       CHECK (size IS NULL OR size BETWEEN 0 AND 10485760),
  uploaded_by     UUID         REFERENCES auth.users (id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One current file per document; a new upload replaces the row
  CONSTRAINT job_vacancy_application_documents_name_key UNIQUE (application_id, document_name)
);

COMMENT ON TABLE esmdd.job_vacancy_application_documents IS
  'Soft copies (documents bucket) of a job application''s requirements, uploaded by the applicant (087).';

-- The storage policy below looks files up by path
CREATE INDEX IF NOT EXISTS idx_job_vacancy_application_documents_path
  ON esmdd.job_vacancy_application_documents (path);

DROP TRIGGER IF EXISTS trg_job_vacancy_application_documents_updated_at ON esmdd.job_vacancy_application_documents;
CREATE TRIGGER trg_job_vacancy_application_documents_updated_at
  BEFORE UPDATE ON esmdd.job_vacancy_application_documents
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_job_vacancy_application_updated_at();


-- ─── 3. Access helpers ──────────────────────────────────────────────────────

-- Who reviews a vacancy's applicants: whoever may manage the vacancy (084), plus the members of its
-- company (081), who help the owner with hiring. Only the owner still edits the vacancy itself.
CREATE OR REPLACE FUNCTION esmdd.can_review_job_vacancy(p_job_vacancy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT esmdd.can_manage_job_vacancy(p_job_vacancy_id)
    OR EXISTS (
      SELECT 1
      FROM esmdd.job_vacancies v
      JOIN employers.establishments e ON e.id = v.establishment_id
      WHERE v.id = p_job_vacancy_id
        AND e.company_id IS NOT NULL
        AND employers.is_company_member(e.company_id)
    );
$$;

REVOKE ALL ON FUNCTION esmdd.can_review_job_vacancy(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.can_review_job_vacancy(UUID) TO authenticated;

-- The applicant may still change their files: their own application, not yet reviewed
CREATE OR REPLACE FUNCTION esmdd.can_edit_own_job_vacancy_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM esmdd.job_vacancy_applications ja
    JOIN applicants.applicants a ON a.id = ja.applicant_id
    WHERE ja.id = p_application_id
      AND ja.stage = 'applied'
      AND a.profile_id = (SELECT auth.uid())
  );
$$;

-- Own application, or one of a vacancy the caller may manage
CREATE OR REPLACE FUNCTION esmdd.can_read_job_vacancy_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM esmdd.job_vacancy_applications ja
    WHERE ja.id = p_application_id
      AND (applicants.owns_applicant(ja.applicant_id) OR esmdd.can_review_job_vacancy(ja.job_vacancy_id))
  );
$$;

REVOKE ALL ON FUNCTION esmdd.can_edit_own_job_vacancy_application(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.can_read_job_vacancy_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.can_edit_own_job_vacancy_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.can_read_job_vacancy_application(UUID) TO authenticated;


-- ─── 4. Row Level Security ──────────────────────────────────────────────────
-- No INSERT / DELETE policy on applications: apply_to_job_vacancy() creates them, and they stay
-- as the applicant's record (erasure removes them with the applicant, 069).

ALTER TABLE esmdd.job_vacancy_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applicant_own_select ON esmdd.job_vacancy_applications;
CREATE POLICY applicant_own_select ON esmdd.job_vacancy_applications
FOR SELECT TO authenticated
USING ((SELECT applicants.owns_applicant(applicant_id)));

DROP POLICY IF EXISTS manager_select ON esmdd.job_vacancy_applications;
CREATE POLICY manager_select ON esmdd.job_vacancy_applications
FOR SELECT TO authenticated
USING ((SELECT esmdd.can_review_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_update ON esmdd.job_vacancy_applications;
CREATE POLICY manager_update ON esmdd.job_vacancy_applications
FOR UPDATE TO authenticated
USING ((SELECT esmdd.can_review_job_vacancy(job_vacancy_id)))
WITH CHECK ((SELECT esmdd.can_review_job_vacancy(job_vacancy_id)));

REVOKE ALL ON esmdd.job_vacancy_applications FROM anon;
GRANT SELECT, UPDATE ON esmdd.job_vacancy_applications TO authenticated;
GRANT ALL ON esmdd.job_vacancy_applications TO service_role;

ALTER TABLE esmdd.job_vacancy_application_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reader_select ON esmdd.job_vacancy_application_documents;
CREATE POLICY reader_select ON esmdd.job_vacancy_application_documents
FOR SELECT TO authenticated
USING ((SELECT esmdd.can_read_job_vacancy_application(application_id)));

-- Applicants upload into their own storage folder, only while the application is still editable
DROP POLICY IF EXISTS applicant_own_write ON esmdd.job_vacancy_application_documents;
CREATE POLICY applicant_own_write ON esmdd.job_vacancy_application_documents
FOR ALL TO authenticated
USING ((SELECT esmdd.can_edit_own_job_vacancy_application(application_id)))
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND split_part(path, '/', 1) = (SELECT auth.uid())::TEXT
  AND (SELECT esmdd.can_edit_own_job_vacancy_application(application_id))
);

REVOKE ALL ON esmdd.job_vacancy_application_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_vacancy_application_documents TO authenticated;
GRANT ALL ON esmdd.job_vacancy_application_documents TO service_role;

-- The employer opens the applicant's files through signed URLs. The subquery runs under the
-- documents table's RLS, so only files of applications the caller may read match.
DROP POLICY IF EXISTS documents_job_application_select ON storage.objects;
CREATE POLICY documents_job_application_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (SELECT 1 FROM esmdd.job_vacancy_application_documents d WHERE d.path = objects.name)
);


-- ─── 5. A vacancy with applicants stays (close it instead) ──────────────────
-- Deleting it would delete the applicants' applications. Admin (account erasure, 069) and system
-- jobs still can; the cascade then removes the applications.

CREATE OR REPLACE FUNCTION esmdd.guard_job_vacancy_with_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR core.has_role('admin') THEN
    RETURN OLD;
  END IF;
  IF EXISTS (SELECT 1 FROM esmdd.job_vacancy_applications WHERE job_vacancy_id = OLD.id) THEN
    RAISE EXCEPTION 'A posting with applicants cannot be deleted. Close it instead.' USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.guard_job_vacancy_with_applications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancies_guard_applications ON esmdd.job_vacancies;
CREATE TRIGGER trg_job_vacancies_guard_applications
  BEFORE DELETE ON esmdd.job_vacancies
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.guard_job_vacancy_with_applications();


-- ─── 6. RPC: open vacancies (applicant's Vacancies page) ────────────────────
-- SECURITY DEFINER for the company name (applicants can't read establishments / companies).
-- Lists open, current vacancies of PESO-verified companies; p_job_vacancy_id returns one vacancy,
-- also after it closed when the caller applied to it. total_count is the count before paging.

CREATE INDEX IF NOT EXISTS idx_job_vacancies_open_posting
  ON esmdd.job_vacancies (posting_date DESC NULLS LAST, created_at DESC)
  WHERE status = 'open';

DROP FUNCTION IF EXISTS esmdd.search_open_job_vacancies(TEXT, UUID, INT, INT);

CREATE FUNCTION esmdd.search_open_job_vacancies(
  p_search TEXT DEFAULT NULL,
  p_job_vacancy_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 12,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  position_title TEXT,
  company_name TEXT,
  nature_of_work TEXT,
  place_of_work TEXT,
  salary TEXT,
  vacancy_count INT,
  posting_date DATE,
  valid_until DATE,
  status TEXT,
  my_application_id UUID,
  my_stage TEXT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT a.id FROM applicants.applicants a WHERE a.profile_id = (SELECT auth.uid()) LIMIT 1
  ),
  today AS (
    SELECT (now() AT TIME ZONE 'Asia/Manila')::DATE AS d
  )
  SELECT
    v.id,
    v.position_title::TEXT,
    coalesce(nullif(btrim(c.company_name), ''), e.business_name)::TEXT,
    v.nature_of_work::TEXT,
    v.place_of_work::TEXT,
    v.salary::TEXT,
    v.vacancy_count::INT,
    v.posting_date::DATE,
    v.valid_until::DATE,
    coalesce(v.status::TEXT, 'open'),
    ja.id,
    ja.stage,
    count(*) OVER ()
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  JOIN employers.companies c ON c.id = e.company_id
  CROSS JOIN today
  LEFT JOIN esmdd.job_vacancy_applications ja
    ON ja.job_vacancy_id = v.id AND ja.applicant_id = (SELECT me.id FROM me)
  WHERE (
      p_job_vacancy_id IS NULL
      AND coalesce(v.status::TEXT, 'open') = 'open'
      AND c.verification_status::TEXT = 'approved'
      AND (v.posting_date IS NULL OR v.posting_date::DATE <= today.d)
      AND (v.valid_until IS NULL OR v.valid_until::DATE >= today.d)
      AND (
        nullif(btrim(p_search), '') IS NULL
        OR v.position_title ILIKE '%' || btrim(p_search) || '%'
        OR c.company_name ILIKE '%' || btrim(p_search) || '%'
        OR v.place_of_work ILIKE '%' || btrim(p_search) || '%'
      )
    )
    OR (
      v.id = p_job_vacancy_id
      AND (
        (coalesce(v.status::TEXT, 'open') = 'open' AND c.verification_status::TEXT = 'approved')
        OR ja.id IS NOT NULL
      )
    )
  ORDER BY v.posting_date DESC NULLS LAST, v.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 12), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION esmdd.search_open_job_vacancies(TEXT, UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.search_open_job_vacancies(TEXT, UUID, INT, INT) TO authenticated;


-- ─── 7. RPC: apply to a vacancy ─────────────────────────────────────────────
-- Returns the existing application when the applicant already applied. The applicant isn't
-- notified (system.notify skips the acting user); the page confirms with a toast.

DROP FUNCTION IF EXISTS esmdd.apply_to_job_vacancy(UUID);

CREATE FUNCTION esmdd.apply_to_job_vacancy(p_job_vacancy_id UUID)
RETURNS esmdd.job_vacancy_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applicant applicants.applicants%ROWTYPE;
  v_row esmdd.job_vacancy_applications%ROWTYPE;
  v_position TEXT;
  v_owner UUID;
  v_today DATE := (now() AT TIME ZONE 'Asia/Manila')::DATE;
  v_name TEXT;
BEGIN
  IF NOT core.has_role('applicant') THEN
    RAISE EXCEPTION 'Only applicants can apply to job vacancies' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_applicant FROM applicants.applicants WHERE profile_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complete your NSRP profile before applying' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_row FROM esmdd.job_vacancy_applications
  WHERE job_vacancy_id = p_job_vacancy_id AND applicant_id = v_applicant.id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  -- Lock the vacancy so it can't close or be deleted halfway through
  SELECT v.position_title, c.profile_id
  INTO v_position, v_owner
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  JOIN employers.companies c ON c.id = e.company_id
  WHERE v.id = p_job_vacancy_id
    AND coalesce(v.status::TEXT, 'open') = 'open'
    AND c.verification_status::TEXT = 'approved'
    AND (v.posting_date IS NULL OR v.posting_date::DATE <= v_today)
    AND (v.valid_until IS NULL OR v.valid_until::DATE >= v_today)
  FOR SHARE OF v;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This vacancy is no longer accepting applications' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO esmdd.job_vacancy_applications (job_vacancy_id, applicant_id)
  VALUES (p_job_vacancy_id, v_applicant.id)
  RETURNING * INTO v_row;

  v_name := coalesce(nullif(btrim(concat_ws(' ', v_applicant.first_name, v_applicant.surname)), ''), 'An applicant');
  PERFORM system.notify(
    v_owner,
    'application_status',
    'New Applicant',
    v_name || ' applied for ' || v_position || '. Review their application in Job Applicants.'
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.apply_to_job_vacancy(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.apply_to_job_vacancy(UUID) TO authenticated;


-- ─── 8. RPC: a vacancy's applicants (employer) ──────────────────────────────
-- SECURITY DEFINER for the names (employers can't read applicants.applicants); only summary
-- columns. Searches by name, filters by stage, pages in SQL (BACKEND.md §19).

DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, INT, INT);

CREATE FUNCTION esmdd.search_job_vacancy_applications(
  p_job_vacancy_id UUID,
  p_search TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  municipality TEXT,
  stage TEXT,
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
    ja.stage,
    ja.created_at,
    ja.updated_at,
    count(*) OVER ()
  FROM esmdd.job_vacancy_applications ja
  JOIN applicants.applicants a ON a.id = ja.applicant_id
  WHERE ja.job_vacancy_id = p_job_vacancy_id
    AND (nullif(btrim(p_stage), '') IS NULL OR ja.stage = btrim(p_stage))
    AND (
      nullif(btrim(p_search), '') IS NULL
      OR concat_ws(' ', a.first_name, a.middle_name, a.surname, a.suffix) ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY ja.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, INT, INT) TO authenticated;


-- ─── 9. RPC: applicants per vacancy and stage ───────────────────────────────
-- For the vacancy cards (one page of postings) and the stage filter of one vacancy.
-- Vacancies the caller may not manage are left out.

DROP FUNCTION IF EXISTS esmdd.job_vacancy_application_stats(UUID[]);

CREATE FUNCTION esmdd.job_vacancy_application_stats(p_job_vacancy_ids UUID[])
RETURNS TABLE (job_vacancy_id UUID, stage TEXT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ja.job_vacancy_id, ja.stage, count(*)
  FROM esmdd.job_vacancy_applications ja
  WHERE ja.job_vacancy_id IN (
    SELECT ids.id
    FROM unnest(p_job_vacancy_ids[1:100]) AS ids (id)
    WHERE esmdd.can_review_job_vacancy(ids.id)
  )
  GROUP BY ja.job_vacancy_id, ja.stage;
$$;

REVOKE ALL ON FUNCTION esmdd.job_vacancy_application_stats(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.job_vacancy_application_stats(UUID[]) TO authenticated;


-- ─── 10. RPC: one applicant's summary (employer) ────────────────────────────
-- Only what the application needs (PRIVACY.md §4.3); the full NSRP is the attached form. Every call
-- is an employer opening a person's record, so it is logged here (PRIVACY.md §5.2) — the client
-- can't skip it.

DROP FUNCTION IF EXISTS esmdd.get_job_vacancy_application(UUID);

CREATE FUNCTION esmdd.get_job_vacancy_application(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_application esmdd.job_vacancy_applications%ROWTYPE;
  v_applicant applicants.applicants%ROWTYPE;
BEGIN
  SELECT * INTO v_application FROM esmdd.job_vacancy_applications WHERE id = p_application_id;
  IF NOT FOUND OR NOT esmdd.can_review_job_vacancy(v_application.job_vacancy_id) THEN
    RAISE EXCEPTION 'This application could not be found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_applicant FROM applicants.applicants WHERE id = v_application.applicant_id;

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
    'status_remarks', v_application.status_remarks,
    'created_at', v_application.created_at,
    'updated_at', v_application.updated_at,
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


-- ─── 11. Stage notification ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_job_vacancy_application_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_position TEXT;
  v_company TEXT;
  v_job TEXT;
  v_message TEXT;
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NULL;
  END IF;

  SELECT v.position_title, coalesce(nullif(btrim(c.company_name), ''), e.business_name)
  INTO v_position, v_company
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  LEFT JOIN employers.companies c ON c.id = e.company_id
  WHERE v.id = NEW.job_vacancy_id;

  v_job := coalesce(v_position, 'the job') || CASE WHEN v_company IS NULL THEN '' ELSE ' at ' || v_company END;
  v_message := CASE NEW.stage
    WHEN 'applied'   THEN 'Your application for ' || v_job || ' is back under review.'
    WHEN 'screening' THEN 'Your application for ' || v_job || ' is being screened.'
    WHEN 'interview' THEN 'You are shortlisted for an interview for ' || v_job || '. The employer will contact you with the schedule.'
    WHEN 'offered'   THEN 'You have a job offer for ' || v_job || '. The employer will contact you with the details.'
    WHEN 'hired'     THEN 'Congratulations! You have been hired for ' || v_job || '.'
    WHEN 'rejected'  THEN 'Your application for ' || v_job || ' was not successful.'
  END;

  PERFORM system.notify(
    system.applicant_profile_id(NEW.applicant_id),
    'application_status',
    'Job Application Update',
    v_message,
    system.status_remarks(NEW.stage, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION system.notify_job_vacancy_application_stage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancy_applications_notify_stage ON esmdd.job_vacancy_applications;
CREATE TRIGGER trg_job_vacancy_applications_notify_stage
AFTER UPDATE OF stage ON esmdd.job_vacancy_applications
FOR EACH ROW EXECUTE FUNCTION system.notify_job_vacancy_application_stage();

COMMIT;
