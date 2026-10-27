-- =============================================================================
-- Migration: 066_gip_orientation_schedule.sql
-- Purpose:   When PESO approves a GIP application it sets when the applicant comes to the office for
--            orientation, with an optional note (what to bring, where to go):
--              - esmdd.gip_applicants.orientation_at   (date and time, required by the app for Approved)
--              - esmdd.gip_applicants.orientation_note
--            The approval notification carries the schedule in its message and the note as its remarks
--            (057). Changing the schedule of an approved application notifies the applicant again.
--            Applicants only read their row (034 applicant_own_select); there is still no applicant
--            INSERT / UPDATE policy (060), so only PESO sets these.
-- Schemas:   esmdd, system
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE esmdd.gip_applicants ADD COLUMN IF NOT EXISTS orientation_at TIMESTAMPTZ;
ALTER TABLE esmdd.gip_applicants ADD COLUMN IF NOT EXISTS orientation_note TEXT;

COMMENT ON COLUMN esmdd.gip_applicants.orientation_at IS 'When the approved applicant comes to the PESO office for orientation; required by the app for Approved (066).';
COMMENT ON COLUMN esmdd.gip_applicants.orientation_note IS 'PESO''s note for the orientation, e.g. what to bring (066).';


-- ─── 2. Notification with the schedule ──────────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_gip_applicant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_approved BOOLEAN := lower(btrim(coalesce(NEW.status, ''))) = 'approved';
  v_message TEXT;
  v_remarks TEXT;
BEGIN
  IF NEW.status IS NULL OR system.is_gip_staff_only_status(NEW.status) THEN
    RETURN NULL;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_message := system.program_status_message('GIP', NEW.status);
  ELSIF v_is_approved AND (OLD.orientation_at IS DISTINCT FROM NEW.orientation_at
                           OR OLD.orientation_note IS DISTINCT FROM NEW.orientation_note) THEN
    v_message := 'Your GIP orientation schedule has been updated.';
  ELSE
    RETURN NULL;
  END IF;

  IF v_is_approved AND NEW.orientation_at IS NOT NULL THEN
    -- Philippine time, e.g. "November 3, 2026 at 9:00 AM"
    v_message := v_message || ' Please come to the PESO office for your orientation on '
      || to_char(NEW.orientation_at AT TIME ZONE 'Asia/Manila', 'FMMonth FMDD, YYYY "at" FMHH12:MI AM') || '.';
    v_remarks := NEW.orientation_note;
  ELSE
    v_remarks := system.status_remarks(NEW.status, NEW.status_remarks);
  END IF;

  PERFORM system.notify(
    system.applicant_profile_id(NEW.applicant_id),
    'application_status',
    'GIP Application Update',
    v_message,
    v_remarks
  );
  RETURN NULL;
END;
$$;

-- Also fire when only the schedule changes
DROP TRIGGER IF EXISTS trg_gip_applicants_notify_status ON esmdd.gip_applicants;
CREATE TRIGGER trg_gip_applicants_notify_status
AFTER UPDATE OF status, orientation_at, orientation_note ON esmdd.gip_applicants
FOR EACH ROW EXECUTE FUNCTION system.notify_gip_applicant_status();

COMMIT;
