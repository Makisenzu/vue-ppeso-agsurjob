-- =============================================================================
-- Migration: 111_gip_dashboard_server_side.sql
-- Purpose:   The GIP dashboard's yearly charts (interns per program and applicants, by sex) are
--            counted in the database. Until now the dashboard downloaded every intern, every GIP
--            application and each applicant's full record only to count them by year.
--
--            esmdd.gip_yearly_demographics() returns
--              { pgas: [{year, male, female}], dole: [...], applicants: [...] }
--            with the same rules as gipHelper.ts:
--              - year:    gip / application created_at (else the applicant's), in Asia/Manila
--              - sex:     Female when it starts with "f" or is "woman", otherwise Male
--              - program: DOLE when the gip's or the application's remarks mention DOLE, else PGAS
--              - years:   2026–2028 always, plus any later year with records (GIP_CHART_START_YEAR)
--            An application's applicant_id may hold the applicant's id or their profile id (both
--            are matched, like gipService.ts).
--
-- Access: SECURITY DEFINER; Provincial PESO and admin, plus Municipal PESO / DOLE who already read
--         every esmdd table (034). Personal data: none returned (counts only).
-- Notified events: none. Depends on 034. Safe to re-run. Then run `npm run types:gen`.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION esmdd.gip_yearly_demographics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_start_year CONSTANT INT := 2026;
  v_result JSONB;
BEGIN
  IF NOT core.has_role('provincial_peso', 'admin', 'municipal_peso', 'dole') THEN
    RAISE EXCEPTION 'Only PESO staff can view the GIP dashboard.' USING ERRCODE = '42501';
  END IF;

  WITH applications AS (
    SELECT ga.id, ga.created_at, ga.remarks, person.created_at AS applicant_created_at, person.sex
    FROM esmdd.gip_applicants ga
    LEFT JOIN LATERAL (
      SELECT a.created_at, a.sex::TEXT AS sex
      FROM applicants.applicants a
      WHERE a.id = ga.applicant_id OR a.profile_id = ga.applicant_id
      ORDER BY (a.id = ga.applicant_id) DESC
      LIMIT 1
    ) person ON true
  ),
  points AS (
    -- Applicants: every GIP application
    SELECT 'APPLICANT'::TEXT AS series,
           extract(year FROM (coalesce(ap.created_at, ap.applicant_created_at, now()) AT TIME ZONE 'Asia/Manila'))::INT AS year,
           ap.sex
    FROM applications ap
    UNION ALL
    -- Interns: every deployed gip, per program
    SELECT CASE WHEN upper(concat_ws(' ', g.remarks, array_to_string(ap.remarks, ' '))) LIKE '%DOLE%' THEN 'DOLE' ELSE 'PGAS' END,
           extract(year FROM (coalesce(g.created_at, ap.created_at, ap.applicant_created_at, now()) AT TIME ZONE 'Asia/Manila'))::INT,
           ap.sex
    FROM esmdd.gips g
    LEFT JOIN applications ap ON ap.id = g.application_id
  ),
  flagged AS (
    SELECT series, year,
           (lower(trim(coalesce(sex, ''))) LIKE 'f%' OR lower(trim(coalesce(sex, ''))) = 'woman') AS is_female
    FROM points
  ),
  -- Interns (PGAS and DOLE share their years) and applicants each get 2026–2028 plus later years
  chart_years AS (
    SELECT s.kind, y.year
    FROM (VALUES ('INTERN'), ('APPLICANT')) s(kind)
    CROSS JOIN generate_series(c_start_year, c_start_year + 2) y(year)
    UNION
    SELECT CASE WHEN f.series = 'APPLICANT' THEN 'APPLICANT' ELSE 'INTERN' END, f.year
    FROM flagged f WHERE f.year >= c_start_year
  ),
  series_points AS (
    SELECT sr.series, cy.year,
           count(f.*) FILTER (WHERE NOT f.is_female)::INT AS male,
           count(f.*) FILTER (WHERE f.is_female)::INT AS female
    FROM (VALUES ('PGAS', 'INTERN'), ('DOLE', 'INTERN'), ('APPLICANT', 'APPLICANT')) sr(series, kind)
    JOIN chart_years cy ON cy.kind = sr.kind
    LEFT JOIN flagged f ON f.series = sr.series AND f.year = cy.year
    GROUP BY sr.series, cy.year
  )
  SELECT jsonb_build_object(
    'pgas', coalesce((SELECT jsonb_agg(jsonb_build_object('year', year, 'male', male, 'female', female) ORDER BY year)
                      FROM series_points WHERE series = 'PGAS'), '[]'::jsonb),
    'dole', coalesce((SELECT jsonb_agg(jsonb_build_object('year', year, 'male', male, 'female', female) ORDER BY year)
                      FROM series_points WHERE series = 'DOLE'), '[]'::jsonb),
    'applicants', coalesce((SELECT jsonb_agg(jsonb_build_object('year', year, 'male', male, 'female', female) ORDER BY year)
                            FROM series_points WHERE series = 'APPLICANT'), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.gip_yearly_demographics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.gip_yearly_demographics() TO authenticated;

COMMIT;
