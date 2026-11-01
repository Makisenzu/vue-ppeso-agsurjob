-- =============================================================================
-- Migration: 100_skill_links_and_fit.sql
-- Purpose:   Link what employers and applicants already typed to the skill list (099), keep it linked
--            as people save, give PESO a review queue for unknown wordings, and match skills by id in
--            the vacancy fit (098).
--
--              esmdd.job_vacancy_skills.skill_id ──> core.skills
--              applicants.applicant_skill_index  ──> core.skills      (derived from the NSRP record)
--
--            1. job_vacancy_skills.skill_id: set from skill_name by a trigger on every save (the employer
--               still sees what they typed). Backfilled here.
--            2. applicants.applicant_skill_index: one row per skill wording on an applicant's record —
--               NSRP checklist (other_skills), "Others, specify" (other_skills_specified, split on , ; and
--               new lines), training skills acquired (vocational_trainings), profile skills
--               (applicant_skills) — with the skill it maps to. Rebuilt for one applicant whenever those
--               fields change. The NSRP fields themselves are unchanged (official form, import, Skill
--               Repository). Backfilled here.
--            3. Relinking: adding, changing or removing an alias or a skill name relinks every posting skill
--               and index row with that wording at once. Renaming a skill keeps the old name as an alias.
--               core.merge_skills(from, into) folds one skill into another.
--            4. PESO review queue (admin / provincial_peso):
--                 core.unmapped_skill_keys(search, limit, offset)  wordings not on the list, with how many
--                                                                  postings and applicants use them (counts
--                                                                  only, no applicant ids)
--                 core.add_skill_from_wording(name, category, wording)  new skill (+ the wording as alias)
--                 core.skill_link_coverage()                       share of wordings linked
--                 core.refresh_skill_links()                       relink everything
--               Mapping a wording to an existing skill is a plain insert into core.skill_aliases; ignoring
--               one is an insert into core.skill_ignored_keys (099 RLS).
--            5. Vacancy fit: a posting skill matches when the applicant's index has the same skill id;
--               wordings not on the list still match by text as in 098. Same output shape.
--
-- Access Matrix:
--   Resource                     | admin / provincial_peso | applicant        | employer / others
--   -----------------------------|-------------------------|------------------|------------------
--   applicant_skill_index        | read                    | read own         | none (fit only)
--   job_vacancy_skills.skill_id  | as 084                  | as 084           | as 084
--   queue / coverage / refresh / | yes                     | none             | none
--   merge                        |                         |                  |
--
-- Personal data (PRIVACY.md): applicant_skill_index is a derived copy of skills already on the NSRP
-- record, kept for matching. Nothing new is collected; it is deleted with the applicant (ON DELETE CASCADE,
-- so erasure follows 069 / 073) and rebuilt from the record on every change. The review queue shows
-- wordings and counts, never who wrote them.
--
-- Notified events: none.
-- Depends on 084, 098, 099. After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Posting skills → skill id ───────────────────────────────────────────

ALTER TABLE esmdd.job_vacancy_skills
  ADD COLUMN IF NOT EXISTS skill_id INTEGER REFERENCES core.skills (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_vacancy_skills_skill ON esmdd.job_vacancy_skills (skill_id);
CREATE INDEX IF NOT EXISTS idx_job_vacancy_skills_unlinked ON esmdd.job_vacancy_skills (skill_key) WHERE skill_id IS NULL;

COMMENT ON COLUMN esmdd.job_vacancy_skills.skill_id IS
  'The core.skills row skill_name maps to (by name or alias); NULL while not on the list (100).';

CREATE OR REPLACE FUNCTION esmdd.link_job_vacancy_skill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.skill_id := core.resolve_skill_id(NEW.skill_name);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.link_job_vacancy_skill() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancy_skills_link ON esmdd.job_vacancy_skills;
CREATE TRIGGER trg_job_vacancy_skills_link
BEFORE INSERT OR UPDATE OF skill_name ON esmdd.job_vacancy_skills
FOR EACH ROW EXECUTE FUNCTION esmdd.link_job_vacancy_skill();


-- ─── 2. Applicant skill index ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applicants.applicant_skill_index (
  applicant_id  UUID     NOT NULL REFERENCES applicants.applicants (id) ON DELETE CASCADE,
  skill_key     TEXT     NOT NULL,
  skill_text    TEXT     NOT NULL,
  source        TEXT     NOT NULL CHECK (source IN ('nsrp_checklist', 'nsrp_specified', 'training', 'profile')),
  skill_id      INTEGER  REFERENCES core.skills (id) ON DELETE SET NULL,
  PRIMARY KEY (applicant_id, skill_key, source)
);

COMMENT ON TABLE applicants.applicant_skill_index IS
  'Derived from the NSRP record for matching: each skill wording and the core.skills row it maps to (100).';

CREATE INDEX IF NOT EXISTS idx_applicant_skill_index_skill ON applicants.applicant_skill_index (skill_id);
CREATE INDEX IF NOT EXISTS idx_applicant_skill_index_unlinked
  ON applicants.applicant_skill_index (skill_key) WHERE skill_id IS NULL;

/** Every skill wording on one applicant's record, split the same way as the fit (098) */
CREATE OR REPLACE FUNCTION applicants.applicant_skill_sources(p_applicant applicants.applicants)
RETURNS TABLE (skill_key TEXT, skill_text TEXT, source TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (s.k, s.src) s.k, s.txt, s.src
  FROM (
    SELECT core.normalize_skill_key(x) AS k, regexp_replace(btrim(x), '\s+', ' ', 'g') AS txt, 'nsrp_checklist' AS src
    FROM unnest(coalesce(p_applicant.other_skills, '{}')) AS x
    UNION ALL
    SELECT core.normalize_skill_key(x), regexp_replace(btrim(x), '\s+', ' ', 'g'), 'nsrp_specified'
    FROM regexp_split_to_table(coalesce(p_applicant.other_skills_specified, ''), '[,;\n]') AS x
    UNION ALL
    SELECT core.normalize_skill_key(x), regexp_replace(btrim(x), '\s+', ' ', 'g'), 'training'
    FROM jsonb_array_elements(esmdd.match_jsonb_array(p_applicant.vocational_trainings::JSONB)) AS t
    CROSS JOIN LATERAL regexp_split_to_table(coalesce(t ->> 'skills_acquired', ''), '[,;\n]') AS x
    UNION ALL
    SELECT core.normalize_skill_key(sk.skill_name), regexp_replace(btrim(sk.skill_name), '\s+', ' ', 'g'), 'profile'
    FROM applicants.applicant_skills sk
    WHERE p_applicant.profile_id IS NOT NULL AND sk.profile_id = p_applicant.profile_id
  ) s
  WHERE s.k IS NOT NULL
    AND char_length(s.k) BETWEEN 2 AND 80
    AND s.k NOT IN ('others', 'other', 'none', 'n/a', 'na')
  ORDER BY s.k, s.src, s.txt;
$$;

REVOKE ALL ON FUNCTION applicants.applicant_skill_sources(applicants.applicants) FROM PUBLIC, anon, authenticated;

/** Replaces one applicant's index rows from their record */
CREATE OR REPLACE FUNCTION applicants.rebuild_applicant_skill_index(p_applicant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM applicants.applicant_skill_index WHERE applicant_id = p_applicant_id;

  INSERT INTO applicants.applicant_skill_index (applicant_id, skill_key, skill_text, source, skill_id)
  SELECT p.id, src.skill_key, src.skill_text, src.source, core.resolve_skill_id(src.skill_key)
  FROM applicants.applicants p
  CROSS JOIN LATERAL applicants.applicant_skill_sources(p) AS src
  WHERE p.id = p_applicant_id;
END;
$$;

REVOKE ALL ON FUNCTION applicants.rebuild_applicant_skill_index(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION applicants.sync_applicant_skill_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM applicants.rebuild_applicant_skill_index(NEW.id);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION applicants.sync_applicant_skill_index() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_applicants_skill_index ON applicants.applicants;
CREATE TRIGGER trg_applicants_skill_index
AFTER INSERT OR UPDATE OF other_skills, other_skills_specified, vocational_trainings, profile_id ON applicants.applicants
FOR EACH ROW EXECUTE FUNCTION applicants.sync_applicant_skill_index();

/** Profile skills belong to a profile; rebuild the applicant(s) on it */
CREATE OR REPLACE FUNCTION applicants.sync_applicant_skill_index_from_profile_skill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  FOR v_id IN
    SELECT a.id
    FROM applicants.applicants a
    WHERE a.profile_id IN (
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.profile_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.profile_id END
    )
  LOOP
    PERFORM applicants.rebuild_applicant_skill_index(v_id);
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION applicants.sync_applicant_skill_index_from_profile_skill() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_applicant_skills_skill_index ON applicants.applicant_skills;
CREATE TRIGGER trg_applicant_skills_skill_index
AFTER INSERT OR UPDATE OR DELETE ON applicants.applicant_skills
FOR EACH ROW EXECUTE FUNCTION applicants.sync_applicant_skill_index_from_profile_skill();

ALTER TABLE applicants.applicant_skill_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_select ON applicants.applicant_skill_index;
CREATE POLICY staff_select ON applicants.applicant_skill_index
FOR SELECT TO authenticated
USING ((SELECT core.has_role('admin', 'provincial_peso')));

DROP POLICY IF EXISTS applicant_own_select ON applicants.applicant_skill_index;
CREATE POLICY applicant_own_select ON applicants.applicant_skill_index
FOR SELECT TO authenticated
USING (applicant_id IN (SELECT a.id FROM applicants.applicants a WHERE a.profile_id = (SELECT auth.uid())));

-- Written only by the triggers above
REVOKE ALL ON applicants.applicant_skill_index FROM anon, authenticated;
GRANT SELECT ON applicants.applicant_skill_index TO authenticated;
GRANT ALL ON applicants.applicant_skill_index TO service_role;


-- ─── 3. Relinking when the list changes ─────────────────────────────────────

/** Re-resolves every posting skill and index row with one of these wordings */
CREATE OR REPLACE FUNCTION core.relink_skill_keys(p_keys TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_keys IS NULL OR cardinality(p_keys) = 0 THEN
    RETURN;
  END IF;

  UPDATE esmdd.job_vacancy_skills v
  SET skill_id = core.resolve_skill_id(v.skill_name)
  WHERE v.skill_key = ANY (p_keys)
    AND v.skill_id IS DISTINCT FROM core.resolve_skill_id(v.skill_name);

  UPDATE applicants.applicant_skill_index i
  SET skill_id = core.resolve_skill_id(i.skill_key)
  WHERE i.skill_key = ANY (p_keys)
    AND i.skill_id IS DISTINCT FROM core.resolve_skill_id(i.skill_key);
END;
$$;

REVOKE ALL ON FUNCTION core.relink_skill_keys(TEXT[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION core.relink_after_skill_alias_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM core.relink_skill_keys(ARRAY[
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.alias_key END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.alias_key END
  ]);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION core.relink_after_skill_alias_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_skill_aliases_relink ON core.skill_aliases;
CREATE TRIGGER trg_skill_aliases_relink
AFTER INSERT OR UPDATE OR DELETE ON core.skill_aliases
FOR EACH ROW EXECUTE FUNCTION core.relink_after_skill_alias_change();

/** A new skill links its wording; a renamed one keeps its old name as an alias, then relinks both */
CREATE OR REPLACE FUNCTION core.relink_after_skill_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.skill_key IS DISTINCT FROM NEW.skill_key THEN
    INSERT INTO core.skill_aliases (skill_id, alias)
    VALUES (NEW.id, OLD.name)
    ON CONFLICT (alias_key) DO NOTHING;
    PERFORM core.relink_skill_keys(ARRAY[OLD.skill_key, NEW.skill_key]);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM core.relink_skill_keys(ARRAY[NEW.skill_key]);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION core.relink_after_skill_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_skills_relink ON core.skills;
CREATE TRIGGER trg_skills_relink
AFTER INSERT OR UPDATE OF name ON core.skills
FOR EACH ROW EXECUTE FUNCTION core.relink_after_skill_change();

/** Folds one skill into another: links, aliases and its name (as an alias) move to the kept one */
CREATE OR REPLACE FUNCTION core.merge_skills(p_from INTEGER, p_into INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_from_name TEXT;
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso') THEN
    RAISE EXCEPTION 'Only PESO can manage the skill list' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_into IS NULL OR p_from = p_into THEN
    RAISE EXCEPTION 'Pick two different skills to merge' USING ERRCODE = '22023';
  END IF;

  SELECT s.name INTO v_from_name FROM core.skills s WHERE s.id = p_from;
  IF v_from_name IS NULL OR NOT EXISTS (SELECT 1 FROM core.skills s WHERE s.id = p_into) THEN
    RAISE EXCEPTION 'This skill could not be found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE esmdd.job_vacancy_skills SET skill_id = p_into WHERE skill_id = p_from;
  UPDATE applicants.applicant_skill_index SET skill_id = p_into WHERE skill_id = p_from;
  UPDATE core.skill_aliases SET skill_id = p_into WHERE skill_id = p_from;
  DELETE FROM core.skills WHERE id = p_from;
  INSERT INTO core.skill_aliases (skill_id, alias) VALUES (p_into, v_from_name) ON CONFLICT (alias_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION core.merge_skills(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.merge_skills(INTEGER, INTEGER) TO authenticated;

/** Relinks every posting skill and index row (after a bulk seed, for example) */
CREATE OR REPLACE FUNCTION core.refresh_skill_links()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso') THEN
    RAISE EXCEPTION 'Only PESO can manage the skill list' USING ERRCODE = '42501';
  END IF;

  UPDATE esmdd.job_vacancy_skills v
  SET skill_id = core.resolve_skill_id(v.skill_name)
  WHERE v.skill_id IS DISTINCT FROM core.resolve_skill_id(v.skill_name);

  UPDATE applicants.applicant_skill_index i
  SET skill_id = core.resolve_skill_id(i.skill_key)
  WHERE i.skill_id IS DISTINCT FROM core.resolve_skill_id(i.skill_key);
END;
$$;

REVOKE ALL ON FUNCTION core.refresh_skill_links() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.refresh_skill_links() TO authenticated;


-- ─── 4. PESO review queue ───────────────────────────────────────────────────

/** Wordings not on the list (and not ignored), most used first; counts only, never who typed them */
CREATE OR REPLACE FUNCTION core.unmapped_skill_keys(
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  wording_key TEXT,
  example_text TEXT,
  vacancy_count BIGINT,
  applicant_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso') THEN
    RAISE EXCEPTION 'Only PESO can manage the skill list' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH v AS (
    SELECT s.skill_key AS k, min(s.skill_name) AS txt, count(DISTINCT s.job_vacancy_id) AS n
    FROM esmdd.job_vacancy_skills s
    WHERE s.skill_id IS NULL
    GROUP BY s.skill_key
  ),
  a AS (
    SELECT i.skill_key AS k, min(i.skill_text) AS txt, count(DISTINCT i.applicant_id) AS n
    FROM applicants.applicant_skill_index i
    WHERE i.skill_id IS NULL
    GROUP BY i.skill_key
  ),
  j AS (
    SELECT coalesce(v.k, a.k) AS k, coalesce(v.txt, a.txt) AS txt, coalesce(v.n, 0) AS vn, coalesce(a.n, 0) AS an
    FROM v
    FULL JOIN a ON a.k = v.k
  )
  SELECT j.k, j.txt, j.vn, j.an, count(*) OVER ()
  FROM j
  WHERE NOT EXISTS (SELECT 1 FROM core.skill_ignored_keys g WHERE g.key = j.k)
    AND (nullif(btrim(p_search), '') IS NULL OR j.k LIKE '%' || core.normalize_skill_key(p_search) || '%')
  ORDER BY j.vn + j.an DESC, j.k
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION core.unmapped_skill_keys(TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.unmapped_skill_keys(TEXT, INT, INT) TO authenticated;

/** A new skill from a queued wording; the wording becomes its alias when it reads differently */
CREATE OR REPLACE FUNCTION core.add_skill_from_wording(p_name TEXT, p_category TEXT, p_wording TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO core.skills (name, category, source) VALUES (p_name, p_category, 'peso') RETURNING id INTO v_id;
  IF core.normalize_skill_key(p_wording) IS NOT NULL
     AND core.normalize_skill_key(p_wording) <> core.normalize_skill_key(p_name) THEN
    INSERT INTO core.skill_aliases (skill_id, alias) VALUES (v_id, p_wording) ON CONFLICT (alias_key) DO NOTHING;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION core.add_skill_from_wording(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.add_skill_from_wording(TEXT, TEXT, TEXT) TO authenticated;

/** How much of what people typed is on the list (ignored wordings left out) */
CREATE OR REPLACE FUNCTION core.skill_link_coverage()
RETURNS TABLE (vacancy_total BIGINT, vacancy_linked BIGINT, applicant_total BIGINT, applicant_linked BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso') THEN
    RAISE EXCEPTION 'Only PESO can manage the skill list' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM esmdd.job_vacancy_skills s
       WHERE s.skill_id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM core.skill_ignored_keys g WHERE g.key = s.skill_key)),
    (SELECT count(*) FROM esmdd.job_vacancy_skills s WHERE s.skill_id IS NOT NULL),
    (SELECT count(*) FROM applicants.applicant_skill_index i
       WHERE i.skill_id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM core.skill_ignored_keys g WHERE g.key = i.skill_key)),
    (SELECT count(*) FROM applicants.applicant_skill_index i WHERE i.skill_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION core.skill_link_coverage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.skill_link_coverage() TO authenticated;


-- ─── 5. Backfill ────────────────────────────────────────────────────────────

UPDATE esmdd.job_vacancy_skills v
SET skill_id = core.resolve_skill_id(v.skill_name)
WHERE v.skill_id IS DISTINCT FROM core.resolve_skill_id(v.skill_name);

INSERT INTO applicants.applicant_skill_index (applicant_id, skill_key, skill_text, source, skill_id)
SELECT p.id, src.skill_key, src.skill_text, src.source, core.resolve_skill_id(src.skill_key)
FROM applicants.applicants p
CROSS JOIN LATERAL applicants.applicant_skill_sources(p) AS src
ON CONFLICT (applicant_id, skill_key, source) DO UPDATE
SET skill_text = EXCLUDED.skill_text,
    skill_id = EXCLUDED.skill_id;


-- ─── 6. Vacancy fit: skills by id (replaces 098's two functions; same output) ───

/** Skill matches by list id when both sides are linked, else by wording as in 098 */
CREATE OR REPLACE FUNCTION esmdd.fit_skill_matches(p_skill JSONB, p_ids INTEGER[], p_keys TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT coalesce((p_skill ->> 'id')::INTEGER = ANY (p_ids), false)
      OR coalesce((p_skill ->> 'key') = ANY (p_keys), false);
$$;

REVOKE ALL ON FUNCTION esmdd.fit_skill_matches(JSONB, INTEGER[], TEXT[]) FROM PUBLIC, anon, authenticated;

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
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', s.skill_name, 'key', s.skill_key, 'id', s.skill_id) ORDER BY s.skill_name), '[]'::JSONB)
      FROM esmdd.job_vacancy_skills s
      WHERE s.job_vacancy_id = v.id AND s.is_required
    ),
    'skills_optional', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', s.skill_name, 'key', s.skill_key, 'id', s.skill_id) ORDER BY s.skill_name), '[]'::JSONB)
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
  v_skill_ids  INTEGER[];
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

  -- Skills the applicant's record maps to on the skill list (100)
  SELECT coalesce(array_agg(DISTINCT i.skill_id) FILTER (WHERE i.skill_id IS NOT NULL), '{}')
  INTO v_skill_ids
  FROM applicants.applicant_skill_index i
  WHERE i.applicant_id = p_applicant.id;

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
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      (count(*) FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)))::NUMERIC / count(*)
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
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      coalesce(jsonb_agg(s ->> 'name') FILTER (WHERE NOT esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)), '[]'::JSONB),
      (count(*) FILTER (WHERE esmdd.fit_skill_matches(s, v_skill_ids, v_skill_keys)))::NUMERIC / count(*)
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

REVOKE ALL ON FUNCTION esmdd.job_vacancy_fit_requirements(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION esmdd.job_vacancy_fit_for(JSONB, applicants.applicants) FROM PUBLIC, anon, authenticated;

COMMIT;


-- ─── Manual checks (SQL editor, as postgres; not run by the migration) ──────
--
-- 1. Wordings resolve:  SELECT core.resolve_skill_id('ms excel') = core.resolve_skill_id('Microsoft Excel');  -- true
-- 2. Postings linked:   SELECT skill_name, skill_id FROM esmdd.job_vacancy_skills ORDER BY skill_id NULLS FIRST LIMIT 20;
-- 3. Applicants linked: SELECT source, count(*), count(skill_id) FROM applicants.applicant_skill_index GROUP BY 1;
-- 4. Adding an alias relinks: pick a NULL wording from (2), INSERT INTO core.skill_aliases (skill_id, alias) …,
--    then re-run (2): it now has a skill_id.
-- 5. Editing an NSRP record rebuilds its rows:
--    UPDATE applicants.applicants SET other_skills_specified = 'MS Excel, Forklift' WHERE id = '<id>';
--    SELECT * FROM applicants.applicant_skill_index WHERE applicant_id = '<id>';
-- 6. Fit by id: a posting with "Microsoft Excel" and an applicant with "MS Excel" → skills_required matched.
--    SELECT jsonb_pretty(esmdd.compute_job_vacancy_fit('<vacancy id>', '<applicant id>'));
-- 7. Queue (as a provincial_peso user): SELECT * FROM core.unmapped_skill_keys(NULL, 20, 0);
