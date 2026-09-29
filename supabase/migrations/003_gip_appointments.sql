-- =============================================================================
-- Migration: 003_gip_appointments.sql
-- Purpose:   Create `esmdd.gip_appointments` table to manage GIP intern
--            appointment terms, lifecycle tracking, and Provincial PESO
--            renewal or conclusion decisions.
-- Schema:    esmdd
--
-- Appointment Lifecycle (database status values):
--   Active → Renewed (when a new term is created)
--                   → Completed (service concluded normally)
--                   → Hired (absorbed into employment)
--                   → Terminated (resigned or removed)
--
-- Note: "Expiring Soon" and "Expired" are client-computed statuses derived
-- from comparing end_date to the current date in the frontend helper
-- (calculateAppointmentStatus in gipHelper.ts). They are NOT stored in DB.
-- =============================================================================

-- ─── 1. Create the gip_appointments table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.gip_appointments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gip_id           UUID        NOT NULL REFERENCES esmdd.gips(id) ON DELETE CASCADE,
  term_number      INT         NOT NULL DEFAULT 1,
  appointment_code TEXT        NOT NULL,
  program          TEXT        NOT NULL CHECK (program IN ('PGAS', 'DOLE')),
  assigned_office  TEXT        NOT NULL,
  supervisor       TEXT,
  daily_stipend    TEXT        NOT NULL DEFAULT '₱479.35 / day',
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'Active'
                               CHECK (status IN ('Active', 'Renewed', 'Completed', 'Terminated', 'Hired')),
  decision_notes   TEXT,
  decided_by       UUID        REFERENCES auth.users(id),
  decided_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE esmdd.gip_appointments IS
  'Tracks GIP intern appointment terms. Each term has a start/end date and is managed by Provincial PESO for renewal or conclusion.';


-- ─── 2. Indexes for performance ─────────────────────────────────────────────

-- Fast lookup by GIP intern
CREATE INDEX IF NOT EXISTS idx_gip_appointments_gip_id
  ON esmdd.gip_appointments (gip_id);

-- Fast filtering of appointments approaching expiration (active only)
CREATE INDEX IF NOT EXISTS idx_gip_appointments_end_date_status
  ON esmdd.gip_appointments (end_date, status)
  WHERE status = 'Active';

-- Ordering by term number within a GIP
CREATE INDEX IF NOT EXISTS idx_gip_appointments_term
  ON esmdd.gip_appointments (gip_id, term_number);


-- ─── 3. Auto-update `updated_at` trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.set_gip_appointment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gip_appointment_updated_at ON esmdd.gip_appointments;
CREATE TRIGGER trg_gip_appointment_updated_at
  BEFORE UPDATE ON esmdd.gip_appointments
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_gip_appointment_updated_at();


-- ─── 4. Row Level Security (RLS) ────────────────────────────────────────────

ALTER TABLE esmdd.gip_appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Provincial PESO full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_gip_appointments_all" ON esmdd.gip_appointments;
CREATE POLICY "provincial_peso_gip_appointments_all"
ON esmdd.gip_appointments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'provincial_peso'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'provincial_peso'
  )
);

-- Policy: Admin read-only access
DROP POLICY IF EXISTS "admin_gip_appointments_select" ON esmdd.gip_appointments;
CREATE POLICY "admin_gip_appointments_select"
ON esmdd.gip_appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);


-- ─── 5. Grant permissions to Supabase roles ─────────────────────────────────

GRANT SELECT ON esmdd.gip_appointments TO authenticated;
GRANT SELECT ON esmdd.gip_appointments TO anon;
GRANT ALL ON esmdd.gip_appointments TO service_role;


-- ─── 6. Backfill: Create initial Term 1 appointments from existing gips ─────
-- Automatically populates Term 1 appointments for existing deployed interns
-- in esmdd.gips by parsing their remarks for office, supervisor, stipend,
-- period, and program information.

DO $$
DECLARE
  rec RECORD;
  v_start_dt DATE;
  v_end_dt DATE;
  v_program TEXT;
  v_office TEXT;
  v_supervisor TEXT;
  v_stipend TEXT;
  v_batch_year INT;
  v_appt_status TEXT;
  v_parts TEXT[];
  v_part TEXT;
  v_period_text TEXT;
BEGIN
  FOR rec IN SELECT * FROM esmdd.gips LOOP
    -- Only create if not exists
    IF NOT EXISTS (SELECT 1 FROM esmdd.gip_appointments WHERE gip_id = rec.id) THEN

      -- Derive batch year from created_at
      v_batch_year := COALESCE(EXTRACT(YEAR FROM rec.created_at)::INT, EXTRACT(YEAR FROM now())::INT);
      v_start_dt := MAKE_DATE(v_batch_year, 1, 1);
      v_end_dt := MAKE_DATE(v_batch_year, 6, 30);

      -- Default values
      v_program := 'PGAS';
      v_stipend := '₱479.35 / day';
      v_office := 'Provincial PESO / PGAS Office';
      v_supervisor := 'Assigned Coordinator';

      -- Parse remarks for program, office, supervisor, stipend, period
      IF rec.remarks IS NOT NULL AND rec.remarks <> '' THEN
        -- Detect program from [DOLE] or [PGAS] prefix
        IF rec.remarks ILIKE '%[DOLE]%' OR rec.remarks ILIKE '%DOLE%' THEN
          v_program := 'DOLE';
          v_stipend := '₱475.00 / day';
          v_office := 'DOLE AgSur Provincial Field Office';
        END IF;

        -- Split by pipe delimiter and parse each segment
        v_parts := string_to_array(rec.remarks, '|');
        IF array_length(v_parts, 1) > 0 THEN
          -- First part (after removing program tag) is typically the office
          v_part := btrim(v_parts[1]);
          IF v_part ~ '^\[(PGAS|DOLE)\]\s*' THEN
            v_office := btrim(regexp_replace(v_part, '^\[(PGAS|DOLE)\]\s*', ''));
          ELSIF v_part <> '' THEN
            v_office := v_part;
          END IF;

          -- Process remaining parts
          FOR i IN 2..array_length(v_parts, 1) LOOP
            v_part := btrim(v_parts[i]);
            IF v_part ILIKE 'Supervisor:%' THEN
              v_supervisor := btrim(substring(v_part FROM 'Supervisor:\s*(.*)'));
            ELSIF v_part ILIKE 'Stipend:%' THEN
              v_stipend := btrim(substring(v_part FROM 'Stipend:\s*(.*)'));
            ELSIF v_part ILIKE 'Period:%' THEN
              v_period_text := btrim(substring(v_part FROM 'Period:\s*(.*)'));
              -- Try parsing ISO dates from period (e.g., "2026-01-01 to 2026-06-30")
              BEGIN
                IF v_period_text ~ '\d{4}-\d{2}-\d{2}' THEN
                  v_start_dt := (regexp_matches(v_period_text, '(\d{4}-\d{2}-\d{2})'))[1]::DATE;
                  IF v_period_text ~ '[-–]\s*(\d{4}-\d{2}-\d{2})' THEN
                    v_end_dt := (regexp_matches(v_period_text, '[-–]\s*(\d{4}-\d{2}-\d{2})'))[1]::DATE;
                  ELSIF v_period_text ILIKE '%to%' THEN
                    v_end_dt := (regexp_matches(v_period_text, 'to\s*(\d{4}-\d{2}-\d{2})'))[1]::DATE;
                  END IF;
                END IF;
              EXCEPTION WHEN OTHERS THEN
                -- Keep defaults if date parsing fails
                NULL;
              END;
            END IF;
          END LOOP;
        END IF;
      END IF;

      -- Map GIP status to appointment status
      v_appt_status := CASE
        WHEN rec.status IN ('Active', 'Approved', 'Pending') THEN 'Active'
        WHEN rec.status = 'Hired' THEN 'Hired'
        WHEN rec.status = 'Completed' THEN 'Completed'
        WHEN rec.status IN ('Resigned', 'Terminated', 'Rejected') THEN 'Terminated'
        ELSE 'Active'
      END;

      -- Insert initial Term 1 appointment
      INSERT INTO esmdd.gip_appointments (
        gip_id,
        term_number,
        appointment_code,
        program,
        assigned_office,
        supervisor,
        daily_stipend,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      ) VALUES (
        rec.id,
        1,
        'GIP-APPT-' || v_batch_year || '-' || UPPER(SUBSTRING(rec.id::TEXT, 1, 4)) || '-T1',
        v_program,
        v_office,
        v_supervisor,
        v_stipend,
        v_start_dt,
        v_end_dt,
        v_appt_status,
        COALESCE(rec.created_at, now()),
        COALESCE(rec.updated_at, now())
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: Initial Term 1 appointments created for all existing GIP interns.';
END $$;
