-- =============================================================================
-- Migration: 112_gip_accomplishments.sql
-- Purpose:   GIP interns keep an accomplishment report per half-month (1–15, 16–end of month) of their
--            current appointment term in the GIP portal, generate / print it on their funding's form, and
--            submit it; Provincial PESO reviews it on the intern's page (Reviewed, or Returned with remarks).
--
--              1. esmdd.gip_accomplishments — one report per appointment per half
--              2. The funding (the appointment's program, copied onto the row) decides the report's form:
--                   DOLE — GIP Work Accomplishment Report: the date and what the intern did that day, for every
--                          weekday of the half (Worked, or Holiday / Leave)
--                   PGAS — Accomplishment Report: Activities / Output / Remarks rows, plus the Acknowledgement
--                          Receipt of Payment: the amount the intern computed (days on duty × daily stipend),
--                          in figures and in words. Daily entries are optional.
--                 Both carry the signatories printed on the form (supervisor, approving office head).
--              3. applicant_id and program are always derived from the appointment (never trusted from the client)
--              4. RLS: interns read their own and delete their own unreviewed reports; staff read; PPESO all
--              5. RPC esmdd.save_gip_accomplishment() — the only way an intern writes a report: save a Draft while
--                 the half runs, submit once the half has ended
--              6. Notifications: a submitted report notifies Provincial PESO; Reviewed / Returned notifies the intern
--              7. Audit trail (PRIVACY.md §5.1)
-- Schema:    esmdd, system
--
-- Data model:
--   gips ──< gip_appointments ──< gip_accomplishments (UNIQUE appointment_id, period_start) >── applicants.applicants
--   daily_entries: JSONB array of { "date": "YYYY-MM-DD", "status": "Worked" | "Holiday" | "Leave", "entry": text }
--                  (entry: one accomplishment per line, printed as bullets)
--   activities:    JSONB array of { "activity": text, "output": text | null, "remarks": text | null }  (PGAS)
--
-- Access Matrix:
--   Resource                      | provincial_peso | municipal_peso / dole / admin | applicant (intern)
--   ------------------------------|-----------------|-------------------------------|-----------------------------------
--   gip_accomplishments           | full CRUD       | read                          | read own; delete own unless Reviewed;
--                                 |                 |                               | write only through the RPC
--   esmdd.save_gip_accomplishment | —               | —                             | execute (own Active term)
--
-- Status flow: Draft --submit--> Submitted --PESO--> Reviewed
--                                Submitted --PESO--> Returned --edit + submit--> Submitted
--              (a Returned report can be saved while it is edited; it stays Returned until submitted again)
--
-- A half is clipped to the term: in a term that starts 11/10, the first half covers 11/10–11/15. Weekdays are
-- Monday–Friday (holidays are not known to the database: the intern marks them).
--
-- Privacy (PRIVACY.md): the FK to applicants.applicants puts the rows in Download my data (§6.2) and in account
-- erasure (§6.3, cascade); attached files sit in the intern's own storage folder, which erasure removes. PESO
-- staff already read every file in the documents bucket (documents_peso_select, migration 034).
-- =============================================================================

BEGIN;


-- ─── 1. gip_accomplishments ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.gip_accomplishments (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID          NOT NULL REFERENCES esmdd.gip_appointments(id) ON DELETE CASCADE,
  applicant_id       UUID          NOT NULL REFERENCES applicants.applicants(id) ON DELETE CASCADE,
  program            TEXT          NOT NULL CHECK (program IN ('PGAS', 'DOLE')),
  period_start       DATE          NOT NULL,
  period_end         DATE          NOT NULL,
  daily_entries      JSONB         NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(daily_entries) = 'array'),
  activities         JSONB         NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(activities) = 'array'),
  -- Printed on the form
  designation        TEXT          CHECK (designation IS NULL OR char_length(designation) <= 150),
  supervisor_name    TEXT          CHECK (supervisor_name IS NULL OR char_length(supervisor_name) <= 150),
  approver_name      TEXT          CHECK (approver_name IS NULL OR char_length(approver_name) <= 150),
  approver_position  TEXT          CHECK (approver_position IS NULL OR char_length(approver_position) <= 150),
  -- PGAS Acknowledgement Receipt of Payment: computed by the intern (days on duty × daily stipend)
  amount             NUMERIC(12,2) CHECK (amount IS NULL OR amount >= 0),
  amount_in_words    TEXT          CHECK (amount_in_words IS NULL OR char_length(amount_in_words) <= 300),
  -- Optional supporting PDF (e.g. the signed copy)
  file_name          TEXT,
  file_path          TEXT,
  file_size          BIGINT        CHECK (file_size IS NULL OR file_size BETWEEN 0 AND 10485760),
  status             TEXT          NOT NULL DEFAULT 'Draft'
                                   CHECK (status IN ('Draft', 'Submitted', 'Reviewed', 'Returned')),
  review_remarks     TEXT,
  reviewed_by        UUID          REFERENCES auth.users(id),
  reviewed_at        TIMESTAMPTZ,
  submitted_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT gip_accomplishments_half_key UNIQUE (appointment_id, period_start),
  -- A half-month: the 1st to the 15th, or the 16th to the last day of the month
  CONSTRAINT gip_accomplishments_half_check CHECK (
    extract(DAY FROM period_start) IN (1, 16)
    AND period_end = CASE
      WHEN extract(DAY FROM period_start) = 1 THEN period_start + 14
      ELSE (date_trunc('month', period_start) + INTERVAL '1 month - 1 day')::DATE
    END
  ),
  -- An attached file has both its storage path and its original name, or neither
  CONSTRAINT gip_accomplishments_file_check CHECK ((file_path IS NULL) = (file_name IS NULL)),
  -- Anything past Draft has been submitted at least once
  CONSTRAINT gip_accomplishments_submitted_check CHECK (status = 'Draft' OR submitted_at IS NOT NULL),
  -- Returning a report needs a reason the intern can act on
  CONSTRAINT gip_accomplishments_returned_remarks_check
    CHECK (status <> 'Returned' OR nullif(btrim(review_remarks), '') IS NOT NULL)
);

COMMENT ON TABLE esmdd.gip_accomplishments IS
  'Half-month accomplishment reports of GIP interns: DOLE daily entries, or PGAS activities with the payment receipt; reviewed by Provincial PESO.';

CREATE INDEX IF NOT EXISTS idx_gip_accomplishments_applicant
  ON esmdd.gip_accomplishments (applicant_id);
CREATE INDEX IF NOT EXISTS idx_gip_accomplishments_submitted
  ON esmdd.gip_accomplishments (submitted_at) WHERE status = 'Submitted';


-- ─── 2. Derived columns & review stamps ────────────────────────────────────
-- applicant_id and program come from the appointment, so no caller can attach a report to someone else or
-- pick the other funding's form. Review fields are stamped here so edits from any screen stay consistent.

CREATE OR REPLACE FUNCTION esmdd.set_gip_accomplishment_derived()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT ga.applicant_id, ap.program INTO NEW.applicant_id, NEW.program
  FROM esmdd.gip_appointments ap
  JOIN esmdd.gips g ON g.id = ap.gip_id
  JOIN esmdd.gip_applicants ga ON ga.id = g.application_id
  WHERE ap.id = NEW.appointment_id;

  IF NEW.applicant_id IS NULL THEN
    RAISE EXCEPTION 'This appointment is not linked to a GIP application' USING ERRCODE = '23502';
  END IF;

  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- PESO reviews submitted reports only; a Draft is the intern's work in progress
    IF NEW.status IN ('Reviewed', 'Returned') AND OLD.status = 'Draft' THEN
      RAISE EXCEPTION 'This report has not been submitted yet' USING ERRCODE = '22023';
    END IF;

    IF NEW.status IN ('Reviewed', 'Returned') THEN
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := now();
    ELSE
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.set_gip_accomplishment_derived() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_gip_accomplishments_derived ON esmdd.gip_accomplishments;
CREATE TRIGGER trg_gip_accomplishments_derived
  BEFORE INSERT OR UPDATE ON esmdd.gip_accomplishments
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_gip_accomplishment_derived();


-- ─── 3. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.gip_accomplishments TO authenticated;
GRANT ALL ON esmdd.gip_accomplishments TO service_role;

ALTER TABLE esmdd.gip_accomplishments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provincial_peso_all" ON esmdd.gip_accomplishments;
CREATE POLICY "provincial_peso_all"
ON esmdd.gip_accomplishments
FOR ALL
TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS "oversight_select" ON esmdd.gip_accomplishments;
CREATE POLICY "oversight_select"
ON esmdd.gip_accomplishments
FOR SELECT
TO authenticated
USING ((SELECT core.has_role('municipal_peso', 'dole', 'admin')));

DROP POLICY IF EXISTS "applicant_own_select" ON esmdd.gip_accomplishments;
CREATE POLICY "applicant_own_select"
ON esmdd.gip_accomplishments
FOR SELECT
TO authenticated
USING (applicants.owns_applicant(applicant_id));

-- Interns may discard a report PESO has not reviewed yet; writing goes through the RPC
DROP POLICY IF EXISTS "applicant_own_delete" ON esmdd.gip_accomplishments;
CREATE POLICY "applicant_own_delete"
ON esmdd.gip_accomplishments
FOR DELETE
TO authenticated
USING (status <> 'Reviewed' AND applicants.owns_applicant(applicant_id));


-- ─── 4. RPC: save (Draft) or submit a half-month report ────────────────────
-- p_period_start: the half's first day (the 1st or the 16th). p_daily_entries / p_activities replace the saved
-- ones. p_details: { designation, supervisor_name, approver_name, approver_position, amount, amount_in_words }.
-- p_file_path NULL saves no file (pass the current path to keep the existing one).
-- Saving without submitting keeps a Returned report Returned (its remarks stay visible); a Submitted report can
-- only be changed by submitting it again.

DROP FUNCTION IF EXISTS esmdd.submit_gip_accomplishment(UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, BIGINT);
DROP FUNCTION IF EXISTS esmdd.save_gip_accomplishment(UUID, DATE, TEXT, JSONB, TEXT, TEXT, BIGINT, BOOLEAN);
DROP FUNCTION IF EXISTS esmdd.save_gip_accomplishment(UUID, DATE, JSONB, JSONB, JSONB, TEXT, TEXT, BIGINT, BOOLEAN);

CREATE FUNCTION esmdd.save_gip_accomplishment(
  p_appointment_id UUID,
  p_period_start   DATE,
  p_daily_entries  JSONB,
  p_activities     JSONB,
  p_details        JSONB,
  p_file_path      TEXT DEFAULT NULL,
  p_file_name      TEXT DEFAULT NULL,
  p_file_size      BIGINT DEFAULT NULL,
  p_submit         BOOLEAN DEFAULT FALSE
)
RETURNS esmdd.gip_accomplishments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_appointment esmdd.gip_appointments%ROWTYPE;
  v_applicant_id UUID;
  v_existing esmdd.gip_accomplishments%ROWTYPE;
  v_row esmdd.gip_accomplishments%ROWTYPE;
  v_today DATE := (now() AT TIME ZONE 'Asia/Manila')::DATE;
  v_is_dole BOOLEAN;
  v_half_end DATE;
  v_from DATE;
  v_to DATE;
  v_entries JSONB := '[]'::JSONB;
  v_activities JSONB := '[]'::JSONB;
  v_item JSONB;
  v_date DATE;
  v_status TEXT;
  v_text TEXT;
  v_output TEXT;
  v_remarks TEXT;
  v_missing INT;
  v_new_status TEXT;
  v_designation TEXT;
  v_supervisor TEXT;
  v_approver TEXT;
  v_approver_position TEXT;
  v_amount NUMERIC(12,2);
  v_amount_words TEXT;
BEGIN
  IF NOT core.has_role('applicant') THEN
    RAISE EXCEPTION 'Only GIP interns can submit accomplishment reports' USING ERRCODE = '42501';
  END IF;

  -- ─ The term: the intern's own, still Active ─
  SELECT ap.* INTO v_appointment FROM esmdd.gip_appointments ap WHERE ap.id = p_appointment_id;
  SELECT ga.applicant_id INTO v_applicant_id
  FROM esmdd.gips g
  JOIN esmdd.gip_applicants ga ON ga.id = g.application_id
  WHERE g.id = v_appointment.gip_id;

  IF v_appointment.id IS NULL OR v_applicant_id IS NULL OR NOT applicants.owns_applicant(v_applicant_id) THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_appointment.status <> 'Active' THEN
    RAISE EXCEPTION 'This appointment term is closed; reports can only be filed for your current term'
      USING ERRCODE = '22023';
  END IF;

  v_is_dole := v_appointment.program = 'DOLE';

  -- ─ The half, clipped to the term ─
  IF p_period_start IS NULL OR extract(DAY FROM p_period_start) NOT IN (1, 16) THEN
    RAISE EXCEPTION 'Pick a half of the month (1st–15th or 16th–end)' USING ERRCODE = '22023';
  END IF;

  v_half_end := CASE
    WHEN extract(DAY FROM p_period_start) = 1 THEN p_period_start + 14
    ELSE (date_trunc('month', p_period_start) + INTERVAL '1 month - 1 day')::DATE
  END;
  v_from := greatest(p_period_start, v_appointment.start_date);
  v_to := least(v_half_end, v_appointment.end_date);

  IF v_from > v_to THEN
    RAISE EXCEPTION 'This half of the month is outside your appointment term' USING ERRCODE = '22023';
  END IF;
  IF v_from > v_today THEN
    RAISE EXCEPTION 'This half of the month has not started yet' USING ERRCODE = '22023';
  END IF;

  -- ─ Daily entries: weekdays of the half up to today, one per day ─
  IF p_daily_entries IS NOT NULL AND jsonb_typeof(p_daily_entries) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_daily_entries) LOOP
      BEGIN
        v_date := (v_item ->> 'date')::DATE;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'A daily entry has an invalid date' USING ERRCODE = '22023';
      END;
      v_status := coalesce(v_item ->> 'status', 'Worked');
      v_text := nullif(btrim(v_item ->> 'entry'), '');

      IF v_date IS NULL OR v_date < v_from OR v_date > least(v_to, v_today) THEN
        RAISE EXCEPTION 'Daily entries must fall within this half of the month and not after today' USING ERRCODE = '22023';
      END IF;
      IF extract(ISODOW FROM v_date) > 5 THEN
        RAISE EXCEPTION 'Daily entries are for weekdays only' USING ERRCODE = '22023';
      END IF;
      IF v_status NOT IN ('Worked', 'Holiday', 'Leave') THEN
        RAISE EXCEPTION 'A daily entry has an invalid status' USING ERRCODE = '22023';
      END IF;
      IF v_status = 'Worked' AND v_text IS NULL THEN
        RAISE EXCEPTION 'Write what you did on %', to_char(v_date, 'MM/DD/YYYY') USING ERRCODE = '22023';
      END IF;
      IF char_length(coalesce(v_text, '')) > 1000 THEN
        RAISE EXCEPTION 'Keep each daily entry under 1000 characters' USING ERRCODE = '22023';
      END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_entries) e WHERE (e ->> 'date')::DATE = v_date) THEN
        RAISE EXCEPTION 'There are two entries for %', to_char(v_date, 'MM/DD/YYYY') USING ERRCODE = '22023';
      END IF;

      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'date', to_char(v_date, 'YYYY-MM-DD'), 'status', v_status, 'entry', v_text
      ));
    END LOOP;

    -- Stored in date order
    SELECT coalesce(jsonb_agg(e ORDER BY e ->> 'date'), '[]'::JSONB) INTO v_entries FROM jsonb_array_elements(v_entries) e;
  END IF;

  -- ─ PGAS activities: Activities / Output / Remarks rows (DOLE's form has none) ─
  IF NOT v_is_dole AND p_activities IS NOT NULL AND jsonb_typeof(p_activities) = 'array' THEN
    IF jsonb_array_length(p_activities) > 50 THEN
      RAISE EXCEPTION 'List up to 50 activities' USING ERRCODE = '22023';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_activities) LOOP
      v_text := nullif(btrim(v_item ->> 'activity'), '');
      v_output := nullif(btrim(v_item ->> 'output'), '');
      v_remarks := nullif(btrim(v_item ->> 'remarks'), '');
      CONTINUE WHEN v_text IS NULL AND v_output IS NULL;
      IF v_text IS NULL THEN
        RAISE EXCEPTION 'Every row needs the activity you accomplished' USING ERRCODE = '22023';
      END IF;
      IF char_length(v_text) > 1000 OR char_length(coalesce(v_output, '')) > 500 OR char_length(coalesce(v_remarks, '')) > 150 THEN
        RAISE EXCEPTION 'An activity row is too long' USING ERRCODE = '22023';
      END IF;
      v_activities := v_activities || jsonb_build_array(jsonb_build_object(
        'activity', v_text, 'output', v_output, 'remarks', v_remarks
      ));
    END LOOP;
  END IF;

  -- ─ Form details ─
  p_details := coalesce(p_details, '{}'::JSONB);
  v_designation := nullif(btrim(p_details ->> 'designation'), '');
  v_supervisor := nullif(btrim(p_details ->> 'supervisor_name'), '');
  v_approver := nullif(btrim(p_details ->> 'approver_name'), '');
  v_approver_position := nullif(btrim(p_details ->> 'approver_position'), '');
  IF char_length(coalesce(v_designation, '')) > 150 OR char_length(coalesce(v_supervisor, '')) > 150
     OR char_length(coalesce(v_approver, '')) > 150 OR char_length(coalesce(v_approver_position, '')) > 150 THEN
    RAISE EXCEPTION 'Keep names and positions under 150 characters' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_dole THEN
    BEGIN
      v_amount := nullif(btrim(p_details ->> 'amount'), '')::NUMERIC(12,2);
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Enter the amount as a number, e.g. 5300.00' USING ERRCODE = '22023';
    END;
    IF v_amount IS NOT NULL AND v_amount < 0 THEN
      RAISE EXCEPTION 'The amount cannot be negative' USING ERRCODE = '22023';
    END IF;
    v_amount_words := nullif(btrim(p_details ->> 'amount_in_words'), '');
    IF char_length(coalesce(v_amount_words, '')) > 300 THEN
      RAISE EXCEPTION 'Keep the amount in words under 300 characters' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ─ File: a PDF in the intern's own folder ─
  IF p_file_path IS NOT NULL THEN
    IF split_part(p_file_path, '/', 1) <> (SELECT auth.uid())::TEXT
       OR lower(p_file_path) NOT LIKE '%.pdf'
       OR nullif(btrim(p_file_name), '') IS NULL THEN
      RAISE EXCEPTION 'Attach a PDF from your own uploads' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ─ Existing report of this half ─
  SELECT * INTO v_existing
  FROM esmdd.gip_accomplishments
  WHERE appointment_id = p_appointment_id AND period_start = p_period_start
  FOR UPDATE;

  IF FOUND AND v_existing.status = 'Reviewed' THEN
    RAISE EXCEPTION 'This report was already reviewed and can no longer be changed' USING ERRCODE = '22023';
  END IF;

  -- ─ Submit: the half has ended and the funding's form is complete ─
  IF p_submit THEN
    IF v_to > v_today THEN
      RAISE EXCEPTION 'You can submit this report from %, once the half ends', to_char(v_to, 'MM/DD/YYYY')
        USING ERRCODE = '22023';
    END IF;

    IF v_is_dole THEN
      SELECT count(*) INTO v_missing
      FROM generate_series(v_from, v_to, INTERVAL '1 day') AS d(day)
      WHERE extract(ISODOW FROM d.day) <= 5
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_entries) e WHERE (e ->> 'date')::DATE = d.day::DATE);
      IF v_missing > 0 THEN
        RAISE EXCEPTION 'Write what you did on every weekday of the half (% missing)', v_missing USING ERRCODE = '22023';
      END IF;
    ELSE
      IF jsonb_array_length(v_activities) = 0 THEN
        RAISE EXCEPTION 'List at least one activity you accomplished this half' USING ERRCODE = '22023';
      END IF;
      IF v_amount IS NULL OR v_amount <= 0 OR v_amount_words IS NULL THEN
        RAISE EXCEPTION 'Enter the amount of your pay for this half, in figures and in words' USING ERRCODE = '22023';
      END IF;
    END IF;

    v_new_status := 'Submitted';
  ELSIF FOUND AND v_existing.status = 'Submitted' THEN
    RAISE EXCEPTION 'This report is already submitted; submit it again to save your changes' USING ERRCODE = '22023';
  ELSIF FOUND THEN
    v_new_status := v_existing.status; -- Draft or Returned
  ELSE
    v_new_status := 'Draft';
  END IF;

  IF v_existing.id IS NULL THEN
    INSERT INTO esmdd.gip_accomplishments (
      appointment_id, applicant_id, program, period_start, period_end, daily_entries, activities,
      designation, supervisor_name, approver_name, approver_position, amount, amount_in_words,
      file_path, file_name, file_size, status, submitted_at
    )
    VALUES (
      p_appointment_id, v_applicant_id, v_appointment.program, p_period_start, v_half_end, v_entries, v_activities,
      v_designation, v_supervisor, v_approver, v_approver_position, v_amount, v_amount_words,
      p_file_path, CASE WHEN p_file_path IS NULL THEN NULL ELSE btrim(p_file_name) END,
      CASE WHEN p_file_path IS NULL THEN NULL ELSE p_file_size END,
      v_new_status, CASE WHEN p_submit THEN now() END
    )
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  UPDATE esmdd.gip_accomplishments
  SET daily_entries = v_entries,
      activities = v_activities,
      designation = v_designation,
      supervisor_name = v_supervisor,
      approver_name = v_approver,
      approver_position = v_approver_position,
      amount = v_amount,
      amount_in_words = v_amount_words,
      file_path = p_file_path,
      file_name = CASE WHEN p_file_path IS NULL THEN NULL ELSE btrim(p_file_name) END,
      file_size = CASE WHEN p_file_path IS NULL THEN NULL ELSE p_file_size END,
      status = v_new_status,
      review_remarks = CASE WHEN p_submit THEN NULL ELSE review_remarks END,
      submitted_at = CASE WHEN p_submit THEN now() ELSE submitted_at END
  WHERE id = v_existing.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.save_gip_accomplishment(UUID, DATE, JSONB, JSONB, JSONB, TEXT, TEXT, BIGINT, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.save_gip_accomplishment(UUID, DATE, JSONB, JSONB, JSONB, TEXT, TEXT, BIGINT, BOOLEAN)
  TO authenticated;


-- ─── 5. Notifications (BACKEND.md §17) ─────────────────────────────────────
-- Submitted (first time or again) → every Provincial PESO account; Reviewed / Returned → the intern.
-- Drafts notify no one. PESO's remarks go in the remarks argument, never in the message.

CREATE OR REPLACE FUNCTION system.notify_gip_accomplishment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_staff UUID;
  v_period TEXT;
  v_resubmitted BOOLEAN := TG_OP = 'UPDATE' AND OLD.submitted_at IS NOT NULL;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.submitted_at IS NOT DISTINCT FROM OLD.submitted_at THEN
    RETURN NULL;
  END IF;

  v_period := to_char(NEW.period_start, 'MM/DD/YYYY') || ' to ' || to_char(NEW.period_end, 'MM/DD/YYYY');

  IF NEW.status = 'Submitted' THEN
    SELECT coalesce(nullif(btrim(concat_ws(' ', a.first_name, a.surname)), ''), 'A GIP intern') INTO v_name
    FROM applicants.applicants a WHERE a.id = NEW.applicant_id;

    FOR v_staff IN SELECT id FROM core.profiles WHERE role::TEXT = 'provincial_peso' LOOP
      PERFORM system.notify(
        v_staff,
        'deployment',
        CASE WHEN v_resubmitted THEN 'GIP Accomplishment Report Resubmitted' ELSE 'New GIP Accomplishment Report' END,
        coalesce(v_name, 'A GIP intern') || ' submitted their accomplishment report for ' || v_period
          || '. Review it on their page in GIP Records.'
      );
    END LOOP;
  ELSIF NEW.status = 'Reviewed' THEN
    PERFORM system.notify(
      system.applicant_profile_id(NEW.applicant_id),
      'deployment',
      'Accomplishment Report Reviewed',
      'PESO reviewed your GIP accomplishment report for ' || v_period || '.'
    );
  ELSIF NEW.status = 'Returned' AND (TG_OP = 'INSERT' OR OLD.status <> 'Returned') THEN
    PERFORM system.notify(
      system.applicant_profile_id(NEW.applicant_id),
      'deployment',
      'Accomplishment Report Returned',
      'PESO returned your GIP accomplishment report for ' || v_period || '. Update it and submit it again.',
      NEW.review_remarks
    );
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION system.notify_gip_accomplishment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_gip_accomplishments_notify ON esmdd.gip_accomplishments;
CREATE TRIGGER trg_gip_accomplishments_notify
  AFTER INSERT OR UPDATE OF status, submitted_at ON esmdd.gip_accomplishments
  FOR EACH ROW
  EXECUTE FUNCTION system.notify_gip_accomplishment();


-- ─── 6. Audit trail (PRIVACY.md §5.1) ──────────────────────────────────────

DROP TRIGGER IF EXISTS trg_audit_personal_data ON esmdd.gip_accomplishments;
CREATE TRIGGER trg_audit_personal_data
  AFTER INSERT OR UPDATE OR DELETE ON esmdd.gip_accomplishments
  FOR EACH ROW EXECUTE FUNCTION system.audit_personal_data_change('applicant_id', 'applicant');

COMMIT;
