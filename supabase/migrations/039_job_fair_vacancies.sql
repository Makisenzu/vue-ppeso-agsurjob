-- =============================================================================
-- Migration: 039_job_fair_vacancies.sql
-- Purpose:   Vacancies belong to the establishment; a job fair only offers them.
--
--              employers.establishments ──< esmdd.job_vacancies           (the job, entered once)
--              esmdd.job_fair_participants ──< esmdd.job_fair_vacancies >── job_vacancies
--              esmdd.job_fair_vacancies ──< esmdd.hots                     (hired at this fair)
--
--            1. job_vacancies.establishment_id (backfilled from the participant); job_fair_id /
--               participant_id move to the new link table and are dropped
--            2. esmdd.job_fair_vacancies: vacancy offered at a job fair, with that fair's openings
--               (vacancy_count) and status; job_fair_id is copied from the participant, and the
--               vacancy must belong to the participant's establishment
--            3. hots.job_fair_vacancy_id replaces hots.job_vacancy_id; the sync trigger copies
--               job_fair_id / participant_id from it and enforces the fair's openings
--            4. Company owners post / edit / delete their own establishment's job_vacancies
--            5. esmdd.add_job_fair_vacancy(): create (or reuse) a vacancy and offer it at the job
--               fair in one transaction
-- Schema:    esmdd
--
-- DEPLOY TOGETHER WITH THE FRONTEND (job fair vacancies / HOTS pages read the new shape), then
-- re-run `npm run types:gen`. Data at the time of writing: 1 vacancy, 0 hires.
--
-- Access Matrix:
--   Resource            | admin / provincial_peso | municipal_peso / dole | company_owner        | other authenticated
--   --------------------|-------------------------|-----------------------|----------------------|--------------------
--   job_vacancies       | full CRUD               | read                  | CRUD own establishment| read
--   job_fair_vacancies  | full CRUD               | read                  | read                 | read
-- =============================================================================

BEGIN;


-- ─── 1. job_vacancies belong to an establishment ────────────────────────────

ALTER TABLE esmdd.job_vacancies
  ADD COLUMN IF NOT EXISTS establishment_id UUID
    REFERENCES employers.establishments (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL;

UPDATE esmdd.job_vacancies v
SET establishment_id = p.establishment_id
FROM esmdd.job_fair_participants p
WHERE p.id = v.participant_id
  AND v.establishment_id IS NULL;


-- ─── 2. Table: esmdd.job_fair_vacancies ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_fair_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Copied from the participant by trg_job_fair_vacancies_sync
  job_fair_id UUID NOT NULL
    REFERENCES esmdd.job_fairs (id) ON DELETE CASCADE,
  participant_id UUID NOT NULL
    REFERENCES esmdd.job_fair_participants (id) ON DELETE CASCADE,
  job_vacancy_id UUID NOT NULL
    REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  -- Openings offered at this fair; defaults to the vacancy's own count, NULL = no limit
  vacancy_count INTEGER CHECK (vacancy_count IS NULL OR vacancy_count > 0),
  status esmdd.job_vacancy_status NOT NULL DEFAULT 'open',
  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_fair_vacancies_fair_vacancy_key UNIQUE (job_fair_id, job_vacancy_id)
);

CREATE INDEX IF NOT EXISTS idx_job_fair_vacancies_participant_id
  ON esmdd.job_fair_vacancies (participant_id);
CREATE INDEX IF NOT EXISTS idx_job_fair_vacancies_job_vacancy_id
  ON esmdd.job_fair_vacancies (job_vacancy_id);

CREATE OR REPLACE FUNCTION esmdd.job_fair_vacancies_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_participant esmdd.job_fair_participants%ROWTYPE;
  v_vacancy esmdd.job_vacancies%ROWTYPE;
BEGIN
  SELECT * INTO v_participant FROM esmdd.job_fair_participants WHERE id = NEW.participant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job fair participant % does not exist', NEW.participant_id;
  END IF;

  SELECT * INTO v_vacancy FROM esmdd.job_vacancies WHERE id = NEW.job_vacancy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job vacancy % does not exist', NEW.job_vacancy_id;
  END IF;

  -- A fair can only offer the participating employer's own vacancies
  IF v_vacancy.establishment_id IS DISTINCT FROM v_participant.establishment_id THEN
    RAISE EXCEPTION '"%" belongs to another employer', v_vacancy.position_title;
  END IF;

  NEW.job_fair_id := v_participant.job_fair_id;
  IF TG_OP = 'INSERT' AND NEW.vacancy_count IS NULL THEN
    NEW.vacancy_count := v_vacancy.vacancy_count;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_fair_vacancies_sync ON esmdd.job_fair_vacancies;
CREATE TRIGGER trg_job_fair_vacancies_sync
BEFORE INSERT OR UPDATE ON esmdd.job_fair_vacancies
FOR EACH ROW
EXECUTE FUNCTION esmdd.job_fair_vacancies_sync();

-- Backfill: every existing vacancy was posted for one fair / participant
INSERT INTO esmdd.job_fair_vacancies (job_fair_id, participant_id, job_vacancy_id, vacancy_count, status)
SELECT
  v.job_fair_id,
  v.participant_id,
  v.id,
  v.vacancy_count,
  CASE WHEN v.status IN ('open', 'closed', 'filled', 'cancelled')
    THEN v.status::esmdd.job_vacancy_status ELSE 'open' END
FROM esmdd.job_vacancies v
WHERE v.participant_id IS NOT NULL
ON CONFLICT (job_fair_id, job_vacancy_id) DO NOTHING;


-- ─── 3. HOTS point at the job fair vacancy ──────────────────────────────────

ALTER TABLE esmdd.hots
  ADD COLUMN IF NOT EXISTS job_fair_vacancy_id UUID
    REFERENCES esmdd.job_fair_vacancies (id) ON DELETE RESTRICT;

UPDATE esmdd.hots h
SET job_fair_vacancy_id = jfv.id
FROM esmdd.job_fair_vacancies jfv
WHERE jfv.job_vacancy_id = h.job_vacancy_id
  AND jfv.job_fair_id = h.job_fair_id
  AND h.job_fair_vacancy_id IS NULL;

-- The old trigger watches job_vacancy_id, so it goes before the column does
DROP TRIGGER IF EXISTS trg_hots_sync_job_fair_links ON esmdd.hots;

ALTER TABLE esmdd.hots
  ALTER COLUMN job_fair_vacancy_id SET NOT NULL,
  DROP COLUMN IF EXISTS job_vacancy_id;

CREATE INDEX IF NOT EXISTS idx_hots_job_fair_vacancy_id
  ON esmdd.hots (job_fair_vacancy_id);

-- Copies job_fair_id / participant_id from the job fair vacancy and keeps hires within its openings
CREATE OR REPLACE FUNCTION esmdd.hots_sync_job_fair_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_offer esmdd.job_fair_vacancies%ROWTYPE;
  v_position TEXT;
  v_hired INT;
BEGIN
  -- Lock the offer so concurrent hires cannot exceed vacancy_count
  SELECT * INTO v_offer
  FROM esmdd.job_fair_vacancies
  WHERE id = NEW.job_fair_vacancy_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job fair vacancy % does not exist', NEW.job_fair_vacancy_id;
  END IF;

  NEW.job_fair_id := v_offer.job_fair_id;
  NEW.participant_id := v_offer.participant_id;

  IF v_offer.vacancy_count IS NOT NULL THEN
    SELECT count(*) INTO v_hired
    FROM esmdd.hots
    WHERE job_fair_vacancy_id = NEW.job_fair_vacancy_id
      AND id IS DISTINCT FROM NEW.id;

    IF v_hired >= v_offer.vacancy_count THEN
      SELECT position_title INTO v_position FROM esmdd.job_vacancies WHERE id = v_offer.job_vacancy_id;
      RAISE EXCEPTION 'All % slot(s) of "%" are already filled', v_offer.vacancy_count, v_position;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hots_sync_job_fair_links
BEFORE INSERT OR UPDATE OF job_fair_vacancy_id, job_fair_id, participant_id ON esmdd.hots
FOR EACH ROW
EXECUTE FUNCTION esmdd.hots_sync_job_fair_links();


-- ─── 4. job_vacancies: establishment required, fair columns dropped ─────────

-- A vacancy that never got an establishment (no participant) can't be kept
DELETE FROM esmdd.job_vacancies WHERE establishment_id IS NULL;

ALTER TABLE esmdd.job_vacancies
  ALTER COLUMN establishment_id SET NOT NULL,
  DROP COLUMN IF EXISTS job_fair_id,
  DROP COLUMN IF EXISTS participant_id;

CREATE INDEX IF NOT EXISTS idx_job_vacancies_establishment_id
  ON esmdd.job_vacancies (establishment_id);


-- ─── 5. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE esmdd.job_fair_vacancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all ON esmdd.job_fair_vacancies;
CREATE POLICY admin_all ON esmdd.job_fair_vacancies
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS provincial_peso_all ON esmdd.job_fair_vacancies;
CREATE POLICY provincial_peso_all ON esmdd.job_fair_vacancies
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

-- Like job_vacancies / job_fairs: every signed-in user can see what a fair offers
DROP POLICY IF EXISTS authenticated_select ON esmdd.job_fair_vacancies;
CREATE POLICY authenticated_select ON esmdd.job_fair_vacancies
FOR SELECT TO authenticated
USING (true);

REVOKE ALL ON esmdd.job_fair_vacancies FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_fair_vacancies TO authenticated;
GRANT ALL ON esmdd.job_fair_vacancies TO service_role;

-- Company owners manage their own establishment's vacancies (hires still block deletes)
DROP POLICY IF EXISTS company_owner_insert ON esmdd.job_vacancies;
CREATE POLICY company_owner_insert ON esmdd.job_vacancies
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employers.establishments e
    WHERE e.id = job_vacancies.establishment_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_owner(e.company_id)
  )
);

DROP POLICY IF EXISTS company_owner_update ON esmdd.job_vacancies;
CREATE POLICY company_owner_update ON esmdd.job_vacancies
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employers.establishments e
    WHERE e.id = job_vacancies.establishment_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_owner(e.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employers.establishments e
    WHERE e.id = job_vacancies.establishment_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_owner(e.company_id)
  )
);

DROP POLICY IF EXISTS company_owner_delete ON esmdd.job_vacancies;
CREATE POLICY company_owner_delete ON esmdd.job_vacancies
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employers.establishments e
    WHERE e.id = job_vacancies.establishment_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_owner(e.company_id)
  )
);


-- ─── 6. RPC: offer a vacancy at a job fair ──────────────────────────────────
-- Pass p_job_vacancy_id to offer an existing vacancy of the participant's establishment, or
-- p_job_vacancy (vacancy fields as JSON) to create one for that establishment; both happen in
-- one transaction. p_vacancy_count / p_status are this fair's openings and status.
-- SECURITY INVOKER: RLS decides who may call it (Provincial PESO / admin).

CREATE OR REPLACE FUNCTION esmdd.add_job_fair_vacancy(
  p_participant_id UUID,
  p_job_vacancy_id UUID DEFAULT NULL,
  p_job_vacancy JSONB DEFAULT NULL,
  p_vacancy_count INTEGER DEFAULT NULL,
  p_status esmdd.job_vacancy_status DEFAULT NULL
)
RETURNS esmdd.job_fair_vacancies
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_establishment_id UUID;
  v_job_vacancy_id UUID := p_job_vacancy_id;
  v_offer esmdd.job_fair_vacancies;
BEGIN
  IF (p_job_vacancy_id IS NULL) = (p_job_vacancy IS NULL) THEN
    RAISE EXCEPTION 'Pass either p_job_vacancy_id or p_job_vacancy, not both'
      USING ERRCODE = '22023';
  END IF;

  SELECT establishment_id INTO v_establishment_id
  FROM esmdd.job_fair_participants
  WHERE id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job fair participant % does not exist', p_participant_id;
  END IF;

  IF v_job_vacancy_id IS NULL THEN
    INSERT INTO esmdd.job_vacancies (
      establishment_id, position_title, job_description, nature_of_work, vacancy_count, salary,
      place_of_work, educational_level, course_shs_strand, eligibility, license, certification,
      work_experience_months, language_dialect_spoken, other_qualifications,
      accepts_pwd, pwd_disabilities, pwd_other_disability, accepts_returning_ofw,
      posting_date, valid_until, status
    )
    SELECT
      v_establishment_id, r.position_title, r.job_description, COALESCE(r.nature_of_work, 'Permanent'),
      COALESCE(r.vacancy_count, 1), r.salary,
      r.place_of_work, r.educational_level, r.course_shs_strand, r.eligibility, r.license, r.certification,
      r.work_experience_months, r.language_dialect_spoken, r.other_qualifications,
      r.accepts_pwd, r.pwd_disabilities, r.pwd_other_disability, r.accepts_returning_ofw,
      COALESCE(r.posting_date, CURRENT_DATE), r.valid_until, COALESCE(r.status, 'open')
    FROM jsonb_populate_record(NULL::esmdd.job_vacancies, p_job_vacancy) r
    RETURNING id INTO v_job_vacancy_id;
  END IF;

  INSERT INTO esmdd.job_fair_vacancies (participant_id, job_fair_id, job_vacancy_id, vacancy_count, status)
  SELECT p_participant_id, p.job_fair_id, v_job_vacancy_id, p_vacancy_count, COALESCE(p_status, 'open')
  FROM esmdd.job_fair_participants p
  WHERE p.id = p_participant_id
  RETURNING * INTO v_offer;

  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.add_job_fair_vacancy(UUID, UUID, JSONB, INTEGER, esmdd.job_vacancy_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.add_job_fair_vacancy(UUID, UUID, JSONB, INTEGER, esmdd.job_vacancy_status) TO authenticated;

COMMIT;
