-- =============================================================================
-- Migration: 088_job_vacancy_requirements.sql
-- Purpose:   The employer lists the documents applicants must submit for each vacancy, and marks
--            each one required or optional. Replaces the fixed list of 087 (Resume, Application Letter).
--
--              esmdd.job_vacancies ──< esmdd.job_vacancy_requirements
--
--            1. esmdd.job_vacancy_requirements: one row per document a vacancy asks for. requirement_key
--               is the normalized name (lower case, single spaces), unique per vacancy. is_required:
--               the applicant can't apply without it (true) or may skip it (false). sort_order keeps
--               the employer's order.
--            2. esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB): the 084 / 085 save plus the
--               requirements, in one transaction (the employer Job Posting page). SECURITY INVOKER, so
--               the job_vacancies / job_vacancy_requirements RLS still decides who may write.
--            3. esmdd.job_vacancy_application_documents: document_name is any requirement of the
--               application's vacancy, checked in the applicant's write policy
--               instead of the fixed CHECK of 087.
--            4. Existing vacancies get the 087 list (Resume required, Application Letter optional),
--               so their applications keep working.
--
--            No NSRP Form: it is only for PESO programs, job fairs and analytics, never a job application,
--            so employers can't list it (job_vacancy_requirements_not_nsrp) and applicants can't upload it.
--
-- Schema:    esmdd
-- Notified events: none (the owner edits their own posting; system.notify skips self-changes).
--
-- Access Matrix:
--   Resource                  | admin / provincial_peso | company_owner (own vacancy) | other authenticated
--   --------------------------|-------------------------|-----------------------------|--------------------
--   job_vacancy_requirements  | full CRUD               | full CRUD                   | read
--
-- Personal data (PRIVACY.md): none in the requirements themselves (a list of document names). The
-- files applicants attach stay under the 087 rules (private bucket, signed URLs, audit).
--
-- Depends on 084, 085, 087. After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_requirements (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_vacancy_id    UUID         NOT NULL REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  requirement_name  TEXT         NOT NULL CHECK (char_length(btrim(requirement_name)) BETWEEN 2 AND 80),
  requirement_key   TEXT         GENERATED ALWAYS AS (lower(regexp_replace(btrim(requirement_name), '\s+', ' ', 'g'))) STORED,
  is_required       BOOLEAN      NOT NULL DEFAULT true,
  sort_order        INT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT job_vacancy_requirements_unique_key UNIQUE (job_vacancy_id, requirement_key),
  -- Generated for every application; never one of the employer's requirements
  CONSTRAINT job_vacancy_requirements_not_nsrp
    CHECK (lower(regexp_replace(btrim(requirement_name), '\s+', ' ', 'g')) <> 'nsrp form')
);

COMMENT ON TABLE esmdd.job_vacancy_requirements IS
  'Documents an applicant submits when applying to a vacancy, each required or optional (088).';

-- job_vacancy_id is the leading column of the unique index, which serves the per-vacancy lookups


-- ─── 2. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE esmdd.job_vacancy_requirements ENABLE ROW LEVEL SECURITY;

-- Like job_vacancies and their skills: every signed-in user can see what a vacancy asks for
DROP POLICY IF EXISTS authenticated_select ON esmdd.job_vacancy_requirements;
CREATE POLICY authenticated_select ON esmdd.job_vacancy_requirements
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS manager_insert ON esmdd.job_vacancy_requirements;
CREATE POLICY manager_insert ON esmdd.job_vacancy_requirements
FOR INSERT TO authenticated
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_update ON esmdd.job_vacancy_requirements;
CREATE POLICY manager_update ON esmdd.job_vacancy_requirements
FOR UPDATE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)))
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_delete ON esmdd.job_vacancy_requirements;
CREATE POLICY manager_delete ON esmdd.job_vacancy_requirements
FOR DELETE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

REVOKE ALL ON esmdd.job_vacancy_requirements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_vacancy_requirements TO authenticated;
GRANT ALL ON esmdd.job_vacancy_requirements TO service_role;


-- ─── 3. Validate / replace a vacancy's requirements ─────────────────────────

/** Raises unless p_requirements holds 1–15 distinct requirements, none of them the NSRP Form */
CREATE OR REPLACE FUNCTION esmdd.assert_job_vacancy_requirements(p_requirements JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_requirements IS NULL OR jsonb_typeof(p_requirements) <> 'array' THEN
    RAISE EXCEPTION 'A vacancy needs 1 to 15 requirements' USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT lower(regexp_replace(btrim(r.elem ->> 'requirement_name'), '\s+', ' ', 'g')))
  INTO v_count
  FROM jsonb_array_elements(p_requirements) AS r (elem)
  WHERE COALESCE(btrim(r.elem ->> 'requirement_name'), '') <> ''
    AND lower(regexp_replace(btrim(r.elem ->> 'requirement_name'), '\s+', ' ', 'g')) <> 'nsrp form';

  IF v_count < 1 OR v_count > 15 THEN
    RAISE EXCEPTION 'A vacancy needs 1 to 15 requirements' USING ERRCODE = '22023';
  END IF;
END;
$$;

/** Replaces the requirements of a vacancy (caller's RLS applies); duplicates keep the first */
CREATE OR REPLACE FUNCTION esmdd.replace_job_vacancy_requirements(p_job_vacancy_id UUID, p_requirements JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  DELETE FROM esmdd.job_vacancy_requirements WHERE job_vacancy_id = p_job_vacancy_id;

  INSERT INTO esmdd.job_vacancy_requirements (job_vacancy_id, requirement_name, is_required, sort_order)
  SELECT DISTINCT ON (lower(regexp_replace(btrim(r.elem ->> 'requirement_name'), '\s+', ' ', 'g')))
    p_job_vacancy_id,
    regexp_replace(btrim(r.elem ->> 'requirement_name'), '\s+', ' ', 'g'),
    COALESCE((r.elem ->> 'is_required')::BOOLEAN, true),
    r.ord::INT
  FROM jsonb_array_elements(p_requirements) WITH ORDINALITY AS r (elem, ord)
  WHERE COALESCE(btrim(r.elem ->> 'requirement_name'), '') <> ''
    AND lower(regexp_replace(btrim(r.elem ->> 'requirement_name'), '\s+', ' ', 'g')) <> 'nsrp form'
  ORDER BY lower(regexp_replace(btrim(r.elem ->> 'requirement_name'), '\s+', ' ', 'g')), r.ord;
$$;

REVOKE ALL ON FUNCTION esmdd.assert_job_vacancy_requirements(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.replace_job_vacancy_requirements(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.assert_job_vacancy_requirements(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.replace_job_vacancy_requirements(UUID, JSONB) TO authenticated;


-- ─── 4. Employer form: save_job_vacancy with requirements ───────────────────
/*
 * Same as the 4-argument save (084 / 085), plus p_requirements:
 * [{ "requirement_name": text, "is_required": bool }], 1 to 15 entries, in the employer's order.
 * Everything is checked before anything is written. Returns the vacancy id.
 */
CREATE OR REPLACE FUNCTION esmdd.save_job_vacancy(
  p_job_vacancy_id UUID,
  p_establishment_id UUID,
  p_vacancy JSONB,
  p_skills JSONB,
  p_requirements JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM esmdd.assert_job_vacancy_requirements(p_requirements);

  v_id := esmdd.save_job_vacancy(p_job_vacancy_id, p_establishment_id, p_vacancy, p_skills);
  PERFORM esmdd.replace_job_vacancy_requirements(v_id, p_requirements);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_job_vacancy(UUID, UUID, JSONB, JSONB, JSONB) TO authenticated;


-- ─── 5. Application documents follow the vacancy's requirements ─────────────

-- One of the requirements of the application's vacancy (matched by key); never the NSRP Form
CREATE OR REPLACE FUNCTION esmdd.is_job_vacancy_application_requirement(p_application_id UUID, p_document_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
      SELECT 1
      FROM esmdd.job_vacancy_applications ja
      JOIN esmdd.job_vacancy_requirements r ON r.job_vacancy_id = ja.job_vacancy_id
      WHERE ja.id = p_application_id
        AND r.requirement_key = lower(regexp_replace(btrim(p_document_name), '\s+', ' ', 'g'))
    );
$$;

REVOKE ALL ON FUNCTION esmdd.is_job_vacancy_application_requirement(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.is_job_vacancy_application_requirement(UUID, TEXT) TO authenticated;

-- 087's inline CHECK only allowed 'NSRP Form', 'Resume', 'Application Letter'
ALTER TABLE esmdd.job_vacancy_application_documents
  DROP CONSTRAINT IF EXISTS job_vacancy_application_documents_document_name_check;
ALTER TABLE esmdd.job_vacancy_application_documents
  DROP CONSTRAINT IF EXISTS job_vacancy_application_documents_document_name_length;
ALTER TABLE esmdd.job_vacancy_application_documents
  ADD CONSTRAINT job_vacancy_application_documents_document_name_length
  CHECK (char_length(btrim(document_name)) BETWEEN 2 AND 80);

-- Same as 087, plus: the file is for a requirement the vacancy asks for. Deleting (USING) stays
-- allowed for a requirement the employer removed later, so the applicant can clean it up.
DROP POLICY IF EXISTS applicant_own_write ON esmdd.job_vacancy_application_documents;
CREATE POLICY applicant_own_write ON esmdd.job_vacancy_application_documents
FOR ALL TO authenticated
USING ((SELECT esmdd.can_edit_own_job_vacancy_application(application_id)))
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND split_part(path, '/', 1) = (SELECT auth.uid())::TEXT
  AND (SELECT esmdd.can_edit_own_job_vacancy_application(application_id))
  AND (SELECT esmdd.is_job_vacancy_application_requirement(application_id, document_name))
);


-- ─── 6. Existing vacancies keep the 087 list ────────────────────────────────

INSERT INTO esmdd.job_vacancy_requirements (job_vacancy_id, requirement_name, is_required, sort_order)
SELECT v.id, d.requirement_name, d.is_required, d.sort_order
FROM esmdd.job_vacancies v
CROSS JOIN (VALUES ('Resume', true, 1), ('Application Letter', false, 2)) AS d (requirement_name, is_required, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM esmdd.job_vacancy_requirements r WHERE r.job_vacancy_id = v.id)
ON CONFLICT (job_vacancy_id, requirement_key) DO NOTHING;

COMMIT;
