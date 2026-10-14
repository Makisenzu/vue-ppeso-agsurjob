-- =============================================================================
-- Migration: 016_spes_process.sql
-- Purpose:   Bring SPES in line with the Provincial PESO process:
--
--              Entry of SPES applicant (New / Returning)
--                → submit the 5 documentary requirements           (migration 014)
--                → PESO draws applicants at random per municipality (spes_form.municipality)
--                → appointment of 10 or 20 days                     (spes_appointments.days_duration)
--                → beneficiary submits DTR + Accomplishment Report (esmdd.spes_completion_reports)
--                → only then can the appointment be marked Completed
--
--              1. applicants.spes_form.municipality (+ backfill) — the randomizer draws per municipality
--              2. esmdd.spes_appointments.days_duration limited to 10 or 20 days
--              3. esmdd.spes_completion_reports (DTR / Accomplishment Report PDFs)
--              4. Guard: an appointment cannot become Completed without both reports
--              5. RLS + storage read access for the beneficiary
-- Schemas:   applicants, esmdd, storage
--
-- Data model:
--   spes_form ──1:1── spes ──< spes_appointments ──< spes_completion_reports (UNIQUE appointment_id, report_type)
--
-- Access Matrix:
--   Table                    | provincial_peso | municipal_peso / admin | applicant
--   -------------------------|-----------------|------------------------|---------------------------------------
--   spes_completion_reports  | full CRUD       | read                   | read own; insert / update / delete own
--                            |                 |                        | while the appointment is Active
--   storage 'documents'      | (migration 014) | (migration 014)        | + read files of own completion reports
--
-- Storage path convention (same as 014): documents/<uploader auth.uid()>/<file>
-- =============================================================================


-- ─── 1. SPES form municipality ─────────────────────────────────────────────
-- Names match AGUSAN_DEL_SUR_MUNICIPALITIES in src/helpers/common/mapboxHelpers.ts

ALTER TABLE applicants.spes_form
  ADD COLUMN IF NOT EXISTS municipality TEXT;

COMMENT ON COLUMN applicants.spes_form.municipality IS
  'Agusan del Sur municipality of the applicant. The Provincial PESO randomizer draws SPES applicants per municipality.';

CREATE INDEX IF NOT EXISTS idx_spes_form_municipality_status
  ON applicants.spes_form (municipality, status);

-- Backfill: linked registry record first, then the present address text.
-- spes_form_guard_review (migration 012) blocks changes to reviewed forms unless auth.uid() is
-- PESO staff, and a migration has no auth.uid(), so the guard is paused for this backfill only.
ALTER TABLE applicants.spes_form DISABLE TRIGGER spes_form_guard_review;

WITH municipalities (name, pattern) AS (
  VALUES
    ('City of Bayugan', 'bayugan'),
    ('Bunawan',         'bunawan'),
    ('Esperanza',       'esperanza'),
    ('La Paz',          'la paz'),
    ('Loreto',          'loreto'),
    ('Prosperidad',     'prosperidad'),
    ('Rosario',         'rosario'),
    ('San Francisco',   'san francisco'),
    ('San Luis',        'san luis'),
    ('Santa Josefa',    'santa josefa'),
    ('Sibagat',         'sibagat'),
    ('Talacogon',       'talacogon'),
    ('Trento',          'trento'),
    ('Veruela',         'veruela')
)
UPDATE applicants.spes_form f
SET municipality = m.name
FROM municipalities m
WHERE f.municipality IS NULL
  AND (
    EXISTS (
      SELECT 1 FROM applicants.applicants a
      WHERE a.id = f.applicant_id
        AND lower(COALESCE(
              a.address ->> 'city_municipality',
              a.address ->> 'municipality',
              a.address ->> 'city',
              ''
            )) LIKE '%' || m.pattern || '%'
    )
    OR lower(COALESCE(f.present_address, '')) LIKE '%' || m.pattern || '%'
  );

ALTER TABLE applicants.spes_form ENABLE TRIGGER spes_form_guard_review;


-- ─── 2. Appointments last 10 or 20 days ────────────────────────────────────
-- NOT VALID: rows appointed before this process keep their duration; every new
-- or edited appointment must be 10 or 20 days.

ALTER TABLE esmdd.spes_appointments
  DROP CONSTRAINT IF EXISTS spes_appointments_days_duration_options;
ALTER TABLE esmdd.spes_appointments
  ADD CONSTRAINT spes_appointments_days_duration_options
  CHECK (days_duration IN (10, 20)) NOT VALID;


-- ─── 3. Completion reports (DTR / Accomplishment Report) ───────────────────

CREATE TABLE IF NOT EXISTS esmdd.spes_completion_reports (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID         NOT NULL REFERENCES esmdd.spes_appointments(id) ON DELETE CASCADE,
  report_type     TEXT         NOT NULL CHECK (report_type IN ('dtr', 'accomplishment_report')),
  filename        TEXT         NOT NULL,
  path            TEXT         NOT NULL,
  mime_type       TEXT         NOT NULL CHECK (mime_type = 'application/pdf'),
  size            BIGINT       CHECK (size IS NULL OR size >= 0),
  uploaded_by     UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One current file per report; a new upload replaces the row
  CONSTRAINT spes_completion_reports_type_key UNIQUE (appointment_id, report_type)
);

COMMENT ON TABLE esmdd.spes_completion_reports IS
  'PDF Daily Time Record and Accomplishment Report of a SPES appointment. Both are required before the appointment can be marked Completed.';

CREATE OR REPLACE FUNCTION esmdd.set_spes_completion_report_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_completion_report_updated_at ON esmdd.spes_completion_reports;
CREATE TRIGGER trg_spes_completion_report_updated_at
  BEFORE UPDATE ON esmdd.spes_completion_reports
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_spes_completion_report_updated_at();


-- ─── 4. Completed requires both reports ────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.guard_spes_appointment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_reports INT;
BEGIN
  IF NEW.status <> 'Completed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'Completed' THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT r.report_type) INTO v_reports
  FROM esmdd.spes_completion_reports r
  WHERE r.appointment_id = NEW.id
    AND r.report_type IN ('dtr', 'accomplishment_report');

  IF v_reports < 2 THEN
    RAISE EXCEPTION 'Upload the DTR and Accomplishment Report (PDF) before marking this SPES appointment as Completed.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spes_appointment_guard_completion ON esmdd.spes_appointments;
CREATE TRIGGER trg_spes_appointment_guard_completion
  BEFORE INSERT OR UPDATE OF status ON esmdd.spes_appointments
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.guard_spes_appointment_completion();


-- ─── 5. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.spes_completion_reports TO authenticated;
GRANT ALL ON esmdd.spes_completion_reports TO service_role;

ALTER TABLE esmdd.spes_completion_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provincial_peso_spes_completion_reports_all" ON esmdd.spes_completion_reports;
CREATE POLICY "provincial_peso_spes_completion_reports_all"
ON esmdd.spes_completion_reports
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

DROP POLICY IF EXISTS "municipal_peso_and_admin_spes_completion_reports_select" ON esmdd.spes_completion_reports;
CREATE POLICY "municipal_peso_and_admin_spes_completion_reports_select"
ON esmdd.spes_completion_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

DROP POLICY IF EXISTS "applicant_own_spes_completion_reports_select" ON esmdd.spes_completion_reports;
CREATE POLICY "applicant_own_spes_completion_reports_select"
ON esmdd.spes_completion_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.spes_appointments a
    JOIN esmdd.spes s ON s.id = a.spes_id
    JOIN applicants.spes_form f ON f.id = s.application_id
    WHERE a.id = spes_completion_reports.appointment_id
      AND f.profile_id = (SELECT auth.uid())
  )
);

-- Beneficiaries upload their own reports into their own storage folder, only while the appointment runs
DROP POLICY IF EXISTS "applicant_own_spes_completion_reports_write" ON esmdd.spes_completion_reports;
CREATE POLICY "applicant_own_spes_completion_reports_write"
ON esmdd.spes_completion_reports
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.spes_appointments a
    JOIN esmdd.spes s ON s.id = a.spes_id
    JOIN applicants.spes_form f ON f.id = s.application_id
    WHERE a.id = spes_completion_reports.appointment_id
      AND a.status = 'Active'
      AND f.profile_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND split_part(path, '/', 1) = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM esmdd.spes_appointments a
    JOIN esmdd.spes s ON s.id = a.spes_id
    JOIN applicants.spes_form f ON f.id = s.application_id
    WHERE a.id = spes_completion_reports.appointment_id
      AND a.status = 'Active'
      AND f.profile_id = (SELECT auth.uid())
  )
);

-- The beneficiary can open reports PESO uploaded for them (those files sit in the staff member's folder)
DROP POLICY IF EXISTS "applicant_spes_completion_report_documents_select" ON storage.objects;
CREATE POLICY "applicant_spes_completion_report_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM esmdd.spes_completion_reports r
    JOIN esmdd.spes_appointments a ON a.id = r.appointment_id
    JOIN esmdd.spes s ON s.id = a.spes_id
    JOIN applicants.spes_form f ON f.id = s.application_id
    WHERE r.path = objects.name
      AND f.profile_id = (SELECT auth.uid())
  )
);
