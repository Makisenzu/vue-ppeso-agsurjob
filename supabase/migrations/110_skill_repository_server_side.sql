-- =============================================================================
-- Migration: 110_skill_repository_server_side.sql
-- Purpose:   Skill Repository (Provincial PESO → Skill Tagging) is computed in the database instead of
--            in the browser. Until now the page downloaded every applicant, every skill row and every
--            barangay, then grouped them in JavaScript — fine for hundreds of applicants, not for a
--            province. Now the browser receives totals, per-municipality summaries and one page of
--            applicants at a time.
--
--            1. SQL ports of skillRepositoryHelper.ts: normalizeGeographicLabel, normalizeBarangayName,
--               cleanSkillName, categorizeSkill, findBarangayTagByName (fuzzystrmatch levenshtein).
--            2. Index tables kept current by triggers:
--                 applicants.sr_profiles  one row per applicant: municipality, barangay, province, LPII tag
--                 applicants.sr_skills    one row per applicant per extracted skill (deduplicated)
--            3. Read RPCs (SECURITY DEFINER, Provincial PESO / admin):
--                 applicants.skill_repository_summary()                 stats + municipality rows + skill list
--                 applicants.skill_repository_municipality(p_name)      one municipality: skills, barangays
--                 applicants.skill_repository_applicants(...)           its applicants, filtered and paged
--
-- Access: the index tables have RLS on and no policies or grants, so only the RPCs read them. The RPCs
--         check core.has_role('provincial_peso', 'admin') like the route (role: provincial_peso).
-- Personal data: the index holds no names or contacts (only location and skills keyed by applicant id);
--         names / contacts are joined from applicants.applicants for the requested page only.
-- Notified events: none. Depends on 034 (core.has_role). Safe to re-run. Then run `npm run types:gen`.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;


-- ─── 1. Text helpers (ports of skillRepositoryHelper.ts) ─────────────────────

-- normalizeGeographicLabel: "City of Bayugan" / "Bayugan City" → "bayugan"
CREATE OR REPLACE FUNCTION applicants.sr_normalize_geo(p_value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT trim(
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      lower(trim(coalesce(p_value, ''))),
      '^city of\s+', '', 'i'),
      '^municipality of\s+', '', 'i'),
      '^municipality\s+', '', 'i'),
      '^city\s+', '', 'i'),
      '\s+city$', '', 'i')
  );
$$;

-- normalizeBarangayName: "Barangay Poblacion" / "Brgy. Poblacion" → "poblacion"
CREATE OR REPLACE FUNCTION applicants.sr_normalize_barangay(p_value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT trim(
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      lower(trim(coalesce(p_value, ''))),
      '\s+barangay$', '', 'i'),
      '^barangay\s+', '', 'i'),
      '\s+brgy\.?$', '', 'i'),
      '^brgy\.?\s+', '', 'i'),
      '\s+puroks?$', '', 'i'),
      '\s+sitio\s+', ' ', 'i')
  );
$$;

-- cleanSkillName: trims bullets, drops N/A / none, standardizes known variants, Title Cases the rest
CREATE OR REPLACE FUNCTION applicants.sr_clean_skill(p_raw TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
DECLARE
  v TEXT;
  v_word TEXT;
  v_out TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_raw IS NULL THEN RETURN ''; END IF;
  v := regexp_replace(trim(p_raw), '^[-*•,\s]+|[-*•,\s]+$', '', 'g');
  IF v = '' OR char_length(v) < 2 THEN RETURN ''; END IF;
  IF v ~* '^n[\s/.]*a$' OR v ~* '^none$' THEN RETURN ''; END IF;

  IF v ~* 'computer\s*(literate|literacy)' THEN RETURN 'Computer Literacy'; END IF;
  IF v ~* 'qgis' THEN RETURN 'QGIS / Spatial Mapping'; END IF;
  IF v ~* '^gis$' THEN RETURN 'GIS (Geographic Information Systems)'; END IF;
  IF v ~* 'smaw' THEN RETURN 'Shielded Metal Arc Welding (SMAW)'; END IF;
  IF v ~* 'watershed\s*(delineation|dilimation)' OR v ~* 'water\s*dilimation' THEN RETURN 'Watershed Delineation'; END IF;
  IF v ~* 'fragstat' THEN RETURN 'Fragstats (Spatial Pattern Analysis)'; END IF;
  IF v ~* 'spss' THEN RETURN 'SPSS / Biostatistics'; END IF;
  IF v ~* 'painter\s*/\s*artist' THEN RETURN 'Painter / Visual Artist'; END IF;

  -- Title Case; short all-caps words (IT, NC2, CSS) stay as typed
  FOREACH v_word IN ARRAY regexp_split_to_array(v, '\s+') LOOP
    IF char_length(v_word) <= 3 AND v_word = upper(v_word) THEN
      v_out := v_out || v_word;
    ELSE
      v_out := v_out || (upper(left(v_word, 1)) || lower(substr(v_word, 2)));
    END IF;
  END LOOP;
  RETURN array_to_string(v_out, ' ');
END;
$$;

-- categorizeSkill: same keyword buckets, same order
CREATE OR REPLACE FUNCTION applicants.sr_categorize_skill(p_name TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT CASE
    WHEN l ~ '(comput|gis|prog|data|software|web|it |hardware|network|spss|qgis|fragstat|typing)' THEN 'Information Technology'
    WHEN l ~ '(weld|smaw|carpenter|carpent|mason|plumb|electric|automot|mechanic|engine|construct|repair)' THEN 'Technical & Engineering'
    WHEN l ~ '(farm|agri|garden|watershed|water|crop|poultry|livestock|fish|forest)' THEN 'Agriculture & Environment'
    WHEN l ~ '(admin|clerk|bookkeep|account|office|secretar|manage|statist|analys)' THEN 'Office & Administration'
    WHEN l ~ '(cook|bake|food|chores|housekeep|care|driv|sew|tailor|beaut|hair|massage|service)' THEN 'Services & Livelihood'
    WHEN l ~ '(paint|art|draw|craft|music|photo)' THEN 'Arts & Design'
    ELSE 'General Skills'
  END
  FROM (SELECT lower(trim(coalesce(p_name, ''))) AS l) s;
$$;

-- The 14 canonical municipalities / city of Agusan del Sur (AGUSAN_DEL_SUR_CANONICAL_MUNICIPALITIES)
CREATE OR REPLACE FUNCTION applicants.sr_agusan_municipalities()
RETURNS TEXT[] LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT ARRAY['City of Bayugan', 'Bunawan', 'Esperanza', 'La Paz', 'Loreto', 'Prosperidad', 'Rosario',
               'San Francisco', 'San Luis', 'Santa Josefa', 'Sibagat', 'Talacogon', 'Trento', 'Veruela'];
$$;

-- findBarangayTagByName: exact normalized match, then substring / levenshtein <= 2, else LOWLAND
CREATE OR REPLACE FUNCTION applicants.sr_barangay_tag(p_barangay TEXT, p_municipality_id UUID)
RETURNS public.lpii_type LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  v_search TEXT := applicants.sr_normalize_barangay(p_barangay);
  v_tag public.lpii_type;
BEGIN
  IF p_barangay IS NULL OR p_barangay IN ('', 'N/A', 'Unknown') THEN RETURN 'LOWLAND'; END IF;

  SELECT b.lpii_tag INTO v_tag
  FROM public.barangays b
  WHERE (p_municipality_id IS NULL OR b.municipality_id = p_municipality_id)
    AND applicants.sr_normalize_barangay(b.name) = v_search
  ORDER BY b.name
  LIMIT 1;
  IF FOUND THEN RETURN coalesce(v_tag, 'LOWLAND'); END IF;

  SELECT b.lpii_tag INTO v_tag
  FROM public.barangays b, LATERAL (SELECT applicants.sr_normalize_barangay(b.name) AS n) r
  WHERE (p_municipality_id IS NULL OR b.municipality_id = p_municipality_id)
    AND (
      position(v_search IN r.n) > 0
      OR position(r.n IN v_search) > 0
      OR (char_length(v_search) < 255 AND char_length(r.n) < 255 AND extensions.levenshtein(v_search, r.n) <= 2)
    )
  ORDER BY b.name
  LIMIT 1;
  RETURN coalesce(v_tag, 'LOWLAND');
END;
$$;


-- ─── 2. Index tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applicants.sr_profiles (
  applicant_id UUID PRIMARY KEY REFERENCES applicants.applicants (id) ON DELETE CASCADE,
  municipality TEXT NOT NULL,
  municipality_key TEXT NOT NULL,
  barangay TEXT NOT NULL,
  barangay_key TEXT NOT NULL,
  province TEXT NOT NULL,
  is_agusan BOOLEAN NOT NULL,
  lpii_tag public.lpii_type,
  sort_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sr_profiles_municipality ON applicants.sr_profiles (municipality_key, sort_at DESC, applicant_id);

CREATE TABLE IF NOT EXISTS applicants.sr_skills (
  applicant_id UUID NOT NULL REFERENCES applicants.applicants (id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  ord INT NOT NULL,
  PRIMARY KEY (applicant_id, skill_key)
);
CREATE INDEX IF NOT EXISTS idx_sr_skills_key ON applicants.sr_skills (skill_key);

ALTER TABLE applicants.sr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants.sr_skills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON applicants.sr_profiles, applicants.sr_skills FROM PUBLIC, anon, authenticated;


-- ─── 3. Refresh (extractSkillsFromApplicant + location), set-based ───────────
-- p_ids NULL refreshes every applicant (backfill, barangay tag changes)

CREATE OR REPLACE FUNCTION applicants.sr_refresh(p_ids UUID[] DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM applicants.sr_profiles WHERE p_ids IS NULL OR applicant_id = ANY (p_ids);
  DELETE FROM applicants.sr_skills WHERE p_ids IS NULL OR applicant_id = ANY (p_ids);

  -- Location: city_municipality → municipality → city → geographic, matched to the canonical names
  INSERT INTO applicants.sr_profiles
    (applicant_id, municipality, municipality_key, barangay, barangay_key, province, is_agusan, lpii_tag, sort_at)
  SELECT
    a.id,
    m.municipality,
    applicants.sr_normalize_geo(m.municipality),
    g.barangay,
    applicants.sr_normalize_barangay(g.barangay),
    coalesce(nullif(g.province_raw, ''), CASE WHEN m.is_agusan THEN 'Agusan del Sur' ELSE 'Outside Agusan del Sur' END),
    m.is_agusan,
    CASE WHEN m.is_agusan THEN applicants.sr_barangay_tag(
      g.barangay,
      (SELECT mu.id FROM public.municipalities mu
       WHERE applicants.sr_normalize_geo(mu.name) = applicants.sr_normalize_geo(m.municipality)
       ORDER BY mu.name LIMIT 1)
    ) END,
    a.created_at
  FROM applicants.applicants a
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN jsonb_typeof(a.address) = 'object' THEN a.address ELSE '{}'::jsonb END AS addr
  ) j
  CROSS JOIN LATERAL (
    SELECT
      coalesce(nullif(j.addr->>'city_municipality', ''), nullif(j.addr->>'municipality', ''),
               nullif(j.addr->>'city', ''), nullif(j.addr->>'geographic', ''), '') AS raw_muni,
      coalesce(nullif(j.addr->>'barangay', ''), nullif(j.addr->>'brgy', ''), 'Unknown') AS barangay,
      j.addr->>'province' AS province_raw
  ) g
  CROSS JOIN LATERAL (
    SELECT
      coalesce(c.name, nullif(g.raw_muni, ''), 'Unknown') AS municipality,
      c.name IS NOT NULL AS is_agusan
    FROM (SELECT 1) one
    LEFT JOIN LATERAL (
      SELECT name FROM unnest(applicants.sr_agusan_municipalities()) AS name
      WHERE applicants.sr_normalize_geo(name) = applicants.sr_normalize_geo(g.raw_muni)
      LIMIT 1
    ) c ON true
  ) m
  WHERE p_ids IS NULL OR a.id = ANY (p_ids);

  -- Skills in source order: linked applicant_skills, other_skills, other_skills_specified,
  -- vocational trainings, eligibilities. The first spelling of each skill wins (like addSkill).
  INSERT INTO applicants.sr_skills (applicant_id, skill_key, skill_name, category, ord)
  SELECT DISTINCT ON (s.applicant_id, s.skill_key)
    s.applicant_id, s.skill_key, s.skill_name, s.category, s.ord
  FROM (
    SELECT r.applicant_id, lower(trim(r.cleaned)) AS skill_key, r.cleaned AS skill_name,
           coalesce(nullif(r.category, ''), applicants.sr_categorize_skill(r.cleaned)) AS category, r.ord
    FROM (
      -- 1. applicant_skills
      SELECT a.id AS applicant_id, applicants.sr_clean_skill(sk.skill_name) AS cleaned, sk.skill_category AS category,
             (1000000 + row_number() OVER (PARTITION BY a.id ORDER BY sk.id))::INT AS ord
      FROM applicants.applicants a
      JOIN applicants.applicant_skills sk ON sk.profile_id = a.profile_id
      WHERE (p_ids IS NULL OR a.id = ANY (p_ids)) AND a.profile_id IS NOT NULL
      UNION ALL
      -- 2. other_skills
      SELECT a.id, applicants.sr_clean_skill(o.v), NULL, (2000000 + o.n)::INT
      FROM applicants.applicants a, unnest(a.other_skills) WITH ORDINALITY AS o(v, n)
      WHERE p_ids IS NULL OR a.id = ANY (p_ids)
      UNION ALL
      -- 3. other_skills_specified, split on , ; and new lines
      SELECT a.id, applicants.sr_clean_skill(o.v), NULL, (3000000 + o.n)::INT
      FROM applicants.applicants a, regexp_split_to_table(a.other_skills_specified, '[,;\n]') WITH ORDINALITY AS o(v, n)
      WHERE (p_ids IS NULL OR a.id = ANY (p_ids)) AND a.other_skills_specified IS NOT NULL
      UNION ALL
      -- 4. vocational trainings: skills acquired, then the course title
      SELECT a.id, applicants.sr_clean_skill(x.v), NULL, (4000000 + t.n * 2 + x.k)::INT
      FROM applicants.applicants a,
           jsonb_array_elements(CASE WHEN jsonb_typeof(a.vocational_trainings) = 'array' THEN a.vocational_trainings ELSE '[]'::jsonb END)
             WITH ORDINALITY AS t(e, n),
           LATERAL (VALUES (0, t.e->>'skills_acquired'), (1, t.e->>'course_training_title')) AS x(k, v)
      WHERE (p_ids IS NULL OR a.id = ANY (p_ids)) AND x.v IS NOT NULL AND jsonb_typeof(t.e) = 'object'
      UNION ALL
      -- 5. eligibilities and licenses
      SELECT a.id, applicants.sr_clean_skill(x.v), 'Certifications & Eligibilities', (5000000 + t.n * 2 + x.k)::INT
      FROM applicants.applicants a,
           jsonb_array_elements(CASE WHEN jsonb_typeof(a.eligibilities) = 'array' THEN a.eligibilities ELSE '[]'::jsonb END)
             WITH ORDINALITY AS t(e, n),
           LATERAL (VALUES (0, t.e->>'eligibility_title'), (1, t.e->>'license_title')) AS x(k, v)
      WHERE (p_ids IS NULL OR a.id = ANY (p_ids)) AND x.v IS NOT NULL AND jsonb_typeof(t.e) = 'object'
    ) r
    WHERE r.cleaned <> ''
  ) s
  ORDER BY s.applicant_id, s.skill_key, s.ord;
END;
$$;
REVOKE ALL ON FUNCTION applicants.sr_refresh(UUID[]) FROM PUBLIC, anon, authenticated;


-- ─── 4. Triggers keep the index current ──────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.sr_on_applicant_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM applicants.sr_refresh(ARRAY[NEW.id]);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sr_applicant_change ON applicants.applicants;
CREATE TRIGGER trigger_sr_applicant_change
AFTER INSERT OR UPDATE OF address, other_skills, other_skills_specified, vocational_trainings, eligibilities, profile_id, created_at
ON applicants.applicants
FOR EACH ROW EXECUTE FUNCTION applicants.sr_on_applicant_change();

CREATE OR REPLACE FUNCTION applicants.sr_on_skill_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT array_agg(a.id) INTO v_ids
  FROM applicants.applicants a
  WHERE a.profile_id IN (
    SELECT p FROM (VALUES (CASE WHEN TG_OP <> 'INSERT' THEN OLD.profile_id END),
                          (CASE WHEN TG_OP <> 'DELETE' THEN NEW.profile_id END)) v(p)
    WHERE p IS NOT NULL
  );
  IF v_ids IS NOT NULL THEN PERFORM applicants.sr_refresh(v_ids); END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sr_skill_change ON applicants.applicant_skills;
CREATE TRIGGER trigger_sr_skill_change
AFTER INSERT OR UPDATE OR DELETE ON applicants.applicant_skills
FOR EACH ROW EXECUTE FUNCTION applicants.sr_on_skill_change();

-- A barangay's LPII tag or name changing re-tags everyone (rare, PESO-only edit)
CREATE OR REPLACE FUNCTION applicants.sr_on_barangay_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE applicants.sr_profiles p
  SET lpii_tag = applicants.sr_barangay_tag(
    p.barangay,
    (SELECT mu.id FROM public.municipalities mu
     WHERE applicants.sr_normalize_geo(mu.name) = p.municipality_key ORDER BY mu.name LIMIT 1)
  )
  WHERE p.is_agusan;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sr_barangay_change ON public.barangays;
CREATE TRIGGER trigger_sr_barangay_change
AFTER INSERT OR DELETE OR UPDATE OF name, lpii_tag, municipality_id ON public.barangays
FOR EACH STATEMENT EXECUTE FUNCTION applicants.sr_on_barangay_change();

REVOKE ALL ON FUNCTION applicants.sr_on_applicant_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION applicants.sr_on_skill_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION applicants.sr_on_barangay_change() FROM PUBLIC, anon, authenticated;

-- Backfill
SELECT applicants.sr_refresh(NULL);


-- ─── 5. Read RPCs ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.sr_assert_staff()
RETURNS VOID LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF NOT core.has_role('provincial_peso', 'admin') THEN
    RAISE EXCEPTION 'Only Provincial PESO can view the skill repository.' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION applicants.sr_assert_staff() FROM PUBLIC, anon;

-- Skill counts {name, count, category}[] over a set of applicants, most common first
CREATE OR REPLACE FUNCTION applicants.sr_skill_counts(p_applicant_ids UUID[], p_limit INT DEFAULT NULL)
RETURNS JSONB LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'count', c.cnt, 'category', c.category)
                            ORDER BY c.cnt DESC, c.name), '[]'::jsonb)
  FROM (
    SELECT mode() WITHIN GROUP (ORDER BY s.skill_name) AS name,
           mode() WITHIN GROUP (ORDER BY s.category) AS category,
           count(*)::INT AS cnt
    FROM applicants.sr_skills s
    WHERE s.applicant_id = ANY (p_applicant_ids)
    GROUP BY s.skill_key
    ORDER BY count(*) DESC, mode() WITHIN GROUP (ORDER BY s.skill_name)
    LIMIT p_limit
  ) c;
$$;
REVOKE ALL ON FUNCTION applicants.sr_skill_counts(UUID[], INT) FROM PUBLIC, anon, authenticated;

-- Dashboard: stats, one row per municipality (the 14 of Agusan del Sur always, others when they have
-- applicants), and every skill with its count for the skill filter
CREATE OR REPLACE FUNCTION applicants.skill_repository_summary()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_rows JSONB;
  v_stats JSONB;
  v_skills JSONB;
BEGIN
  PERFORM applicants.sr_assert_staff();

  WITH agusan AS (
    SELECT name, applicants.sr_normalize_geo(name) AS key FROM unnest(applicants.sr_agusan_municipalities()) AS name
  ),
  outside AS (
    SELECT p.municipality_key AS key,
           (array_agg(p.municipality ORDER BY p.sort_at DESC NULLS LAST, p.applicant_id))[1] AS name,
           (array_agg(p.province ORDER BY p.sort_at DESC NULLS LAST, p.applicant_id))[1] AS province
    FROM applicants.sr_profiles p
    WHERE NOT p.is_agusan AND p.municipality_key NOT IN ('', 'agusan del sur', 'unknown')
    GROUP BY p.municipality_key
  ),
  munis AS (
    SELECT a.key, a.name, 'Agusan del Sur'::TEXT AS province, true AS is_agusan FROM agusan a
    UNION ALL
    SELECT o.key, o.name, coalesce(o.province, 'Outside Agusan del Sur'), false FROM outside o
  ),
  muni_rows AS (
    SELECT m.*, ids.ids, ids.total, ids.lowland, ids.upland, ids.wetland, ids.distinct_barangays,
           (SELECT count(*)::INT FROM public.municipalities mu
              JOIN public.barangays b ON b.municipality_id = mu.id
            WHERE m.is_agusan AND applicants.sr_normalize_geo(mu.name) = m.key) AS db_barangays
    FROM munis m
    CROSS JOIN LATERAL (
      SELECT coalesce(array_agg(p.applicant_id), ARRAY[]::UUID[]) AS ids,
             count(*)::INT AS total,
             count(*) FILTER (WHERE m.is_agusan AND p.lpii_tag = 'LOWLAND')::INT AS lowland,
             count(*) FILTER (WHERE m.is_agusan AND p.lpii_tag = 'UPLAND')::INT AS upland,
             count(*) FILTER (WHERE m.is_agusan AND p.lpii_tag = 'WETLAND')::INT AS wetland,
             count(DISTINCT p.barangay_key) FILTER (WHERE p.barangay <> 'Unknown')::INT AS distinct_barangays
      FROM applicants.sr_profiles p
      WHERE p.municipality_key = m.key AND p.is_agusan = m.is_agusan
    ) ids
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'name', r.name,
           'province', r.province,
           'isAgusanDelSur', r.is_agusan,
           'barangays', CASE WHEN r.is_agusan THEN r.db_barangays ELSE r.distinct_barangays END,
           'totalApplicants', r.total,
           'lowlandApplicants', r.lowland,
           'uplandApplicants', r.upland,
           'wetlandApplicants', r.wetland,
           'allSkills', applicants.sr_skill_counts(r.ids)
         ) ORDER BY NOT r.is_agusan, r.name), '[]'::jsonb)
  INTO v_rows
  FROM muni_rows r;

  SELECT jsonb_build_object(
    'totalApplicants', count(*)::INT,
    'agusanApplicants', count(*) FILTER (WHERE p.is_agusan)::INT,
    'outsideApplicants', count(*) FILTER (WHERE NOT p.is_agusan)::INT,
    'lowlandApplicants', count(*) FILTER (WHERE p.is_agusan AND p.lpii_tag = 'LOWLAND')::INT,
    'uplandApplicants', count(*) FILTER (WHERE p.is_agusan AND p.lpii_tag = 'UPLAND')::INT,
    'wetlandApplicants', count(*) FILTER (WHERE p.is_agusan AND p.lpii_tag = 'WETLAND')::INT,
    'totalUniqueSkills', (SELECT count(DISTINCT s.skill_key)::INT FROM applicants.sr_skills s)
  )
  INTO v_stats
  FROM applicants.sr_profiles p;

  SELECT applicants.sr_skill_counts(array_agg(p.applicant_id)) INTO v_skills FROM applicants.sr_profiles p;

  RETURN jsonb_build_object('stats', v_stats, 'municipalities', v_rows, 'skills', coalesce(v_skills, '[]'::jsonb));
END;
$$;

-- One municipality: totals, skills breakdown, categories and one row per barangay
CREATE OR REPLACE FUNCTION applicants.skill_repository_municipality(p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_key TEXT := applicants.sr_normalize_geo(p_name);
  v_is_agusan BOOLEAN := EXISTS (
    SELECT 1 FROM unnest(applicants.sr_agusan_municipalities()) n WHERE applicants.sr_normalize_geo(n) = v_key
  );
  v_muni_id UUID;
  v_ids UUID[];
  v_province TEXT;
  v_breakdown JSONB;
  v_barangays JSONB;
  v_counts RECORD;
BEGIN
  PERFORM applicants.sr_assert_staff();

  SELECT mu.id INTO v_muni_id FROM public.municipalities mu
  WHERE applicants.sr_normalize_geo(mu.name) = v_key ORDER BY mu.name LIMIT 1;

  SELECT coalesce(array_agg(p.applicant_id ORDER BY p.sort_at DESC NULLS LAST, p.applicant_id), ARRAY[]::UUID[]),
         (array_agg(p.province ORDER BY p.sort_at DESC NULLS LAST, p.applicant_id))[1]
  INTO v_ids, v_province
  FROM applicants.sr_profiles p WHERE p.municipality_key = v_key;

  SELECT count(*)::INT AS total,
         count(*) FILTER (WHERE v_is_agusan AND p.lpii_tag = 'LOWLAND')::INT AS lowland,
         count(*) FILTER (WHERE v_is_agusan AND p.lpii_tag = 'UPLAND')::INT AS upland,
         count(*) FILTER (WHERE v_is_agusan AND p.lpii_tag = 'WETLAND')::INT AS wetland
  INTO v_counts
  FROM applicants.sr_profiles p WHERE p.municipality_key = v_key;

  v_breakdown := applicants.sr_skill_counts(v_ids);

  -- Every barangay on record (so empty ones still show), plus any typed by applicants
  WITH known AS (
    SELECT applicants.sr_normalize_barangay(b.name) AS key, b.name, coalesce(b.lpii_tag, 'LOWLAND') AS lpii_tag
    FROM public.barangays b WHERE b.municipality_id = v_muni_id
  ),
  typed AS (
    SELECT p.barangay_key AS key,
           (array_agg(p.barangay ORDER BY p.sort_at DESC NULLS LAST, p.applicant_id))[1] AS name,
           CASE WHEN v_is_agusan THEN (array_agg(p.lpii_tag ORDER BY p.sort_at DESC NULLS LAST, p.applicant_id))[1] END AS lpii_tag
    FROM applicants.sr_profiles p
    WHERE p.municipality_key = v_key AND p.barangay_key NOT IN (SELECT key FROM known)
    GROUP BY p.barangay_key
  ),
  all_barangays AS (
    (SELECT DISTINCT ON (key) key, name, lpii_tag FROM known ORDER BY key, name)
    UNION ALL
    SELECT key, name, lpii_tag FROM typed
  ),
  barangay_rows AS (
    SELECT ab.name, ab.lpii_tag, ids.ids, cardinality(ids.ids) AS cnt
    FROM all_barangays ab
    CROSS JOIN LATERAL (
      SELECT coalesce(array_agg(p.applicant_id), ARRAY[]::UUID[]) AS ids
      FROM applicants.sr_profiles p WHERE p.municipality_key = v_key AND p.barangay_key = ab.key
    ) ids
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'name', r.name,
           'lpiiTag', r.lpii_tag,
           'applicantsCount', r.cnt,
           'topSkills', applicants.sr_skill_counts(r.ids, 3),
           'allSkills', (SELECT coalesce(jsonb_agg(e->'name'), '[]'::jsonb) FROM jsonb_array_elements(applicants.sr_skill_counts(r.ids)) e)
         ) ORDER BY r.cnt DESC, r.name), '[]'::jsonb)
  INTO v_barangays
  FROM barangay_rows r;

  RETURN jsonb_build_object(
    'municipality', p_name,
    'province', CASE WHEN v_is_agusan THEN 'Agusan del Sur' ELSE coalesce(v_province, 'Outside Agusan del Sur') END,
    'isAgusanDelSur', v_is_agusan,
    'totalApplicants', v_counts.total,
    'lowlandApplicants', v_counts.lowland,
    'uplandApplicants', v_counts.upland,
    'wetlandApplicants', v_counts.wetland,
    'uniqueSkillsCount', jsonb_array_length(v_breakdown),
    'skillsBreakdown', v_breakdown,
    'categories', (SELECT coalesce(jsonb_agg(DISTINCT e->>'category' ORDER BY e->>'category'), '[]'::jsonb)
                   FROM jsonb_array_elements(v_breakdown) e),
    'barangayRows', v_barangays
  );
END;
$$;

-- A municipality's applicants, filtered and paged (newest first). total_count is the filtered total.
CREATE OR REPLACE FUNCTION applicants.skill_repository_applicants(
  p_municipality TEXT,
  p_search TEXT DEFAULT NULL,
  p_skill TEXT DEFAULT NULL,
  p_lpii TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  first_name TEXT,
  middle_name TEXT,
  surname TEXT,
  suffix TEXT,
  municipality TEXT,
  barangay TEXT,
  province TEXT,
  lpii_tag TEXT,
  skills JSONB,
  contact_number TEXT,
  email TEXT,
  employment_status TEXT,
  highest_education TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
  v_key TEXT := applicants.sr_normalize_geo(p_municipality);
  v_q TEXT := nullif(lower(trim(coalesce(p_search, ''))), '');
  v_skill TEXT := nullif(lower(trim(coalesce(p_skill, ''))), '');
  v_lpii TEXT := nullif(nullif(upper(trim(coalesce(p_lpii, ''))), ''), 'ALL');
BEGIN
  PERFORM applicants.sr_assert_staff();

  RETURN QUERY
  WITH matched AS (
    SELECT p.*, a.first_name AS a_first, a.middle_name AS a_middle, a.surname AS a_surname, a.suffix AS a_suffix,
           a.profile_id AS a_profile, a.contact_numbers, a.email AS a_email, a.employment_status AS a_status,
           a.educational_background
    FROM applicants.sr_profiles p
    JOIN applicants.applicants a ON a.id = p.applicant_id
    WHERE p.municipality_key = v_key
      AND (v_lpii IS NULL OR p.lpii_tag::TEXT = v_lpii)
      AND (v_skill IS NULL OR EXISTS (SELECT 1 FROM applicants.sr_skills s WHERE s.applicant_id = p.applicant_id AND s.skill_key = v_skill))
      AND (
        v_q IS NULL
        OR lower(concat_ws(' ', a.first_name, a.middle_name, a.surname, a.suffix)) LIKE '%' || v_q || '%'
        OR lower(p.barangay) LIKE '%' || v_q || '%'
        OR EXISTS (SELECT 1 FROM applicants.sr_skills s WHERE s.applicant_id = p.applicant_id AND s.skill_key LIKE '%' || v_q || '%')
      )
  )
  SELECT m.applicant_id, m.a_profile, m.a_first::TEXT, m.a_middle::TEXT, m.a_surname::TEXT, m.a_suffix::TEXT,
         m.municipality, m.barangay, m.province, m.lpii_tag::TEXT,
         (SELECT coalesce(jsonb_agg(jsonb_build_object('name', s.skill_name, 'category', s.category) ORDER BY s.ord), '[]'::jsonb)
          FROM applicants.sr_skills s WHERE s.applicant_id = m.applicant_id),
         m.contact_numbers[1]::TEXT,
         m.a_email::TEXT,
         m.a_status::TEXT,
         CASE WHEN jsonb_typeof(m.educational_background) = 'array'
              THEN coalesce(nullif(m.educational_background->0->>'course', ''), nullif(m.educational_background->0->>'level', '')) END,
         count(*) OVER ()
  FROM matched m
  ORDER BY m.sort_at DESC NULLS LAST, m.applicant_id
  LIMIT greatest(least(coalesce(p_limit, 25), 200), 1)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION applicants.skill_repository_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION applicants.skill_repository_municipality(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION applicants.skill_repository_applicants(TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION applicants.skill_repository_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.skill_repository_municipality(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.skill_repository_applicants(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

COMMIT;
