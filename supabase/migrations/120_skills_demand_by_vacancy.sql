-- ════════════════════════════════════════════════════════════════════════════
-- 120 · Skills Demand → By Skill: pick a job vacancy, see its skills' demand, supply and surplus
-- ════════════════════════════════════════════════════════════════════════════
-- The By Skill tab (118) counts every open vacancy together. This lets PESO pick one open vacancy and see
-- each required skill of it, counted where the vacancy is (its establishment's municipality), like 118:
--
--   demand    the vacancy's slots (every slot needs each of its required skills)
--   supply    Agusan del Sur jobseekers living in the vacancy's municipality with the skill on their record
--             (unemployed only unless p_supply = 'ALL'), plus completers of a training that teaches it who
--             don't have it on their record yet (trained)
--   surplus   supply - demand, never below 0 (jobseekers to spare for the vacancy)
--   gap       demand - supply, never below 0 (short: refer from elsewhere or train)
--   province_supply  the same count across the whole province, for a referral from another municipality
--
-- RPCs (SECURITY DEFINER; rows only for provincial_peso / admin via esmdd.skills_training_is_staff(), like 118):
--   esmdd.skills_demand_vacancy_options(...)   the open vacancies with a required skill on the Skill List
--   esmdd.skills_demand_vacancy_skills(...)    one vacancy's required skills: demand, supply, surplus, gap
--
-- Counts only: no personal data. Depends on 110 (sr_profiles, sr_normalize_geo), 118 (skills_training_is_staff).
-- Safe to re-run.

BEGIN;

-- The open vacancies (approved company, posted, not expired) that require at least one skill on the Skill
-- List, most slots first. p_municipality narrows them to that municipality. Capped at 500 for the picker.
CREATE OR REPLACE FUNCTION esmdd.skills_demand_vacancy_options(p_municipality TEXT DEFAULT NULL)
RETURNS TABLE (
  vacancy_id UUID,
  position_title TEXT,
  employer_name TEXT,
  place TEXT,
  slots INT,
  valid_until DATE,
  skills INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH m AS (
    SELECT
      nullif(applicants.sr_normalize_geo(CASE WHEN coalesce(p_municipality, 'ALL') = 'ALL' THEN '' ELSE p_municipality END), '') AS q,
      (now() AT TIME ZONE 'Asia/Manila')::DATE AS today
  )
  SELECT
    v.id,
    v.position_title::TEXT,
    coalesce(nullif(btrim(c.company_name), ''), e.business_name)::TEXT,
    coalesce(nullif(btrim(e.city_municipality), ''), 'Unspecified')::TEXT,
    greatest(coalesce(v.vacancy_count, 1), 1)::INT,
    v.valid_until::DATE,
    k.n
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  JOIN employers.companies c ON c.id = e.company_id
  CROSS JOIN m
  CROSS JOIN LATERAL (
    SELECT count(DISTINCT ks.skill_id)::INT AS n
    FROM esmdd.job_vacancy_skills ks
    WHERE ks.job_vacancy_id = v.id AND ks.is_required AND ks.skill_id IS NOT NULL
  ) k
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND k.n > 0
    AND coalesce(v.status::TEXT, 'open') = 'open'
    AND c.verification_status::TEXT = 'approved'
    AND (v.posting_date IS NULL OR v.posting_date::DATE <= m.today)
    AND (v.valid_until IS NULL OR v.valid_until::DATE >= m.today)
    AND (m.q IS NULL OR applicants.sr_normalize_geo(e.city_municipality) = m.q)
  ORDER BY greatest(coalesce(v.vacancy_count, 1), 1) DESC, v.position_title, v.id
  LIMIT 500;
$$;

-- One vacancy's required skills (on the Skill List), biggest gap first, then most surplus
CREATE OR REPLACE FUNCTION esmdd.skills_demand_vacancy_skills(p_vacancy_id UUID, p_supply TEXT DEFAULT 'UNEMPLOYED')
RETURNS TABLE (
  skill_id INT,
  skill_name TEXT,
  category TEXT,
  demand INT,
  supply INT,
  trained INT,
  surplus INT,
  gap INT,
  province_supply INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH vac AS (
    SELECT
      greatest(coalesce(v.vacancy_count, 1), 1)::INT AS slots,
      coalesce(nullif(applicants.sr_normalize_geo(e.city_municipality), ''), 'unspecified') AS pkey
    FROM esmdd.job_vacancies v
    JOIN employers.establishments e ON e.id = v.establishment_id
    WHERE v.id = p_vacancy_id
  ),
  sk AS (
    SELECT DISTINCT ks.skill_id AS sid
    FROM esmdd.job_vacancy_skills ks
    WHERE ks.job_vacancy_id = p_vacancy_id AND ks.is_required AND ks.skill_id IS NOT NULL
  ),
  holders AS (
    SELECT
      i.skill_id AS sid,
      count(DISTINCT i.applicant_id) FILTER (WHERE sp.municipality_key = (SELECT vac.pkey FROM vac))::INT AS here,
      count(DISTINCT i.applicant_id)::INT AS province
    FROM applicants.applicant_skill_index i
    JOIN applicants.sr_profiles sp ON sp.applicant_id = i.applicant_id AND sp.is_agusan
    JOIN applicants.applicants a ON a.id = i.applicant_id
    WHERE i.skill_id IN (SELECT sk.sid FROM sk)
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR lower(coalesce(a.employment_status, 'Unemployed')) LIKE '%unemployed%')
    GROUP BY i.skill_id
  ),
  trained AS (
    SELECT
      ts.skill_id AS sid,
      count(DISTINCT p.applicant_id) FILTER (WHERE sp.municipality_key = (SELECT vac.pkey FROM vac))::INT AS here,
      count(DISTINCT p.applicant_id)::INT AS province
    FROM esmdd.skills_training_skills ts
    JOIN esmdd.skills_training_participants p ON p.training_id = ts.training_id AND p.completion_status = 'Completed'
    JOIN applicants.sr_profiles sp ON sp.applicant_id = p.applicant_id AND sp.is_agusan
    WHERE ts.skill_id IN (SELECT sk.sid FROM sk)
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR p.employment_status NOT IN ('Hired', 'Self-Employed'))
      AND NOT EXISTS (
        SELECT 1 FROM applicants.applicant_skill_index i
        WHERE i.applicant_id = p.applicant_id AND i.skill_id = ts.skill_id
      )
    GROUP BY ts.skill_id
  ),
  r AS (
    SELECT
      sk.sid,
      vac.slots AS demand,
      coalesce(h.here, 0) AS supply,
      coalesce(t.here, 0) AS trained,
      coalesce(h.province, 0) + coalesce(t.province, 0) AS province_supply
    FROM sk
    CROSS JOIN vac
    LEFT JOIN holders h ON h.sid = sk.sid
    LEFT JOIN trained t ON t.sid = sk.sid
  )
  SELECT
    r.sid,
    s.name::TEXT,
    coalesce(nullif(btrim(s.category), ''), 'Uncategorized')::TEXT,
    r.demand,
    r.supply,
    r.trained,
    greatest(r.supply + r.trained - r.demand, 0),
    greatest(r.demand - r.supply - r.trained, 0),
    r.province_supply
  FROM r
  JOIN core.skills s ON s.id = r.sid
  WHERE (SELECT esmdd.skills_training_is_staff())
  ORDER BY greatest(r.demand - r.supply - r.trained, 0) DESC, greatest(r.supply + r.trained - r.demand, 0) DESC, s.name;
$$;

REVOKE ALL ON FUNCTION esmdd.skills_demand_vacancy_options(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_vacancy_skills(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_vacancy_options(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_vacancy_skills(UUID, TEXT) TO authenticated;

COMMIT;
