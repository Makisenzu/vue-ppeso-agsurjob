-- =============================================================================
-- Migration: 063_gip_staff_only_statuses.sql
-- Purpose:   GIP statuses Hired (Deployed), Completed and Resigned are Provincial PESO's own record
--            keeping, so setting them no longer notifies the applicant:
--              - esmdd.gip_applicants.status   (system.notify_gip_applicant_status, 057)
--              - esmdd.gip_appointments.status (system.notify_gip_appointment, 053)
--            Every other status change still notifies as before (BACKEND.md §17).
-- Schema:    system
-- =============================================================================

BEGIN;

-- Statuses PESO sets for its own tracking; case-insensitive
CREATE OR REPLACE FUNCTION system.is_gip_staff_only_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(btrim(coalesce(p_status, ''))) IN ('hired', 'deployed', 'completed', 'resigned');
$$;

REVOKE ALL ON FUNCTION system.is_gip_staff_only_status(TEXT) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION system.notify_gip_applicant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL
     OR system.is_gip_staff_only_status(NEW.status) THEN
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
  IF system.is_gip_staff_only_status(NEW.status) THEN
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

COMMIT;
