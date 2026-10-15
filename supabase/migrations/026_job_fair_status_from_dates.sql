-- =============================================================================
-- Migration: 026_job_fair_status_from_dates.sql
-- Purpose:   Derive esmdd.job_fairs.status from start_date / end_date so PESO staff
--            no longer set Upcoming / Ongoing / Completed by hand.
--
--              1. esmdd.job_fair_status_for() — the date rule, in Philippine time
--              2. trg_job_fairs_status        — applies it on every insert / update
--              3. esmdd.refresh_job_fair_statuses() + daily pg_cron job, because a
--                 trigger only fires on writes: a fair saved as Upcoming has to roll
--                 over to Ongoing / Completed on its own as the days pass
--              4. Backfill existing rows
-- Schema:    esmdd
--
-- Rule (today = current date in Asia/Manila):
--   today <  start_date                → Upcoming
--   start_date <= today <= end_date    → Ongoing
--   today >  end_date                  → Completed
--   Cancelled is set by PESO and is never overwritten. Saving any other status
--   on a cancelled fair un-cancels it and the date rule applies again.
-- =============================================================================

BEGIN;


-- ─── 1. Date rule ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.job_fair_status_for(
  p_start_date DATE,
  p_end_date   DATE,
  p_status     TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_status, '')) = 'cancelled' THEN 'Cancelled'
    WHEN (now() AT TIME ZONE 'Asia/Manila')::date < p_start_date THEN 'Upcoming'
    WHEN (now() AT TIME ZONE 'Asia/Manila')::date > p_end_date THEN 'Completed'
    ELSE 'Ongoing'
  END;
$$;

COMMENT ON FUNCTION esmdd.job_fair_status_for(DATE, DATE, TEXT) IS
  'Job fair status from its dates in Asia/Manila time; Cancelled is kept as is.';


-- ─── 2. Apply on every write ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.set_job_fair_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.status := esmdd.job_fair_status_for(NEW.start_date::date, NEW.end_date::date, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_fairs_status ON esmdd.job_fairs;
CREATE TRIGGER trg_job_fairs_status
  BEFORE INSERT OR UPDATE ON esmdd.job_fairs
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_job_fair_status();


-- ─── 3. Daily rollover ─────────────────────────────────────────────────────
-- Only rows whose status is out of date are touched; the trigger recomputes them.

CREATE OR REPLACE FUNCTION esmdd.refresh_job_fair_statuses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE esmdd.job_fairs jf
  SET status = esmdd.job_fair_status_for(jf.start_date::date, jf.end_date::date, jf.status)
  WHERE jf.status IS DISTINCT FROM esmdd.job_fair_status_for(jf.start_date::date, jf.end_date::date, jf.status);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION esmdd.refresh_job_fair_statuses() IS
  'Rolls job fair statuses forward as dates pass; run daily by pg_cron (job-fair-status-refresh).';

REVOKE ALL ON FUNCTION esmdd.refresh_job_fair_statuses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION esmdd.refresh_job_fair_statuses() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 16:00 UTC = 00:00 Asia/Manila; re-running this migration updates the same job
SELECT cron.schedule(
  'job-fair-status-refresh',
  '0 16 * * *',
  $$SELECT esmdd.refresh_job_fair_statuses();$$
);


-- ─── 4. Backfill ───────────────────────────────────────────────────────────
-- Also normalises legacy lowercase values ('upcoming' → 'Upcoming').

SELECT esmdd.refresh_job_fair_statuses();

COMMIT;
