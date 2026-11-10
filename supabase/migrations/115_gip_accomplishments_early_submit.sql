-- =============================================================================
-- Migration: 115_gip_accomplishments_early_submit.sql
-- Purpose:   GIP interns may submit an accomplishment report before its last day (Date to). The GIP portal
--            asks them to confirm first; the database no longer refuses it. A DOLE report then needs an entry
--            for every weekday up to today (later days can't be filled in yet); PGAS rules are unchanged.
-- Schema:    esmdd
--
-- Replaces esmdd.save_gip_accomplishment() from migration 114 (same signature and grants); everything else
-- in 112 / 114 is unchanged.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION esmdd.save_gip_accomplishment(
  p_id             UUID,
  p_appointment_id UUID,
  p_period_start   DATE,
  p_period_end     DATE,
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
  v_overlap esmdd.gip_accomplishments%ROWTYPE;
  v_row esmdd.gip_accomplishments%ROWTYPE;
  v_today DATE := (now() AT TIME ZONE 'Asia/Manila')::DATE;
  v_is_dole BOOLEAN;
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

  -- ─ The term: the intern's own, still Active. Locked so overlapping saves are checked one at a time ─
  SELECT ap.* INTO v_appointment FROM esmdd.gip_appointments ap WHERE ap.id = p_appointment_id FOR UPDATE;
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

  -- ─ The report being edited ─
  IF p_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM esmdd.gip_accomplishments WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR v_existing.applicant_id <> v_applicant_id OR v_existing.appointment_id <> p_appointment_id THEN
      RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_existing.status = 'Reviewed' THEN
      RAISE EXCEPTION 'This report was already reviewed and can no longer be changed' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ─ The period: inside the term, started, not overlapping another report of the term ─
  IF p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'Pick the dates this report covers' USING ERRCODE = '22023';
  END IF;
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'The end date must be on or after the start date' USING ERRCODE = '22023';
  END IF;
  IF p_period_start < v_appointment.start_date OR p_period_end > v_appointment.end_date THEN
    RAISE EXCEPTION 'The dates must fall within your appointment term (% to %)',
      to_char(v_appointment.start_date, 'MM/DD/YYYY'), to_char(v_appointment.end_date, 'MM/DD/YYYY')
      USING ERRCODE = '22023';
  END IF;
  IF p_period_start > v_today THEN
    RAISE EXCEPTION 'The start date cannot be after today' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_overlap
  FROM esmdd.gip_accomplishments a
  WHERE a.appointment_id = p_appointment_id
    AND a.id IS DISTINCT FROM p_id
    AND a.period_start <= p_period_end
    AND a.period_end >= p_period_start
  ORDER BY a.period_start
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'You already have a report covering % to %',
      to_char(v_overlap.period_start, 'MM/DD/YYYY'), to_char(v_overlap.period_end, 'MM/DD/YYYY')
      USING ERRCODE = '22023';
  END IF;

  -- ─ Daily entries: weekdays of the period up to today, one per day ─
  IF p_daily_entries IS NOT NULL AND jsonb_typeof(p_daily_entries) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_daily_entries) LOOP
      BEGIN
        v_date := (v_item ->> 'date')::DATE;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'A daily entry has an invalid date' USING ERRCODE = '22023';
      END;
      v_status := coalesce(v_item ->> 'status', 'Worked');
      v_text := nullif(btrim(v_item ->> 'entry'), '');

      IF v_date IS NULL OR v_date < p_period_start OR v_date > least(p_period_end, v_today) THEN
        RAISE EXCEPTION 'Daily entries must fall within the report''s dates and not after today' USING ERRCODE = '22023';
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

  -- ─ Submit: the funding's form is complete for the days so far. A report may go in before its last day (the
  --   page warns first); DOLE then needs every weekday up to today, as later days can't be filled in yet ─
  IF p_submit THEN
    IF v_is_dole THEN
      SELECT count(*) INTO v_missing
      FROM generate_series(p_period_start, least(p_period_end, v_today), INTERVAL '1 day') AS d(day)
      WHERE extract(ISODOW FROM d.day) <= 5
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_entries) e WHERE (e ->> 'date')::DATE = d.day::DATE);
      IF v_missing > 0 THEN
        RAISE EXCEPTION 'Write what you did on every weekday of the report so far (% missing)', v_missing USING ERRCODE = '22023';
      END IF;
    ELSE
      IF jsonb_array_length(v_activities) = 0 THEN
        RAISE EXCEPTION 'List at least one activity you accomplished' USING ERRCODE = '22023';
      END IF;
      IF v_amount IS NULL OR v_amount <= 0 OR v_amount_words IS NULL THEN
        RAISE EXCEPTION 'Enter the amount of your pay for these dates, in figures and in words' USING ERRCODE = '22023';
      END IF;
    END IF;

    v_new_status := 'Submitted';
  ELSIF v_existing.id IS NOT NULL AND v_existing.status = 'Submitted' THEN
    RAISE EXCEPTION 'This report is already submitted; submit it again to save your changes' USING ERRCODE = '22023';
  ELSIF v_existing.id IS NOT NULL THEN
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
      p_appointment_id, v_applicant_id, v_appointment.program, p_period_start, p_period_end, v_entries, v_activities,
      v_designation, v_supervisor, v_approver, v_approver_position, v_amount, v_amount_words,
      p_file_path, CASE WHEN p_file_path IS NULL THEN NULL ELSE btrim(p_file_name) END,
      CASE WHEN p_file_path IS NULL THEN NULL ELSE p_file_size END,
      v_new_status, CASE WHEN p_submit THEN now() END
    )
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  UPDATE esmdd.gip_accomplishments
  SET period_start = p_period_start,
      period_end = p_period_end,
      daily_entries = v_entries,
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

COMMIT;
