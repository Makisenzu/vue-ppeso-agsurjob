-- ════════════════════════════════════════════════════════════════════════════
-- 122 · Skills Demand → By Skill: keep skills whose vacancies have closed
-- ════════════════════════════════════════════════════════════════════════════
-- Until now a skill left the By Skill table as soon as its last open vacancy closed, so the history was lost.
-- Provincial PESO wants every skill a vacancy ever required to stay, so the data builds up over the years.
--
-- Each skill row now also carries the closed postings that required it:
--   closed_vacancies / closed_slots   vacancies (approved company, posted) that are closed, filled, cancelled
--                                     or past valid_until, and their slots
-- Demand, gap and surplus still count OPEN vacancies only (118); a skill whose vacancies are all closed shows
-- 0 demand and 0 gap, with its closed slots and its supply. The totals' "skills in demand" stays open-only.
-- "Open" is the same rule as 118 / 121: status 'open' and not past valid_until.
--
-- Replaces from 118: skills_demand_grid (+ closed columns), skills_demand_rows and skills_demand_search
-- (+ closed columns, closed-only skills kept), skills_demand_places (closed-only municipalities left out),
-- skills_demand_summary (skills_in_demand open-only). Counts only: no personal data. Safe to re-run.

BEGIN;

-- The return types gain the closed columns: drop the old ones first
DROP FUNCTION IF EXISTS esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT, INT);
DROP FUNCTION IF EXISTS esmdd.skills_demand_rows(TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS esmdd.skills_demand_grid(TEXT, INT);

-- One row per skill a vacancy requires and municipality with demand, closed postings or supply for it
CREATE FUNCTION esmdd.skills_demand_grid(p_supply TEXT DEFAULT 'UNEMPLOYED', p_skill_id INT DEFAULT NULL)
RETURNS TABLE (
  skill_id INT,
  place_key TEXT,
  place TEXT,
  vacancies INT,
  demand INT,
  supply INT,
  trained INT,
  closed_vacancies INT,
  closed_demand INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Asia/Manila')::DATE AS d
  ),
  -- One row per vacancy and required skill, open or closed (two wordings of one skill on a vacancy count once)
  vacancy_skills AS (
    SELECT DISTINCT
      v.id AS vacancy_id,
      ks.skill_id AS sid,
      greatest(coalesce(v.vacancy_count, 1), 1) AS slots,
      coalesce(nullif(applicants.sr_normalize_geo(e.city_municipality), ''), 'unspecified') AS pkey,
      e.city_municipality AS raw_place,
      (coalesce(v.status::TEXT, 'open') = 'open' AND (v.valid_until IS NULL OR v.valid_until::DATE >= today.d)) AS is_open
    FROM esmdd.job_vacancies v
    JOIN employers.establishments e ON e.id = v.establishment_id
    JOIN employers.companies c ON c.id = e.company_id
    JOIN esmdd.job_vacancy_skills ks ON ks.job_vacancy_id = v.id AND ks.is_required AND ks.skill_id IS NOT NULL
    CROSS JOIN today
    WHERE c.verification_status::TEXT = 'approved'
      AND (v.posting_date IS NULL OR v.posting_date::DATE <= today.d)
      AND (p_skill_id IS NULL OR ks.skill_id = p_skill_id)
  ),
  demand AS (
    SELECT
      vs.sid,
      vs.pkey,
      min(vs.raw_place) AS raw_place,
      (count(*) FILTER (WHERE vs.is_open))::INT AS vacancies,
      coalesce(sum(vs.slots) FILTER (WHERE vs.is_open), 0)::INT AS slots,
      (count(*) FILTER (WHERE NOT vs.is_open))::INT AS closed_vacancies,
      coalesce(sum(vs.slots) FILTER (WHERE NOT vs.is_open), 0)::INT AS closed_slots
    FROM vacancy_skills vs
    GROUP BY vs.sid, vs.pkey
  ),
  -- Only the skills a vacancy requires are counted, so the index is never aggregated whole
  wanted AS (
    SELECT DISTINCT d.sid FROM demand d
  ),
  holders AS (
    SELECT i.skill_id AS sid, sp.municipality_key AS pkey, count(DISTINCT i.applicant_id)::INT AS n
    FROM applicants.applicant_skill_index i
    JOIN applicants.sr_profiles sp ON sp.applicant_id = i.applicant_id AND sp.is_agusan
    JOIN applicants.applicants a ON a.id = i.applicant_id
    WHERE i.skill_id IN (SELECT w.sid FROM wanted w)
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR lower(coalesce(a.employment_status, 'Unemployed')) LIKE '%unemployed%')
    GROUP BY i.skill_id, sp.municipality_key
  ),
  trained AS (
    SELECT ts.skill_id AS sid, sp.municipality_key AS pkey, count(DISTINCT p.applicant_id)::INT AS n
    FROM esmdd.skills_training_skills ts
    JOIN esmdd.skills_training_participants p ON p.training_id = ts.training_id AND p.completion_status = 'Completed'
    JOIN applicants.sr_profiles sp ON sp.applicant_id = p.applicant_id AND sp.is_agusan
    WHERE ts.skill_id IN (SELECT w.sid FROM wanted w)
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR p.employment_status NOT IN ('Hired', 'Self-Employed'))
      AND NOT EXISTS (
        SELECT 1 FROM applicants.applicant_skill_index i
        WHERE i.applicant_id = p.applicant_id AND i.skill_id = ts.skill_id
      )
    GROUP BY ts.skill_id, sp.municipality_key
  ),
  cells AS (
    SELECT d.sid, d.pkey FROM demand d
    UNION SELECT h.sid, h.pkey FROM holders h
    UNION SELECT t.sid, t.pkey FROM trained t
  )
  SELECT
    k.sid,
    k.pkey,
    esmdd.skills_demand_place_name(k.pkey, d.raw_place),
    coalesce(d.vacancies, 0),
    coalesce(d.slots, 0),
    coalesce(h.n, 0),
    coalesce(t.n, 0),
    coalesce(d.closed_vacancies, 0),
    coalesce(d.closed_slots, 0)
  FROM cells k
  LEFT JOIN demand d ON d.sid = k.sid AND d.pkey = k.pkey
  LEFT JOIN holders h ON h.sid = k.sid AND h.pkey = k.pkey
  LEFT JOIN trained t ON t.sid = k.sid AND t.pkey = k.pkey
  WHERE (SELECT esmdd.skills_training_is_staff());
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_grid(TEXT, INT) FROM PUBLIC, anon, authenticated;

-- One row per skill a vacancy requires, open or closed. p_municipality narrows the demand, the gap and the
-- closed postings to that municipality; the supply is always the whole province's. places: the municipalities
-- whose open vacancies need it, biggest gap first.
CREATE FUNCTION esmdd.skills_demand_rows(
  p_municipality TEXT DEFAULT NULL,
  p_supply TEXT DEFAULT 'UNEMPLOYED',
  p_skill_id INT DEFAULT NULL
)
RETURNS TABLE (
  skill_id INT,
  skill_name TEXT,
  category TEXT,
  vacancies INT,
  demand_slots INT,
  supply INT,
  trained INT,
  gap INT,
  places TEXT[],
  closed_vacancies INT,
  closed_slots INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH m AS (
    SELECT nullif(applicants.sr_normalize_geo(CASE WHEN coalesce(p_municipality, 'ALL') = 'ALL' THEN '' ELSE p_municipality END), '') AS q
  ),
  g AS (
    SELECT x.*, greatest(x.demand - x.supply - x.trained, 0) AS local_gap
    FROM esmdd.skills_demand_grid(coalesce(p_supply, 'UNEMPLOYED'), p_skill_id) x
  )
  SELECT
    g.skill_id,
    s.name::TEXT,
    coalesce(nullif(btrim(s.category), ''), 'Uncategorized')::TEXT,
    coalesce((sum(g.vacancies) FILTER (WHERE m.q IS NULL OR g.place_key = m.q))::INT, 0),
    coalesce((sum(g.demand) FILTER (WHERE m.q IS NULL OR g.place_key = m.q))::INT, 0),
    sum(g.supply)::INT,
    sum(g.trained)::INT,
    coalesce((sum(g.local_gap) FILTER (WHERE g.demand > 0 AND (m.q IS NULL OR g.place_key = m.q)))::INT, 0),
    coalesce(
      array_agg(g.place ORDER BY g.local_gap DESC, g.demand DESC, g.place)
        FILTER (WHERE g.demand > 0 AND (m.q IS NULL OR g.place_key = m.q)),
      '{}'::TEXT[]
    ),
    coalesce((sum(g.closed_vacancies) FILTER (WHERE m.q IS NULL OR g.place_key = m.q))::INT, 0),
    coalesce((sum(g.closed_demand) FILTER (WHERE m.q IS NULL OR g.place_key = m.q))::INT, 0)
  FROM g
  CROSS JOIN m
  JOIN core.skills s ON s.id = g.skill_id
  GROUP BY g.skill_id, s.name, s.category
  HAVING coalesce(sum(g.demand + g.closed_demand) FILTER (WHERE m.q IS NULL OR g.place_key = m.q), 0) > 0;
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_rows(TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;

-- The By Skill table: biggest local gap first, then open demand, then closed postings
CREATE FUNCTION esmdd.skills_demand_search(
  p_municipality TEXT DEFAULT NULL,
  p_supply TEXT DEFAULT 'UNEMPLOYED',
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_only_gaps BOOLEAN DEFAULT false,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_skill_id INT DEFAULT NULL
)
RETURNS TABLE (
  skill_id INT,
  skill_name TEXT,
  category TEXT,
  vacancies INT,
  demand_slots INT,
  supply INT,
  trained INT,
  gap INT,
  places TEXT[],
  closed_vacancies INT,
  closed_slots INT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.skill_id, r.skill_name, r.category, r.vacancies, r.demand_slots, r.supply, r.trained, r.gap, r.places,
         r.closed_vacancies, r.closed_slots, count(*) OVER ()
  FROM esmdd.skills_demand_rows(p_municipality, coalesce(p_supply, 'UNEMPLOYED'), p_skill_id) r
  CROSS JOIN LATERAL (SELECT nullif(btrim(coalesce(p_search, '')), '') AS q) f
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND (f.q IS NULL OR r.skill_name ILIKE '%' || f.q || '%')
    AND (coalesce(p_category, 'ALL') = 'ALL' OR r.category = p_category)
    AND (NOT coalesce(p_only_gaps, false) OR r.gap > 0)
  ORDER BY r.gap DESC, r.demand_slots DESC, r.closed_slots DESC, r.skill_name
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

-- One skill by municipality (same columns as 118); municipalities with only closed postings are left out
CREATE OR REPLACE FUNCTION esmdd.skills_demand_places(p_skill_id INT, p_supply TEXT DEFAULT 'UNEMPLOYED')
RETURNS TABLE (
  place_key TEXT,
  place TEXT,
  vacancies INT,
  demand INT,
  supply INT,
  trained INT,
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
    g.trained,
    greatest(g.demand - g.supply - g.trained, 0),
    greatest(g.supply + g.trained - g.demand, 0)
  FROM esmdd.skills_demand_grid(coalesce(p_supply, 'UNEMPLOYED'), p_skill_id) g
  WHERE g.demand > 0 OR g.supply > 0 OR g.trained > 0
  ORDER BY greatest(g.demand - g.supply - g.trained, 0) DESC, g.demand DESC,
           greatest(g.supply + g.trained - g.demand, 0) DESC, g.place;
$$;

-- Totals above the table: "skills in demand" counts open demand only, as before
CREATE OR REPLACE FUNCTION esmdd.skills_demand_summary(p_municipality TEXT DEFAULT NULL, p_supply TEXT DEFAULT 'UNEMPLOYED')
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'skills_in_demand', count(*) FILTER (WHERE r.demand_slots > 0),
    'skills_with_gap', count(*) FILTER (WHERE r.gap > 0),
    'total_demand', coalesce(sum(r.demand_slots), 0),
    'total_gap', coalesce(sum(r.gap), 0),
    'categories', coalesce(jsonb_agg(DISTINCT r.category), '[]'::JSONB),
    'unlinked_wordings', (
      SELECT count(DISTINCT ks.skill_key)
      FROM esmdd.job_vacancy_skills ks
      JOIN esmdd.job_vacancies v ON v.id = ks.job_vacancy_id
      WHERE ks.skill_id IS NULL AND ks.is_required AND coalesce(v.status::TEXT, 'open') = 'open'
    )
  )
  FROM esmdd.skills_demand_rows(p_municipality, coalesce(p_supply, 'UNEMPLOYED')) r
  WHERE (SELECT esmdd.skills_training_is_staff());
$$;

REVOKE ALL ON FUNCTION esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT, INT) TO authenticated;

COMMIT;
