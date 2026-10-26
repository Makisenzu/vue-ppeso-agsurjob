-- =============================================================================
-- Migration: 064_program_staff_only_statuses.sql
-- Purpose:   Extends 063's rule to the other PESO programs: statuses PESO sets for its own record
--            keeping don't notify the applicant.
--              - esmdd.spes_appointments.status = Completed  (system.notify_spes_appointment, 053)
--              - esmdd.tupad.status             = Completed  (system.notify_tupad_deployment, 053)
--            Shared check: system.is_staff_only_program_status (Hired / Deployed / Completed / Resigned);
--            063's system.is_gip_staff_only_status now delegates to it.
--            Still notified: new deployments, Active, Terminated, and every application review
--            (Pending / Approved / Rejected) — those are user-facing (BACKEND.md §17).
-- Schema:    system
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION system.is_staff_only_program_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(btrim(coalesce(p_status, ''))) IN ('hired', 'deployed', 'completed', 'resigned');
$$;

REVOKE ALL ON FUNCTION system.is_staff_only_program_status(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION system.is_gip_staff_only_status(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT system.is_staff_only_program_status(p_status);
$$;


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
  IF system.is_staff_only_program_status(NEW.status) THEN
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
  IF system.is_staff_only_program_status(NEW.status) THEN
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

COMMIT;
