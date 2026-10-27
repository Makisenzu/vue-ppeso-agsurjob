-- =============================================================================
-- Migration: 070_tupad_online_application.sql
-- Purpose:   TUPAD applications follow the GIP flow (BACKEND.md §18): a signed-in applicant applies from
--            the TUPAD page instead of waiting for PESO to refer them.
--              1. Columns: applied_online (how the application came in), orientation_at /
--                 orientation_note (set by PESO on approval, like GIP's 066)
--              2. guard_tupad_applicant_review: applicants still edit their income, dependent and
--                 documents while Pending (023); status, remarks, orientation and applied_online stay
--                 staff-only
--              3. Uploads keep tupad_applicants.doc_submitted in step (the PESO review checklist), like
--                 GIP's 060. NSRP Form stays ticked (tupad_applicants_nsrp_form_check, 023)
--              4. RPC esmdd.apply_to_tupad() — creates the application, notifies Provincial PESO
--              5. The approval notification carries the orientation schedule; changing it notifies again
-- Schemas:   esmdd, applicants, system
--
-- Like PESO's referral (tupadService.referToTupad) the RPC adds 'TUPAD' to referred_programs, so a later
-- registry save by PESO keeps the application instead of removing it (unreferFromTupad).
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE esmdd.tupad_applicants ADD COLUMN IF NOT EXISTS applied_online BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE esmdd.tupad_applicants ADD COLUMN IF NOT EXISTS orientation_at TIMESTAMPTZ;
ALTER TABLE esmdd.tupad_applicants ADD COLUMN IF NOT EXISTS orientation_note TEXT;

COMMENT ON COLUMN esmdd.tupad_applicants.applied_online IS 'The applicant applied on AGSURJOBS (apply_to_tupad), not referred by PESO (070).';
COMMENT ON COLUMN esmdd.tupad_applicants.orientation_at IS 'When the approved applicant comes to the PESO office for orientation; required by the app for Approved (070).';
COMMENT ON COLUMN esmdd.tupad_applicants.orientation_note IS 'PESO''s note for the orientation, e.g. what to bring (070).';


-- ─── 2. Review guard ────────────────────────────────────────────────────────
-- The applicant UPDATE policy (023 / 034) only keeps the status Pending; this keeps the rest of
-- PESO's review as it was.

CREATE OR REPLACE FUNCTION esmdd.guard_tupad_applicant_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR core.has_role('admin', 'provincial_peso', 'municipal_peso') THEN
    RETURN NEW;
  END IF;

  NEW.applicant_id := OLD.applicant_id;
  NEW.status := OLD.status;
  NEW.status_remarks := OLD.status_remarks;
  NEW.applied_online := OLD.applied_online;
  NEW.orientation_at := OLD.orientation_at;
  NEW.orientation_note := OLD.orientation_note;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_applicants_guard_review ON esmdd.tupad_applicants;
CREATE TRIGGER trg_tupad_applicants_guard_review
  BEFORE UPDATE ON esmdd.tupad_applicants
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.guard_tupad_applicant_review();


-- ─── 3. Uploads tick the document in the review checklist ──────────────────
-- SECURITY DEFINER so it also works once the application is no longer the applicant's to edit
-- (PESO removing a file). A removed file unticks it, except NSRP Form; PESO can still tick documents
-- handed in on paper.

CREATE OR REPLACE FUNCTION esmdd.sync_tupad_doc_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.document_name <> 'NSRP Form' THEN
      UPDATE esmdd.tupad_applicants
      SET doc_submitted = array_remove(doc_submitted, OLD.document_name)
      WHERE id = OLD.tupad_applicant_id;
    END IF;
    RETURN NULL;
  END IF;

  UPDATE esmdd.tupad_applicants
  SET doc_submitted = array_append(coalesce(doc_submitted, '{}'), NEW.document_name)
  WHERE id = NEW.tupad_applicant_id
    AND NOT (NEW.document_name = ANY (coalesce(doc_submitted, '{}')));
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.sync_tupad_doc_submitted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_tupad_applicant_documents_sync ON esmdd.tupad_applicant_documents;
CREATE TRIGGER trg_tupad_applicant_documents_sync
  AFTER INSERT OR DELETE ON esmdd.tupad_applicant_documents
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.sync_tupad_doc_submitted();


-- ─── 4. RPC: apply to TUPAD ────────────────────────────────────────────────
-- Returns the existing application when there is one (applied before, or referred by PESO).
-- The applicant isn't notified (system.notify skips the acting user); the page confirms with a toast.

DROP FUNCTION IF EXISTS esmdd.apply_to_tupad();

CREATE FUNCTION esmdd.apply_to_tupad()
RETURNS esmdd.tupad_applicants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applicant applicants.applicants%ROWTYPE;
  v_row esmdd.tupad_applicants%ROWTYPE;
  v_name TEXT;
  v_staff UUID;
BEGIN
  IF NOT core.has_role('applicant') THEN
    RAISE EXCEPTION 'Only applicants can apply to TUPAD' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_applicant FROM applicants.applicants WHERE profile_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complete your NSRP profile before applying to TUPAD' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_row FROM esmdd.tupad_applicants WHERE applicant_id = v_applicant.id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  UPDATE applicants.applicants
  SET referred_programs = array_append(coalesce(referred_programs, '{}'), 'TUPAD')
  WHERE id = v_applicant.id
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(referred_programs, '{}')) p WHERE upper(btrim(p)) LIKE '%TUPAD%');

  -- NSRP Form is always on the checklist (tupad_applicants_nsrp_form_check, 023)
  INSERT INTO esmdd.tupad_applicants (applicant_id, status, doc_submitted, applied_online)
  VALUES (v_applicant.id, 'Pending', ARRAY['NSRP Form'], true)
  RETURNING * INTO v_row;

  v_name := coalesce(nullif(btrim(concat_ws(' ', v_applicant.first_name, v_applicant.surname)), ''), 'An applicant');
  FOR v_staff IN SELECT id FROM core.profiles WHERE role::TEXT = 'provincial_peso' LOOP
    PERFORM system.notify(
      v_staff,
      'application_status',
      'New TUPAD Application',
      v_name || ' applied to TUPAD. Review their documents in TUPAD Applicants.'
    );
  END LOOP;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.apply_to_tupad() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.apply_to_tupad() TO authenticated;


-- ─── 5. Status notification with the orientation schedule ──────────────────

CREATE OR REPLACE FUNCTION system.notify_tupad_applicant_status()
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
  IF NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_message := system.program_status_message('TUPAD', NEW.status);
  ELSIF v_is_approved AND (OLD.orientation_at IS DISTINCT FROM NEW.orientation_at
                           OR OLD.orientation_note IS DISTINCT FROM NEW.orientation_note) THEN
    v_message := 'Your TUPAD orientation schedule has been updated.';
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
    'TUPAD Application Update',
    v_message,
    v_remarks
  );
  RETURN NULL;
END;
$$;

-- Also fire when only the schedule changes
DROP TRIGGER IF EXISTS trg_tupad_applicants_notify_status ON esmdd.tupad_applicants;
CREATE TRIGGER trg_tupad_applicants_notify_status
AFTER UPDATE OF status, orientation_at, orientation_note ON esmdd.tupad_applicants
FOR EACH ROW EXECUTE FUNCTION system.notify_tupad_applicant_status();

COMMIT;
