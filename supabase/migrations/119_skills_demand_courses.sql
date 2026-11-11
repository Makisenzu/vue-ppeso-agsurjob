-- ════════════════════════════════════════════════════════════════════════════
-- 119 · Skills Demand → By Course: jobseekers per course in each municipality
-- ════════════════════════════════════════════════════════════════════════════
-- The Skills Demand page (118) counts skills. This adds a second tab that counts courses: for every course on
-- the jobseekers' NSRP education records (SHS strand, TESDA, college, graduate), the open vacancies that ask
-- for it against the Agusan del Sur jobseekers who have it, counted per municipality like 118:
--
--   demand   slots of open vacancies (approved company, posted, not expired) in the municipality whose
--            course_shs_strand or related_courses name the course (the vacancy's place is its establishment's)
--   supply   Agusan del Sur jobseekers living there with the course on an educational_background entry
--            (unemployed only unless p_supply = 'ALL'); one person counts once per course
--   gap      demand - supply of that municipality, never below 0; a course's gap is the sum of its municipalities'
--   surplus  supply - demand of that municipality, never below 0 (people another municipality could draw on)
--
-- Courses are matched by esmdd.normalize_match_key (098), so "bsit " and "BSIT" are one course; the name shown
-- is the core.courses spelling when listed, else the most common typed one. "None" / "N/A" are left out
-- (esmdd.fit_requirement_text). A course only vacancies ask for still shows, with 0 jobseekers.
--
-- RPCs (SECURITY DEFINER; rows only for provincial_peso / admin via esmdd.skills_training_is_staff(), like 118):
--   esmdd.skills_demand_courses_search(...)    the course table, filtered and paged (p_course_key: one course)
--   esmdd.skills_demand_courses_summary(...)   its totals
--   esmdd.skills_demand_course_places(...)     one course by municipality: demand, supply, gap, surplus
--   esmdd.skills_demand_course_supply(...)     the jobseekers who have one course, paged
--
-- skills_demand_course_supply lists names and contacts so PESO can reach them for a referral (staff only, a
-- list summary, as skills_demand_supply in 118); everything else returns counts only.
-- Depends on 098 (normalize_match_key, fit_requirement_text), 110 (sr_profiles, sr_normalize_geo,
-- sr_agusan_municipalities), 118 (skills_training_is_staff, skills_demand_place_name). Safe to re-run.

BEGIN;

-- Earlier drafts returned other columns: drop them so the return types can change
DROP FUNCTION IF EXISTS esmdd.skills_demand_courses_search(TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS esmdd.skills_demand_course_rows(TEXT);

-- One row per course and municipality with demand or supply for it (p_course_key: that course only)
CREATE OR REPLACE FUNCTION esmdd.skills_demand_course_grid(p_supply TEXT DEFAULT 'UNEMPLOYED', p_course_key TEXT DEFAULT NULL)
RETURNS TABLE (
  course_key TEXT,
  raw_course TEXT,
  level TEXT,
  place_key TEXT,
  place TEXT,
  vacancies INT,
  demand INT,
  supply INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Asia/Manila')::DATE AS d
  ),
  -- One row per jobseeker and course on their education record
  edu AS (
    SELECT
      a.id AS applicant_id,
      esmdd.normalize_match_key(e.value ->> 'course') AS ckey,
      btrim(e.value ->> 'course') AS raw_course,
      CASE e.value ->> 'level'
        WHEN 'Senior High School' THEN 'shs_strand'
        WHEN 'Technical-Vocational' THEN 'techvoc'
        WHEN 'College / Tertiary' THEN 'tertiary'
        WHEN 'Post-Graduate / Masteral' THEN 'graduate'
      END AS lvl,
      sp.municipality_key AS pkey
    FROM applicants.applicants a
    JOIN applicants.sr_profiles sp ON sp.applicant_id = a.id AND sp.is_agusan
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(a.educational_background) = 'array' THEN a.educational_background ELSE '[]'::JSONB END
    ) AS e (value)
    WHERE esmdd.fit_requirement_text(e.value ->> 'course') IS NOT NULL
      AND (p_course_key IS NULL OR esmdd.normalize_match_key(e.value ->> 'course') = p_course_key)
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR lower(coalesce(a.employment_status, 'Unemployed')) LIKE '%unemployed%')
  ),
  supply AS (
    SELECT
      ed.ckey,
      ed.pkey,
      mode() WITHIN GROUP (ORDER BY ed.raw_course) AS raw_course,
      mode() WITHIN GROUP (ORDER BY ed.lvl) AS lvl,
      count(DISTINCT ed.applicant_id)::INT AS n
    FROM edu ed
    GROUP BY ed.ckey, ed.pkey
  ),
  -- One row per open vacancy and course it accepts (a course named twice on a vacancy counts once)
  vacancy_courses AS (
    SELECT DISTINCT ON (v.id, esmdd.normalize_match_key(c.name))
      v.id AS vacancy_id,
      esmdd.normalize_match_key(c.name) AS ckey,
      btrim(c.name) AS raw_course,
      greatest(coalesce(v.vacancy_count, 1), 1) AS slots,
      coalesce(nullif(applicants.sr_normalize_geo(e.city_municipality), ''), 'unspecified') AS pkey,
      e.city_municipality AS raw_place
    FROM esmdd.job_vacancies v
    JOIN employers.establishments e ON e.id = v.establishment_id
    JOIN employers.companies co ON co.id = e.company_id
    CROSS JOIN LATERAL unnest(array_prepend(v.course_shs_strand, coalesce(v.related_courses, '{}'))) AS c (name)
    CROSS JOIN today
    WHERE coalesce(v.status::TEXT, 'open') = 'open'
      AND co.verification_status::TEXT = 'approved'
      AND (v.posting_date IS NULL OR v.posting_date::DATE <= today.d)
      AND (v.valid_until IS NULL OR v.valid_until::DATE >= today.d)
      AND esmdd.fit_requirement_text(c.name) IS NOT NULL
      AND (p_course_key IS NULL OR esmdd.normalize_match_key(c.name) = p_course_key)
    ORDER BY v.id, esmdd.normalize_match_key(c.name)
  ),
  demand AS (
    SELECT vc.ckey, vc.pkey, min(vc.raw_course) AS raw_course, min(vc.raw_place) AS raw_place,
           count(*)::INT AS vacancies, sum(vc.slots)::INT AS slots
    FROM vacancy_courses vc
    GROUP BY vc.ckey, vc.pkey
  ),
  cells AS (
    SELECT s.ckey, s.pkey FROM supply s
    UNION SELECT d.ckey, d.pkey FROM demand d
  )
  SELECT
    k.ckey,
    coalesce(s.raw_course, d.raw_course),
    s.lvl,
    k.pkey,
    esmdd.skills_demand_place_name(k.pkey, d.raw_place),
    coalesce(d.vacancies, 0),
    coalesce(d.slots, 0),
    coalesce(s.n, 0)
  FROM cells k
  LEFT JOIN supply s ON s.ckey = k.ckey AND s.pkey = k.pkey
  LEFT JOIN demand d ON d.ckey = k.ckey AND d.pkey = k.pkey
  WHERE k.ckey IS NOT NULL
    AND (SELECT esmdd.skills_training_is_staff());
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_course_grid(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- One row per course: totals, its jobseekers per municipality (sr_agusan_municipalities() order) and its gap
CREATE OR REPLACE FUNCTION esmdd.skills_demand_course_rows(p_supply TEXT DEFAULT 'UNEMPLOYED', p_course_key TEXT DEFAULT NULL)
RETURNS TABLE (
  course_key TEXT,
  course TEXT,
  level TEXT,
  applicants INT,
  places INT[],
  vacancies INT,
  demand_slots INT,
  gap INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH mu AS (
    SELECT applicants.sr_normalize_geo(t.name) AS pkey, t.ord
    FROM unnest(applicants.sr_agusan_municipalities()) WITH ORDINALITY AS t (name, ord)
  ),
  g AS (
    SELECT x.*, greatest(x.demand - x.supply, 0) AS local_gap
    FROM esmdd.skills_demand_course_grid(coalesce(p_supply, 'UNEMPLOYED'), p_course_key) x
  ),
  agg AS (
    SELECT
      g.course_key,
      mode() WITHIN GROUP (ORDER BY g.raw_course) AS raw_course,
      mode() WITHIN GROUP (ORDER BY g.level) AS lvl,
      sum(g.supply)::INT AS applicants,
      sum(g.vacancies)::INT AS vacancies,
      sum(g.demand)::INT AS slots,
      coalesce(sum(g.local_gap) FILTER (WHERE g.demand > 0), 0)::INT AS gap
    FROM g
    GROUP BY g.course_key
  )
  SELECT
    a.course_key,
    coalesce(lc.name, a.raw_course)::TEXT,
    coalesce(a.lvl, lc.level)::TEXT,
    a.applicants,
    ARRAY(
      SELECT coalesce(c.supply, 0)
      FROM mu
      LEFT JOIN g c ON c.course_key = a.course_key AND c.place_key = mu.pkey
      ORDER BY mu.ord
    ),
    a.vacancies,
    a.slots,
    a.gap
  FROM agg a
  LEFT JOIN LATERAL (
    SELECT cc.name, cc.level
    FROM core.courses cc
    WHERE esmdd.normalize_match_key(cc.name) = a.course_key
    ORDER BY (cc.level = a.lvl) DESC NULLS LAST, cc.sort_order, cc.id
    LIMIT 1
  ) lc ON true;
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_course_rows(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- The course table: biggest gap first, then the most jobseekers. p_municipality keeps the courses with
-- jobseekers there and ranks by that municipality. p_level: 'ALL', a core.courses level, or 'OTHER' (a course
-- only vacancies name, with no level). p_course_key: that course's row alone (the course page).
CREATE FUNCTION esmdd.skills_demand_courses_search(
  p_supply TEXT DEFAULT 'UNEMPLOYED',
  p_search TEXT DEFAULT NULL,
  p_level TEXT DEFAULT NULL,
  p_municipality TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_course_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  course_key TEXT,
  course TEXT,
  level TEXT,
  applicants INT,
  places INT[],
  vacancies INT,
  demand_slots INT,
  gap INT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH f AS (
    SELECT
      nullif(btrim(coalesce(p_search, '')), '') AS q,
      coalesce(nullif(p_level, ''), 'ALL') AS lvl,
      -- Position of the municipality in sr_agusan_municipalities(), NULL for the whole province
      (
        SELECT t.ord::INT
        FROM unnest(applicants.sr_agusan_municipalities()) WITH ORDINALITY AS t (name, ord)
        WHERE coalesce(p_municipality, 'ALL') <> 'ALL'
          AND applicants.sr_normalize_geo(t.name) = applicants.sr_normalize_geo(p_municipality)
        LIMIT 1
      ) AS place_ord
  )
  SELECT r.course_key, r.course, r.level, r.applicants, r.places, r.vacancies, r.demand_slots, r.gap, count(*) OVER ()
  FROM esmdd.skills_demand_course_rows(coalesce(p_supply, 'UNEMPLOYED'), p_course_key) r
  CROSS JOIN f
  WHERE (f.q IS NULL OR r.course ILIKE '%' || f.q || '%')
    AND (f.lvl = 'ALL' OR (f.lvl = 'OTHER' AND r.level IS NULL) OR r.level = f.lvl)
    AND (f.place_ord IS NULL OR r.places[f.place_ord] > 0)
  ORDER BY
    r.places[f.place_ord] DESC NULLS LAST,
    r.gap DESC,
    r.demand_slots DESC,
    r.applicants DESC,
    r.course
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

-- Totals above the course table
CREATE OR REPLACE FUNCTION esmdd.skills_demand_courses_summary(p_supply TEXT DEFAULT 'UNEMPLOYED')
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'courses_on_record', count(*) FILTER (WHERE r.applicants > 0),
    'courses_in_demand', count(*) FILTER (WHERE r.demand_slots > 0),
    'courses_without_supply', count(*) FILTER (WHERE r.demand_slots > 0 AND r.applicants = 0),
    'total_demand', coalesce(sum(r.demand_slots), 0)
  )
  FROM esmdd.skills_demand_course_rows(coalesce(p_supply, 'UNEMPLOYED')) r;
$$;

-- One course, by municipality: where it is short and where jobseekers could come from (surplus)
CREATE OR REPLACE FUNCTION esmdd.skills_demand_course_places(p_course_key TEXT, p_supply TEXT DEFAULT 'UNEMPLOYED')
RETURNS TABLE (
  place_key TEXT,
  place TEXT,
  vacancies INT,
  demand INT,
  supply INT,
  gap INT,
  surplus INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    g.place_key,
    g.place,
    g.vacancies,
    g.demand,
    g.supply,
    greatest(g.demand - g.supply, 0),
    greatest(g.supply - g.demand, 0)
  FROM esmdd.skills_demand_course_grid(coalesce(p_supply, 'UNEMPLOYED'), p_course_key) g
  WHERE p_course_key IS NOT NULL
  ORDER BY greatest(g.demand - g.supply, 0) DESC, g.demand DESC, greatest(g.supply - g.demand, 0) DESC, g.place;
$$;

-- Who has one course, by name. p_municipality: NULL / 'ALL' for the whole province, 'NEEDED' for the
-- municipalities whose vacancies ask for it, or a municipality name. Staff only, one page at a time.
CREATE OR REPLACE FUNCTION esmdd.skills_demand_course_supply(
  p_course_key TEXT,
  p_municipality TEXT DEFAULT NULL,
  p_supply TEXT DEFAULT 'UNEMPLOYED',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  applicant_id UUID,
  surname TEXT,
  first_name TEXT,
  middle_name TEXT,
  suffix TEXT,
  contact_number TEXT,
  email TEXT,
  municipality TEXT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH m AS (
    SELECT coalesce(nullif(btrim(coalesce(p_municipality, '')), ''), 'ALL') AS mode
  ),
  needed AS (
    SELECT DISTINCT g.place_key
    FROM esmdd.skills_demand_course_grid(coalesce(p_supply, 'UNEMPLOYED'), p_course_key) g
    WHERE g.demand > 0 AND (SELECT m.mode FROM m) = 'NEEDED'
  ),
  holders AS (
    SELECT DISTINCT a.id AS holder_id
    FROM applicants.applicants a
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(a.educational_background) = 'array' THEN a.educational_background ELSE '[]'::JSONB END
    ) AS e (value)
    WHERE esmdd.normalize_match_key(e.value ->> 'course') = p_course_key
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR lower(coalesce(a.employment_status, 'Unemployed')) LIKE '%unemployed%')
  )
  SELECT
    a.id,
    upper(btrim(a.surname))::TEXT,
    btrim(a.first_name)::TEXT,
    nullif(btrim(coalesce(a.middle_name, '')), '')::TEXT,
    nullif(btrim(coalesce(a.suffix, '')), '')::TEXT,
    nullif(array_to_string(a.contact_numbers, ', '), '')::TEXT,
    nullif(btrim(coalesce(a.email, '')), '')::TEXT,
    sp.municipality::TEXT,
    count(*) OVER ()
  FROM holders h
  JOIN applicants.applicants a ON a.id = h.holder_id
  JOIN applicants.sr_profiles sp ON sp.applicant_id = a.id AND sp.is_agusan
  CROSS JOIN m
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND p_course_key IS NOT NULL
    AND (
      m.mode = 'ALL'
      OR (m.mode = 'NEEDED' AND sp.municipality_key IN (SELECT n.place_key FROM needed n))
      OR (m.mode NOT IN ('ALL', 'NEEDED') AND sp.municipality_key = applicants.sr_normalize_geo(m.mode))
    )
  ORDER BY sp.municipality, upper(a.surname), upper(a.first_name), a.id
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION esmdd.skills_demand_courses_search(TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_courses_summary(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_course_places(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_course_supply(TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_courses_search(TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_courses_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_course_places(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_course_supply(TEXT, TEXT, TEXT, INT, INT) TO authenticated;

COMMIT;
