-- =============================================================================
-- Migration: 071_spes_form_document.sql
-- Purpose:   A new SPES requirement, the SPES form (PESO Agusan del Sur's SPES checklist form). Like the
--            NSRP and TUPAD forms, applicants generate it from their saved SPES details
--            (spesProfilingFormHelper.ts) and it is attached as a file:
--              1. applicants.spes_form.has_spes_form — PESO's checklist tick
--              2. public.requirement_templates row (requirement_type 'spes', migration 014), named like
--                 the SPES_DOCUMENT_REQUIREMENTS label in src/types/common/spesForm.ts
--              3. guard_spes_form_review (067): a reviewed application also keeps this tick
-- Schemas:   applicants, public
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Checklist column ────────────────────────────────────────────────────

ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS has_spes_form BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN applicants.spes_form.has_spes_form IS 'The SPES form (generated from the saved details, or on paper) is submitted (071).';


-- ─── 2. Requirement template ────────────────────────────────────────────────

INSERT INTO public.requirement_templates (name, requirement_type, description)
SELECT 'SPES form', 'spes', 'SPES: Generated from the applicant''s SPES details'
WHERE NOT EXISTS (
  SELECT 1 FROM public.requirement_templates r
  WHERE r.requirement_type = 'spes' AND r.name = 'SPES form'
);


-- ─── 3. Review guard (067, plus has_spes_form) ──────────────────────────────

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
    NEW.has_spes_form := OLD.has_spes_form;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
