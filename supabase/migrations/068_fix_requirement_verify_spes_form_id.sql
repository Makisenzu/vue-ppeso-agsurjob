-- =============================================================================
-- Migration: 068_fix_requirement_verify_spes_form_id.sql
-- Purpose:   031's applicants.verify_profile_on_requirement_approval() declared v_spes_form_id as INT,
--            but applicant_requirements.spes_form_id is a UUID (applicants.spes_form.id). Every insert,
--            status change or delete of a SPES requirement row failed with
--              invalid input syntax for type integer: "<spes form uuid>"
--            which blocked applicants from submitting SPES documents (067's application flow).
--            Same function, the variable typed as UUID; behavior is unchanged.
-- Schemas:   applicants
-- Safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION applicants.verify_profile_on_requirement_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_spes_form_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_profile_id := OLD.profile_id;
    v_spes_form_id := OLD.spes_form_id;
  ELSE
    v_profile_id := NEW.profile_id;
    v_spes_form_id := NEW.spes_form_id;
  END IF;

  IF v_profile_id IS NULL OR v_spes_form_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  -- Change must come from staff
  IF NOT EXISTS (
    SELECT 1 FROM core.profiles
    WHERE id = auth.uid()
      AND role::TEXT IN ('admin', 'provincial_peso', 'municipal_peso')
  ) THEN
    RETURN NULL;
  END IF;

  IF applicants.has_all_verification_documents_approved(v_profile_id) THEN
    UPDATE core.profiles
    SET status = 'approved'
    WHERE id = v_profile_id
      AND role::TEXT = 'applicant'
      AND status IS DISTINCT FROM 'approved';
  ELSE
    UPDATE core.profiles
    SET status = 'pending'
    WHERE id = v_profile_id
      AND role::TEXT = 'applicant'
      AND status = 'approved';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
