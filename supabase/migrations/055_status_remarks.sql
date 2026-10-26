-- =============================================================================
-- Migration: 055_status_remarks.sql
-- Purpose:   Remarks are required when a status is set to Rejected / Cancelled (enforced in the app:
--            statusRemarksHelper), so every such table needs a place for them, and the person affected
--            is told why through their notification (extends 053_notification_triggers.sql):
--              - core.profiles.status_remarks           (account rejected)
--              - esmdd.gip_applicants.status_remarks    (GIP review; `remarks` there is a tag list)
--              - esmdd.tupad_applicants.status_remarks  (TUPAD review)
--              - esmdd.tupad_batch.status_remarks       (batch cancelled)
--              - esmdd.job_fairs.status_remarks         (job fair cancelled)
--              - esmdd.recruitment_activities.status_remarks (cancelled; `remarks` there are general notes)
--            Tables that already had review remarks keep using them: applicants.applicant_requirements,
--            employers.employer_requirements, applicants.spes_form, employers.establishments.
--
-- New notified events (see 053 for the rules):
--   esmdd.tupad_batch  | status -> Cancelled | every applicant in the batch       | deployment
--   esmdd.job_fairs    | status -> Cancelled | every registered job fair applicant| job_fair
-- Schemas:   core, esmdd, system
-- Safe to re-run.
-- =============================================================================


-- ─── 1. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE core.profiles          ADD COLUMN IF NOT EXISTS status_remarks TEXT;
ALTER TABLE esmdd.gip_applicants   ADD COLUMN IF NOT EXISTS status_remarks TEXT;
ALTER TABLE esmdd.tupad_applicants ADD COLUMN IF NOT EXISTS status_remarks TEXT;
ALTER TABLE esmdd.tupad_batch      ADD COLUMN IF NOT EXISTS status_remarks TEXT;
ALTER TABLE esmdd.job_fairs        ADD COLUMN IF NOT EXISTS status_remarks TEXT;
ALTER TABLE esmdd.recruitment_activities ADD COLUMN IF NOT EXISTS status_remarks TEXT;

COMMENT ON COLUMN core.profiles.status_remarks IS 'Why the account was rejected; required by the app for Rejected (055).';
COMMENT ON COLUMN esmdd.gip_applicants.status_remarks IS 'Why the GIP application was rejected; required by the app for Rejected (055).';
COMMENT ON COLUMN esmdd.tupad_applicants.status_remarks IS 'Why the TUPAD application was rejected; required by the app for Rejected (055).';
COMMENT ON COLUMN esmdd.tupad_batch.status_remarks IS 'Why the batch was cancelled; required by the app for Cancelled (055).';
COMMENT ON COLUMN esmdd.job_fairs.status_remarks IS 'Why the job fair was cancelled; required by the app for Cancelled (055).';
COMMENT ON COLUMN esmdd.recruitment_activities.status_remarks IS 'Why the activity was cancelled; required by the app for Cancelled (055).';


-- ─── 2. Notifications now carry the remarks ─────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_profile_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  v_message := CASE NEW.status::TEXT
    WHEN 'approved' THEN 'Congratulations! Your account has been verified. You can now apply for jobs and programs.'
    WHEN 'rejected' THEN 'Your account verification was not approved.'
      || coalesce(' Remarks: ' || nullif(btrim(NEW.status_remarks), ''), ' Please review your submitted documents and try again.')
    WHEN 'pending'  THEN 'Your account is pending verification by PESO.'
    WHEN 'active'   THEN 'Your account is active. Welcome back!'
    WHEN 'inactive' THEN 'Your account has been deactivated. Please contact the PESO office for assistance.'
    ELSE 'Your account status is now ' || NEW.status::TEXT || '.'
  END;

  PERFORM system.notify(NEW.id, 'account_status', 'Account Status Update', v_message);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION system.notify_tupad_applicant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM system.notify(
    system.applicant_profile_id(NEW.applicant_id),
    'application_status',
    'TUPAD Application Update',
    system.program_status_message('TUPAD', NEW.status, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION system.notify_gip_applicant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM system.notify(
    system.applicant_profile_id(NEW.applicant_id),
    'application_status',
    'GIP Application Update',
    system.program_status_message('GIP', NEW.status, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION system.notify_recruitment_activity_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT system.company_profile_id(e.company_id) INTO v_profile_id
  FROM employers.establishments e
  WHERE e.id = NEW.establishment_id;

  PERFORM system.notify(
    v_profile_id,
    'recruitment_activity',
    NEW.type || ' Update',
    'Your ' || NEW.type || ' (' || to_char(NEW.start_date, 'Mon DD, YYYY') || ') is now ' || NEW.status || '.'
      || CASE WHEN NEW.status = 'Cancelled' THEN coalesce(' Remarks: ' || nullif(btrim(NEW.status_remarks), ''), '') ELSE '' END
  );
  RETURN NULL;
END;
$$;


-- ─── 3. Cancelled batches and job fairs ─────────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_tupad_batch_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS DISTINCT FROM 'Cancelled' THEN
    RETURN NULL;
  END IF;

  v_message := 'Your TUPAD batch ' || coalesce(NEW.edl_number, '') || ' has been cancelled.'
    || coalesce(' Remarks: ' || nullif(btrim(NEW.status_remarks), ''), '');

  FOR v_profile_id IN
    SELECT DISTINCT system.applicant_profile_id(ta.applicant_id)
    FROM esmdd.tupad t
    JOIN esmdd.tupad_applicants ta ON ta.id = t.tupad_applicant_id
    WHERE t.batch_id = NEW.id
  LOOP
    PERFORM system.notify(v_profile_id, 'deployment', 'TUPAD Batch Cancelled', v_message);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_batch_notify_cancelled ON esmdd.tupad_batch;
CREATE TRIGGER trg_tupad_batch_notify_cancelled
AFTER UPDATE OF status ON esmdd.tupad_batch
FOR EACH ROW EXECUTE FUNCTION system.notify_tupad_batch_cancelled();


CREATE OR REPLACE FUNCTION system.notify_job_fair_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS DISTINCT FROM 'Cancelled' THEN
    RETURN NULL;
  END IF;

  v_message := coalesce(nullif(NEW.title, ''), 'A job fair you registered for')
    || ' (' || to_char(NEW.start_date, 'Mon DD, YYYY') || ') has been cancelled.'
    || coalesce(' Remarks: ' || nullif(btrim(NEW.status_remarks), ''), '');

  FOR v_profile_id IN
    SELECT DISTINCT system.applicant_profile_id(a.applicant_id)
    FROM esmdd.job_fair_applicants a
    WHERE a.job_fair_id = NEW.id
  LOOP
    PERFORM system.notify(v_profile_id, 'job_fair', 'Job Fair Cancelled', v_message);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_fairs_notify_cancelled ON esmdd.job_fairs;
CREATE TRIGGER trg_job_fairs_notify_cancelled
AFTER UPDATE OF status ON esmdd.job_fairs
FOR EACH ROW EXECUTE FUNCTION system.notify_job_fair_cancelled();
