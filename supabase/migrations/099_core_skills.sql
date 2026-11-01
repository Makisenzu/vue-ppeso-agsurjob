-- =============================================================================
-- Migration: 099_core_skills.sql
-- Purpose:   One skill list for employers and applicants, so "MS Excel", "Excel" and "Microsoft Excel"
--            are the same skill when matching (098). Phase 1 of skill matching; no AI.
--
--              core.skills ──< core.skill_aliases          (other wordings of a skill)
--              core.skill_ignored_keys                      (wordings PESO dismissed: "n/a", "asap")
--
--            1. core.skills: the list. skill_key is the normalized name (same rule as
--               esmdd.job_vacancy_skills.skill_key, 084), unique. The 17 NSRP Form 1 checklist names are
--               seeded here with source 'nsrp' and must keep their exact wording.
--            2. core.skill_aliases: one wording → one skill. alias_key is unique and never equals a skill's
--               own key. Renaming a skill keeps the old name as an alias (100 adds the trigger, since the
--               relinking it starts lives there).
--            3. core.resolve_skill_id(text): skill name first, then alias; NULL when unknown.
--            4. core.search_skills(query, limit): the pickers' suggestions (names and aliases).
--               core.resolve_skill_names(names[]): which typed names the list knows (the "not on the list
--               yet" note in the posting form).
--            More starter skills and aliases: supabase/seeds/004_core_skills.sql (re-runnable).
--            Linking postings and applicants to the list, the PESO review queue and the fit update: 100.
--
-- Access Matrix:
--   Resource              | admin / provincial_peso | other authenticated | anon
--   ----------------------|-------------------------|---------------------|-----
--   skills                | full CRUD               | read active         | none
--   skill_aliases         | full CRUD               | read (active skill) | none
--   skill_ignored_keys    | full CRUD               | none                | none
--   search_skills,        | yes                     | yes                 | none
--   resolve_skill_names   |                         |                     |
--
-- Personal data: none (a reference list). Notified events: none.
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Normalizing ─────────────────────────────────────────────────────────

/** Lower case, trimmed, single spaces; NULL when blank. Same as job_vacancy_skills.skill_key (084) */
CREATE OR REPLACE FUNCTION core.normalize_skill_key(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT nullif(lower(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g')), '');
$$;

GRANT EXECUTE ON FUNCTION core.normalize_skill_key(TEXT) TO authenticated;


-- ─── 2. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.skills (
  id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT         NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  skill_key   TEXT         GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED,
  category    TEXT         CHECK (category IS NULL OR char_length(btrim(category)) BETWEEN 2 AND 60),
  source      TEXT         NOT NULL DEFAULT 'peso' CHECK (source IN ('nsrp', 'tesda', 'peso', 'esco')),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  created_by  UUID         REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT skills_skill_key_unique UNIQUE (skill_key)
);

COMMENT ON TABLE core.skills IS
  'The skill list employers and applicants pick from; matching compares its ids (099, 100).';

CREATE INDEX IF NOT EXISTS idx_skills_active_name ON core.skills (sort_order, name) WHERE is_active;

CREATE TABLE IF NOT EXISTS core.skill_aliases (
  id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  skill_id    INTEGER      NOT NULL REFERENCES core.skills (id) ON DELETE CASCADE,
  alias       TEXT         NOT NULL CHECK (char_length(btrim(alias)) BETWEEN 2 AND 80),
  alias_key   TEXT         GENERATED ALWAYS AS (lower(regexp_replace(btrim(alias), '\s+', ' ', 'g'))) STORED,
  created_by  UUID         REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT skill_aliases_alias_key_unique UNIQUE (alias_key)
);

COMMENT ON TABLE core.skill_aliases IS
  'Other wordings of a skill ("MS Excel" → Microsoft Excel); one wording points to one skill (099).';

CREATE INDEX IF NOT EXISTS idx_skill_aliases_skill ON core.skill_aliases (skill_id);

CREATE TABLE IF NOT EXISTS core.skill_ignored_keys (
  key         TEXT         PRIMARY KEY CHECK (key = lower(regexp_replace(btrim(key), '\s+', ' ', 'g'))),
  created_by  UUID         REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.skill_ignored_keys IS
  'Typed skill wordings PESO dismissed from the review queue, e.g. "n/a" or "asap" (099).';

DROP TRIGGER IF EXISTS trg_skills_updated_at ON core.skills;
CREATE TRIGGER trg_skills_updated_at
BEFORE UPDATE ON core.skills
FOR EACH ROW EXECUTE FUNCTION core.reference_list_touch_updated_at();


-- ─── 3. A wording is a skill name or an alias, never both ───────────────────

/** A skill's name may not be another skill's alias; renaming a skill to its own alias drops that alias */
CREATE OR REPLACE FUNCTION core.guard_skill_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key TEXT := core.normalize_skill_key(NEW.name);
  v_owner TEXT;
BEGIN
  NEW.name := regexp_replace(btrim(NEW.name), '\s+', ' ', 'g');
  NEW.category := nullif(btrim(coalesce(NEW.category, '')), '');

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.created_at := now();
  END IF;

  IF NEW.id IS NOT NULL THEN
    DELETE FROM core.skill_aliases a WHERE a.alias_key = v_key AND a.skill_id = NEW.id;
  END IF;

  SELECT s.name INTO v_owner
  FROM core.skill_aliases a
  JOIN core.skills s ON s.id = a.skill_id
  WHERE a.alias_key = v_key;

  IF v_owner IS NOT NULL THEN
    RAISE EXCEPTION '"%" is already another wording of %', NEW.name, v_owner USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.guard_skill_name() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_skills_guard_name ON core.skills;
CREATE TRIGGER trg_skills_guard_name
BEFORE INSERT OR UPDATE OF name, category ON core.skills
FOR EACH ROW EXECUTE FUNCTION core.guard_skill_name();

/** An alias may not be a skill's own name (any skill) */
CREATE OR REPLACE FUNCTION core.guard_skill_alias()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key TEXT := core.normalize_skill_key(NEW.alias);
  v_owner TEXT;
BEGIN
  NEW.alias := regexp_replace(btrim(NEW.alias), '\s+', ' ', 'g');

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.created_at := now();
  END IF;

  SELECT s.name INTO v_owner FROM core.skills s WHERE s.skill_key = v_key;
  IF v_owner IS NOT NULL THEN
    RAISE EXCEPTION '"%" is already the skill %', NEW.alias, v_owner USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.guard_skill_alias() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_skill_aliases_guard ON core.skill_aliases;
CREATE TRIGGER trg_skill_aliases_guard
BEFORE INSERT OR UPDATE OF alias ON core.skill_aliases
FOR EACH ROW EXECUTE FUNCTION core.guard_skill_alias();


-- ─── 4. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE core.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.skill_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.skill_ignored_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_select_active ON core.skills;
CREATE POLICY authenticated_select_active ON core.skills
FOR SELECT TO authenticated
USING (is_active OR (SELECT core.has_role('admin', 'provincial_peso')));

DROP POLICY IF EXISTS manager_all ON core.skills;
CREATE POLICY manager_all ON core.skills
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin', 'provincial_peso')))
WITH CHECK ((SELECT core.has_role('admin', 'provincial_peso')));

DROP POLICY IF EXISTS authenticated_select ON core.skill_aliases;
CREATE POLICY authenticated_select ON core.skill_aliases
FOR SELECT TO authenticated
USING (
  (SELECT core.has_role('admin', 'provincial_peso'))
  OR EXISTS (SELECT 1 FROM core.skills s WHERE s.id = skill_id AND s.is_active)
);

DROP POLICY IF EXISTS manager_all ON core.skill_aliases;
CREATE POLICY manager_all ON core.skill_aliases
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin', 'provincial_peso')))
WITH CHECK ((SELECT core.has_role('admin', 'provincial_peso')));

DROP POLICY IF EXISTS manager_all ON core.skill_ignored_keys;
CREATE POLICY manager_all ON core.skill_ignored_keys
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin', 'provincial_peso')))
WITH CHECK ((SELECT core.has_role('admin', 'provincial_peso')));

REVOKE ALL ON core.skills, core.skill_aliases, core.skill_ignored_keys FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.skills, core.skill_aliases, core.skill_ignored_keys TO authenticated;
GRANT ALL ON core.skills, core.skill_aliases, core.skill_ignored_keys TO service_role;


-- ─── 5. NSRP Form 1 checklist (exact wording; NSRP_SKILL_OPTIONS in skillHelper.ts) ───

INSERT INTO core.skills (name, category, source, sort_order) VALUES
  ('Auto Mechanic',     'Automotive & Machinery',     'nsrp', 1),
  ('Beautician',        'Household & Personal Care',  'nsrp', 2),
  ('Carpentry Work',    'Construction & Trades',      'nsrp', 3),
  ('Computer Literate', 'Computer / ICT',             'nsrp', 4),
  ('Domestic Chores',   'Household & Personal Care',  'nsrp', 5),
  ('Driver',            'Automotive & Machinery',     'nsrp', 6),
  ('Electrician',       'Construction & Trades',      'nsrp', 7),
  ('Embroidery',        'Creative',                   'nsrp', 8),
  ('Gardening',         'Agriculture',                'nsrp', 9),
  ('Masonry',           'Construction & Trades',      'nsrp', 10),
  ('Painter/Artist',    'Creative',                   'nsrp', 11),
  ('Painting Jobs',     'Construction & Trades',      'nsrp', 12),
  ('Photography',       'Creative',                   'nsrp', 13),
  ('Plumbing',          'Construction & Trades',      'nsrp', 14),
  ('Sewing Dresses',    'Creative',                   'nsrp', 15),
  ('Stenography',       'Office / Clerical',          'nsrp', 16),
  ('Tailoring',         'Creative',                   'nsrp', 17)
ON CONFLICT (skill_key) DO NOTHING;


-- ─── 6. Lookups ─────────────────────────────────────────────────────────────

/** The skill a wording names: its name first, then an alias; NULL when the list doesn't know it */
CREATE OR REPLACE FUNCTION core.resolve_skill_id(p_value TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT s.id FROM core.skills s WHERE s.skill_key = core.normalize_skill_key(p_value)),
    (SELECT a.skill_id FROM core.skill_aliases a WHERE a.alias_key = core.normalize_skill_key(p_value))
  );
$$;

REVOKE ALL ON FUNCTION core.resolve_skill_id(TEXT) FROM PUBLIC, anon, authenticated;

/**
 * Picker suggestions: active skills whose name or an alias contains the query. Names that start with it
 * first, then aliases that start with it, then the rest; one row per skill.
 */
CREATE OR REPLACE FUNCTION core.search_skills(p_query TEXT, p_limit INT DEFAULT 8)
RETURNS TABLE (id INTEGER, name TEXT, category TEXT, matched_alias TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (SELECT core.normalize_skill_key(p_query) AS key),
  hits AS (
    SELECT s.id, s.name, s.category, NULL::TEXT AS matched_alias,
           CASE WHEN s.skill_key LIKE q.key || '%' THEN 0 ELSE 2 END AS rnk, s.sort_order
    FROM core.skills s, q
    WHERE s.is_active AND q.key IS NOT NULL AND s.skill_key LIKE '%' || q.key || '%'
    UNION ALL
    SELECT s.id, s.name, s.category, a.alias,
           CASE WHEN a.alias_key LIKE q.key || '%' THEN 1 ELSE 3 END, s.sort_order
    FROM core.skill_aliases a
    JOIN core.skills s ON s.id = a.skill_id, q
    WHERE s.is_active AND q.key IS NOT NULL AND a.alias_key LIKE '%' || q.key || '%'
  ),
  best AS (
    SELECT DISTINCT ON (h.id) h.*
    FROM hits h
    ORDER BY h.id, h.rnk, h.matched_alias NULLS FIRST
  )
  SELECT b.id, b.name, b.category, b.matched_alias
  FROM best b
  ORDER BY b.rnk, b.sort_order, b.name
  LIMIT least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

REVOKE ALL ON FUNCTION core.search_skills(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.search_skills(TEXT, INT) TO authenticated;

/** For each typed name: the skill the list maps it to (NULL when not on the list yet) */
CREATE OR REPLACE FUNCTION core.resolve_skill_names(p_names TEXT[])
RETURNS TABLE (name TEXT, skill_id INTEGER, skill_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT n.name, s.id, s.name
  FROM unnest(coalesce(p_names, '{}')) WITH ORDINALITY AS n (name, ord)
  LEFT JOIN core.skills s ON s.id = core.resolve_skill_id(n.name)
  WHERE cardinality(coalesce(p_names, '{}')) <= 100
  ORDER BY n.ord;
$$;

REVOKE ALL ON FUNCTION core.resolve_skill_names(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.resolve_skill_names(TEXT[]) TO authenticated;

COMMIT;
