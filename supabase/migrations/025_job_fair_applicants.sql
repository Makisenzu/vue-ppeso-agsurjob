-- =============================================================================
-- Migration: 025_job_fair_applicants.sql
-- Purpose:   Track which registry applicants took part in each job fair, so PESO can
--            count how many people registered for / attended every job fair.
--
--              1. esmdd.job_fair_applicants — one row per applicant per job fair
--              2. Hired-on-the-spot registry applicants are marked Attended automatically
--              3. RLS + grants
-- Schema:    esmdd
--
-- Data model:
--   job_fairs ──< job_fair_applicants >── applicants.applicants
--   (UNIQUE job_fair_id, applicant_id)
--
-- Deletes cascade from both sides: unlike hots (migration 024), attendance is not an
-- applicant outcome, so it goes with the job fair or the registry record.
--
-- Access Matrix:
--   Table                | provincial_peso | municipal_peso / admin | applicant
--   ---------------------|-----------------|------------------------|-----------
--   job_fair_applicants  | full CRUD       | read                   | read own
--
-- Counting per job fair (PostgREST):
--   job_fairs?select=*,job_fair_applicants(count)                       -- participated
--   job_fair_applicants?job_fair_id=eq.<id>&status=eq.Attended&select=count   -- attended
-- =============================================================================

BEGIN;


-- ─── 1. job_fair_applicants ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_fair_applicants (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_fair_id   UUID         NOT NULL REFERENCES esmdd.job_fairs(id) ON DELETE CASCADE,
  applicant_id  UUID         NOT NULL REFERENCES applicants.applicants(id) ON DELETE CASCADE,
  -- Registered = signed up / pre-registered; Attended = showed up at the job fair
  status        TEXT         NOT NULL DEFAULT 'Registered' CHECK (status IN ('Registered', 'Attended')),
  attended_at   TIMESTAMPTZ,
  remarks       TEXT,
  recorded_by   UUID         REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- An applicant is counted once per job fair
  CONSTRAINT job_fair_applicants_fair_applicant_key UNIQUE (job_fair_id, applicant_id)
);

COMMENT ON TABLE esmdd.job_fair_applicants IS
  'Registry applicants (applicants.applicants) who registered for / attended a job fair; one row per applicant per job fair.';

CREATE INDEX IF NOT EXISTS job_fair_applicants_applicant_id_idx ON esmdd.job_fair_applicants (applicant_id);
CREATE INDEX IF NOT EXISTS job_fair_applicants_fair_status_idx ON esmdd.job_fair_applicants (job_fair_id, status);

-- updated_at, and attended_at follows the status
CREATE OR REPLACE FUNCTION esmdd.set_job_fair_applicants_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.status = 'Attended' AND NEW.attended_at IS NULL THEN
    NEW.attended_at := now();
  ELSIF NEW.status <> 'Attended' THEN
    NEW.attended_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_fair_applicants_timestamps ON esmdd.job_fair_applicants;
CREATE TRIGGER trg_job_fair_applicants_timestamps
  BEFORE INSERT OR UPDATE ON esmdd.job_fair_applicants
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_job_fair_applicants_timestamps();


-- ─── 2. Hires count as attendance ──────────────────────────────────────────
-- A registry applicant hired on the spot was at the job fair, so their hots row
-- registers them (or upgrades a Registered row) as Attended. Walk-in hires
-- (applicant_id NULL) are not in the registry and are skipped.

CREATE OR REPLACE FUNCTION esmdd.hots_mark_job_fair_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.applicant_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO esmdd.job_fair_applicants (job_fair_id, applicant_id, status)
  VALUES (NEW.job_fair_id, NEW.applicant_id, 'Attended')
  ON CONFLICT (job_fair_id, applicant_id)
  DO UPDATE SET status = 'Attended'
  WHERE esmdd.job_fair_applicants.status <> 'Attended';

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_hots_mark_job_fair_attendance ON esmdd.hots;
CREATE TRIGGER trg_hots_mark_job_fair_attendance
  AFTER INSERT OR UPDATE OF applicant_id, job_fair_id ON esmdd.hots
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.hots_mark_job_fair_attendance();

-- Backfill from existing hires
INSERT INTO esmdd.job_fair_applicants (job_fair_id, applicant_id, status)
SELECT DISTINCT h.job_fair_id, h.applicant_id, 'Attended'
FROM esmdd.hots h
WHERE h.applicant_id IS NOT NULL
ON CONFLICT (job_fair_id, applicant_id) DO NOTHING;


-- ─── 3. RLS + grants ───────────────────────────────────────────────────────

ALTER TABLE esmdd.job_fair_applicants ENABLE ROW LEVEL SECURITY;

-- Provincial PESO full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_job_fair_applicants_all" ON esmdd.job_fair_applicants;
CREATE POLICY "provincial_peso_job_fair_applicants_all"
ON esmdd.job_fair_applicants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'provincial_peso'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'provincial_peso'
  )
);

-- Municipal PESO and Admin read-only access
DROP POLICY IF EXISTS "municipal_peso_and_admin_job_fair_applicants_select" ON esmdd.job_fair_applicants;
CREATE POLICY "municipal_peso_and_admin_job_fair_applicants_select"
ON esmdd.job_fair_applicants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

-- Applicants read their own rows through applicants.applicants.profile_id
DROP POLICY IF EXISTS "applicant_own_job_fair_applicants_select" ON esmdd.job_fair_applicants;
CREATE POLICY "applicant_own_job_fair_applicants_select"
ON esmdd.job_fair_applicants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applicants.applicants a
    WHERE a.id = job_fair_applicants.applicant_id
      AND a.profile_id = (SELECT auth.uid())
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_fair_applicants TO authenticated;
GRANT ALL ON esmdd.job_fair_applicants TO service_role;

COMMIT;
