-- =============================================================================
-- Migration: 031_applicant_auto_unverify.sql
-- Purpose:   Make the applicant account status follow the three verification documents both
--            ways (extends 030_applicant_auto_verify.sql):
--
--              all three approved                     ⇒ core.profiles.status = 'approved'
--              any of them back to pending / rejected ⇒ core.profiles.status = 'pending'
--              (or the requirement row is deleted)       (only if it was 'approved')
--
-- Rules:
--   * Same scope as 030: legacy applicant templates (Application Form, Resume, Birth Certificate),
--     no spes_form_id, staff-only (admin / provincial_peso / municipal_peso), applicant profiles only.
--   * Only an 'approved' profile is reverted, so other manual statuses (e.g. 'inactive') stay.
--   * SECURITY INVOKER, as in 030: the profile write runs under the approver's RLS.
-- Schemas:   applicants, core, public
-- Safe to re-run.
-- =============================================================================


CREATE OR REPLACE FUNCTION applicants.verify_profile_on_requirement_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_spes_form_id INT;
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

DROP TRIGGER IF EXISTS trg_applicant_requirements_verify_profile ON applicants.applicant_requirements;
CREATE TRIGGER trg_applicant_requirements_verify_profile
AFTER INSERT OR UPDATE OF status OR DELETE
ON applicants.applicant_requirements
FOR EACH ROW
EXECUTE FUNCTION applicants.verify_profile_on_requirement_approval();


-- ─── Backfill: applicants verified without all three documents approved ─────

UPDATE core.profiles p
SET status = 'pending'
WHERE p.role::TEXT = 'applicant'
  AND p.status = 'approved'
  AND NOT applicants.has_all_verification_documents_approved(p.id);
