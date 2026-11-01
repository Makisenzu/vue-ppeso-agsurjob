-- =============================================================================
-- Migration: 097_auto_close_by_dates.sql
-- Purpose:   Statuses that follow their dates move on their own, the way job fairs already do (026).
--            A trigger only fires on writes, so a daily pg_cron job rolls rows forward as the days pass.
--
--            1. Job vacancies (employer postings and PESO-encoded ones):
--                 open and valid_until before today        → closed
--               Applied on every save too, so an open posting can't be saved past its deadline.
--               Filled / closed / cancelled are never touched. To reopen an expired posting, move its
--               deadline first. The company owner is told when the daily job closes their posting.
--            2. Recruitment activities (LRA / SRA):
--                 Approved and end_date before today        → Conducted
--               Pending ones aren't approved, so they're left to PESO; Completed still needs the
--               after-activity documents (041 guard), so it stays manual. The agency is notified by
--               053's status trigger.
--            3. TUPAD batches, forward only (a Completed or Cancelled batch never moves back):
--                 Pending and start_date reached            → Ongoing
--                 Pending / Ongoing and end_date passed     → Completed
--               Applied on every save too.
--            4. esmdd.refresh_date_statuses() runs all three daily (date-status-refresh, 00:05 Asia/Manila),
--               and once now to catch up.
--
-- Rule dates are calendar days in Asia/Manila, like 026.
--
-- Notified events (BACKEND.md §17):
--   | Event                                         | Recipient           | type          |
--   |-----------------------------------------------|---------------------|---------------|
--   | The daily job closes a posting past deadline  | the company owner   | job_posting   |
--   | Recruitment activity moves to Conducted       | the agency (053)    | recruitment_activity |
--
-- Schema:    esmdd. Depends on 020, 026, 041, 053, 084. Personal data: none. Safe to re-run.
-- =============================================================================

BEGIN;

/** Today in Asia/Manila */
CREATE OR REPLACE FUNCTION esmdd.manila_today()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Manila')::date;
$$;


-- ─── 1. Job vacancies ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.close_expired_job_vacancy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF coalesce(NEW.status, 'open') = 'open' AND NEW.valid_until IS NOT NULL
     AND NEW.valid_until::date < esmdd.manila_today() THEN
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_vacancies_close_expired ON esmdd.job_vacancies;
CREATE TRIGGER trg_job_vacancies_close_expired
  BEFORE INSERT OR UPDATE OF status, valid_until ON esmdd.job_vacancies
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.close_expired_job_vacancy();

CREATE INDEX IF NOT EXISTS idx_job_vacancies_open_valid_until
  ON esmdd.job_vacancies (valid_until) WHERE status = 'open';


-- ─── 2 & 3. TUPAD batches ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.tupad_batch_status_for(p_start DATE, p_end DATE, p_status TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_status NOT IN ('Pending', 'Ongoing') THEN p_status
    WHEN p_end IS NOT NULL AND p_end < esmdd.manila_today() THEN 'Completed'
    WHEN p_status = 'Pending' AND p_start IS NOT NULL AND p_start <= esmdd.manila_today() THEN 'Ongoing'
    ELSE p_status
  END;
$$;

CREATE OR REPLACE FUNCTION esmdd.set_tupad_batch_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.status := esmdd.tupad_batch_status_for(NEW.start_date, NEW.end_date, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_batch_status_from_dates ON esmdd.tupad_batch;
CREATE TRIGGER trg_tupad_batch_status_from_dates
  BEFORE INSERT OR UPDATE OF status, start_date, end_date ON esmdd.tupad_batch
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_tupad_batch_status();


-- ─── 4. Daily rollover ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.refresh_date_statuses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := esmdd.manila_today();
  v_vacancies INT := 0;
  v_activities INT := 0;
  v_batches INT := 0;
  r RECORD;
BEGIN
  -- Postings past their deadline: close, then tell the company owner
  FOR r IN
    WITH closed AS (
      UPDATE esmdd.job_vacancies v
      SET status = 'closed', updated_at = now()
      WHERE v.status = 'open' AND v.valid_until IS NOT NULL AND v.valid_until::date < v_today
      RETURNING v.id, v.position_title, v.valid_until, v.establishment_id
    )
    SELECT * FROM closed
  LOOP
    v_vacancies := v_vacancies + 1;
    PERFORM system.notify(
      (SELECT system.company_profile_id(e.company_id) FROM employers.establishments e WHERE e.id = r.establishment_id),
      'job_posting',
      'Job Posting Closed',
      'Your posting "' || r.position_title || '" closed because its deadline (' || to_char(r.valid_until, 'MM/DD/YYYY')
        || ') has passed. Move the deadline and reopen it to take applicants again.'
    );
  END LOOP;

  -- Approved activities whose last day has passed were conducted
  UPDATE esmdd.recruitment_activities a
  SET status = 'Conducted'
  WHERE a.status = 'Approved' AND a.end_date IS NOT NULL AND a.end_date < v_today;
  GET DIAGNOSTICS v_activities = ROW_COUNT;

  -- Batches move forward with their dates (the trigger recomputes the status)
  UPDATE esmdd.tupad_batch b
  SET status = esmdd.tupad_batch_status_for(b.start_date, b.end_date, b.status)
  WHERE b.status IS DISTINCT FROM esmdd.tupad_batch_status_for(b.start_date, b.end_date, b.status);
  GET DIAGNOSTICS v_batches = ROW_COUNT;

  RETURN jsonb_build_object('job_vacancies', v_vacancies, 'recruitment_activities', v_activities, 'tupad_batches', v_batches);
END;
$$;

COMMENT ON FUNCTION esmdd.refresh_date_statuses() IS
  'Closes postings past their deadline, marks finished approved recruitment activities Conducted and rolls TUPAD batches forward; run daily by pg_cron (date-status-refresh) (097).';

REVOKE ALL ON FUNCTION esmdd.refresh_date_statuses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION esmdd.refresh_date_statuses() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 16:05 UTC = 00:05 Asia/Manila (after job-fair-status-refresh); re-running updates the same job
SELECT cron.schedule(
  'date-status-refresh',
  '5 16 * * *',
  $$SELECT esmdd.refresh_date_statuses();$$
);

COMMIT;

-- Catch up now (outside the transaction so a notification problem can't undo the schema above)
SELECT esmdd.refresh_date_statuses();
