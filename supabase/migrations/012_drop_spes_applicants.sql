-- =============================================================================
-- Migration: 012_drop_spes_applicants.sql
-- Purpose:   esmdd.spes_applicants only duplicated applicants.spes_form, so the
--            SPES applicant list now reads the forms directly.
--              1. Review fields (status, remarks) move onto applicants.spes_form
--              2. Only PESO staff / admin may change the review fields
--              3. esmdd.spes.application_id → applicants.spes_form.id
--              4. esmdd.spes_applicants is dropped
-- Schemas:   applicants, esmdd
-- =============================================================================


-- ─── 1. Review fields on applicants.spes_form ──────────────────────────────

ALTER TABLE applicants.spes_form
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS remarks text;

ALTER TABLE applicants.spes_form DROP CONSTRAINT IF EXISTS spes_form_status_check;
ALTER TABLE applicants.spes_form
  ADD CONSTRAINT spes_form_status_check CHECK (status IN ('Pending', 'Approved', 'Rejected'));

-- Carry over the review already recorded on esmdd.spes_applicants
UPDATE applicants.spes_form f
SET status = CASE lower(coalesce(a.status, ''))
               WHEN 'approved' THEN 'Approved'
               WHEN 'rejected' THEN 'Rejected'
               ELSE 'Pending'
             END,
    remarks = a.remarks
FROM esmdd.spes_applicants a
WHERE a.spes_form_id = f.id;


-- ─── 2. Applicants cannot review their own form ────────────────────────────
-- RLS lets applicants insert/update their own form, so a trigger keeps the
-- review fields staff-only and freezes forms once PESO has decided on them.

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

  IF is_staff THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'Pending';
    NEW.remarks := NULL;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('Approved', 'Rejected') THEN
    RAISE EXCEPTION 'This SPES application has already been reviewed by PESO and can no longer be changed.'
      USING ERRCODE = '42501';
  END IF;

  NEW.status := OLD.status;
  NEW.remarks := OLD.remarks;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spes_form_guard_review ON applicants.spes_form;
CREATE TRIGGER spes_form_guard_review
BEFORE INSERT OR UPDATE ON applicants.spes_form
FOR EACH ROW EXECUTE FUNCTION applicants.guard_spes_form_review();


-- ─── 3. esmdd.spes → applicants.spes_form ──────────────────────────────────

-- This policy reads esmdd.spes_applicants, so it goes before the table does
DROP POLICY IF EXISTS "applicant_own_spes_select" ON esmdd.spes;

ALTER TABLE esmdd.spes DROP CONSTRAINT IF EXISTS spes_application_id_fkey;

-- application_id held an esmdd.spes_applicants id; swap it for that row's form id
UPDATE esmdd.spes s
SET application_id = a.spes_form_id
FROM esmdd.spes_applicants a
WHERE a.id = s.application_id;

-- Beneficiaries whose applicant record had no form cannot be linked any more
DELETE FROM esmdd.spes s
WHERE s.application_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM applicants.spes_form f WHERE f.id = s.application_id);

ALTER TABLE esmdd.spes
  ADD CONSTRAINT spes_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applicants.spes_form (id) ON DELETE CASCADE;

-- spes_application_id_key (one beneficiary record per form) is kept from 011

CREATE POLICY "applicant_own_spes_select"
ON esmdd.spes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applicants.spes_form f
    WHERE f.id = spes.application_id
      AND f.profile_id = auth.uid()
  )
);


-- ─── 4. Drop esmdd.spes_applicants ─────────────────────────────────────────

DROP TABLE IF EXISTS esmdd.spes_applicants;
