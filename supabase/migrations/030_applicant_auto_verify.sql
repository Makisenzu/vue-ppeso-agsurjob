-- =============================================================================
-- Migration: 030_applicant_auto_verify.sql
-- Purpose:   Verify an applicant's account automatically once staff have approved ALL three
--            required documents (REQUIRED_UPLOAD_ORDER in useApplicantProfile.ts):
--
--              Application Form + Resume + Birth Certificate  — all 'approved'
--                ⇒ core.profiles.status = 'approved'   (what useAuth().isVerified reads)
--
-- Rules:
--   * Only account-verification requirements count: SPES attachments (spes_form_id set) and
--     templates outside the legacy applicant types (LEGACY_APPLICANT_REQUIREMENT_TYPES) are ignored.
--   * Template names are matched loosely (case, spaces, '_' and '-' ignored).
--   * Only staff approvals trigger it (admin / provincial_peso / municipal_peso). An applicant who
--     writes 'approved' on their own requirement cannot verify themselves.
--   * Only applicant profiles are touched, and only when not already approved.
--   * Rejecting a document later does NOT un-verify the account (staff change that manually).
--   * SECURITY INVOKER: the profile write runs under the approver's RLS (admin can update
--     core.profiles). A writer without that right only updates the requirement — RLS filters
--     the profile UPDATE to zero rows instead of failing the approval.
-- Schemas:   applicants, core, public
-- Safe to re-run.
-- =============================================================================


-- ─── 1. Helper: has this profile got all three documents approved? ──────────

CREATE OR REPLACE FUNCTION applicants.has_all_verification_documents_approved(p_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COUNT(DISTINCT lower(regexp_replace(t.name, '[\s_-]+', '', 'g'))) = 3
  FROM applicants.applicant_requirements r
  JOIN public.requirement_templates t ON t.id = r.requirement_id
  WHERE r.profile_id = p_profile_id
    AND r.spes_form_id IS NULL
    AND r.status::TEXT = 'approved'
    AND t.requirement_type IN ('applicant_requirements', 'applicant_requirement')
    AND lower(regexp_replace(t.name, '[\s_-]+', '', 'g'))
        IN ('applicationform', 'resume', 'birthcertificate');
$$ LANGUAGE sql STABLE;


-- ─── 2. Trigger function ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.verify_profile_on_requirement_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status::TEXT <> 'approved'
     OR NEW.profile_id IS NULL
     OR NEW.spes_form_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Approver must be staff
  IF NOT EXISTS (
    SELECT 1 FROM core.profiles
    WHERE id = auth.uid()
      AND role::TEXT IN ('admin', 'provincial_peso', 'municipal_peso')
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT applicants.has_all_verification_documents_approved(NEW.profile_id) THEN
    RETURN NEW;
  END IF;

  UPDATE core.profiles
  SET status = 'approved'
  WHERE id = NEW.profile_id
    AND role::TEXT = 'applicant'
    AND status IS DISTINCT FROM 'approved';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applicant_requirements_verify_profile ON applicants.applicant_requirements;
CREATE TRIGGER trg_applicant_requirements_verify_profile
AFTER INSERT OR UPDATE OF status
ON applicants.applicant_requirements
FOR EACH ROW
EXECUTE FUNCTION applicants.verify_profile_on_requirement_approval();


-- ─── 3. Backfill: applicants whose three documents are already approved ─────

UPDATE core.profiles p
SET status = 'approved'
WHERE p.role::TEXT = 'applicant'
  AND p.status IS DISTINCT FROM 'approved'
  AND applicants.has_all_verification_documents_approved(p.id);
