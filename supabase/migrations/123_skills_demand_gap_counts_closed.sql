-- ════════════════════════════════════════════════════════════════════════════
-- 123 · Skills Demand: closed vacancies count as demand and gap too
-- ════════════════════════════════════════════════════════════════════════════
-- 122 kept skills whose vacancies closed, but counted their demand and gap from open vacancies only, so a
-- skill whose vacancies had all closed showed no gap. Provincial PESO wants the gap of every skill a vacancy
-- ever required, to build up data on each skill over the years.
--
-- skills_demand_grid now counts every vacancy (approved company, posted), open or closed, in vacancies and
-- demand; closed_vacancies / closed_demand stay as the closed share of those. Everything built on the grid
-- follows: the By Skill table's demand and gap, the totals, a skill's municipalities (gap / surplus), and the
-- "municipalities that need it" of a skill's jobseekers list. Same return type as 122. Safe to re-run.

BEGIN;

-- One row per skill a vacancy requires and municipality with demand or supply for it
CREATE OR REPLACE FUNCTION esmdd.skills_demand_grid(p_supply TEXT DEFAULT 'UNEMPLOYED', p_skill_id INT DEFAULT NULL)
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
      -- Every vacancy counts as demand, open or closed; the closed share is broken out below
      count(*)::INT AS vacancies,
      sum(vs.slots)::INT AS slots,
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

COMMIT;
