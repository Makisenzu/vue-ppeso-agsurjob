-- =============================================================================
-- Migration: 015_spes_appointments.sql
-- Purpose:   Create `esmdd.spes_appointments`, the yearly container of a SPES
--            beneficiary's employment — the SPES counterpart of
--            esmdd.gip_appointments.
--              1. esmdd.spes_appointments (one row per beneficiary per SPES year)
--              2. Keep esmdd.spes status / days_duration / beneficiary in step
--                 with the beneficiary's latest appointment
--              3. RLS
--              4. Backfill one appointment for every existing beneficiary
-- Schema:    esmdd
--
-- Data model:
--   applicants.spes_form ──1:1── esmdd.spes ──< esmdd.spes_appointments (UNIQUE spes_id, spes_year)
--
--   SPES runs once a year, so a beneficiary has at most one appointment per year.
--   A former beneficiary who becomes SPES again gets a new appointment for the
--   new year on the same esmdd.spes record (availment #2, #3, ...).
--
-- Appointment Lifecycle (database status values):
--   Active → Completed (served the full duration)
--          → Terminated (resigned or removed)
--
-- Note: "Expiring Soon" and "Expired" are client-computed statuses derived from
-- comparing end_date to the current date (getSpesAppointmentTiming in
-- spesHelper.ts). They are NOT stored in DB.
--
-- Access Matrix:
--   Table              | provincial_peso | municipal_peso / admin | applicant
--   -------------------|-----------------|------------------------|-------------------------
--   spes_appointments  | full CRUD       | read                   | read own (via spes_form)
-- =============================================================================


-- ─── 1. Create the spes_appointments table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.spes_appointments (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  spes_id          UUID          NOT NULL REFERENCES esmdd.spes(id) ON DELETE CASCADE,
  spes_year        INT           NOT NULL CHECK (spes_year BETWEEN 2000 AND 2100),
  appointment_code TEXT          NOT NULL,
  assigned_office  TEXT          NOT NULL,
  supervisor       TEXT,
  daily_wage       NUMERIC(10,2) CHECK (daily_wage IS NULL OR daily_wage >= 0),
  days_duration    INT           NOT NULL CHECK (days_duration BETWEEN 1 AND 365),
  start_date       DATE          NOT NULL,
  end_date         DATE          NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'Active'
                                 CHECK (status IN ('Active', 'Completed', 'Terminated')),
  decision_notes   TEXT,
  decided_by       UUID          REFERENCES auth.users(id),
  decided_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT spes_appointments_dates_check CHECK (end_date >= start_date),
  -- SPES runs once a year: one appointment per beneficiary per year
  CONSTRAINT spes_appointments_spes_year_key UNIQUE (spes_id, spes_year)
);

COMMENT ON TABLE esmdd.spes_appointments IS
  'Yearly SPES appointment of a beneficiary (esmdd.spes). One row per beneficiary per SPES year; returning beneficiaries get a new row for each year they are re-appointed.';


-- ─── 2. Indexes for performance ────────────────────────────────────────────
-- (spes_id, spes_year) is already covered by spes_appointments_spes_year_key

-- Yearly listing on the SPES dashboard
CREATE INDEX IF NOT EXISTS idx_spes_appointments_year
  ON esmdd.spes_appointments (spes_year);

-- Fast filtering of appointments approaching their end (active only)
CREATE INDEX IF NOT EXISTS idx_spes_appointments_end_date_status
  ON esmdd.spes_appointments (end_date, status)
  WHERE status = 'Active';


-- ─── 3. Auto-update `updated_at` trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.set_spes_appointment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_appointment_updated_at ON esmdd.spes_appointments;
CREATE TRIGGER trg_spes_appointment_updated_at
  BEFORE UPDATE ON esmdd.spes_appointments
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_spes_appointment_updated_at();


-- ─── 4. Sync esmdd.spes with its latest appointment ────────────────────────
-- esmdd.spes keeps status / days_duration / beneficiary as a summary of the
-- most recent SPES year, the way esmdd.gips.status follows the current GIP term.
-- A beneficiary with more than one appointment is 'Returning'.

CREATE OR REPLACE FUNCTION esmdd.sync_spes_from_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_spes_id UUID := COALESCE(NEW.spes_id, OLD.spes_id);
  v_latest  RECORD;
  v_count   INT;
BEGIN
  SELECT a.status, a.days_duration
  INTO v_latest
  FROM esmdd.spes_appointments a
  WHERE a.spes_id = v_spes_id
  ORDER BY a.spes_year DESC
  LIMIT 1;

  -- No appointments left: keep the beneficiary record as it is
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_count FROM esmdd.spes_appointments a WHERE a.spes_id = v_spes_id;

  UPDATE esmdd.spes s
  SET status        = v_latest.status,
      days_duration = v_latest.days_duration::TEXT,
      beneficiary   = CASE WHEN v_count > 1 THEN 'Returning' ELSE COALESCE(s.beneficiary, 'New') END,
      updated_at    = now()
  WHERE s.id = v_spes_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_appointment_sync_spes ON esmdd.spes_appointments;
CREATE TRIGGER trg_spes_appointment_sync_spes
  AFTER INSERT OR UPDATE OR DELETE ON esmdd.spes_appointments
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.sync_spes_from_appointments();


-- ─── 5. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.spes_appointments TO authenticated;
GRANT ALL ON esmdd.spes_appointments TO service_role;

ALTER TABLE esmdd.spes_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provincial_peso_spes_appointments_all" ON esmdd.spes_appointments;
CREATE POLICY "provincial_peso_spes_appointments_all"
ON esmdd.spes_appointments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'provincial_peso'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'provincial_peso'
  )
);

DROP POLICY IF EXISTS "municipal_peso_and_admin_spes_appointments_select" ON esmdd.spes_appointments;
CREATE POLICY "municipal_peso_and_admin_spes_appointments_select"
ON esmdd.spes_appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

DROP POLICY IF EXISTS "applicant_own_spes_appointments_select" ON esmdd.spes_appointments;
CREATE POLICY "applicant_own_spes_appointments_select"
ON esmdd.spes_appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.spes s
    JOIN applicants.spes_form f ON f.id = s.application_id
    WHERE s.id = spes_appointments.spes_id
      AND f.profile_id = (SELECT auth.uid())
  )
);


-- ─── 6. Backfill: one appointment per existing beneficiary ─────────────────
-- Existing esmdd.spes rows become the appointment of the year they were
-- enrolled. Their establishment was never recorded, so it is left for PESO to
-- fill in; a missing / non-numeric duration falls back to the 20-day minimum.

INSERT INTO esmdd.spes_appointments (
  spes_id,
  spes_year,
  appointment_code,
  assigned_office,
  days_duration,
  start_date,
  end_date,
  status,
  created_at,
  updated_at
)
SELECT
  s.id,
  v.spes_year,
  'SPES-' || v.spes_year || '-' || UPPER(SUBSTRING(s.id::TEXT, 1, 4)),
  'Not specified',
  v.days,
  v.start_date,
  v.start_date + (v.days - 1),
  CASE lower(COALESCE(s.status, ''))
    WHEN 'completed'  THEN 'Completed'
    WHEN 'terminated' THEN 'Terminated'
    ELSE 'Active'
  END,
  COALESCE(s.created_at, now()),
  COALESCE(s.updated_at, s.created_at, now())
FROM esmdd.spes s
CROSS JOIN LATERAL (
  SELECT
    EXTRACT(YEAR FROM COALESCE(s.created_at, now()))::INT AS spes_year,
    COALESCE(s.created_at, now())::DATE AS start_date,
    CASE
      WHEN btrim(COALESCE(s.days_duration, '')) ~ '^\d+$'
       AND btrim(s.days_duration)::INT BETWEEN 1 AND 365
      THEN btrim(s.days_duration)::INT
      ELSE 20
    END AS days
) v
WHERE NOT EXISTS (
  SELECT 1 FROM esmdd.spes_appointments a WHERE a.spes_id = s.id
);
