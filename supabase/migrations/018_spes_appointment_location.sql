-- =============================================================================
-- Migration: 018_spes_appointment_location.sql
-- Purpose:   A SPES beneficiary is now assigned to a place (province →
--            municipality → barangay, picked from the PSGC API) instead of an
--            establishment, and PESO no longer records a supervisor or daily
--            wage for the appointment.
--              1. assigned_office → assigned_municipality (existing values kept)
--              2. Add assigned_province / assigned_barangay
--              3. Drop supervisor / daily_wage
-- Schema:    esmdd
--
-- Notes:
--   Province and barangay are nullable so appointments saved before this
--   migration stay valid; the appointment form requires all three.
-- =============================================================================


-- ─── 1. Establishment becomes the assigned municipality ────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'esmdd'
      AND table_name   = 'spes_appointments'
      AND column_name  = 'assigned_office'
  ) THEN
    ALTER TABLE esmdd.spes_appointments RENAME COLUMN assigned_office TO assigned_municipality;
  END IF;
END;
$$;


-- ─── 2. Province and barangay of the assignment ────────────────────────────

ALTER TABLE esmdd.spes_appointments
  ADD COLUMN IF NOT EXISTS assigned_province TEXT,
  ADD COLUMN IF NOT EXISTS assigned_barangay TEXT;

-- The program is run by the Provincial PESO of Agusan del Sur
UPDATE esmdd.spes_appointments
SET assigned_province = 'Agusan del Sur'
WHERE assigned_province IS NULL;

COMMENT ON COLUMN esmdd.spes_appointments.assigned_province IS
  'Province of the assignment (PSGC province name).';
COMMENT ON COLUMN esmdd.spes_appointments.assigned_municipality IS
  'City / municipality of the assignment (PSGC name).';
COMMENT ON COLUMN esmdd.spes_appointments.assigned_barangay IS
  'Barangay of the assignment (PSGC name). NULL for appointments made before migration 018.';


-- ─── 3. Supervisor and daily wage are no longer recorded ───────────────────

ALTER TABLE esmdd.spes_appointments
  DROP COLUMN IF EXISTS supervisor,
  DROP COLUMN IF EXISTS daily_wage;
