-- =============================================================================
-- Migration: 035_applicant_registry_search.sql
-- Purpose:   Server-side filtering, paging and stats for the Provincial PESO
--            applicant registry (Applicant Entry page).
--
--   The page used to download every row of applicants.applicants and filter in
--   the browser. PostgREST caps responses at 1,000 rows, so applicants beyond
--   that silently disappeared from the table and totals. These functions move
--   the filters into Postgres so the client fetches one page at a time.
--
--   All functions are SECURITY INVOKER: the caller's RLS on
--   applicants.applicants still decides which rows are visible.
--
--   Filter semantics mirror the previous client-side logic in
--   useApplicantEntry.ts so results are unchanged.
-- =============================================================================


-- ─── 1. Municipality resolver (address JSON has several legacy key names) ───

CREATE OR REPLACE FUNCTION applicants.applicant_municipality(p_address JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(p_address ->> 'city_municipality', ''),
    NULLIF(p_address ->> 'municipality', ''),
    NULLIF(p_address ->> 'city', ''),
    NULLIF(p_address ->> 'geographic', ''),
    'Agusan del Sur'
  )
$$;


-- ─── 2. Filtered registry search (use with .range() + count) ────────────────
-- Returns SETOF so PostgREST can page it, order it and report an exact count.

CREATE OR REPLACE FUNCTION applicants.search_applicant_registry(
  p_search TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT 'ALL',
  p_employment_status TEXT DEFAULT 'ALL',
  p_program TEXT DEFAULT 'ALL',
  p_municipality TEXT DEFAULT 'ALL'
)
RETURNS SETOF applicants.applicants
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT a.*
  FROM applicants.applicants a
  CROSS JOIN LATERAL (
    SELECT
      lower(COALESCE(a.employment_status, 'Unemployed')) AS emp,
      lower(COALESCE(a.employment_type, '')) AS emp_type,
      upper(COALESCE(array_to_string(a.referred_programs, ' '), '')) AS programs,
      NULLIF(btrim(COALESCE(p_search, '')), '') AS q
  ) f
  WHERE
    -- Search: name, email, contact, municipality, barangay, education, occupations, skills, programs
    (
      f.q IS NULL
      OR concat_ws(' ',
           a.first_name,
           CASE WHEN COALESCE(a.middle_name, '') <> '' THEN left(a.middle_name, 1) || '.' END,
           a.surname,
           a.suffix,
           a.email,
           array_to_string(a.contact_numbers, ' '),
           applicants.applicant_municipality(a.address),
           COALESCE(a.address ->> 'barangay', a.address ->> 'brgy'),
           (a.educational_background -> -1) ->> 'course',
           (a.educational_background -> -1) ->> 'level',
           array_to_string(a.preferred_occupations, ' '),
           array_to_string(a.other_skills, ' '),
           array_to_string(a.referred_programs, ' ')
         ) ILIKE '%' || f.q || '%'
    )
    -- Gender
    AND (
      COALESCE(p_gender, 'ALL') = 'ALL'
      OR (p_gender = 'Male' AND lower(COALESCE(a.sex, '')) LIKE 'm%')
      OR (p_gender = 'Female' AND (lower(COALESCE(a.sex, '')) LIKE 'f%' OR lower(COALESCE(a.sex, '')) = 'woman'))
    )
    -- Employment status (Self-employed is Employed + a self-employment type)
    AND (
      COALESCE(p_employment_status, 'ALL') = 'ALL'
      OR (p_employment_status = 'Employed'
          AND f.emp LIKE '%employed%' AND f.emp NOT LIKE '%unemployed%'
          AND f.emp NOT LIKE '%self%' AND f.emp_type NOT LIKE '%self%')
      OR (p_employment_status = 'Unemployed' AND f.emp LIKE '%unemployed%')
      OR (p_employment_status = 'Self-Employed' AND (f.emp LIKE '%self%' OR f.emp_type LIKE '%self%'))
    )
    -- Referred program
    AND (
      COALESCE(p_program, 'ALL') = 'ALL'
      OR (p_program = 'NONE' AND COALESCE(cardinality(a.referred_programs), 0) = 0)
      OR (p_program <> 'NONE' AND f.programs LIKE '%' || upper(p_program) || '%')
    )
    -- Municipality
    AND (
      COALESCE(p_municipality, 'ALL') = 'ALL'
      OR lower(applicants.applicant_municipality(a.address)) = lower(p_municipality)
    )
$$;


-- ─── 3. Registry-wide stat cards ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.applicant_registry_stats()
RETURNS TABLE (total BIGINT, gip BIGINT, tupad BIGINT, spes BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE p.programs LIKE '%GIP%'),
    count(*) FILTER (WHERE p.programs LIKE '%TUPAD%'),
    count(*) FILTER (WHERE p.programs LIKE '%SPES%')
  FROM applicants.applicants a
  CROSS JOIN LATERAL (
    SELECT upper(COALESCE(array_to_string(a.referred_programs, ' '), '')) AS programs
  ) p
$$;


-- ─── 4. Municipality filter options ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.applicant_registry_municipalities()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT DISTINCT applicants.applicant_municipality(a.address) AS municipality
  FROM applicants.applicants a
  WHERE applicants.applicant_municipality(a.address) <> 'N/A'
  ORDER BY 1
$$;


-- ─── 5. Privileges ──────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION applicants.applicant_municipality(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION applicants.search_applicant_registry(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION applicants.applicant_registry_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION applicants.applicant_registry_municipalities() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION applicants.applicant_municipality(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.search_applicant_registry(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.applicant_registry_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.applicant_registry_municipalities() TO authenticated;


-- ─── 6. Indexes ─────────────────────────────────────────────────────────────
-- Default sort order of the registry, and the municipality filter.

CREATE INDEX IF NOT EXISTS idx_applicants_created_at
  ON applicants.applicants (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applicants_municipality
  ON applicants.applicants (lower(applicants.applicant_municipality(address)));
