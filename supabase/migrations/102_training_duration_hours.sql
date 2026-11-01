-- =============================================================================
-- Migration: 102_training_duration_hours.sql
-- Purpose:   Training hours on the NSRP record count toward a vacancy's required training (fit, 098)
--            however the duration was written. Until now only "40 hours" / "40 hrs" counted; "40",
--            "5 days" or "3 months" were left as "check documents".
--
--            1. esmdd.training_duration_hours(text): hours in a duration text.
--                 "40 hours", "40 hrs", "40h"  → 40
--                 "40"                         → 40   (a bare number is hours: the applicant form asks for hours)
--                 "5 days"                     → 40   (8 hours a day)
--                 "2 weeks"                    → 80   (40 hours a week)
--                 "3 months", "3 mos"          → 480  (160 hours a month: 20 working days)
--                 anything else                → NULL (the fit says "check documents")
--               Same reading as parseTrainingHours (src/helpers/common/trainingDurationHelper.ts).
--            2. esmdd.job_vacancy_fit_for: same as 100, reading durations with (1). Same output.
--
--            The applicant form now asks for a number of hours and stores "40 hours" (no schema change:
--            vocational_trainings stays JSON). PESO forms keep free text; (1) reads it.
--
-- Access: (1) is internal (the fit calls it). Personal data: none new. Notified events: none.
-- Depends on 098, 100. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Reading a duration ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.training_duration_hours(p_duration TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  WITH t AS (SELECT lower(coalesce(p_duration, '')) AS txt),
  m AS (
    SELECT
      regexp_match(t.txt, '(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|days?|weeks?|wks?|months?|mos?)\y') AS unit_match,
      regexp_match(t.txt, '^\s*(\d+(?:\.\d+)?)\s*$') AS bare_match
    FROM t
  )
  SELECT CASE
    WHEN m.unit_match IS NOT NULL THEN
      m.unit_match[1]::NUMERIC * CASE left(m.unit_match[2], 1)
        WHEN 'd' THEN 8
        WHEN 'w' THEN 40
        WHEN 'm' THEN 160
        ELSE 1
      END
    WHEN m.bare_match IS NOT NULL THEN m.bare_match[1]::NUMERIC
  END
  FROM m;
$$;

REVOKE ALL ON FUNCTION esmdd.training_duration_hours(TEXT) FROM PUBLIC, anon, authenticated;


-- ─── 2. Vacancy fit (same as 100, durations read by training_duration_hours) ──

/** One applicant against a vacancy's requirements (from job_vacancy_fit_requirements). Never raises */
CREATE OR REPLACE FUNCTION esmdd.job_vacancy_fit_for(p_req JSONB, p_applicant applicants.applicants)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  w_skills_required CONSTANT INT := 30;
  w_education       CONSTANT INT := 15;
  w_course          CONSTANT INT := 15;
  w_experience      CONSTANT INT := 15;
  w_eligibility     CONSTANT INT := 10;
  w_license         CONSTANT INT := 10;
  w_training        CONSTANT INT := 5;
  w_skills_optional CONSTANT INT := 5;
  w_language        CONSTANT INT := 5;

  v_edu       JSONB := esmdd.match_jsonb_array(p_applicant.educational_background::JSONB);
  v_trainings JSONB := esmdd.match_jsonb_array(p_applicant.vocational_trainings::JSONB);
  v_work      JSONB := esmdd.match_jsonb_array(p_applicant.work_experiences::JSONB);
  v_elig      JSONB := esmdd.match_jsonb_array(p_applicant.eligibilities::JSONB);
  v_langs     JSONB := esmdd.match_jsonb_array(p_applicant.language_proficiencies::JSONB);

  v_skill_keys TEXT[];
  v_skill_ids  INTEGER[];
  v_elig_keys  TEXT[];
  v_lang_keys  TEXT[];
  v_rank       SMALLINT;
  v_rank_label TEXT;
  v_req_rank   SMALLINT;
  v_courses    JSONB;

  v_criteria JSONB := '[]'::JSONB;
  v_required JSONB;
  v_matched  JSONB;
  v_missing  JSONB;
  v_ratio    NUMERIC;
  v_status   TEXT;
  v_reason   TEXT;
  v_text     TEXT;
  v_num      NUMERIC;
  v_count    INT;
  v_req_num  NUMERIC;

  v_total   NUMERIC;
  v_earned  NUMERIC;
  v_scored  INT;
  v_met     INT;
  v_unknown INT;
  v_score   INT;
BEGIN
  IF p_req IS NULL OR p_applicant.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- The applicant's skills: profile skills, NSRP other skills, and skills from trainings (084 header)
  SELECT coalesce(array_agg(DISTINCT s.k) FILTER (WHERE s.k IS NOT NULL), '{}')
  INTO v_skill_keys
  FROM (
    SELECT esmdd.normalize_match_key(sk.skill_name) AS k
    FROM applicants.applicant_skills sk
    WHERE p_applicant.profile_id IS NOT NULL AND sk.profile_id = p_applicant.profile_id
    UNION ALL
    SELECT esmdd.normalize_match_key(x) FROM unnest(coalesce(p_applicant.other_skills, '{}')) AS x
    UNION ALL
    SELECT esmdd.normalize_match_key(x)
    FROM regexp_split_to_table(coalesce(p_applicant.other_skills_specified, ''), '[,;\n]') AS x
    UNION ALL
    SELECT esmdd.normalize_match_key(x)
    FROM jsonb_array_elements(v_trainings) AS t
    CROSS JOIN LATERAL regexp_split_to_table(coalesce(t ->> 'skills_acquired', ''), '[,;\n]') AS x
  ) s;

  -- Skills the applicant's record maps to on the skill list (100)
  SELECT coalesce(array_agg(DISTINCT i.skill_id) FILTER (WHERE i.skill_id IS NOT NULL), '{}')
  INTO v_skill_ids
  FROM applicants.applicant_skill_index i
  WHERE i.applicant_id = p_applicant.id;

  -- Highest education entry
  SELECT r.rnk, r.label
  INTO v_rank, v_rank_label
  FROM (
    SELECT esmdd.applicant_education_rank(e ->> 'level', e ->> 'year_graduated') AS rnk, btrim(e ->> 'level') AS label
    FROM jsonb_array_elements(v_edu) AS e
  ) r
  ORDER BY r.rnk DESC NULLS LAST
  LIMIT 1;

  -- ── Must-have skills ──
  IF jsonb_array_length(coalesce(p_req -> 'skills_required', '[]'::JSONB)) > 0 THEN
    SELECT
      jsonb_agg(s ->> 'name'),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      (count(*) FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)))::NUMERIC / count(*)
    INTO v_required, v_matched, v_missing, v_ratio
    FROM jsonb_array_elements(p_req -> 'skills_required') AS s;

    v_criteria := v_criteria || jsonb_build_array(jsonb_build_object(
      'key', 'skills_required', 'weight', w_skills_required,
      'status', esmdd.fit_ratio_status(v_ratio), 'ratio', round(v_ratio, 2),
      'required', v_required, 'matched', v_matched, 'missing', v_missing
    ));
  END IF;

  -- ── Education level ──
  IF p_req ->> 'education_level' IS NOT NULL THEN
    v_req_rank := esmdd.vacancy_education_rank(p_req ->> 'education_level');
    v_reason := NULL;
    IF v_req_rank IS NULL THEN
      v_status := 'unknown';
      v_reason := 'level_not_comparable';
    ELSIF v_rank IS NULL THEN
      v_status := 'unmet';
      v_reason := 'no_education_on_profile';
    ELSIF v_rank >= v_req_rank THEN
      v_status := 'met';
    ELSE
      v_status := 'unmet';
    END IF;

    v_criteria := v_criteria || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'key', 'education', 'weight', w_education,
      'status', v_status, 'ratio', CASE WHEN v_status = 'met' THEN 1 ELSE 0 END,
      'required', p_req ->> 'education_level', 'applicant', v_rank_label, 'reason', v_reason
    )));
  END IF;

  -- ── Course / strand ──
  IF jsonb_array_length(coalesce(p_req -> 'courses', '[]'::JSONB)) > 0 THEN
    SELECT coalesce(jsonb_agg(DISTINCT btrim(e ->> 'course')) FILTER (WHERE nullif(btrim(e ->> 'course'), '') IS NOT NULL), '[]'::JSONB)
    INTO v_courses
    FROM jsonb_array_elements(v_edu) AS e;

    v_text := NULL;
    v_reason := NULL;
    SELECT c #>> '{}'
    INTO v_text
    FROM jsonb_array_elements(p_req -> 'courses') AS c
    WHERE esmdd.normalize_match_key(c #>> '{}') IN (
      SELECT esmdd.normalize_match_key(x #>> '{}') FROM jsonb_array_elements(v_courses) AS x
    )
    LIMIT 1;

    IF v_text IS NOT NULL THEN
      v_status := 'met';
    ELSIF EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(p_req -> 'courses') AS c
      WHERE esmdd.normalize_match_key(c) = 'any bachelor''s degree'
    ) AND coalesce(v_rank, 0) >= 6 THEN
      v_status := 'met';
      v_reason := 'any_bachelors_degree';
    ELSIF EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(p_req -> 'courses') AS c
      WHERE esmdd.normalize_match_key(c) LIKE '%relevant to the job%'
    ) THEN
      v_status := 'unknown';
      v_reason := 'relevance_needs_review';
    ELSE
      v_status := 'unmet';
    END IF;

    v_criteria := v_criteria || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'key', 'course', 'weight', w_course,
      'status', v_status, 'ratio', CASE WHEN v_status = 'met' THEN 1 ELSE 0 END,
      'required', p_req -> 'courses', 'applicant', v_courses, 'matched', v_text, 'reason', v_reason
    )));
  END IF;

  -- ── Work experience ──
  v_req_num := (p_req ->> 'experience_months')::NUMERIC;
  IF v_req_num > 0 THEN
    SELECT coalesce(sum(substring(w ->> 'number_of_months' FROM '^\s*(\d{1,4})')::INT), 0)
    INTO v_num
    FROM jsonb_array_elements(v_work) AS w;

    v_ratio := least(v_num / v_req_num, 1);
    v_status := CASE WHEN v_ratio >= 1 THEN 'met' WHEN v_ratio >= 0.5 THEN 'partial' ELSE 'unmet' END;

    v_criteria := v_criteria || jsonb_build_array(jsonb_build_object(
      'key', 'experience', 'weight', w_experience,
      'status', v_status, 'ratio', CASE WHEN v_status = 'unmet' THEN 0 ELSE round(v_ratio, 2) END,
      'required_months', v_req_num::INT, 'applicant_months', v_num::INT
    ));
  END IF;

  -- ── Eligibility and license (NSRP keeps both under eligibilities) ──
  IF jsonb_typeof(p_req -> 'eligibility') = 'object' OR jsonb_typeof(p_req -> 'license') = 'object' THEN
    SELECT coalesce(array_agg(DISTINCT k), '{}')
    INTO v_elig_keys
    FROM jsonb_array_elements(v_elig) AS e
    CROSS JOIN LATERAL unnest(esmdd.eligibility_match_keys(e ->> 'eligibility_title')) AS k;
  END IF;

  IF jsonb_typeof(p_req -> 'eligibility') = 'object' THEN
    v_reason := NULL;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_req -> 'eligibility' -> 'keys') AS k WHERE k = ANY (v_elig_keys)) THEN
      v_status := 'met';
    ELSIF (p_req -> 'eligibility' ->> 'listed')::BOOLEAN THEN
      v_status := 'unmet';
    ELSE
      v_status := 'unknown';
      v_reason := 'unlisted_eligibility_needs_review';
    END IF;

    v_criteria := v_criteria || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'key', 'eligibility', 'weight', w_eligibility,
      'status', v_status, 'ratio', CASE WHEN v_status = 'met' THEN 1 ELSE 0 END,
      'required', p_req -> 'eligibility' ->> 'name', 'reason', v_reason
    )));
  END IF;

  IF jsonb_typeof(p_req -> 'license') = 'object' THEN
    v_reason := NULL;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_req -> 'license' -> 'keys') AS k WHERE k = ANY (v_elig_keys)) THEN
      v_status := 'met';
    ELSIF (p_req -> 'license' ->> 'listed')::BOOLEAN THEN
      v_status := 'unmet';
    ELSE
      v_status := 'unknown';
      v_reason := 'unlisted_license_needs_review';
    END IF;

    v_criteria := v_criteria || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'key', 'license', 'weight', w_license,
      'status', v_status, 'ratio', CASE WHEN v_status = 'met' THEN 1 ELSE 0 END,
      'required', p_req -> 'license' ->> 'name', 'reason', v_reason
    )));
  END IF;

  -- ── Training hours: esmdd.training_duration_hours (102); a duration it can't read is unknown ──
  v_req_num := (p_req ->> 'training_hours')::NUMERIC;
  IF v_req_num > 0 THEN
    SELECT coalesce(sum(h.hours), 0), count(*) FILTER (WHERE h.hours IS NULL)
    INTO v_num, v_count
    FROM (
      SELECT esmdd.training_duration_hours(t ->> 'duration') AS hours
      FROM jsonb_array_elements(v_trainings) AS t
    ) h;

    v_reason := NULL;
    v_ratio := least(v_num / v_req_num, 1);
    IF v_ratio >= 1 THEN
      v_status := 'met';
    ELSIF v_count > 0 THEN
      v_status := 'unknown';
      v_reason := 'duration_not_in_hours';
    ELSE
      v_status := esmdd.fit_ratio_status(v_ratio);
    END IF;

    v_criteria := v_criteria || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'key', 'training', 'weight', w_training,
      'status', v_status, 'ratio', CASE WHEN v_status IN ('met', 'partial') THEN round(v_ratio, 2) ELSE 0 END,
      'required_hours', v_req_num::INT, 'applicant_hours', v_num, 'reason', v_reason
    )));
  END IF;

  -- ── Nice-to-have skills (scored, never counted as a requirement) ──
  IF jsonb_array_length(coalesce(p_req -> 'skills_optional', '[]'::JSONB)) > 0 THEN
    SELECT
      jsonb_agg(s ->> 'name'),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      (count(*) FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)))::NUMERIC / count(*)
    INTO v_required, v_matched, v_missing, v_ratio
    FROM jsonb_array_elements(p_req -> 'skills_optional') AS s;

    v_criteria := v_criteria || jsonb_build_array(jsonb_build_object(
      'key', 'skills_optional', 'weight', w_skills_optional,
      'status', esmdd.fit_ratio_status(v_ratio), 'ratio', round(v_ratio, 2),
      'required', v_required, 'matched', v_matched, 'missing', v_missing
    ));
  END IF;

  -- ── Languages the applicant speaks or understands ──
  IF jsonb_array_length(coalesce(p_req -> 'languages', '[]'::JSONB)) > 0 THEN
    SELECT coalesce(array_agg(DISTINCT esmdd.normalize_match_key(l ->> 'language')), '{}')
    INTO v_lang_keys
    FROM jsonb_array_elements(v_langs) AS l
    WHERE lower(coalesce(l ->> 'speak', '')) IN ('true', 't')
       OR lower(coalesce(l ->> 'understand', '')) IN ('true', 't');

    SELECT
      jsonb_agg(s ->> 'name'),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE (s ->> 'key') = ANY (v_lang_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT ((s ->> 'key') = ANY (v_lang_keys))), '[]'::JSONB),
      (count(*) FILTER (WHERE (s ->> 'key') = ANY (v_lang_keys)))::NUMERIC / count(*)
    INTO v_required, v_matched, v_missing, v_ratio
    FROM jsonb_array_elements(p_req -> 'languages') AS s;

    v_criteria := v_criteria || jsonb_build_array(jsonb_build_object(
      'key', 'language', 'weight', w_language,
      'status', esmdd.fit_ratio_status(v_ratio), 'ratio', round(v_ratio, 2),
      'required', v_required, 'matched', v_matched, 'missing', v_missing
    ));
  END IF;

  -- ── Score ──
  SELECT
    coalesce(sum((c ->> 'weight')::NUMERIC), 0),
    coalesce(sum((c ->> 'weight')::NUMERIC * CASE c ->> 'status'
      WHEN 'met' THEN 1
      WHEN 'partial' THEN coalesce((c ->> 'ratio')::NUMERIC, 0)
      ELSE 0
    END), 0),
    count(*) FILTER (WHERE c ->> 'key' <> 'skills_optional'),
    count(*) FILTER (WHERE c ->> 'key' <> 'skills_optional' AND c ->> 'status' = 'met'),
    count(*) FILTER (WHERE c ->> 'status' = 'unknown')
  INTO v_total, v_earned, v_scored, v_met, v_unknown
  FROM jsonb_array_elements(v_criteria) AS c;

  v_score := CASE WHEN v_total > 0 THEN round(v_earned / v_total * 100)::INT END;

  RETURN jsonb_build_object(
    'score', v_score,
    'band', CASE
      WHEN v_score IS NULL THEN NULL
      WHEN v_score >= 80 THEN 'strong'
      WHEN v_score >= 50 THEN 'partial'
      ELSE 'low'
    END,
    'met_count', v_met,
    'required_count', v_scored,
    'unknown_count', v_unknown,
    'criteria', v_criteria
  );
END;
$$;

REVOKE ALL ON FUNCTION esmdd.job_vacancy_fit_for(JSONB, applicants.applicants) FROM PUBLIC, anon, authenticated;

COMMIT;


-- ─── Manual checks (SQL editor; not run by the migration) ───────────────────
--
-- SELECT x, esmdd.training_duration_hours(x)
-- FROM unnest(ARRAY['40 hours', '40 hrs', '40h', '40', '5 days', '2 weeks', '3 months', '3 mos',
--                   '268 hours (TESDA)', 'Forty hours', '', NULL]) AS x;
-- -- 40, 40, 40, 40, 40, 80, 480, 480, 268, NULL, NULL, NULL
--
-- Then reopen an application whose posting asks for training: the Training row reads "has N hours".
