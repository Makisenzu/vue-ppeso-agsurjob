-- =============================================================================
-- Migration: 098_job_vacancy_fit.sql
-- Purpose:   How well an applicant meets a vacancy's requirements, from data already collected:
--            the vacancy's matching fields (084–096) against the applicant's NSRP record. Advisory
--            only: it sorts and informs, it never rejects or hides anyone.
--
--              esmdd.job_vacancies (+ job_vacancy_skills)  ─┐
--                                                           ├─> esmdd.job_vacancy_fit_for() ─> JSONB
--              applicants.applicants (+ applicant_skills)  ─┘
--
--            1. Helpers (internal): normalize_match_key (same rule as job_vacancy_skills.skill_key),
--               match_jsonb_array, fit_requirement_text, vacancy/applicant education ranks,
--               eligibility_match_keys (name or abbreviation through core.eligibilities).
--            2. esmdd.job_vacancy_fit_requirements(vacancy): the vacancy side, read once per call.
--            3. esmdd.job_vacancy_fit_for(requirements, applicant row): the comparison.
--               esmdd.compute_job_vacancy_fit(vacancy, applicant): both together.
--               None of these are callable by users; only the wrappers below are.
--            4. Wrappers:
--                 esmdd.my_job_vacancy_fit(vacancy)                the signed-in applicant's own fit
--                 esmdd.get_job_vacancy_application_fit(app)       one application's full breakdown
--                                                                  (reviewers; logs the view)
--                 esmdd.search_job_vacancy_applications(…)         + fit_score, fit_band, fit counts,
--                                                                  p_sort ('newest' | 'fit'), p_fit_band
--
-- Criteria (only those the vacancy fills in are scored; "None" / empty = not required):
--   key               weight  rule
--   skills_required     30    must-have skills matched / required (all = met, some = partial)
--   education           15    applicant's highest education rank ≥ the required rank
--   course              15    a course matches course_shs_strand / related_courses; "Any bachelor's
--                             degree" = College Graduate or higher; "…relevant to the job" = unknown
--   experience          15    sum of work_experiences.number_of_months ≥ required (≥ 50% = partial)
--   eligibility         10    an NSRP eligibility matches by name or abbreviation
--   license             10    same, against the vacancy's license
--   training             5    sum of vocational_trainings.duration in hours ≥ required
--   skills_optional      5    nice-to-have skills matched (score only, not in met/required counts)
--   language             5    languages the applicant speaks or understands / required
--
--   Statuses: met | partial | unmet | unknown (cannot be judged from the data: check documents).
--   score = Σ weight × (met 1, partial ratio, else 0) ÷ Σ weight of scored criteria × 100, rounded;
--   NULL when the vacancy has no criteria. band: strong ≥ 80, partial 50–79, low < 50.
--
--   Not scored, on purpose: sex, age, civil status, religion, disability, OFW status. accepts_pwd /
--   accepts_returning_ofw are inclusion flags, not qualifications (RA 10173 sensitive personal info).
--
-- Access Matrix:
--   Resource                              | admin / provincial_peso | company owner / members (own vacancy) | applicant
--   --------------------------------------|-------------------------|---------------------------------------|----------
--   compute_job_vacancy_fit + helpers     | none (internal)         | none (internal)                       | none
--   my_job_vacancy_fit                    | own NSRP record only    | own NSRP record only                  | own
--   get_job_vacancy_application_fit       | yes                     | applications to their vacancies       | none
--   search_job_vacancy_applications       | yes (unchanged gate)    | own vacancies (unchanged gate)        | none
--   The core takes any vacancy and applicant, so it stays internal: exposed, an employer could probe any
--   applicant's education, licenses and skills against made-up vacancies.
--
-- Personal data (PRIVACY.md): nothing is stored; the fit is computed on request from the NSRP record.
-- The per-application breakdown shows parts of that record, so get_job_vacancy_application_fit logs a
-- VIEW like get_job_vacancy_application (§5.2). The list shows only the score, as it shows the course.
--
-- Notified events: none.
-- Depends on 084, 085, 087, 089, 093, 094, 096. After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Helpers (internal) ──────────────────────────────────────────────────

/** Lower case, trimmed, single spaces; NULL when blank. Same rule as job_vacancy_skills.skill_key (084) */
CREATE OR REPLACE FUNCTION esmdd.normalize_match_key(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT nullif(lower(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g')), '');
$$;

/** NSRP JSON fields hold an array of entries; older rows may hold one object or nothing */
CREATE OR REPLACE FUNCTION esmdd.match_jsonb_array(p_value JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE jsonb_typeof(p_value)
    WHEN 'array' THEN p_value
    WHEN 'object' THEN jsonb_build_array(p_value)
    ELSE '[]'::JSONB
  END;
$$;

/** A vacancy requirement as text, or NULL when it asks for nothing ("None", the form's NOT_REQUIRED) */
CREATE OR REPLACE FUNCTION esmdd.fit_requirement_text(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN esmdd.normalize_match_key(p_value) IS NULL THEN NULL
    WHEN esmdd.normalize_match_key(p_value) IN ('none', 'n/a', 'na', 'not required') THEN NULL
    ELSE btrim(p_value)
  END;
$$;

/** Rank of a vacancy's educational_level (VACANCY_EDUCATION_LEVELS); NULL for a typed "Others" level */
CREATE OR REPLACE FUNCTION esmdd.vacancy_education_rank(p_level TEXT)
RETURNS SMALLINT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE esmdd.normalize_match_key(p_level)
    WHEN 'elementary graduate' THEN 1
    WHEN 'high school graduate' THEN 2
    WHEN 'senior high school graduate' THEN 3
    WHEN 'technical-vocational / tesda graduate' THEN 4
    WHEN 'college level' THEN 5
    WHEN 'college graduate' THEN 6
    WHEN 'post-graduate / masteral' THEN 7
    WHEN 'doctorate' THEN 8
  END::SMALLINT;
$$;

/**
 * Rank of one NSRP education entry on the vacancy scale. Graduated = a year_graduated, or a level that
 * says "graduate" (older rows: "College Graduate"; not "undergraduate"). Not graduated = one rank lower.
 */
CREATE OR REPLACE FUNCTION esmdd.applicant_education_rank(p_level TEXT, p_year_graduated TEXT)
RETURNS SMALLINT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  WITH k AS (
    SELECT
      esmdd.normalize_match_key(p_level) AS lvl,
      (
        nullif(btrim(coalesce(p_year_graduated, '')), '') IS NOT NULL
        OR esmdd.normalize_match_key(p_level) ~ '(^|[^a-z])graduate'
      ) AS graduated
  )
  SELECT CASE
    WHEN lvl IS NULL THEN NULL
    WHEN lvl LIKE '%doctor%' THEN 8
    WHEN lvl LIKE '%post%grad%' OR lvl LIKE '%master%' THEN 7
    WHEN lvl LIKE '%college%' OR lvl LIKE '%tertiary%' THEN CASE WHEN graduated THEN 6 ELSE 5 END
    WHEN lvl LIKE '%vocational%' OR lvl LIKE '%tesda%' THEN CASE WHEN graduated THEN 4 ELSE 3 END
    WHEN lvl LIKE '%senior high%' THEN CASE WHEN graduated THEN 3 ELSE 2 END
    WHEN lvl LIKE '%secondary%' OR lvl LIKE '%high school%' THEN CASE WHEN graduated THEN 2 ELSE 1 END
    WHEN lvl LIKE '%elementary%' OR lvl LIKE '%primary%' THEN CASE WHEN graduated THEN 1 ELSE 0 END
  END::SMALLINT
  FROM k;
$$;

/** Keys an eligibility / license matches on: its own, plus the listed row's name and abbreviation (094) */
CREATE OR REPLACE FUNCTION esmdd.eligibility_match_keys(p_value TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT s.k) FILTER (WHERE s.k IS NOT NULL), '{}')
  FROM (
    SELECT esmdd.normalize_match_key(p_value) AS k
    UNION ALL
    SELECT esmdd.normalize_match_key(t.x)
    FROM core.eligibilities e
    CROSS JOIN LATERAL (VALUES (e.name), (e.abbreviation)) AS t (x)
    WHERE esmdd.normalize_match_key(p_value) IS NOT NULL
      AND esmdd.normalize_match_key(p_value) IN (
        esmdd.normalize_match_key(e.name),
        esmdd.normalize_match_key(e.abbreviation)
      )
  ) s;
$$;

/** "met" when the whole ratio is reached, "partial" for some, "unmet" for none */
CREATE OR REPLACE FUNCTION esmdd.fit_ratio_status(p_ratio NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_ratio >= 1 THEN 'met' WHEN p_ratio > 0 THEN 'partial' ELSE 'unmet' END;
$$;


-- ─── 2. The vacancy side ────────────────────────────────────────────────────

/** What a vacancy asks for, in the shape job_vacancy_fit_for() reads; NULL when the vacancy is gone */
CREATE OR REPLACE FUNCTION esmdd.job_vacancy_fit_requirements(p_job_vacancy_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v esmdd.job_vacancies%ROWTYPE;
  v_eligibility TEXT;
  v_license TEXT;
BEGIN
  SELECT * INTO v FROM esmdd.job_vacancies WHERE id = p_job_vacancy_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_eligibility := esmdd.fit_requirement_text(v.eligibility);
  v_license := esmdd.fit_requirement_text(v.license);

  RETURN jsonb_build_object(
    'education_level', esmdd.fit_requirement_text(v.educational_level),
    'courses', (
      SELECT coalesce(jsonb_agg(DISTINCT esmdd.fit_requirement_text(c)), '[]'::JSONB)
      FROM unnest(array_prepend(v.course_shs_strand, coalesce(v.related_courses, '{}'))) AS c
      WHERE esmdd.fit_requirement_text(c) IS NOT NULL
    ),
    'skills_required', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', s.skill_name, 'key', s.skill_key) ORDER BY s.skill_name), '[]'::JSONB)
      FROM esmdd.job_vacancy_skills s
      WHERE s.job_vacancy_id = v.id AND s.is_required
    ),
    'skills_optional', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', s.skill_name, 'key', s.skill_key) ORDER BY s.skill_name), '[]'::JSONB)
      FROM esmdd.job_vacancy_skills s
      WHERE s.job_vacancy_id = v.id AND NOT s.is_required
    ),
    'experience_months', CASE WHEN coalesce(v.work_experience_months, 0) > 0 THEN v.work_experience_months END,
    'eligibility', CASE WHEN v_eligibility IS NOT NULL THEN jsonb_build_object(
      'name', v_eligibility,
      'keys', to_jsonb(esmdd.eligibility_match_keys(v_eligibility)),
      'listed', EXISTS (
        SELECT 1 FROM core.eligibilities e
        WHERE esmdd.normalize_match_key(v_eligibility)
          IN (esmdd.normalize_match_key(e.name), esmdd.normalize_match_key(e.abbreviation))
      )
    ) END,
    'license', CASE WHEN v_license IS NOT NULL THEN jsonb_build_object(
      'name', v_license,
      'keys', to_jsonb(esmdd.eligibility_match_keys(v_license)),
      'listed', EXISTS (
        SELECT 1 FROM core.eligibilities e
        WHERE esmdd.normalize_match_key(v_license)
          IN (esmdd.normalize_match_key(e.name), esmdd.normalize_match_key(e.abbreviation))
      )
    ) END,
    'training_hours', CASE WHEN coalesce(v.training_hours, 0) > 0 THEN v.training_hours END,
    'languages', (
      SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('name', btrim(l), 'key', esmdd.normalize_match_key(l))), '[]'::JSONB)
      FROM unnest(coalesce(v.language_dialect_spoken, '{}')) AS l
      WHERE esmdd.fit_requirement_text(l) IS NOT NULL
    )
  );
END;
$$;


-- ─── 3. The comparison ──────────────────────────────────────────────────────

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
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE (s ->> 'key') = ANY (v_skill_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT ((s ->> 'key') = ANY (v_skill_keys))), '[]'::JSONB),
      (count(*) FILTER (WHERE (s ->> 'key') = ANY (v_skill_keys)))::NUMERIC / count(*)
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

  -- ── Training hours: "40 hours" / "40 hrs" / "8h"; anything else cannot be counted ──
  v_req_num := (p_req ->> 'training_hours')::NUMERIC;
  IF v_req_num > 0 THEN
    SELECT coalesce(sum(h.hours), 0), count(*) FILTER (WHERE h.hours IS NULL)
    INTO v_num, v_count
    FROM (
      SELECT substring(lower(t ->> 'duration') FROM '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\y')::NUMERIC AS hours
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
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE (s ->> 'key') = ANY (v_skill_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT ((s ->> 'key') = ANY (v_skill_keys))), '[]'::JSONB),
      (count(*) FILTER (WHERE (s ->> 'key') = ANY (v_skill_keys)))::NUMERIC / count(*)
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

/** One vacancy and one applicant. Internal: callers must already be allowed to see both */
CREATE OR REPLACE FUNCTION esmdd.compute_job_vacancy_fit(p_job_vacancy_id UUID, p_applicant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applicant applicants.applicants%ROWTYPE;
BEGIN
  SELECT * INTO v_applicant FROM applicants.applicants WHERE id = p_applicant_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN esmdd.job_vacancy_fit_for(esmdd.job_vacancy_fit_requirements(p_job_vacancy_id), v_applicant);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.normalize_match_key(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.match_jsonb_array(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.fit_requirement_text(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.vacancy_education_rank(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.applicant_education_rank(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.eligibility_match_keys(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.fit_ratio_status(NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.job_vacancy_fit_requirements(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.job_vacancy_fit_for(JSONB, applicants.applicants) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.compute_job_vacancy_fit(UUID, UUID) FROM PUBLIC, anon, authenticated;


-- ─── 4. Wrappers ────────────────────────────────────────────────────────────

/** The signed-in applicant's own fit to a vacancy, before or after applying; NULL without an NSRP record */
CREATE OR REPLACE FUNCTION esmdd.my_job_vacancy_fit(p_job_vacancy_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applicant applicants.applicants%ROWTYPE;
  v_req JSONB;
BEGIN
  SELECT * INTO v_applicant FROM applicants.applicants WHERE profile_id = (SELECT auth.uid()) LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_req := esmdd.job_vacancy_fit_requirements(p_job_vacancy_id);
  IF v_req IS NULL THEN
    RAISE EXCEPTION 'This job posting could not be found' USING ERRCODE = 'P0002';
  END IF;

  RETURN esmdd.job_vacancy_fit_for(v_req, v_applicant);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.my_job_vacancy_fit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.my_job_vacancy_fit(UUID) TO authenticated;

/** One application's full breakdown, for the vacancy's reviewers; logs the view (PRIVACY.md §5.2) */
CREATE OR REPLACE FUNCTION esmdd.get_job_vacancy_application_fit(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_application esmdd.job_vacancy_applications%ROWTYPE;
  v_profile_id UUID;
BEGIN
  SELECT * INTO v_application FROM esmdd.job_vacancy_applications WHERE id = p_application_id;
  IF NOT FOUND OR NOT esmdd.can_review_job_vacancy(v_application.job_vacancy_id) THEN
    RAISE EXCEPTION 'This application could not be found' USING ERRCODE = 'P0002';
  END IF;

  SELECT a.profile_id INTO v_profile_id FROM applicants.applicants a WHERE a.id = v_application.applicant_id;

  PERFORM system.write_audit_log(
    'VIEW',
    'applicants.applicants',
    v_application.applicant_id::TEXT,
    v_profile_id,
    NULL,
    jsonb_build_object('via', 'esmdd.get_job_vacancy_application_fit', 'application_id', v_application.id)
  );

  RETURN esmdd.compute_job_vacancy_fit(v_application.job_vacancy_id, v_application.applicant_id);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.get_job_vacancy_application_fit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.get_job_vacancy_application_fit(UUID) TO authenticated;


-- ─── 5. Applicants list: fit columns, sort by fit, band filter ──────────────
-- Same as 093, plus fit_*; p_sort and p_fit_band come last with defaults, so existing named calls work.
-- The fit is computed for every filtered application (sorting needs it), with the vacancy read once.

DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT);
DROP FUNCTION IF EXISTS esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT, TEXT, TEXT);

CREATE FUNCTION esmdd.search_job_vacancy_applications(
  p_job_vacancy_id UUID,
  p_search TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_shortlisted BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_sort TEXT DEFAULT 'newest',
  p_fit_band TEXT DEFAULT NULL
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
  fit_score INT,
  fit_band TEXT,
  fit_met_count INT,
  fit_required_count INT,
  fit_unknown_count INT,
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
DECLARE
  v_req JSONB;
  v_sort_fit BOOLEAN := lower(btrim(coalesce(p_sort, ''))) = 'fit';
  v_band TEXT := nullif(lower(btrim(coalesce(p_fit_band, ''))), '');
BEGIN
  IF NOT esmdd.can_review_job_vacancy(p_job_vacancy_id) THEN
    RAISE EXCEPTION 'You can only view the applicants of your own job postings' USING ERRCODE = '42501';
  END IF;

  v_req := esmdd.job_vacancy_fit_requirements(p_job_vacancy_id);

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
    (f.fit ->> 'score')::INT,
    f.fit ->> 'band',
    (f.fit ->> 'met_count')::INT,
    (f.fit ->> 'required_count')::INT,
    (f.fit ->> 'unknown_count')::INT,
    ja.created_at,
    ja.updated_at,
    count(*) OVER ()
  FROM esmdd.job_vacancy_applications ja
  JOIN applicants.applicants a ON a.id = ja.applicant_id
  LEFT JOIN esmdd.job_vacancy_stages st ON st.id = ja.stage_id
  LEFT JOIN esmdd.job_vacancy_application_shortlists sl ON sl.application_id = ja.id
  CROSS JOIN LATERAL (SELECT esmdd.job_vacancy_fit_for(v_req, a) AS fit) f
  WHERE ja.job_vacancy_id = p_job_vacancy_id
    AND (nullif(btrim(p_stage), '') IS NULL OR ja.stage = btrim(p_stage))
    -- Rejected applications keep their step but are listed under Not selected only
    AND (p_stage_id IS NULL OR (ja.stage_id = p_stage_id AND ja.stage <> 'rejected'))
    AND (NOT coalesce(p_shortlisted, FALSE) OR sl.application_id IS NOT NULL)
    AND (v_band IS NULL OR f.fit ->> 'band' = v_band)
    AND (
      nullif(btrim(p_search), '') IS NULL
      OR concat_ws(' ', a.first_name, a.middle_name, a.surname, a.suffix) ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY
    CASE WHEN v_sort_fit THEN (f.fit ->> 'score')::INT END DESC NULLS LAST,
    ja.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.search_job_vacancy_applications(UUID, TEXT, TEXT, UUID, BOOLEAN, INT, INT, TEXT, TEXT) TO authenticated;

COMMIT;


-- ─── Manual checks (SQL editor, as postgres; not run by the migration) ──────
--
-- 1. Rank mapping
--   SELECT esmdd.applicant_education_rank('College / Tertiary', '2020');      -- 6
--   SELECT esmdd.applicant_education_rank('College / Tertiary', NULL);        -- 5
--   SELECT esmdd.applicant_education_rank('College Undergraduate', NULL);     -- 5 (not "graduate")
--   SELECT esmdd.applicant_education_rank('Senior High School', '');          -- 2
--   SELECT esmdd.vacancy_education_rank('College Graduate');                  -- 6
--
-- 2. Duration parsing (training)
--   SELECT substring(lower(x) FROM '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\y')::NUMERIC
--   FROM unnest(ARRAY['40 hours', '8 hrs', '16h', '3 days', 'Forty hours']) x;  -- 40, 8, 16, NULL, NULL
--
-- 3. A real pair: all statuses, matched / missing lists, score and band
--   SELECT jsonb_pretty(esmdd.compute_job_vacancy_fit('<vacancy id>', '<applicant id>'));
--
-- 4. Empty vacancy (no criteria filled in) → score NULL, band NULL, criteria []
--
-- 5. Access, as an employer (set role authenticated + request.jwt.claims sub):
--   SELECT esmdd.compute_job_vacancy_fit(…);                   -- permission denied
--   SELECT esmdd.get_job_vacancy_application_fit('<other company''s application>');  -- P0002
--   SELECT * FROM esmdd.search_job_vacancy_applications('<own vacancy>', p_sort => 'fit');
