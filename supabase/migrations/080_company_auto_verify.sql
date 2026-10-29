-- =============================================================================
-- Migration: 080_company_auto_verify.sql
-- Purpose:   The company status follows PESO's document review:
--              - approving the last of the mandatory documents verifies the company
--                (companies.verification_status = 'approved');
--              - rejecting a document sends a verified company back to 'pending'.
--            Companies are notified only about their company status, not about each document:
--              - drops trg_employer_requirements_notify_status (079)
-- Schemas:   employers, system
--
-- Mandatory documents: the 'employer_requirements' templates named below. Keep the list in sync
-- with COMPANY_REQUIREMENTS (src/types/employer/companyRequirement.ts).
--
-- A rejected document only re-opens a *verified* company: a company PESO rejected keeps its
-- rejection and remarks. Owners cannot approve or reject their own documents (guard trigger, 079),
-- so this only runs for PESO / admin reviews. The company is notified by
-- trg_companies_notify_verification (053 / 079), which carries the remarks of a rejection.
-- Safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION employers.auto_verify_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_required INT;
  v_missing INT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  -- A rejected document re-opens a verified company
  IF NEW.status = 'rejected' THEN
    UPDATE employers.companies
    SET verification_status = 'pending',
        verification_remarks = NULL
    WHERE id = NEW.employer_id
      AND verification_status = 'approved';
    RETURN NULL;
  END IF;

  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NULL;
  END IF;

  -- Mandatory documents, and how many of them this company has not had approved yet
  SELECT
    count(*),
    count(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM employers.employer_requirements r
        WHERE r.employer_id = NEW.employer_id
          AND r.requirement_id = t.id
          AND r.status = 'approved'
      )
    )
  INTO v_required, v_missing
  FROM public.requirement_templates t
  WHERE t.requirement_type = 'employer_requirements'
    AND t.name IN ('Company Profile', 'BIR Certificate (TIN) / SEC / Mayor''s Permit', 'Order of Payment');

  -- No templates (079 not seeded) must never verify a company
  IF v_required > 0 AND v_missing = 0 THEN
    UPDATE employers.companies
    SET verification_status = 'approved',
        verification_remarks = NULL
    WHERE id = NEW.employer_id
      AND verification_status IS DISTINCT FROM 'approved';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION employers.auto_verify_company() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_employer_requirements_auto_verify ON employers.employer_requirements;
CREATE TRIGGER trg_employer_requirements_auto_verify
AFTER UPDATE OF status ON employers.employer_requirements
FOR EACH ROW EXECUTE FUNCTION employers.auto_verify_company();


-- ─── Companies are notified about their company status only ────────────────

DROP TRIGGER IF EXISTS trg_employer_requirements_notify_status ON employers.employer_requirements;
DROP FUNCTION IF EXISTS system.notify_employer_requirement_status();

COMMIT;
