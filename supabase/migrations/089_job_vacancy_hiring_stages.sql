-- =============================================================================
-- Migration: 089_job_vacancy_hiring_stages.sql
-- Purpose:   The employer decides the hiring steps of each vacancy, instead of 087's fixed stages
--            (screening / interview / offered / hired). A new vacancy starts with
--            Paper Screening → Qualified → Initial Exam → Technical Exam → Interview → Result → Appointed → Hired.
--
--              esmdd.job_vacancies ──< esmdd.job_vacancy_stages
--              esmdd.job_vacancy_applications.stage_id ──> esmdd.job_vacancy_stages
--
--            1. esmdd.job_vacancy_stages: the vacancy's steps in order (2–12). The last step means hired.
--            2. job_vacancy_applications:
--                 stage_id  the step the applicant is at (NULL: applied, not reviewed yet). A rejected
--                           application keeps the step it was rejected at, for the applicant's tracker.
--                 stage     now the status only: applied | in_progress | hired | rejected. Derived from
--                           stage_id by the review guard (the last step gives hired); only `rejected`
--                           is set by hand.
--               Existing applications move to the matching default step (screening → Paper Screening,
--               interview → Interview, offered → Appointed, hired → Hired) without notifying anyone.
--            3. esmdd.set_job_vacancy_stages() + esmdd.save_job_vacancy(… p_stages): the posting form saves
--               the steps with the vacancy in one transaction. Steps keep their id when renamed or moved,
--               so applicants stay where they are; a step that still holds applicants can't be removed.
--            4. Every vacancy gets the default steps (existing ones now, new ones by trigger).
--            5. RPCs updated for the steps: search_open_job_vacancies (+ my_stage_name),
--               search_job_vacancy_applications (+ p_stage_id, stage_id, stage_name),
--               get_job_vacancy_application (+ stage_id), new job_vacancy_application_stage_counts.
--            6. The applicant is notified when they move to another step.
--
-- Schema:    esmdd, system
--
-- Access Matrix:
--   Resource             | admin / provincial_peso | company_owner (own vacancy) | other authenticated
--   ---------------------|-------------------------|-----------------------------|--------------------
--   job_vacancy_stages   | full CRUD               | full CRUD                   | read
--
-- Notified events (BACKEND.md §17, .agents/DATABASE.md §9):
--   | Event                                          | Recipient     | type               |
--   |------------------------------------------------|---------------|--------------------|
--   | The application moves to another hiring step   | the applicant | application_status |
--   (replaces 087's stage message; Hired / Not selected as before)
--
-- Personal data: none in the steps (names of the employer's hiring steps). Depends on 084, 087, 088.
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Steps ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_stages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_vacancy_id  UUID         NOT NULL REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  stage_name      TEXT         NOT NULL CHECK (char_length(btrim(stage_name)) BETWEEN 2 AND 60),
  stage_key       TEXT         GENERATED ALWAYS AS (lower(regexp_replace(btrim(stage_name), '\s+', ' ', 'g'))) STORED,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT job_vacancy_stages_unique_key UNIQUE (job_vacancy_id, stage_key)
);

COMMENT ON TABLE esmdd.job_vacancy_stages IS
  'Hiring steps of a vacancy in order; the last one means hired (089).';

CREATE INDEX IF NOT EXISTS idx_job_vacancy_stages_order ON esmdd.job_vacancy_stages (job_vacancy_id, sort_order);

ALTER TABLE esmdd.job_vacancy_stages ENABLE ROW LEVEL SECURITY;

-- Applicants see the steps ahead of them, like the vacancy's skills and requirements
DROP POLICY IF EXISTS authenticated_select ON esmdd.job_vacancy_stages;
CREATE POLICY authenticated_select ON esmdd.job_vacancy_stages
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS manager_insert ON esmdd.job_vacancy_stages;
CREATE POLICY manager_insert ON esmdd.job_vacancy_stages
FOR INSERT TO authenticated
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_update ON esmdd.job_vacancy_stages;
CREATE POLICY manager_update ON esmdd.job_vacancy_stages
FOR UPDATE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)))
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_delete ON esmdd.job_vacancy_stages;
CREATE POLICY manager_delete ON esmdd.job_vacancy_stages
FOR DELETE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

REVOKE ALL ON esmdd.job_vacancy_stages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_vacancy_stages TO authenticated;
GRANT ALL ON esmdd.job_vacancy_stages TO service_role;


-- ─── 2. Default steps ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.add_default_job_vacancy_stages(p_job_vacancy_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO esmdd.job_vacancy_stages (job_vacancy_id, stage_name, sort_order)
  SELECT p_job_vacancy_id, d.stage_name, d.sort_order
  FROM (VALUES
    ('Paper Screening', 1), ('Qualified', 2), ('Initial Exam', 3), ('Technical Exam', 4),
    ('Interview', 5), ('Result', 6), ('Appointed', 7), ('Hired', 8)
  ) AS d (stage_name, sort_order)
  WHERE NOT EXISTS (SELECT 1 FROM esmdd.job_vacancy_stages s WHERE s.job_vacancy_id = p_job_vacancy_id)
  ON CONFLICT (job_vacancy_id, stage_key) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION esmdd.add_default_job_vacancy_stages(UUID) FROM PUBLIC, anon, authenticated;

-- Every new vacancy (employer, PESO job fair or recruitment activity) starts with the defaults;
-- the employer form replaces them in the same transaction
CREATE OR REPLACE FUNCTION esmdd.job_vacancies_default_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM esmdd.add_default_job_vacancy_stages(NEW.id);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.job_vacancies_default_stages() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancies_default_stages ON esmdd.job_vacancies;
CREATE TRIGGER trg_job_vacancies_default_stages
  AFTER INSERT ON esmdd.job_vacancies
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.job_vacancies_default_stages();

SELECT esmdd.add_default_job_vacancy_stages(v.id) FROM esmdd.job_vacancies v;


-- ─── 3. Applications: step + status ─────────────────────────────────────────

ALTER TABLE esmdd.job_vacancy_applications
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES esmdd.job_vacancy_stages (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_job_vacancy_applications_stage_id
  ON esmdd.job_vacancy_applications (stage_id);

/**
 * The employer moves an application to a step (stage_id) or rejects it (stage = 'rejected').
 * The status follows the step: none → applied, the last step → hired, any other → in_progress.
 * Who applied to what, and when, stays as it was.
 */
CREATE OR REPLACE FUNCTION esmdd.guard_job_vacancy_application_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_last UUID;
BEGIN
  NEW.job_vacancy_id := OLD.job_vacancy_id;
  NEW.applicant_id := OLD.applicant_id;
  NEW.created_at := OLD.created_at;

  IF NEW.stage_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM esmdd.job_vacancy_stages s WHERE s.id = NEW.stage_id AND s.job_vacancy_id = NEW.job_vacancy_id
  ) THEN
    RAISE EXCEPTION 'That hiring step is not part of this vacancy' USING ERRCODE = '22023';
  END IF;

  IF NEW.stage = 'rejected' THEN
    NEW.status_remarks := nullif(btrim(NEW.status_remarks), '');
    RETURN NEW;
  END IF;

  NEW.status_remarks := NULL;
  IF NEW.stage_id IS NULL THEN
    NEW.stage := 'applied';
  ELSE
    SELECT s.id INTO v_last
    FROM esmdd.job_vacancy_stages s
    WHERE s.job_vacancy_id = NEW.job_vacancy_id
    ORDER BY s.sort_order DESC, s.created_at DESC
    LIMIT 1;
    NEW.stage := CASE WHEN NEW.stage_id = v_last THEN 'hired' ELSE 'in_progress' END;
  END IF;
  RETURN NEW;
END;
$$;

-- Old statuses → default steps, silently (the notification trigger is replaced below anyway)
ALTER TABLE esmdd.job_vacancy_applications DROP CONSTRAINT IF EXISTS job_vacancy_applications_stage_check;
ALTER TABLE esmdd.job_vacancy_applications DISABLE TRIGGER trg_job_vacancy_applications_notify_stage;

UPDATE esmdd.job_vacancy_applications ja
SET stage_id = s.id,
    stage = CASE WHEN ja.stage = 'hired' THEN 'hired' ELSE 'in_progress' END
FROM esmdd.job_vacancy_stages s
WHERE s.job_vacancy_id = ja.job_vacancy_id
  AND ja.stage_id IS NULL
  AND ja.stage IN ('screening', 'interview', 'offered', 'hired')
  AND s.stage_key = CASE ja.stage
    WHEN 'screening' THEN 'paper screening'
    WHEN 'interview' THEN 'interview'
    WHEN 'offered' THEN 'appointed'
    WHEN 'hired' THEN 'hired'
  END;

ALTER TABLE esmdd.job_vacancy_applications ENABLE TRIGGER trg_job_vacancy_applications_notify_stage;

ALTER TABLE esmdd.job_vacancy_applications
  ADD CONSTRAINT job_vacancy_applications_stage_check
  CHECK (stage IN ('applied', 'in_progress', 'hired', 'rejected'));

ALTER TABLE esmdd.job_vacancy_applications DROP CONSTRAINT IF EXISTS job_vacancy_applications_stage_step;
ALTER TABLE esmdd.job_vacancy_applications
  ADD CONSTRAINT job_vacancy_applications_stage_step
  CHECK (stage NOT IN ('in_progress', 'hired') OR stage_id IS NOT NULL);


-- ─── 4. Saving the steps ────────────────────────────────────────────────────

/** Raises unless p_stages holds 2–12 distinct step names */
CREATE OR REPLACE FUNCTION esmdd.assert_job_vacancy_stages(p_stages JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_total INT;
  v_distinct INT;
BEGIN
  IF p_stages IS NULL OR jsonb_typeof(p_stages) <> 'array' THEN
    RAISE EXCEPTION 'A vacancy needs 2 to 12 hiring steps' USING ERRCODE = '22023';
  END IF;

  SELECT count(*), count(DISTINCT lower(regexp_replace(btrim(s.elem ->> 'stage_name'), '\s+', ' ', 'g')))
  INTO v_total, v_distinct
  FROM jsonb_array_elements(p_stages) AS s (elem)
  WHERE char_length(btrim(coalesce(s.elem ->> 'stage_name', ''))) BETWEEN 2 AND 60;

  IF v_total <> jsonb_array_length(p_stages) OR v_total < 2 OR v_total > 12 THEN
    RAISE EXCEPTION 'A vacancy needs 2 to 12 hiring steps' USING ERRCODE = '22023';
  END IF;
  IF v_distinct <> v_total THEN
    RAISE EXCEPTION 'Each hiring step can only be listed once' USING ERRCODE = '22023';
  END IF;
END;
$$;

/*
 * Replaces a vacancy's steps with p_stages: [{ "id": uuid | null, "stage_name": text }], in order.
 * A listed id keeps its row (renamed / moved), so applications at that step stay there; null adds a
 * step; a step left out is removed, unless an application is at it. SECURITY INVOKER: the
 * job_vacancy_stages RLS decides who may write.
 */
CREATE OR REPLACE FUNCTION esmdd.set_job_vacancy_stages(p_job_vacancy_id UUID, p_stages JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_keep UUID[];
BEGIN
  PERFORM esmdd.assert_job_vacancy_stages(p_stages);

  SELECT coalesce(array_agg((s.elem ->> 'id')::UUID), '{}')
  INTO v_keep
  FROM jsonb_array_elements(p_stages) AS s (elem)
  WHERE nullif(s.elem ->> 'id', '') IS NOT NULL;

  IF EXISTS (
    SELECT 1
    FROM esmdd.job_vacancy_applications ja
    JOIN esmdd.job_vacancy_stages st ON st.id = ja.stage_id
    WHERE st.job_vacancy_id = p_job_vacancy_id
      AND NOT (st.id = ANY (v_keep))
  ) THEN
    RAISE EXCEPTION 'A hiring step with applicants in it can''t be removed. Move them to another step first.'
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM esmdd.job_vacancy_stages
  WHERE job_vacancy_id = p_job_vacancy_id AND NOT (id = ANY (v_keep));

  -- Park the kept names first, so renames and swaps never collide on the unique key
  UPDATE esmdd.job_vacancy_stages
  SET stage_name = '~' || id::TEXT
  WHERE job_vacancy_id = p_job_vacancy_id;

  UPDATE esmdd.job_vacancy_stages st
  SET stage_name = regexp_replace(btrim(s.elem ->> 'stage_name'), '\s+', ' ', 'g'),
      sort_order = s.ord::INT
  FROM jsonb_array_elements(p_stages) WITH ORDINALITY AS s (elem, ord)
  WHERE st.job_vacancy_id = p_job_vacancy_id
    AND st.id = nullif(s.elem ->> 'id', '')::UUID;

  INSERT INTO esmdd.job_vacancy_stages (job_vacancy_id, stage_name, sort_order)
  SELECT p_job_vacancy_id, regexp_replace(btrim(s.elem ->> 'stage_name'), '\s+', ' ', 'g'), s.ord::INT
  FROM jsonb_array_elements(p_stages) WITH ORDINALITY AS s (elem, ord)
  WHERE nullif(s.elem ->> 'id', '') IS NULL;

  -- An id from another vacancy (or a removed step) matches no row above, so that step would go missing
  IF (SELECT count(*) FROM esmdd.job_vacancy_stages WHERE job_vacancy_id = p_job_vacancy_id) <> jsonb_array_length(p_stages) THEN
    RAISE EXCEPTION 'A hiring step does not belong to this vacancy. Reload the page and try again.' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.assert_job_vacancy_stages(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.set_job_vacancy_stages(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.assert_job_vacancy_stages(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.set_job_vacancy_stages(UUID, JSONB) TO authenticated;

/*
 * The employer posting page: the 088 save (vacancy, skills, requirements) plus the hiring steps, in one
 * transaction. Everything is checked before anything is written. Returns the vacancy id.
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
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB, JSONB) TO authenticated;


-- ─── 5. RPCs ────────────────────────────────────────────────────────────────

-- Same as 087, plus the name of the applicant's current step
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
  my_stage_name TEXT,
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
    st.stage_name,
    count(*) OVER ()
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  JOIN employers.companies c ON c.id = e.company_id
  CROSS JOIN today
  LEFT JOIN esmdd.job_vacancy_applications ja
    ON ja.job_vacancy_id = v.id AND ja.applicant_id = (SELECT me.id FROM me)
  LEFT JOIN esmdd.job_vacancy_stages st ON st.id = ja.stage_id
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

-- Same as 087, plus a filter by step and the step of each row
DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, INT, INT);
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

-- Applicants of one vacancy per status and step, for its filter chips
DROP FUNCTION IF EXISTS esmdd.job_vacancy_application_stage_counts(UUID);

CREATE FUNCTION esmdd.job_vacancy_application_stage_counts(p_job_vacancy_id UUID)
RETURNS TABLE (stage TEXT, stage_id UUID, total BIGINT)
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
  SELECT ja.stage, ja.stage_id, count(*)
  FROM esmdd.job_vacancy_applications ja
  WHERE ja.job_vacancy_id = p_job_vacancy_id
  GROUP BY ja.stage, ja.stage_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.job_vacancy_application_stage_counts(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.job_vacancy_application_stage_counts(UUID) TO authenticated;

-- Same as 087 (still logs the view), plus the step
CREATE OR REPLACE FUNCTION esmdd.get_job_vacancy_application(p_application_id UUID)
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
    'stage_id', v_application.stage_id,
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


-- ─── 6. Step notification ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_job_vacancy_application_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_position TEXT;
  v_company TEXT;
  v_step TEXT;
  v_job TEXT;
  v_message TEXT;
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage AND OLD.stage_id IS NOT DISTINCT FROM NEW.stage_id THEN
    RETURN NULL;
  END IF;

  SELECT v.position_title, coalesce(nullif(btrim(c.company_name), ''), e.business_name)
  INTO v_position, v_company
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  LEFT JOIN employers.companies c ON c.id = e.company_id
  WHERE v.id = NEW.job_vacancy_id;

  SELECT s.stage_name INTO v_step FROM esmdd.job_vacancy_stages s WHERE s.id = NEW.stage_id;

  v_job := coalesce(v_position, 'the job') || CASE WHEN v_company IS NULL THEN '' ELSE ' at ' || v_company END;
  v_message := CASE NEW.stage
    WHEN 'applied'     THEN 'Your application for ' || v_job || ' is back under review.'
    WHEN 'in_progress' THEN 'Your application for ' || v_job || ' moved to ' || coalesce(v_step, 'the next step') || '.'
    WHEN 'hired'       THEN 'Congratulations! You have been hired for ' || v_job || '.'
    WHEN 'rejected'    THEN 'Your application for ' || v_job || ' was not successful.'
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
AFTER UPDATE OF stage, stage_id ON esmdd.job_vacancy_applications
FOR EACH ROW EXECUTE FUNCTION system.notify_job_vacancy_application_stage();

COMMIT;
