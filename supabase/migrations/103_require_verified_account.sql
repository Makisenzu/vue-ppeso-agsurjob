-- =============================================================================
-- Migration: 103_require_verified_account.sql
-- Purpose:   Verification rule — accounts must be verified before they take part:
--              - an applicant must have a verified account (core.profiles.status = 'approved',
--                set by 030 once PESO approves the three account documents) before applying to
--                anything: job vacancies, GIP, TUPAD, SPES (new form or re-application);
--              - an employer must have a verified company (employers.companies.verification_status
--                = 'approved', set by PESO / 080) before posting a job vacancy.
--
--            1. applicants.is_verified_account(): the signed-in account is verified.
--            2. applicants.guard_verified_applicant(): BEFORE INSERT on
--                 esmdd.job_vacancy_applications, esmdd.gip_applicants, esmdd.tupad_applicants,
--                 applicants.spes_form, and BEFORE UPDATE on applicants.spes_form while
--                 reapply_spes_form (067) runs.
--            3. esmdd.guard_verified_company_posting(): BEFORE INSERT on esmdd.job_vacancies.
--
--            Only applicant / employer callers are checked: staff encoding records for walk-ins
--            (PESO, admin) and sessions without auth.uid() (migrations, SQL editor, service role)
--            pass. Records made before an account lost its verification (031 / 080) stay
--            editable; only new applications / postings are blocked.
--            Mirrors the client checks (useApplicantVerification, useJobPostingForm).
--
-- Access: triggers only (SECURITY DEFINER to read core.profiles / employers.companies past RLS).
-- Personal data: none new. Notified events: none. Depends on 030, 060, 067, 070, 080, 087. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Is the signed-in account verified ───────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.is_verified_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.profiles
    WHERE id = auth.uid()
      AND status::TEXT = 'approved'
  );
$$;
REVOKE ALL ON FUNCTION applicants.is_verified_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION applicants.is_verified_account() TO authenticated;


-- ─── 2. Applicants: verified account before applying ────────────────────────

CREATE OR REPLACE FUNCTION applicants.guard_verified_applicant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- SPES updates only count while reapply_spes_form() runs (it sets this flag, 067)
  IF TG_OP = 'UPDATE' AND coalesce(current_setting('applicants.spes_reapply', true), 'off') <> 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL
     AND core.has_role('applicant')
     AND NOT applicants.is_verified_account() THEN
    RAISE EXCEPTION 'Verify your account before applying. PESO verifies it once your Application Form, Resume and Birth Certificate are approved.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION applicants.guard_verified_applicant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancy_applications_require_verified ON esmdd.job_vacancy_applications;
CREATE TRIGGER trg_job_vacancy_applications_require_verified
  BEFORE INSERT ON esmdd.job_vacancy_applications
  FOR EACH ROW EXECUTE FUNCTION applicants.guard_verified_applicant();

DROP TRIGGER IF EXISTS trg_gip_applicants_require_verified ON esmdd.gip_applicants;
CREATE TRIGGER trg_gip_applicants_require_verified
  BEFORE INSERT ON esmdd.gip_applicants
  FOR EACH ROW EXECUTE FUNCTION applicants.guard_verified_applicant();

DROP TRIGGER IF EXISTS trg_tupad_applicants_require_verified ON esmdd.tupad_applicants;
CREATE TRIGGER trg_tupad_applicants_require_verified
  BEFORE INSERT ON esmdd.tupad_applicants
  FOR EACH ROW EXECUTE FUNCTION applicants.guard_verified_applicant();

DROP TRIGGER IF EXISTS trg_spes_form_require_verified ON applicants.spes_form;
CREATE TRIGGER trg_spes_form_require_verified
  BEFORE INSERT OR UPDATE ON applicants.spes_form
  FOR EACH ROW EXECUTE FUNCTION applicants.guard_verified_applicant();


-- ─── 3. Employers: verified company before posting a job ────────────────────

CREATE OR REPLACE FUNCTION esmdd.guard_verified_company_posting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT core.has_role('company_owner', 'company_member') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM employers.establishments e
    JOIN employers.companies c ON c.id = e.company_id
    WHERE e.id = NEW.establishment_id
      AND c.verification_status::TEXT = 'approved'
  ) THEN
    RAISE EXCEPTION 'Verify your company before posting a job. PESO verifies it once your company documents are approved.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION esmdd.guard_verified_company_posting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_vacancies_require_verified_company ON esmdd.job_vacancies;
CREATE TRIGGER trg_job_vacancies_require_verified_company
  BEFORE INSERT ON esmdd.job_vacancies
  FOR EACH ROW EXECUTE FUNCTION esmdd.guard_verified_company_posting();

COMMIT;
