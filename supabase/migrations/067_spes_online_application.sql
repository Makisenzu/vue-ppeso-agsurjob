-- =============================================================================
-- Migration: 067_spes_online_application.sql
-- Purpose:   SPES applications follow the GIP flow (BACKEND.md §18). One applicants.spes_form per
--            applicant keeps both their saved SPES details and their current application:
--              1. Columns: applied_at (when the current round was submitted), orientation_at /
--                 orientation_note (set by PESO on approval, like GIP's 066)
--              2. guard_spes_form_review: applicants can edit their details at any time; status,
--                 remarks, orientation, applied_at and — once reviewed — the requirement checklist
--                 stay staff-only. Replaces 012's "reviewed forms are frozen".
--              3. New online applications notify Provincial PESO (BACKEND.md §17)
--              4. RPC applicants.reapply_spes_form(): a Rejected applicant, or an Approved one whose
--                 last SPES year is over, starts a new round (back to Pending) with the same details
--              5. The approval notification carries the orientation schedule; changing it notifies again
-- Schemas:   applicants, system
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS orientation_at TIMESTAMPTZ;
ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS orientation_note TEXT;

-- Backfill. A migration has no auth.uid(), so 012's guard would block reviewed forms (same as 016);
-- updated_at is paused too so "Last updated" keeps meaning a real change
ALTER TABLE applicants.spes_form DISABLE TRIGGER spes_form_guard_review;
ALTER TABLE applicants.spes_form DISABLE TRIGGER spes_form_set_updated_at;
UPDATE applicants.spes_form SET applied_at = created_at WHERE applied_at IS NULL;
ALTER TABLE applicants.spes_form ENABLE TRIGGER spes_form_set_updated_at;
ALTER TABLE applicants.spes_form ENABLE TRIGGER spes_form_guard_review;
ALTER TABLE applicants.spes_form ALTER COLUMN applied_at SET DEFAULT now();

COMMENT ON COLUMN applicants.spes_form.applied_at IS 'When the current application round was submitted; reset by reapply_spes_form (067).';
COMMENT ON COLUMN applicants.spes_form.orientation_at IS 'When the approved applicant comes to the PESO office for orientation (067).';
COMMENT ON COLUMN applicants.spes_form.orientation_note IS 'PESO''s note for the orientation, e.g. what to bring (067).';


-- ─── 2. Review guard ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.guard_spes_form_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_staff boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  ) INTO is_staff;

  -- reapply_spes_form resets the review itself
  IF is_staff OR coalesce(current_setting('applicants.spes_reapply', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'Pending';
    NEW.remarks := NULL;
    NEW.applied_at := now();
    NEW.orientation_at := NULL;
    NEW.orientation_note := NULL;
    RETURN NEW;
  END IF;

  -- Details stay editable; the review is PESO's
  NEW.status := OLD.status;
  NEW.remarks := OLD.remarks;
  NEW.applied_at := OLD.applied_at;
  NEW.orientation_at := OLD.orientation_at;
  NEW.orientation_note := OLD.orientation_note;

  -- A reviewed application keeps the documents PESO checked
  IF OLD.status IN ('Approved', 'Rejected') THEN
    NEW.has_birth_certificate := OLD.has_birth_certificate;
    NEW.has_income_proof := OLD.has_income_proof;
    NEW.has_passing_grade_proof := OLD.has_passing_grade_proof;
    NEW.has_registrar_certification := OLD.has_registrar_certification;
    NEW.has_osy_certification := OLD.has_osy_certification;
  END IF;
  RETURN NEW;
END;
$$;


-- ─── 3. New online applications notify PESO ────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_spes_staff_new_application(p_form applicants.spes_form)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := coalesce(nullif(btrim(concat_ws(' ', p_form.first_name, p_form.surname)), ''), 'An applicant');
  v_staff UUID;
BEGIN
  FOR v_staff IN SELECT id FROM core.profiles WHERE role::TEXT = 'provincial_peso' LOOP
    PERFORM system.notify(
      v_staff,
      'application_status',
      'New SPES Application',
      v_name || ' applied to the Special Program for Employment of Students. Review their documents in SPES Applicants.'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION system.notify_spes_staff_new_application(applicants.spes_form) FROM PUBLIC, anon, authenticated;

-- Only applicants' own forms: PESO's walk-in entries are already in their hands
CREATE OR REPLACE FUNCTION system.notify_spes_form_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL AND NEW.profile_id = auth.uid() THEN
    PERFORM system.notify_spes_staff_new_application(NEW);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_form_notify_created ON applicants.spes_form;
CREATE TRIGGER trg_spes_form_notify_created
AFTER INSERT ON applicants.spes_form
FOR EACH ROW EXECUTE FUNCTION system.notify_spes_form_created();


-- ─── 4. RPC: apply again ────────────────────────────────────────────────────
-- Allowed for Rejected, or Approved with no Active appointment once its SPES year (or the year it
-- was applied, if never appointed) is over. Same details; the requirement files go back to review.

CREATE OR REPLACE FUNCTION applicants.reapply_spes_form()
RETURNS applicants.spes_form
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_form applicants.spes_form%ROWTYPE;
  v_has_active BOOLEAN;
  v_last_year INT;
BEGIN
  SELECT * INTO v_form FROM applicants.spes_form
  WHERE profile_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fill in your SPES application first' USING ERRCODE = 'P0002';
  END IF;

  SELECT bool_or(a.status = 'Active'), max(a.spes_year) INTO v_has_active, v_last_year
  FROM esmdd.spes s
  JOIN esmdd.spes_appointments a ON a.spes_id = s.id
  WHERE s.application_id = v_form.id;

  IF NOT (
    v_form.status = 'Rejected'
    OR (
      v_form.status = 'Approved'
      AND NOT coalesce(v_has_active, false)
      AND coalesce(v_last_year, extract(YEAR FROM coalesce(v_form.applied_at, v_form.created_at))::INT)
          < extract(YEAR FROM now())::INT
    )
  ) THEN
    RAISE EXCEPTION 'You can apply again once PESO has finished your current SPES application' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('applicants.spes_reapply', 'on', true);
  UPDATE applicants.spes_form
  SET status = 'Pending', remarks = NULL, applied_at = now(), orientation_at = NULL, orientation_note = NULL
  WHERE id = v_form.id
  RETURNING * INTO v_form;
  PERFORM set_config('applicants.spes_reapply', 'off', true);

  -- The files go back to review, so the applicant can replace them (can_edit_spes_form, 017)
  UPDATE applicants.applicant_requirements SET status = 'pending' WHERE spes_form_id = v_form.id;

  PERFORM system.notify_spes_staff_new_application(v_form);
  RETURN v_form;
END;
$$;

REVOKE ALL ON FUNCTION applicants.reapply_spes_form() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION applicants.reapply_spes_form() TO authenticated;


-- ─── 5. Status notification with the orientation schedule ──────────────────

CREATE OR REPLACE FUNCTION system.notify_spes_form_status()
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
    v_message := system.program_status_message('SPES', NEW.status);
  ELSIF v_is_approved AND (OLD.orientation_at IS DISTINCT FROM NEW.orientation_at
                           OR OLD.orientation_note IS DISTINCT FROM NEW.orientation_note) THEN
    v_message := 'Your SPES orientation schedule has been updated.';
  ELSE
    RETURN NULL;
  END IF;

  IF v_is_approved AND NEW.orientation_at IS NOT NULL THEN
    -- Philippine time, e.g. "November 3, 2026 at 9:00 AM"
    v_message := v_message || ' Please come to the PESO office for your orientation on '
      || to_char(NEW.orientation_at AT TIME ZONE 'Asia/Manila', 'FMMonth FMDD, YYYY "at" FMHH12:MI AM') || '.';
    v_remarks := NEW.orientation_note;
  ELSE
    v_remarks := system.status_remarks(NEW.status, NEW.remarks);
  END IF;

  PERFORM system.notify(
    coalesce(NEW.profile_id, system.applicant_profile_id(NEW.applicant_id)),
    'application_status',
    'SPES Application Update',
    v_message,
    v_remarks
  );
  RETURN NULL;
END;
$$;

-- Also fire when only the schedule changes
DROP TRIGGER IF EXISTS trg_spes_form_notify_status ON applicants.spes_form;
CREATE TRIGGER trg_spes_form_notify_status
AFTER UPDATE OF status, orientation_at, orientation_note ON applicants.spes_form
FOR EACH ROW EXECUTE FUNCTION system.notify_spes_form_status();

COMMIT;
