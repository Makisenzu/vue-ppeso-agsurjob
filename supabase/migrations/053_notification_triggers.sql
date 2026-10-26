-- =============================================================================
-- Migration: 053_notification_triggers.sql
-- Purpose:   Personal notifications (system.notifications) for every status change a user needs to
--            know about, written by triggers so no code path can forget them:
--              - Function system.notify()                    (the one writer; skips self-caused changes)
--              - Function system.applicant_profile_id()      (registry applicant -> account, if any)
--              - Triggers on the tables below
-- Schemas:   system, core, applicants, employers, esmdd
--
-- Notified events:
--   Table                              | Change                  | Recipient           | type
--   -----------------------------------|-------------------------|---------------------|----------------------
--   core.profiles                      | status                  | the account         | account_status
--   applicants.applicant_requirements  | status                  | the applicant       | document_status
--   applicants.spes_form               | status                  | the applicant       | application_status
--   esmdd.tupad_applicants             | status                  | the applicant       | application_status
--   esmdd.gip_applicants               | status                  | the applicant       | application_status
--   esmdd.spes_appointments            | insert, status          | the applicant       | deployment
--   esmdd.gip_appointments             | insert, status          | the applicant       | deployment
--   esmdd.tupad                        | insert, status          | the applicant       | deployment
--   employers.companies                | verification_status     | the company owner   | account_status
--   employers.establishments           | status                  | the company owner   | establishment_status
--   esmdd.recruitment_activities       | status                  | the company owner   | recruitment_activity
--
-- Rules:
--   * Registry applicants encoded by PESO without an account (applicants.profile_id NULL) get nothing.
--   * A change made by the recipient themself (auth.uid() = recipient) is not notified.
--   * Trigger functions are SECURITY DEFINER: they look up recipients across RLS and insert rows the
--     acting user could not (034 only lets PESO insert notifications). system.notify() is not granted
--     to any client role, so it cannot be called over the API to message arbitrary users.
--   * The jobs schema (job_applications, interviews, referrals) has no app flow yet; add its triggers
--     here-style when it does (see .agents/BACKEND.md "Notifications").
-- Safe to re-run.
-- =============================================================================


-- ─── 1. Writer & lookups ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify(p_recipient UUID, p_type TEXT, p_title TEXT, p_message TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_recipient IS NULL OR p_recipient IS NOT DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO system.notifications (recipient_id, type, title, message, is_read)
  VALUES (p_recipient, p_type, p_title, p_message, false);
END;
$$;

-- Account of a registry applicant (applicants.applicants.id), NULL when PESO encoded them without one
CREATE OR REPLACE FUNCTION system.applicant_profile_id(p_applicant_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.profile_id FROM applicants.applicants a WHERE a.id = p_applicant_id;
$$;

-- Owner account of a company (employers.companies.id)
CREATE OR REPLACE FUNCTION system.company_profile_id(p_company_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.profile_id FROM employers.companies c WHERE c.id = p_company_id;
$$;

REVOKE ALL ON FUNCTION system.notify(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION system.applicant_profile_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION system.company_profile_id(UUID) FROM PUBLIC, anon, authenticated;


-- ─── 2. Accounts ────────────────────────────────────────────────────────────

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

  PERFORM system.notify(NEW.id, 'account_status', 'Account Status Update', v_message);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_notify_status ON core.profiles;
CREATE TRIGGER trg_profiles_notify_status
AFTER UPDATE OF status ON core.profiles
FOR EACH ROW EXECUTE FUNCTION system.notify_profile_status();


CREATE OR REPLACE FUNCTION system.notify_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status OR NEW.verification_status IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM system.notify(
    NEW.profile_id,
    'account_status',
    'Company Verification Update',
    CASE NEW.verification_status::TEXT
      WHEN 'approved' THEN coalesce(NEW.company_name, 'Your company') || ' has been verified.'
      WHEN 'rejected' THEN 'The verification of ' || coalesce(NEW.company_name, 'your company') || ' was not approved. Please review your details.'
      ELSE 'The verification status of ' || coalesce(NEW.company_name, 'your company') || ' is now ' || NEW.verification_status::TEXT || '.'
    END
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_notify_verification ON employers.companies;
CREATE TRIGGER trg_companies_notify_verification
AFTER UPDATE OF verification_status ON employers.companies
FOR EACH ROW EXECUTE FUNCTION system.notify_company_verification();


-- ─── 3. Documents ───────────────────────────────────────────────────────────

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
    WHEN 'rejected' THEN 'Your ' || v_name || ' was rejected.' || coalesce(' Remarks: ' || nullif(NEW.remarks, ''), ' Please upload a new copy.')
    WHEN 'pending'  THEN 'Your ' || v_name || ' is back under review.'
    ELSE 'Your ' || v_name || ' status is now ' || NEW.status::TEXT || '.'
  END;

  PERFORM system.notify(NEW.profile_id, 'document_status', 'Document Status Update', v_message);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_applicant_requirements_notify_status ON applicants.applicant_requirements;
CREATE TRIGGER trg_applicant_requirements_notify_status
AFTER UPDATE OF status ON applicants.applicant_requirements
FOR EACH ROW EXECUTE FUNCTION system.notify_requirement_status();


-- ─── 4. Program applications ────────────────────────────────────────────────

-- Shared wording for SPES / TUPAD / GIP application reviews
CREATE OR REPLACE FUNCTION system.program_status_message(p_program TEXT, p_status TEXT, p_remarks TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(p_status)
    WHEN 'approved' THEN 'Your ' || p_program || ' application has been approved.'
    WHEN 'rejected' THEN 'Your ' || p_program || ' application was not approved.' || coalesce(' Remarks: ' || nullif(p_remarks, ''), '')
    WHEN 'pending'  THEN 'Your ' || p_program || ' application is under review.'
    ELSE 'Your ' || p_program || ' application status is now ' || p_status || '.'
  END;
$$;

REVOKE ALL ON FUNCTION system.program_status_message(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

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
    system.program_status_message('SPES', NEW.status, NEW.remarks)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_form_notify_status ON applicants.spes_form;
CREATE TRIGGER trg_spes_form_notify_status
AFTER UPDATE OF status ON applicants.spes_form
FOR EACH ROW EXECUTE FUNCTION system.notify_spes_form_status();


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
    system.program_status_message('TUPAD', NEW.status, NULL)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_applicants_notify_status ON esmdd.tupad_applicants;
CREATE TRIGGER trg_tupad_applicants_notify_status
AFTER UPDATE OF status ON esmdd.tupad_applicants
FOR EACH ROW EXECUTE FUNCTION system.notify_tupad_applicant_status();


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
    system.program_status_message('GIP', NEW.status, NULL)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_gip_applicants_notify_status ON esmdd.gip_applicants;
CREATE TRIGGER trg_gip_applicants_notify_status
AFTER UPDATE OF status ON esmdd.gip_applicants
FOR EACH ROW EXECUTE FUNCTION system.notify_gip_applicant_status();


-- ─── 5. Deployments (appointments / batches) ────────────────────────────────

-- Wording for a new deployment or a change of its status
CREATE OR REPLACE FUNCTION system.deployment_message(p_program TEXT, p_is_new BOOLEAN, p_status TEXT, p_detail TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_is_new THEN 'You have been deployed under ' || p_program || coalesce(' (' || nullif(p_detail, '') || ')', '') || '.'
    ELSE 'Your ' || p_program || ' deployment' || coalesce(' (' || nullif(p_detail, '') || ')', '') || ' is now ' || coalesce(p_status, 'updated') || '.'
  END;
$$;

REVOKE ALL ON FUNCTION system.deployment_message(TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION system.notify_spes_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(f.profile_id, system.applicant_profile_id(f.applicant_id)) INTO v_profile_id
  FROM esmdd.spes s
  JOIN applicants.spes_form f ON f.id = s.application_id
  WHERE s.id = NEW.spes_id;

  PERFORM system.notify(
    v_profile_id,
    'deployment',
    'SPES Deployment Update',
    system.deployment_message('SPES', TG_OP = 'INSERT', NEW.status, NEW.spes_year::TEXT)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_appointments_notify ON esmdd.spes_appointments;
CREATE TRIGGER trg_spes_appointments_notify
AFTER INSERT OR UPDATE OF status ON esmdd.spes_appointments
FOR EACH ROW EXECUTE FUNCTION system.notify_spes_appointment();


CREATE OR REPLACE FUNCTION system.notify_gip_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  SELECT system.applicant_profile_id(ga.applicant_id) INTO v_profile_id
  FROM esmdd.gips g
  JOIN esmdd.gip_applicants ga ON ga.id = g.application_id
  WHERE g.id = NEW.gip_id;

  PERFORM system.notify(
    v_profile_id,
    'deployment',
    'GIP Deployment Update',
    system.deployment_message('GIP', TG_OP = 'INSERT', NEW.status, NEW.assigned_office)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_gip_appointments_notify ON esmdd.gip_appointments;
CREATE TRIGGER trg_gip_appointments_notify
AFTER INSERT OR UPDATE OF status ON esmdd.gip_appointments
FOR EACH ROW EXECUTE FUNCTION system.notify_gip_appointment();


CREATE OR REPLACE FUNCTION system.notify_tupad_deployment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
  v_edl TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  SELECT system.applicant_profile_id(ta.applicant_id) INTO v_profile_id
  FROM esmdd.tupad_applicants ta
  WHERE ta.id = NEW.tupad_applicant_id;

  SELECT b.edl_number INTO v_edl FROM esmdd.tupad_batch b WHERE b.id = NEW.batch_id;

  PERFORM system.notify(
    v_profile_id,
    'deployment',
    'TUPAD Deployment Update',
    system.deployment_message('TUPAD', TG_OP = 'INSERT', NEW.status, CASE WHEN v_edl IS NULL THEN NULL ELSE 'batch ' || v_edl END)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_notify ON esmdd.tupad;
CREATE TRIGGER trg_tupad_notify
AFTER INSERT OR UPDATE OF status ON esmdd.tupad
FOR EACH ROW EXECUTE FUNCTION system.notify_tupad_deployment();


-- ─── 6. Employers ───────────────────────────────────────────────────────────

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
      WHEN 'Rejected' THEN 'The NSRP Form 2 of ' || v_name || ' was rejected.' || coalesce(' Remarks: ' || nullif(NEW.remarks, ''), '')
      ELSE 'The NSRP Form 2 of ' || v_name || ' is now ' || NEW.status || '.'
    END
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_establishments_notify_status ON employers.establishments;
CREATE TRIGGER trg_establishments_notify_status
AFTER UPDATE OF status ON employers.establishments
FOR EACH ROW EXECUTE FUNCTION system.notify_establishment_status();


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
      || CASE WHEN NEW.status IN ('Cancelled') THEN coalesce(' Remarks: ' || nullif(NEW.remarks, ''), '') ELSE '' END
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activities_notify_status ON esmdd.recruitment_activities;
CREATE TRIGGER trg_recruitment_activities_notify_status
AFTER UPDATE OF status ON esmdd.recruitment_activities
FOR EACH ROW EXECUTE FUNCTION system.notify_recruitment_activity_status();
