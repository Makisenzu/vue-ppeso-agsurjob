-- ════════════════════════════════════════════════════════════════════════════
-- 118 · Skills Training: trainings conducted, their participants, and the skills demand / gap
-- ════════════════════════════════════════════════════════════════════════════
-- Provincial PESO arranges skills trainings with training agencies (TESDA, DICT, …) outside the portal. The
-- portal answers two questions for them:
--
--   1. What should we train?   Skills Demand: for every skill on the Skill List (core.skills, 099), the slots
--                              of open vacancies that require it (demand) against the jobseekers who have it
--                              (supply). The difference is the gap: the training to conduct.
--   2. What did we train, and did it work?   Trainings Conducted: each training with its participants, picked
--                              from the applicant registry, and each participant's current status (hired by a
--                              company, self-employed, still looking), which PESO keeps up to date.
--
--   esmdd.skills_trainings ──< esmdd.skills_training_participants >── applicants.applicants
--            └──< esmdd.skills_training_skills >── core.skills
--
-- A training teaches one or more skills from the Skill List (a Virtual Assistance training covers email
-- management, data entry, social media management, …). A participant who completed a training counts as
-- having each of its skills in the gap (they may not have added them to their NSRP record yet).
--
-- RPCs (SECURITY DEFINER; rows only for provincial_peso / admin, like the Skill Repository, 110):
--   esmdd.save_skills_training(...)                  creates / updates a training and replaces its skills (1–20)
--   esmdd.skills_trainings_search(...)               trainings with skills and participant counts, filtered and paged
--   esmdd.skills_training_filters()                  agencies and years on file (filter options)
--   esmdd.skills_training_participants_search(...)   one training's participants, filtered and paged
--   esmdd.skills_training_candidates(...)            registry applicants not in the training yet, paged
--   esmdd.skills_demand_search(...)                  the demand / supply / gap table, filtered and paged
--   esmdd.skills_demand_places(...)                  one skill by municipality: where it is short, where it is in surplus
--   esmdd.skills_demand_summary(...)                 its totals
--   esmdd.skills_demand_vacancies(...)               the open vacancies behind one skill's demand
--   esmdd.skills_demand_supply(...)                  the jobseekers behind one skill's supply, paged
--
-- Access Matrix:
--   Resource                       | provincial_peso | municipal_peso / dole / admin | applicant / employer
--   -------------------------------|-----------------|-------------------------------|---------------------
--   skills_trainings               | full CRUD       | read                          | none
--   skills_training_skills         | full CRUD       | read                          | none
--   skills_training_participants   | full CRUD       | read                          | none
--   RPCs above                     | yes (+ admin)   | no rows                       | no rows
--
-- Personal data (PRIVACY.md): skills_training_participants names an applicant and their employment outcome
-- (purpose: PESO employment facilitation and program monitoring, already in the Privacy Notice). It gets the
-- row-change audit trigger; the FK to applicants.applicants makes it reachable by core.export_my_data() and
-- removes it with the applicant (ON DELETE CASCADE). Government program record: not auto-purged (§7).
-- The demand table returns counts only; skills_demand_supply lists the jobseekers behind one skill's supply
-- (name, municipality, employment status: a list summary, staff only).
--
-- Notified events:
--   Event                                   | Recipient     | Type            | Trigger
--   ----------------------------------------|---------------|-----------------|------------------------------------
--   Applicant listed as a training participant | the applicant | skills_training | trg_notify_skills_training_participant
--   (employment / completion status are staff-only tracking and never notify)
--
-- Depends on 034 (core.has_role), 035 (applicant_municipality), 053 / 057 (system.notify), 073 (audit),
-- 099 / 100 (core.skills, skill links), 110 (sr_normalize_geo, sr_profiles). Safe to re-run.
-- After applying, re-run `npm run types:gen`.

BEGIN;


-- ─── 1. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.skills_trainings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 150),
  -- The training agency PESO coordinated with ('TESDA', 'DICT', or typed)
  agency        TEXT        NOT NULL CHECK (char_length(btrim(agency)) BETWEEN 2 AND 100),
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  venue         TEXT        CHECK (venue IS NULL OR char_length(venue) <= 200),
  municipality  TEXT        CHECK (municipality IS NULL OR char_length(municipality) <= 80),
  remarks       TEXT        CHECK (remarks IS NULL OR char_length(remarks) <= 1000),
  created_by    UUID        REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skills_trainings_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE esmdd.skills_trainings IS
  'Skills trainings Provincial PESO conducted with a training agency (TESDA, DICT, …): title, agency, dates and venue. Its skills are in skills_training_skills.';

CREATE INDEX IF NOT EXISTS idx_skills_trainings_start_date ON esmdd.skills_trainings (start_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_trainings_agency ON esmdd.skills_trainings (agency);

-- The skills a training teaches (one or more, from the Skill List); written by esmdd.save_skills_training
CREATE TABLE IF NOT EXISTS esmdd.skills_training_skills (
  training_id  UUID     NOT NULL REFERENCES esmdd.skills_trainings (id) ON DELETE CASCADE,
  skill_id     INTEGER  NOT NULL REFERENCES core.skills (id) ON DELETE CASCADE,
  PRIMARY KEY (training_id, skill_id)
);

COMMENT ON TABLE esmdd.skills_training_skills IS
  'Skills taught by a skills training: one row per training and core.skills skill.';

CREATE INDEX IF NOT EXISTS idx_skills_training_skills_skill ON esmdd.skills_training_skills (skill_id);

-- A first draft of this migration kept a single skill on the training row: move it over
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'esmdd' AND table_name = 'skills_trainings' AND column_name = 'skill_id'
  ) THEN
    INSERT INTO esmdd.skills_training_skills (training_id, skill_id)
    SELECT t.id, t.skill_id FROM esmdd.skills_trainings t WHERE t.skill_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    DROP INDEX IF EXISTS esmdd.idx_skills_trainings_skill;
    ALTER TABLE esmdd.skills_trainings DROP COLUMN skill_id;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS esmdd.skills_training_participants (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id        UUID        NOT NULL REFERENCES esmdd.skills_trainings (id) ON DELETE CASCADE,
  applicant_id       UUID        NOT NULL REFERENCES applicants.applicants (id) ON DELETE CASCADE,
  completion_status  TEXT        NOT NULL DEFAULT 'Enrolled'
                                 CHECK (completion_status IN ('Enrolled', 'Completed', 'Did Not Finish')),
  -- Where the participant is now, tracked by PESO after the training
  employment_status  TEXT        NOT NULL DEFAULT 'Not Yet Employed'
                                 CHECK (employment_status IN ('Not Yet Employed', 'Hired', 'Self-Employed', 'Unreachable')),
  -- The company that hired them; typed, since it may not be registered in the portal
  employer_name      TEXT        CHECK (employer_name IS NULL OR char_length(employer_name) <= 150),
  date_hired         DATE,
  status_remarks     TEXT        CHECK (status_remarks IS NULL OR char_length(status_remarks) <= 500),
  status_updated_at  TIMESTAMPTZ,
  added_by           UUID        REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skills_training_participants_unique UNIQUE (training_id, applicant_id),
  CONSTRAINT skills_training_participants_hired_employer
    CHECK (employment_status <> 'Hired' OR nullif(btrim(employer_name), '') IS NOT NULL)
);

COMMENT ON TABLE esmdd.skills_training_participants IS
  'Participants of a skills training (registry applicants) with their completion and current employment status, tracked by Provincial PESO.';

-- training_id leads the unique index; these cover the applicant lookups and the participant list order
CREATE INDEX IF NOT EXISTS idx_skills_training_participants_applicant
  ON esmdd.skills_training_participants (applicant_id);
CREATE INDEX IF NOT EXISTS idx_skills_training_participants_list
  ON esmdd.skills_training_participants (training_id, created_at DESC);


-- ─── 2. Row upkeep ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.set_skills_training_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skills_training_updated_at ON esmdd.skills_trainings;
CREATE TRIGGER trg_skills_training_updated_at
  BEFORE UPDATE ON esmdd.skills_trainings
  FOR EACH ROW EXECUTE FUNCTION esmdd.set_skills_training_updated_at();

-- Employer and date hired only belong to a hire; a status change is stamped
CREATE OR REPLACE FUNCTION esmdd.skills_training_participant_upkeep()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.employer_name := nullif(btrim(NEW.employer_name), '');
  NEW.status_remarks := nullif(btrim(NEW.status_remarks), '');
  IF NEW.employment_status <> 'Hired' THEN
    NEW.employer_name := NULL;
    NEW.date_hired := NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    IF NEW.employment_status IS DISTINCT FROM OLD.employment_status
       OR NEW.completion_status IS DISTINCT FROM OLD.completion_status
       OR NEW.employer_name IS DISTINCT FROM OLD.employer_name
       OR NEW.date_hired IS DISTINCT FROM OLD.date_hired THEN
      NEW.status_updated_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skills_training_participant_upkeep ON esmdd.skills_training_participants;
CREATE TRIGGER trg_skills_training_participant_upkeep
  BEFORE INSERT OR UPDATE ON esmdd.skills_training_participants
  FOR EACH ROW EXECUTE FUNCTION esmdd.skills_training_participant_upkeep();

-- Audit trail (PRIVACY.md §5.1): who changed whose training record, never the values
DROP TRIGGER IF EXISTS trg_audit_personal_data ON esmdd.skills_training_participants;
CREATE TRIGGER trg_audit_personal_data
  AFTER INSERT OR UPDATE OR DELETE ON esmdd.skills_training_participants
  FOR EACH ROW EXECUTE FUNCTION system.audit_personal_data_change('applicant_id', 'applicant');


-- ─── 3. Notification: listed as a participant ───────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.notify_skills_training_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_training esmdd.skills_trainings%ROWTYPE;
BEGIN
  SELECT * INTO v_training FROM esmdd.skills_trainings WHERE id = NEW.training_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM system.notify(
    system.applicant_profile_id(NEW.applicant_id),
    'skills_training',
    'Skills training',
    format(
      'You are listed as a participant of the skills training "%s" (%s), %s.',
      v_training.title,
      v_training.agency,
      CASE
        WHEN v_training.start_date = v_training.end_date THEN 'on ' || to_char(v_training.start_date, 'MM/DD/YYYY')
        ELSE 'from ' || to_char(v_training.start_date, 'MM/DD/YYYY') || ' to ' || to_char(v_training.end_date, 'MM/DD/YYYY')
      END
    )
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION esmdd.notify_skills_training_participant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_skills_training_participant ON esmdd.skills_training_participants;
CREATE TRIGGER trg_notify_skills_training_participant
  AFTER INSERT ON esmdd.skills_training_participants
  FOR EACH ROW EXECUTE FUNCTION esmdd.notify_skills_training_participant();


-- ─── 4. Access ──────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON esmdd.skills_trainings, esmdd.skills_training_skills, esmdd.skills_training_participants TO authenticated;
GRANT ALL ON esmdd.skills_trainings, esmdd.skills_training_skills, esmdd.skills_training_participants TO service_role;

ALTER TABLE esmdd.skills_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.skills_training_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.skills_training_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provincial_peso_all" ON esmdd.skills_trainings;
CREATE POLICY "provincial_peso_all"
  ON esmdd.skills_trainings
  FOR ALL
  TO authenticated
  USING ((SELECT core.has_role('provincial_peso')))
  WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS "oversight_select" ON esmdd.skills_trainings;
CREATE POLICY "oversight_select"
  ON esmdd.skills_trainings
  FOR SELECT
  TO authenticated
  USING ((SELECT core.has_role('municipal_peso', 'dole', 'admin')));

DROP POLICY IF EXISTS "provincial_peso_all" ON esmdd.skills_training_skills;
CREATE POLICY "provincial_peso_all"
  ON esmdd.skills_training_skills
  FOR ALL
  TO authenticated
  USING ((SELECT core.has_role('provincial_peso')))
  WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS "oversight_select" ON esmdd.skills_training_skills;
CREATE POLICY "oversight_select"
  ON esmdd.skills_training_skills
  FOR SELECT
  TO authenticated
  USING ((SELECT core.has_role('municipal_peso', 'dole', 'admin')));

DROP POLICY IF EXISTS "provincial_peso_all" ON esmdd.skills_training_participants;
CREATE POLICY "provincial_peso_all"
  ON esmdd.skills_training_participants
  FOR ALL
  TO authenticated
  USING ((SELECT core.has_role('provincial_peso')))
  WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS "oversight_select" ON esmdd.skills_training_participants;
CREATE POLICY "oversight_select"
  ON esmdd.skills_training_participants
  FOR SELECT
  TO authenticated
  USING ((SELECT core.has_role('municipal_peso', 'dole', 'admin')));


-- ─── 5. Shared helpers ──────────────────────────────────────────────────────

-- The RPCs below return rows only to the staff the pages are for
CREATE OR REPLACE FUNCTION esmdd.skills_training_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT core.has_role('provincial_peso', 'admin');
$$;
REVOKE ALL ON FUNCTION esmdd.skills_training_is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_training_is_staff() TO authenticated;

-- "RIVERA, Denmark B." (surname first, middle initial, suffix)
CREATE OR REPLACE FUNCTION esmdd.skills_training_person_name(p_surname TEXT, p_first TEXT, p_middle TEXT, p_suffix TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT concat_ws(
    ', ',
    nullif(upper(btrim(coalesce(p_surname, ''))), ''),
    nullif(btrim(concat_ws(
      ' ',
      nullif(btrim(coalesce(p_first, '')), ''),
      CASE WHEN btrim(coalesce(p_middle, '')) <> '' THEN upper(left(btrim(p_middle), 1)) || '.' END,
      nullif(btrim(coalesce(p_suffix, '')), '')
    )), '')
  );
$$;
REVOKE ALL ON FUNCTION esmdd.skills_training_person_name(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_training_person_name(TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ─── 6. Trainings Conducted ─────────────────────────────────────────────────

-- Creates (p_training_id NULL) or updates a training and replaces its skills in one transaction.
-- SECURITY INVOKER: the table policies decide who may write. p_training: { title, agency, start_date,
-- end_date, venue, municipality, remarks }. Needs 1–20 skills from the Skill List (22023 otherwise).
CREATE OR REPLACE FUNCTION esmdd.save_skills_training(p_training_id UUID, p_training JSONB, p_skill_ids INT[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id UUID := p_training_id;
  v_skill_ids INT[];
BEGIN
  SELECT array_agg(s.id) INTO v_skill_ids
  FROM core.skills s
  WHERE s.id = ANY (coalesce(p_skill_ids, '{}'::INT[]));

  IF coalesce(cardinality(v_skill_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Pick at least one skill the training teaches.' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_skill_ids) > 20 THEN
    RAISE EXCEPTION 'A training can list up to 20 skills.' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO esmdd.skills_trainings (title, agency, start_date, end_date, venue, municipality, remarks)
    VALUES (
      btrim(p_training ->> 'title'),
      btrim(p_training ->> 'agency'),
      (p_training ->> 'start_date')::DATE,
      (p_training ->> 'end_date')::DATE,
      nullif(btrim(p_training ->> 'venue'), ''),
      nullif(btrim(p_training ->> 'municipality'), ''),
      nullif(btrim(p_training ->> 'remarks'), '')
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE esmdd.skills_trainings t
    SET title = btrim(p_training ->> 'title'),
        agency = btrim(p_training ->> 'agency'),
        start_date = (p_training ->> 'start_date')::DATE,
        end_date = (p_training ->> 'end_date')::DATE,
        venue = nullif(btrim(p_training ->> 'venue'), ''),
        municipality = nullif(btrim(p_training ->> 'municipality'), ''),
        remarks = nullif(btrim(p_training ->> 'remarks'), '')
    WHERE t.id = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The training could not be updated.' USING ERRCODE = '42501';
    END IF;
  END IF;

  DELETE FROM esmdd.skills_training_skills ts
  WHERE ts.training_id = v_id AND NOT (ts.skill_id = ANY (v_skill_ids));

  INSERT INTO esmdd.skills_training_skills (training_id, skill_id)
  SELECT v_id, x.skill_id FROM unnest(v_skill_ids) AS x(skill_id)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$;

-- The data table (and one training, with p_training_id): newest first, with its skills and participant counts.
-- The first draft returned a single skill: drop it so the return type can change.
DROP FUNCTION IF EXISTS esmdd.skills_trainings_search(TEXT, TEXT, INT, INT, INT, INT, UUID);
CREATE FUNCTION esmdd.skills_trainings_search(
  p_search TEXT DEFAULT NULL,
  p_agency TEXT DEFAULT NULL,
  p_skill_id INT DEFAULT NULL,
  p_year INT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_training_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  skill_ids INT[],
  skill_names TEXT[],
  agency TEXT,
  start_date DATE,
  end_date DATE,
  venue TEXT,
  municipality TEXT,
  remarks TEXT,
  participant_count INT,
  completed_count INT,
  employed_count INT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.id,
    t.title,
    k.skill_ids,
    k.skill_names,
    t.agency,
    t.start_date,
    t.end_date,
    t.venue,
    t.municipality,
    t.remarks,
    c.participants::INT,
    c.completed::INT,
    c.employed::INT,
    t.created_at,
    count(*) OVER ()
  FROM esmdd.skills_trainings t
  CROSS JOIN LATERAL (SELECT nullif(btrim(coalesce(p_search, '')), '') AS q) f
  CROSS JOIN LATERAL (
    SELECT
      coalesce(array_agg(s.id ORDER BY s.name), '{}'::INT[]) AS skill_ids,
      coalesce(array_agg(s.name::TEXT ORDER BY s.name), '{}'::TEXT[]) AS skill_names
    FROM esmdd.skills_training_skills ts
    JOIN core.skills s ON s.id = ts.skill_id
    WHERE ts.training_id = t.id
  ) k
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS participants,
      count(*) FILTER (WHERE p.completion_status = 'Completed') AS completed,
      count(*) FILTER (WHERE p.employment_status IN ('Hired', 'Self-Employed')) AS employed
    FROM esmdd.skills_training_participants p
    WHERE p.training_id = t.id
  ) c
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND (p_training_id IS NULL OR t.id = p_training_id)
    AND (
      f.q IS NULL
      OR concat_ws(' ', t.title, t.agency, t.venue, t.municipality, array_to_string(k.skill_names, ' ')) ILIKE '%' || f.q || '%'
    )
    AND (coalesce(p_agency, 'ALL') = 'ALL' OR t.agency = p_agency)
    AND (p_skill_id IS NULL OR p_skill_id = ANY (k.skill_ids))
    AND (p_year IS NULL OR extract(YEAR FROM t.start_date)::INT = p_year)
  ORDER BY t.start_date DESC, t.created_at DESC, t.id
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

-- Filter options: { agencies: ["DICT", "TESDA"], years: [2026, 2025] }
CREATE OR REPLACE FUNCTION esmdd.skills_training_filters()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'agencies', coalesce((
      SELECT jsonb_agg(a.agency ORDER BY a.agency)
      FROM (SELECT DISTINCT t.agency FROM esmdd.skills_trainings t) a
    ), '[]'::JSONB),
    'years', coalesce((
      SELECT jsonb_agg(y.yr ORDER BY y.yr DESC)
      FROM (SELECT DISTINCT extract(YEAR FROM t.start_date)::INT AS yr FROM esmdd.skills_trainings t) y
    ), '[]'::JSONB)
  )
  WHERE (SELECT esmdd.skills_training_is_staff());
$$;

-- One training's participants: name and municipality joined for the requested page only
CREATE OR REPLACE FUNCTION esmdd.skills_training_participants_search(
  p_training_id UUID,
  p_search TEXT DEFAULT NULL,
  p_completion TEXT DEFAULT NULL,
  p_employment TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  applicant_id UUID,
  full_name TEXT,
  municipality TEXT,
  completion_status TEXT,
  employment_status TEXT,
  employer_name TEXT,
  date_hired DATE,
  status_remarks TEXT,
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.applicant_id,
    esmdd.skills_training_person_name(a.surname, a.first_name, a.middle_name, a.suffix),
    nullif(applicants.applicant_municipality(a.address), 'Agusan del Sur')::TEXT,
    p.completion_status,
    p.employment_status,
    p.employer_name,
    p.date_hired,
    p.status_remarks,
    p.status_updated_at,
    p.created_at,
    count(*) OVER ()
  FROM esmdd.skills_training_participants p
  JOIN applicants.applicants a ON a.id = p.applicant_id
  CROSS JOIN LATERAL (SELECT nullif(btrim(coalesce(p_search, '')), '') AS q) f
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND p.training_id = p_training_id
    AND (
      f.q IS NULL
      OR concat_ws(' ', a.first_name, a.surname, a.first_name, p.employer_name,
                   applicants.applicant_municipality(a.address)) ILIKE '%' || f.q || '%'
    )
    AND (coalesce(p_completion, 'ALL') = 'ALL' OR p.completion_status = p_completion)
    AND (coalesce(p_employment, 'ALL') = 'ALL' OR p.employment_status = p_employment)
  ORDER BY upper(a.surname), upper(a.first_name), p.id
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

-- "Add Participants": registry applicants not in the training yet. has_skill marks those who already have
-- every skill of the training on their record (they need it least).
CREATE OR REPLACE FUNCTION esmdd.skills_training_candidates(
  p_training_id UUID,
  p_search TEXT DEFAULT NULL,
  p_municipality TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  applicant_id UUID,
  full_name TEXT,
  municipality TEXT,
  employment_status TEXT,
  has_skill BOOLEAN,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a.id,
    esmdd.skills_training_person_name(a.surname, a.first_name, a.middle_name, a.suffix),
    nullif(applicants.applicant_municipality(a.address), 'Agusan del Sur')::TEXT,
    coalesce(nullif(btrim(a.employment_status), ''), 'Unemployed')::TEXT,
    NOT EXISTS (
      SELECT 1 FROM esmdd.skills_training_skills ts
      WHERE ts.training_id = t.id
        AND NOT EXISTS (
          SELECT 1 FROM applicants.applicant_skill_index i
          WHERE i.applicant_id = a.id AND i.skill_id = ts.skill_id
        )
    ) AND EXISTS (SELECT 1 FROM esmdd.skills_training_skills ts WHERE ts.training_id = t.id),
    count(*) OVER ()
  FROM esmdd.skills_trainings t
  CROSS JOIN applicants.applicants a
  CROSS JOIN LATERAL (SELECT nullif(btrim(coalesce(p_search, '')), '') AS q) f
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND t.id = p_training_id
    AND NOT EXISTS (
      SELECT 1 FROM esmdd.skills_training_participants p
      WHERE p.training_id = t.id AND p.applicant_id = a.id
    )
    AND (
      f.q IS NULL
      OR concat_ws(' ', a.first_name, a.surname, a.first_name,
                   applicants.applicant_municipality(a.address)) ILIKE '%' || f.q || '%'
    )
    AND (
      coalesce(p_municipality, 'ALL') = 'ALL'
      -- "City of Bayugan" and "Bayugan City" are the same place
      OR applicants.sr_normalize_geo(applicants.applicant_municipality(a.address)) = applicants.sr_normalize_geo(p_municipality)
    )
  ORDER BY a.created_at DESC, a.id
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;


-- ─── 7. Skills Demand and Gap ───────────────────────────────────────────────
-- Counted per skill AND municipality, because a vacancy is filled by people who can get there:
--   demand   slots of open vacancies (approved company, posted, not expired) in the municipality that list the
--            skill as required (the vacancy's place is its establishment's municipality)
--   supply   Agusan del Sur residents of the municipality with the skill on their record (unemployed only
--            unless p_supply = 'ALL'), plus participants who completed a training that teaches it and don't
--            have it on their record yet
--   gap      demand - supply of that municipality, never below 0 (the local shortage)
--   surplus  supply - demand of that municipality, never below 0 (people another municipality could draw on)
-- A skill's gap is the sum of its municipalities' gaps; its supply is the whole province's. So a skill whose
-- supply covers its demand but still has a gap can be filled by referring people from other municipalities;
-- one whose supply falls short needs a training. Places are matched with applicants.sr_normalize_geo
-- ("City of Bayugan" = "Bayugan City"). Counts only: no personal data.

-- A place key as shown: the canonical municipality name, else what was typed
CREATE OR REPLACE FUNCTION esmdd.skills_demand_place_name(p_key TEXT, p_fallback TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT n FROM unnest(applicants.sr_agusan_municipalities()) AS n WHERE applicants.sr_normalize_geo(n) = p_key LIMIT 1),
    nullif(btrim(coalesce(p_fallback, '')), ''),
    'Unspecified'
  );
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_place_name(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_place_name(TEXT, TEXT) TO authenticated;

-- One row per skill in demand and municipality with demand or supply for it (p_skill_id: that skill only)
CREATE OR REPLACE FUNCTION esmdd.skills_demand_grid(p_supply TEXT DEFAULT 'UNEMPLOYED', p_skill_id INT DEFAULT NULL)
RETURNS TABLE (
  skill_id INT,
  place_key TEXT,
  place TEXT,
  vacancies INT,
  demand INT,
  supply INT,
  trained INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Asia/Manila')::DATE AS d
  ),
  -- One row per open vacancy and required skill (two wordings of one skill on a vacancy count once)
  vacancy_skills AS (
    SELECT DISTINCT
      v.id AS vacancy_id,
      ks.skill_id AS sid,
      greatest(coalesce(v.vacancy_count, 1), 1) AS slots,
      coalesce(nullif(applicants.sr_normalize_geo(e.city_municipality), ''), 'unspecified') AS pkey,
      e.city_municipality AS raw_place
    FROM esmdd.job_vacancies v
    JOIN employers.establishments e ON e.id = v.establishment_id
    JOIN employers.companies c ON c.id = e.company_id
    JOIN esmdd.job_vacancy_skills ks ON ks.job_vacancy_id = v.id AND ks.is_required AND ks.skill_id IS NOT NULL
    CROSS JOIN today
    WHERE coalesce(v.status::TEXT, 'open') = 'open'
      AND c.verification_status::TEXT = 'approved'
      AND (v.posting_date IS NULL OR v.posting_date::DATE <= today.d)
      AND (v.valid_until IS NULL OR v.valid_until::DATE >= today.d)
      AND (p_skill_id IS NULL OR ks.skill_id = p_skill_id)
  ),
  demand AS (
    SELECT vs.sid, vs.pkey, min(vs.raw_place) AS raw_place, count(*)::INT AS vacancies, sum(vs.slots)::INT AS slots
    FROM vacancy_skills vs
    GROUP BY vs.sid, vs.pkey
  ),
  -- Only the skills in demand are counted, so the index is never aggregated whole
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
    coalesce(t.n, 0)
  FROM cells k
  LEFT JOIN demand d ON d.sid = k.sid AND d.pkey = k.pkey
  LEFT JOIN holders h ON h.sid = k.sid AND h.pkey = k.pkey
  LEFT JOIN trained t ON t.sid = k.sid AND t.pkey = k.pkey
  WHERE (SELECT esmdd.skills_training_is_staff());
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_grid(TEXT, INT) FROM PUBLIC, anon, authenticated;

-- One row per skill in demand. p_municipality narrows the demand and the gap to that municipality ("where
-- needed"); the supply is always the whole province's. places: the municipalities that need it, biggest gap first.
-- The first draft returned the old columns: drop it so the return type can change.
DROP FUNCTION IF EXISTS esmdd.skills_demand_rows(TEXT, TEXT);
CREATE OR REPLACE FUNCTION esmdd.skills_demand_rows(
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
  places TEXT[]
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
    )
  FROM g
  CROSS JOIN m
  JOIN core.skills s ON s.id = g.skill_id
  GROUP BY g.skill_id, s.name, s.category
  HAVING coalesce(sum(g.demand) FILTER (WHERE m.q IS NULL OR g.place_key = m.q), 0) > 0;
$$;
REVOKE ALL ON FUNCTION esmdd.skills_demand_rows(TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;

-- The gap table: biggest local gap first. With p_skill_id, that skill's row alone (the skill page).
-- Earlier drafts returned other columns: drop them so the return type can change.
DROP FUNCTION IF EXISTS esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT);
DROP FUNCTION IF EXISTS esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT, INT);
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
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.skill_id, r.skill_name, r.category, r.vacancies, r.demand_slots, r.supply, r.trained, r.gap, r.places,
         count(*) OVER ()
  FROM esmdd.skills_demand_rows(p_municipality, coalesce(p_supply, 'UNEMPLOYED'), p_skill_id) r
  CROSS JOIN LATERAL (SELECT nullif(btrim(coalesce(p_search, '')), '') AS q) f
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND (f.q IS NULL OR r.skill_name ILIKE '%' || f.q || '%')
    AND (coalesce(p_category, 'ALL') = 'ALL' OR r.category = p_category)
    AND (NOT coalesce(p_only_gaps, false) OR r.gap > 0)
  ORDER BY r.gap DESC, r.demand_slots DESC, r.skill_name
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

-- One skill, by municipality: where it is short (gap: train or refer) and where jobseekers could come from
-- (surplus). Bounded by the municipalities with demand or supply for it.
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
  ORDER BY greatest(g.demand - g.supply - g.trained, 0) DESC, g.demand DESC,
           greatest(g.supply + g.trained - g.demand, 0) DESC, g.place;
$$;

-- Totals above the table. unlinked_wordings: required vacancy skills not on the Skill List yet, which the gap
-- can't count until PESO maps them (Skill List → wordings to review).
CREATE OR REPLACE FUNCTION esmdd.skills_demand_summary(p_municipality TEXT DEFAULT NULL, p_supply TEXT DEFAULT 'UNEMPLOYED')
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'skills_in_demand', count(*),
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

-- The evidence behind one skill's demand: the open vacancies that require it, most slots first
CREATE OR REPLACE FUNCTION esmdd.skills_demand_vacancies(p_skill_id INT, p_municipality TEXT DEFAULT NULL)
RETURNS TABLE (
  vacancy_id UUID,
  position_title TEXT,
  employer_name TEXT,
  place TEXT,
  slots INT,
  valid_until DATE
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
    v.valid_until::DATE
  FROM esmdd.job_vacancies v
  JOIN employers.establishments e ON e.id = v.establishment_id
  JOIN employers.companies c ON c.id = e.company_id
  CROSS JOIN m
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND coalesce(v.status::TEXT, 'open') = 'open'
    AND c.verification_status::TEXT = 'approved'
    AND (v.posting_date IS NULL OR v.posting_date::DATE <= m.today)
    AND (v.valid_until IS NULL OR v.valid_until::DATE >= m.today)
    AND (m.q IS NULL OR applicants.sr_normalize_geo(e.city_municipality) = m.q)
    AND EXISTS (
      SELECT 1 FROM esmdd.job_vacancy_skills ks
      WHERE ks.job_vacancy_id = v.id AND ks.is_required AND ks.skill_id = p_skill_id
    )
  ORDER BY greatest(coalesce(v.vacancy_count, 1), 1) DESC, v.position_title, v.id
  LIMIT 100;
$$;


-- Who the supply of one skill is, by name (same rules as skills_demand_grid). p_municipality: NULL / 'ALL' for
-- the whole province, 'NEEDED' for the municipalities whose vacancies require it, or a municipality name.
-- from_training marks those counted because they completed a training that teaches it. Lists names and
-- contacts so PESO can reach them for a referral: staff only, one page at a time.
-- Earlier drafts returned a single full name: drop them so the return type can change.
DROP FUNCTION IF EXISTS esmdd.skills_demand_supply(INT, TEXT, TEXT, INT, INT);
CREATE FUNCTION esmdd.skills_demand_supply(
  p_skill_id INT,
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
  from_training BOOLEAN,
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
    FROM esmdd.skills_demand_grid(coalesce(p_supply, 'UNEMPLOYED'), p_skill_id) g
    WHERE g.demand > 0 AND (SELECT m.mode FROM m) = 'NEEDED'
  ),
  holders AS (
    -- Has the skill on their record
    SELECT DISTINCT i.applicant_id AS holder_id, false AS from_training
    FROM applicants.applicant_skill_index i
    JOIN applicants.applicants a ON a.id = i.applicant_id
    WHERE i.skill_id = p_skill_id
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR lower(coalesce(a.employment_status, 'Unemployed')) LIKE '%unemployed%')
    UNION
    -- Completed a training that teaches it, and it isn't on their record yet
    SELECT DISTINCT p.applicant_id, true
    FROM esmdd.skills_training_skills ts
    JOIN esmdd.skills_training_participants p ON p.training_id = ts.training_id AND p.completion_status = 'Completed'
    WHERE ts.skill_id = p_skill_id
      AND (coalesce(p_supply, 'UNEMPLOYED') = 'ALL' OR p.employment_status NOT IN ('Hired', 'Self-Employed'))
      AND NOT EXISTS (
        SELECT 1 FROM applicants.applicant_skill_index i
        WHERE i.applicant_id = p.applicant_id AND i.skill_id = ts.skill_id
      )
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
    h.from_training,
    count(*) OVER ()
  FROM holders h
  JOIN applicants.applicants a ON a.id = h.holder_id
  JOIN applicants.sr_profiles sp ON sp.applicant_id = a.id AND sp.is_agusan
  CROSS JOIN m
  WHERE (SELECT esmdd.skills_training_is_staff())
    AND (
      m.mode = 'ALL'
      OR (m.mode = 'NEEDED' AND sp.municipality_key IN (SELECT n.place_key FROM needed n))
      OR (m.mode NOT IN ('ALL', 'NEEDED') AND sp.municipality_key = applicants.sr_normalize_geo(m.mode))
    )
  ORDER BY sp.municipality, upper(a.surname), upper(a.first_name), a.id
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;


-- ─── 8. RPC privileges ──────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION esmdd.save_skills_training(UUID, JSONB, INT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_trainings_search(TEXT, TEXT, INT, INT, INT, INT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_training_filters() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_training_participants_search(UUID, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_training_candidates(UUID, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_summary(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_vacancies(INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_supply(INT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION esmdd.skills_demand_places(INT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION esmdd.save_skills_training(UUID, JSONB, INT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_trainings_search(TEXT, TEXT, INT, INT, INT, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_training_filters() TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_training_participants_search(UUID, TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_training_candidates(UUID, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_summary(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_vacancies(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_supply(INT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION esmdd.skills_demand_places(INT, TEXT) TO authenticated;

COMMIT;
