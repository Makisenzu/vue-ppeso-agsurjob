-- =============================================================================
-- Migration: 057_notification_remarks.sql
-- Purpose:   Staff remarks travel in their own column instead of being appended to the message
--            ("... was rejected. Remarks: ..."), so the app shows them in a separate box under the message:
--              - Column  system.notifications.remarks
--              - system.notify() gains p_remarks (DEFAULT NULL)
--              - Triggers from 053 / 055 pass remarks separately (only for Rejected / Cancelled)
--            Rows written before this migration keep "Remarks:" in the message; the app splits those
--            (notificationHelper.splitNotificationRemarks).
-- Schema:    system
-- Safe to re-run.
-- =============================================================================


-- ─── 1. Column & writer ─────────────────────────────────────────────────────

ALTER TABLE system.notifications ADD COLUMN IF NOT EXISTS remarks TEXT;

COMMENT ON COLUMN system.notifications.remarks IS 'Staff remarks for a rejection / cancellation, shown apart from the message (057).';

-- New parameter list: drop the 4-argument version so calls are not ambiguous
DROP FUNCTION IF EXISTS system.notify(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION system.notify(
  p_recipient UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_remarks TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_recipient IS NULL OR p_recipient IS NOT DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO system.notifications (recipient_id, type, title, message, remarks, is_read)
  VALUES (p_recipient, p_type, p_title, p_message, nullif(btrim(p_remarks), ''), false);
END;
$$;

REVOKE ALL ON FUNCTION system.notify(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Remarks only belong to a rejection / cancellation; other statuses may carry stale remarks
CREATE OR REPLACE FUNCTION system.status_remarks(p_status TEXT, p_remarks TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN lower(p_status) IN ('rejected', 'cancelled', 'canceled') THEN nullif(btrim(p_remarks), '') END;
$$;

REVOKE ALL ON FUNCTION system.status_remarks(TEXT, TEXT) FROM PUBLIC, anon, authenticated;


-- ─── 2. Messages without inline remarks ─────────────────────────────────────

DROP FUNCTION IF EXISTS system.program_status_message(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION system.program_status_message(p_program TEXT, p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(p_status)
    WHEN 'approved' THEN 'Your ' || p_program || ' application has been approved.'
    WHEN 'rejected' THEN 'Your ' || p_program || ' application was not approved.'
    WHEN 'pending'  THEN 'Your ' || p_program || ' application is under review.'
    ELSE 'Your ' || p_program || ' application status is now ' || p_status || '.'
  END;
$$;

REVOKE ALL ON FUNCTION system.program_status_message(TEXT, TEXT) FROM PUBLIC, anon, authenticated;


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
    WHEN 'rejected' THEN 'Your account verification was not approved. Please review your submitted documents and try again.'
    WHEN 'pending'  THEN 'Your account is pending verification by PESO.'
    WHEN 'active'   THEN 'Your account is active. Welcome back!'
    WHEN 'inactive' THEN 'Your account has been deactivated. Please contact the PESO office for assistance.'
    ELSE 'Your account status is now ' || NEW.status::TEXT || '.'
  END;

  PERFORM system.notify(
    NEW.id, 'account_status', 'Account Status Update', v_message,
    system.status_remarks(NEW.status::TEXT, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION system.notify_requirement_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(t.name, t.requirement_type) INTO v_name
  FROM public.requirement_templates t
  WHERE t.id = NEW.requirement_id;
  v_name := coalesce(v_name, 'document');

  v_message := CASE NEW.status::TEXT
    WHEN 'approved' THEN 'Your ' || v_name || ' has been approved.'
    WHEN 'rejected' THEN 'Your ' || v_name || ' was rejected. Please upload a new copy.'
    WHEN 'pending'  THEN 'Your ' || v_name || ' is back under review.'
    ELSE 'Your ' || v_name || ' status is now ' || NEW.status::TEXT || '.'
  END;

  PERFORM system.notify(
    NEW.profile_id, 'document_status', 'Document Status Update', v_message,
    system.status_remarks(NEW.status::TEXT, NEW.remarks)
  );
  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION system.notify_spes_form_status()
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
    coalesce(NEW.profile_id, system.applicant_profile_id(NEW.applicant_id)),
    'application_status',
    'SPES Application Update',
    system.program_status_message('SPES', NEW.status),
    system.status_remarks(NEW.status, NEW.remarks)
  );
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
    system.program_status_message('TUPAD', NEW.status),
    system.status_remarks(NEW.status, NEW.status_remarks)
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
    system.program_status_message('GIP', NEW.status),
    system.status_remarks(NEW.status, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION system.notify_establishment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := coalesce(nullif(NEW.business_name, ''), 'your establishment');
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL OR NEW.company_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM system.notify(
    system.company_profile_id(NEW.company_id),
    'establishment_status',
    'Establishment Review Update',
    CASE NEW.status
      WHEN 'Verified' THEN 'The NSRP Form 2 of ' || v_name || ' has been verified.'
      WHEN 'Rejected' THEN 'The NSRP Form 2 of ' || v_name || ' was rejected.'
      ELSE 'The NSRP Form 2 of ' || v_name || ' is now ' || NEW.status || '.'
    END,
    system.status_remarks(NEW.status, NEW.remarks)
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
    'Your ' || NEW.type || ' (' || to_char(NEW.start_date, 'Mon DD, YYYY') || ') is now ' || NEW.status || '.',
    system.status_remarks(NEW.status, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION system.notify_tupad_batch_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS DISTINCT FROM 'Cancelled' THEN
    RETURN NULL;
  END IF;

  FOR v_profile_id IN
    SELECT DISTINCT system.applicant_profile_id(ta.applicant_id)
    FROM esmdd.tupad t
    JOIN esmdd.tupad_applicants ta ON ta.id = t.tupad_applicant_id
    WHERE t.batch_id = NEW.id
  LOOP
    PERFORM system.notify(
      v_profile_id,
      'deployment',
      'TUPAD Batch Cancelled',
      'Your TUPAD batch ' || coalesce(NEW.edl_number, '') || ' has been cancelled.',
      NEW.status_remarks
    );
  END LOOP;
  RETURN NULL;
END;
$$;


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
    || ' (' || to_char(NEW.start_date, 'Mon DD, YYYY') || ') has been cancelled.';

  FOR v_profile_id IN
    SELECT DISTINCT system.applicant_profile_id(a.applicant_id)
    FROM esmdd.job_fair_applicants a
    WHERE a.job_fair_id = NEW.id
  LOOP
    PERFORM system.notify(v_profile_id, 'job_fair', 'Job Fair Cancelled', v_message, NEW.status_remarks);
  END LOOP;
  RETURN NULL;
END;
$$;
