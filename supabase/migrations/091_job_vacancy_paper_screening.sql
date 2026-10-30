-- =============================================================================
-- Migration: 091_job_vacancy_paper_screening.sql
-- Purpose:   Paper Screening is the mandatory first hiring step of every vacancy, and an application
--            starts there the moment it is submitted (instead of 089's "applied, not reviewed yet").
--
--            1. Steps: every vacancy's first step is Paper Screening. Vacancies without it get it in
--               front; ones that have it elsewhere get it moved to the front. The steps saved from the
--               posting page must start with it (assert_job_vacancy_stages).
--            2. esmdd.apply_to_job_vacancy(): the new application is in_progress at Paper Screening.
--               Applications still "applied" move there too, without notifying anyone.
--            3. The applicant may still change their files while at Paper Screening (until the employer
--               moves them on or rejects them): can_edit_own_job_vacancy_application.
--            4. job_vacancy_application_stats counts applications at Paper Screening as `applied`, the
--               "new" count of the employer's posting cards.
--
-- Schema:    esmdd. Depends on 087, 089. Notified events: none new (the applicant applying isn't
-- notified; the company owner still gets "New Applicant"). Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Paper Screening first ───────────────────────────────────────────────

/** The vacancy's first hiring step (Paper Screening once this migration ran) */
CREATE OR REPLACE FUNCTION esmdd.first_job_vacancy_stage(p_job_vacancy_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id
  FROM esmdd.job_vacancy_stages s
  WHERE s.job_vacancy_id = p_job_vacancy_id
  ORDER BY s.sort_order, s.created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION esmdd.first_job_vacancy_stage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.first_job_vacancy_stage(UUID) TO authenticated;

-- Existing steps: add Paper Screening where it's missing, and put it first where it isn't
INSERT INTO esmdd.job_vacancy_stages (job_vacancy_id, stage_name, sort_order)
SELECT v.id, 'Paper Screening', 0
FROM esmdd.job_vacancies v
WHERE NOT EXISTS (
  SELECT 1 FROM esmdd.job_vacancy_stages s WHERE s.job_vacancy_id = v.id AND s.stage_key = 'paper screening'
)
ON CONFLICT (job_vacancy_id, stage_key) DO NOTHING;

UPDATE esmdd.job_vacancy_stages s
SET sort_order = (SELECT min(o.sort_order) - 1 FROM esmdd.job_vacancy_stages o WHERE o.job_vacancy_id = s.job_vacancy_id)
WHERE s.stage_key = 'paper screening'
  AND s.id IS DISTINCT FROM esmdd.first_job_vacancy_stage(s.job_vacancy_id);

/** Raises unless p_stages holds 2–12 distinct step names, starting with Paper Screening */
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
  IF lower(regexp_replace(btrim(p_stages -> 0 ->> 'stage_name'), '\s+', ' ', 'g')) <> 'paper screening' THEN
    RAISE EXCEPTION 'The first hiring step must be Paper Screening' USING ERRCODE = '22023';
  END IF;
END;
$$;


-- ─── 2. Applications start at Paper Screening ───────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.apply_to_job_vacancy(p_job_vacancy_id UUID)
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
  v_first UUID;
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

  v_first := esmdd.first_job_vacancy_stage(p_job_vacancy_id);
  IF v_first IS NULL THEN
    PERFORM esmdd.add_default_job_vacancy_stages(p_job_vacancy_id);
    v_first := esmdd.first_job_vacancy_stage(p_job_vacancy_id);
  END IF;

  -- Straight into Paper Screening (the review guard only runs on updates)
  INSERT INTO esmdd.job_vacancy_applications (job_vacancy_id, applicant_id, stage, stage_id)
  VALUES (p_job_vacancy_id, v_applicant.id, 'in_progress', v_first)
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

-- Applications still waiting as "applied" join Paper Screening, silently
ALTER TABLE esmdd.job_vacancy_applications DISABLE TRIGGER trg_job_vacancy_applications_notify_stage;

UPDATE esmdd.job_vacancy_applications ja
SET stage_id = esmdd.first_job_vacancy_stage(ja.job_vacancy_id)
WHERE ja.stage = 'applied'
  AND ja.stage_id IS NULL;

ALTER TABLE esmdd.job_vacancy_applications ENABLE TRIGGER trg_job_vacancy_applications_notify_stage;


-- ─── 3. Files stay editable during Paper Screening ──────────────────────────

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
      AND a.profile_id = (SELECT auth.uid())
      AND (
        ja.stage = 'applied'
        OR (ja.stage = 'in_progress' AND ja.stage_id = esmdd.first_job_vacancy_stage(ja.job_vacancy_id))
      )
  );
$$;


-- ─── 4. "New" on the posting cards = waiting at Paper Screening ─────────────

CREATE OR REPLACE FUNCTION esmdd.job_vacancy_application_stats(p_job_vacancy_ids UUID[])
RETURNS TABLE (job_vacancy_id UUID, stage TEXT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    ja.job_vacancy_id,
    CASE
      WHEN ja.stage = 'in_progress' AND ja.stage_id = esmdd.first_job_vacancy_stage(ja.job_vacancy_id) THEN 'applied'
      ELSE ja.stage
    END,
    count(*)
  FROM esmdd.job_vacancy_applications ja
  WHERE ja.job_vacancy_id IN (
    SELECT ids.id
    FROM unnest(p_job_vacancy_ids[1:100]) AS ids (id)
    WHERE esmdd.can_review_job_vacancy(ids.id)
  )
  GROUP BY 1, 2;
$$;

COMMIT;
