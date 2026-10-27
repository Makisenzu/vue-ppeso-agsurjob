-- =============================================================================
-- Migration: 072_spes_requirements_update.sql
-- Purpose:   The SPES requirements follow PESO's SPES form checklist (spesProfilingFormHelper.ts):
--              Application letter, Resume, SPES form (071), Passport size ID picture,
--              Clear copy of birth certificate, Proof of family income, First semester grades
--              1. applicants.spes_form: has_application_letter, has_resume, has_passport_photo
--              2. public.requirement_templates (requirement_type 'spes', 014): the new requirements, and
--                 two renamed to the checklist's wording. Names match the SPES_DOCUMENT_REQUIREMENTS
--                 labels in src/types/common/spesForm.ts (matched case-insensitively)
--              3. guard_spes_form_review (067 / 071): a reviewed application also keeps the new ticks
--            The registrar and out-of-school youth certifications are no longer asked for; their
--            columns and any files already attached are kept.
-- Schemas:   applicants, public
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Checklist columns ───────────────────────────────────────────────────

ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS has_application_letter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS has_resume BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE applicants.spes_form ADD COLUMN IF NOT EXISTS has_passport_photo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN applicants.spes_form.has_application_letter IS 'Application letter to the Provincial Governor is submitted (072).';
COMMENT ON COLUMN applicants.spes_form.has_resume IS 'Resume is submitted (072).';
COMMENT ON COLUMN applicants.spes_form.has_passport_photo IS 'Passport size ID picture is submitted (072).';


-- ─── 2. Requirement templates ───────────────────────────────────────────────

UPDATE public.requirement_templates
SET name = 'Clear copy of birth certificate'
WHERE requirement_type = 'spes' AND name = 'Birth certificate';

UPDATE public.requirement_templates
SET name = 'First semester grades',
    description = 'SPES: Certificate of passing grades, report card or Form 138 with the general average'
WHERE requirement_type = 'spes' AND name = 'Proof of passing grades';

INSERT INTO public.requirement_templates (name, requirement_type, description)
SELECT t.name, 'spes', t.description
FROM (VALUES
  ('Application letter', 'SPES: Addressed to the Provincial Governor'),
  ('Resume', 'SPES: The applicant''s resume'),
  ('Passport size ID picture', 'SPES: Uploaded, or the applicant''s profile picture')
) AS t (name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.requirement_templates r
  WHERE r.requirement_type = 'spes' AND r.name = t.name
);


-- ─── 3. Review guard (071, plus the new ticks) ──────────────────────────────

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
    NEW.has_application_letter := OLD.has_application_letter;
    NEW.has_resume := OLD.has_resume;
    NEW.has_passport_photo := OLD.has_passport_photo;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
