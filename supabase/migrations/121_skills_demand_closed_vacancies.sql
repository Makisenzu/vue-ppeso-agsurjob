-- ════════════════════════════════════════════════════════════════════════════
-- 121 · Skills Demand: list closed vacancies too, marked open or closed
-- ════════════════════════════════════════════════════════════════════════════
-- Provincial PESO wants to see every posting behind a skill, not only the open ones. The two vacancy lists of
-- the Skills Demand page now include closed postings with an is_open flag the page shows as a badge:
--
--   esmdd.skills_demand_vacancies(...)        the vacancies that require one skill (skill page)
--   esmdd.skills_demand_vacancy_options(...)  the vacancies to pick on the By Skill tab (120)
--
-- is_open: status 'open', posted (posting_date not in the future) and not past valid_until, the same rule
-- skills_demand_grid (118) uses. Closed covers 'closed', 'filled', 'cancelled' and expired postings.
-- Postings not yet posted (future posting_date) and those of companies not approved stay out.
--
-- The counts do NOT change: demand, gap and surplus still count open vacancies only (skills_demand_grid).
-- Open vacancies are listed first. Counts only: no personal data. Depends on 118, 120. Safe to re-run.

BEGIN;

-- The return types gain is_open: drop the old ones first
DROP FUNCTION IF EXISTS esmdd.skills_demand_vacancies(INT, TEXT);
DROP FUNCTION IF EXISTS esmdd.skills_demand_vacancy_options(TEXT);

-- The vacancies that require one skill, open first, then most slots
CREATE FUNCTION esmdd.skills_demand_vacancies(p_skill_id INT, p_municipality TEXT DEFAULT NULL)
RETURNS TABLE (
  vacancy_id UUID,
  position_title TEXT,
  employer_name TEXT,
  place TEXT,
  slots INT,
  valid_until DATE,
  is_open BOOLEAN
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
  ),
  v AS (
    SELECT
      v.id,
      v.position_title::TEXT AS position_title,
      coalesce(nullif(btrim(c.company_name), ''), e.business_name)::TEXT AS employer_name,
      coalesce(nullif(btrim(e.city_municipality), ''), 'Unspecified')::TEXT AS place,
      greatest(coalesce(v.vacancy_count, 1), 1)::INT AS slots,
      v.valid_until::DATE AS valid_until,
      (coalesce(v.status::TEXT, 'open') = 'open' AND (v.valid_until IS NULL OR v.valid_until::DATE >= m.today)) AS is_open
    FROM esmdd.job_vacancies v
    JOIN employers.establishments e ON e.id = v.establishment_id
    JOIN employers.companies c ON c.id = e.company_id
    CROSS JOIN m
    WHERE (SELECT esmdd.skills_training_is_staff())
      AND c.verification_status::TEXT = 'approved'
      AND (v.posting_date IS NULL OR v.posting_date::DATE <= m.today)
      AND (m.q IS NULL OR applicants.sr_normalize_geo(e.city_municipality) = m.q)
      AND EXISTS (
        SELECT 1 FROM esmdd.job_vacancy_skills ks
        WHERE ks.job_vacancy_id = v.id AND ks.is_required AND ks.skill_id = p_skill_id
      )
  )
  SELECT v.id, v.position_title, v.employer_name, v.place, v.slots, v.valid_until, v.is_open
  FROM v
  ORDER BY v.is_open DESC, v.slots DESC, v.position_title, v.id
  LIMIT 100;
$$;

-- The vacancies to pick on the By Skill tab: those requiring at least one Skill List skill, open first
CREATE FUNCTION esmdd.skills_demand_vacancy_options(p_municipality TEXT DEFAULT NULL)
RETURNS TABLE (
  vacancy_id UUID,
  position_title TEXT,
  employer_name TEXT,
  place TEXT,
  slots INT,
  valid_until DATE,
  skills INT,
  is_open BOOLEAN
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
  ),
  v AS (
    SELECT
      v.id,
      v.position_title::TEXT AS position_title,
      coalesce(nullif(btrim(c.company_name), ''), e.business_name)::TEXT AS employer_name,
      coalesce(nullif(btrim(e.city_municipality), ''), 'Unspecified')::TEXT AS place,
      greatest(coalesce(v.vacancy_count, 1), 1)::INT AS slots,
      v.valid_until::DATE AS valid_until,
      k.n AS skills,
      (coalesce(v.status::TEXT, 'open') = 'open' AND (v.valid_until IS NULL OR v.valid_until::DATE >= m.today)) AS is_open
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
      AND c.verification_status::TEXT = 'approved'
      AND (v.posting_date IS NULL OR v.posting_date::DATE <= m.today)
      AND (m.q IS NULL OR applicants.sr_normalize_geo(e.city_municipality) = m.q)
  )
  SELECT v.id, v.position_title, v.employer_name, v.place, v.slots, v.valid_until, v.skills, v.is_open
  FROM v
  ORDER BY v.is_open DESC, v.slots DESC, v.position_title, v.id
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION esmdd.skills_demand_vacancies(INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_vacancy_options(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_vacancies(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_vacancy_options(TEXT) TO authenticated;

COMMIT;
