-- =============================================================================
-- Migration: 079_company_requirements_review.sql
-- Purpose:   Companies submit their requirement documents; Provincial PESO reviews each document
--            and the company's verification.
--              1. public.requirement_templates: the three mandatory company documents
--                 (requirement_type 'employer_requirements')
--              2. employers.companies.verification_remarks: why PESO rejected the company
--              3. employers.guard_employer_requirement: owners submit as 'pending' only, without
--                 review remarks; submitted_at is stamped on every (re)submission
--              4. RPC employers.review_employer_requirement(id, status, remarks)
--              5. RPC employers.review_company_verification(company_id, status, remarks)
--              6. Notifications: document status → company owner; company verification now
--                 carries the remarks
-- Schemas:   public, employers, system
--
-- Access Matrix (review):
--   Action                              | admin | provincial_peso | owner                  | others
--   ------------------------------------|-------|-----------------|------------------------|-------
--   submit / replace own requirement    |  yes  |       —         | yes, as 'pending' (034)|  —
--   set a requirement's status          |  yes  |  yes (RPC)      |           —            |  —
--   set the company's verification      |  yes  |  yes (RPC)      |           —            |  —
--
-- Why RPCs instead of UPDATE policies: an UPDATE policy would let PESO rewrite every column of
-- the company / requirement; the RPCs change only status + remarks. Rejected needs remarks
-- (055 / 058 rule, enforced here as well as in the app).
--
-- Storage: files live in the private 'documents' bucket at <owner uid>/employer-requirements/<file>.
-- 034's documents policies already apply (owner manages its folder, Provincial / Municipal PESO
-- read any file), opened by signed URL only (PRIVACY.md rule 4).
-- Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Requirement templates ──────────────────────────────────────────────
-- The app matches these by name (COMPANY_REQUIREMENTS in src/types/employer/companyRequirement.ts)

INSERT INTO public.requirement_templates (name, requirement_type, description, sort_order)
SELECT v.name, 'employer_requirements', v.description, v.sort_order
FROM (VALUES
  ('Company Profile', 'Company profile document', 1),
  ('BIR Certificate (TIN) / SEC / Mayor''s Permit', 'BIR certificate of registration, SEC registration and Mayor''s permit', 2),
  ('Order of Payment', 'Order of payment', 3)
) AS v(name, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.requirement_templates t
  WHERE t.requirement_type = 'employer_requirements' AND t.name = v.name
);


-- ─── 2. Company verification remarks ───────────────────────────────────────

ALTER TABLE employers.companies ADD COLUMN IF NOT EXISTS verification_remarks TEXT;

COMMENT ON COLUMN employers.companies.verification_remarks IS
  'Why PESO rejected the company''s verification (079); required for rejected, cleared otherwise';


-- ─── 3. Guard: owners submit, PESO reviews ─────────────────────────────────

CREATE OR REPLACE FUNCTION employers.guard_employer_requirement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR core.has_role('admin', 'provincial_peso') THEN
    RETURN NEW;
  END IF;

  -- A (re)submission goes back to review and drops the old rejection reason
  NEW.status := 'pending';
  NEW.status_remarks := NULL;
  NEW.submitted_at := now();
  IF TG_OP = 'UPDATE' THEN
    NEW.employer_id := OLD.employer_id;
    NEW.requirement_id := OLD.requirement_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employer_requirements_guard ON employers.employer_requirements;
CREATE TRIGGER trg_employer_requirements_guard
BEFORE INSERT OR UPDATE ON employers.employer_requirements
FOR EACH ROW EXECUTE FUNCTION employers.guard_employer_requirement();

REVOKE ALL ON FUNCTION employers.guard_employer_requirement() FROM PUBLIC, anon, authenticated;


-- ─── 4. RPC: review one requirement ────────────────────────────────────────

CREATE OR REPLACE FUNCTION employers.review_employer_requirement(
  p_requirement_id INT,
  p_status public.status_type,
  p_remarks TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso') THEN
    RAISE EXCEPTION 'Only Provincial PESO can review company documents' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'A document can only be pending, approved or rejected' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'rejected' AND nullif(btrim(p_remarks), '') IS NULL THEN
    RAISE EXCEPTION 'Give the reason for rejecting the document' USING ERRCODE = '22023';
  END IF;

  UPDATE employers.employer_requirements
  SET status = p_status,
      status_remarks = CASE WHEN p_status = 'rejected' THEN btrim(p_remarks) END
  WHERE id = p_requirement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION employers.review_employer_requirement(INT, public.status_type, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.review_employer_requirement(INT, public.status_type, TEXT) TO authenticated;


-- ─── 5. RPC: review the company ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION employers.review_company_verification(
  p_company_id UUID,
  p_status public.status_type,
  p_remarks TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso') THEN
    RAISE EXCEPTION 'Only Provincial PESO can verify companies' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'A company can only be pending, approved or rejected' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'rejected' AND nullif(btrim(p_remarks), '') IS NULL THEN
    RAISE EXCEPTION 'Give the reason for rejecting the company' USING ERRCODE = '22023';
  END IF;

  -- guard_company_verification (034) lets admin / provincial_peso through
  UPDATE employers.companies
  SET verification_status = p_status,
      verification_remarks = CASE WHEN p_status = 'rejected' THEN btrim(p_remarks) END
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION employers.review_company_verification(UUID, public.status_type, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.review_company_verification(UUID, public.status_type, TEXT) TO authenticated;


-- ─── 6. Notifications ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION system.notify_employer_requirement_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner UUID;
  v_name TEXT;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT profile_id INTO v_owner FROM employers.companies WHERE id = NEW.employer_id;
  SELECT coalesce(t.name, t.requirement_type) INTO v_name
  FROM public.requirement_templates t
  WHERE t.id = NEW.requirement_id;
  v_name := coalesce(v_name, 'document');

  v_message := CASE NEW.status::TEXT
    WHEN 'approved' THEN 'Your ' || v_name || ' has been approved.'
    WHEN 'rejected' THEN 'Your ' || v_name || ' was rejected. Please upload a new copy.'
    WHEN 'pending'  THEN 'Your ' || v_name || ' is back under review.'
    ELSE 'Your ' || v_name || ' status is now ' || NEW.status::TEXT || '.'
  END;

  -- system.notify skips the caller, so an owner's own re-submission sends nothing
  PERFORM system.notify(
    v_owner, 'document_status', 'Document Status Update', v_message,
    system.status_remarks(NEW.status::TEXT, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION system.notify_employer_requirement_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_employer_requirements_notify_status ON employers.employer_requirements;
CREATE TRIGGER trg_employer_requirements_notify_status
AFTER UPDATE OF status ON employers.employer_requirements
FOR EACH ROW EXECUTE FUNCTION system.notify_employer_requirement_status();

-- Same messages as 053, now with the rejection reason
CREATE OR REPLACE FUNCTION system.notify_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status OR NEW.verification_status IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM system.notify(
    NEW.profile_id,
    'account_status',
    'Company Verification Update',
    CASE NEW.verification_status::TEXT
      WHEN 'approved' THEN coalesce(NEW.company_name, 'Your company') || ' has been verified.'
      WHEN 'rejected' THEN 'The verification of ' || coalesce(NEW.company_name, 'your company') || ' was not approved. Please review your details.'
      ELSE 'The verification status of ' || coalesce(NEW.company_name, 'your company') || ' is now ' || NEW.verification_status::TEXT || '.'
    END,
    system.status_remarks(NEW.verification_status::TEXT, NEW.verification_remarks)
  );
  RETURN NULL;
END;
$$;

COMMIT;
