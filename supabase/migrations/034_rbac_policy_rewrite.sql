-- =============================================================================
-- Migration: 034_rbac_policy_rewrite.sql
-- Purpose:   Rewrite every Row Level Security policy of the app tables and the storage buckets
--            around one role model (core.profiles.role). Every existing policy on a managed
--            table is dropped first, including ones created outside these migrations, so the
--            rules below are the complete access list for each table.
--
-- Roles:
--   admin            full access to every table and bucket (audit logs: read only)
--   provincial_peso  full access to PESO program data (registry, SPES, GIP, TUPAD, job fairs,
--                    HOTS, job postings, referrals, OCR); reads accounts and companies
--   municipal_peso   reads PESO program data; updates the applicant registry; manages
--                    applicant requirement documents; manages job postings and referrals
--   dole             reads PESO program data, applicants and companies; manages job postings
--   company_owner    own company (profile_id), its members, its requirements, its job fair
--                    participation and HOTS hires
--   company_member   reads the company it belongs to (employers.company_members)
--   applicant        own account, own NSRP record and documents, own SPES / GIP / TUPAD /
--                    job fair / HOTS rows; reads job fairs, job postings and reference data
--   anon             no table access (login / signup only call check_if_email_exists)
--
-- Not owner-scoped yet:
--   public.job_posting.employer_id is int4 while employers.companies.id is uuid, and
--   jobs.job_applications / jobs.referrals.applicant_id are int4 while applicants.applicants.id
--   is uuid, so companies and applicants cannot own those rows. They stay staff-managed until
--   the columns are migrated to uuid.
--
-- Unchanged: the role / status guard on core.profiles (033), the SPES review guard (012) and the
-- other triggers. Added: a guard that keeps employers.companies.verification_status staff-only.
--
-- Tables missing from this database are skipped with a NOTICE. Safe to re-run.
-- Schemas:   core, applicants, employers, esmdd, jobs, public, system, storage
-- =============================================================================


-- ─── 1. Role and ownership helpers ──────────────────────────────────────────
-- SECURITY DEFINER so policies can check roles / ownership without running into the RLS of
-- core.profiles, applicants.applicants or employers.* (and without policy recursion between
-- companies and company_members).

CREATE OR REPLACE FUNCTION core.has_role(VARIADIC p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.profiles
    WHERE id = auth.uid()
      AND role::TEXT = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION applicants.owns_applicant(p_applicant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applicants.applicants
    WHERE id = p_applicant_id
      AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION employers.is_company_owner(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employers.companies
    WHERE id = p_company_id
      AND profile_id = auth.uid()
  );
$$;

-- Owner, or an active / approved row in company_members
CREATE OR REPLACE FUNCTION employers.is_company_member(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT employers.is_company_owner(p_company_id)
      OR EXISTS (
        SELECT 1 FROM employers.company_members
        WHERE company_id = p_company_id
          AND profile_id = auth.uid()
          AND COALESCE(status::TEXT, 'active') IN ('active', 'approved')
      );
$$;

REVOKE ALL ON FUNCTION core.has_role(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION applicants.owns_applicant(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.is_company_owner(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.is_company_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION applicants.owns_applicant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION employers.is_company_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION employers.is_company_member(UUID) TO authenticated;


-- ─── 2. Migration-only helpers (pg_temp, gone after this session) ───────────

-- Drops every policy on the table, enables RLS, removes anon access, gives authenticated the
-- table privileges (RLS decides the rows) and adds the admin policy.
CREATE OR REPLACE FUNCTION pg_temp.reset_table(p_table TEXT, p_admin_all BOOLEAN DEFAULT true)
RETURNS VOID
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_rel REGCLASS := to_regclass(p_table);
  v_policy NAME;
BEGIN
  IF v_rel IS NULL THEN
    RAISE NOTICE 'Skipping %: table not found.', p_table;
    RETURN;
  END IF;

  FOR v_policy IN SELECT polname FROM pg_policy WHERE polrelid = v_rel LOOP
    EXECUTE format('DROP POLICY %I ON %s', v_policy, v_rel);
  END LOOP;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', v_rel);
  EXECUTE format('REVOKE ALL ON %s FROM anon', v_rel);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO authenticated', v_rel);

  IF p_admin_all THEN
    EXECUTE format(
      'CREATE POLICY admin_all ON %s FOR ALL TO authenticated '
      'USING ((SELECT core.has_role(''admin''))) WITH CHECK ((SELECT core.has_role(''admin'')))',
      v_rel
    );
  END IF;
END;
$fn$;

-- p_cmd: ALL | SELECT | INSERT | UPDATE | DELETE. For INSERT, p_using is the WITH CHECK.
-- For ALL / UPDATE, p_check defaults to p_using.
CREATE OR REPLACE FUNCTION pg_temp.add_policy(
  p_table TEXT,
  p_name TEXT,
  p_cmd TEXT,
  p_using TEXT,
  p_check TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_rel REGCLASS := to_regclass(p_table);
  v_sql TEXT;
BEGIN
  IF v_rel IS NULL THEN
    RETURN;
  END IF;

  v_sql := format('CREATE POLICY %I ON %s FOR %s TO authenticated', p_name, v_rel, p_cmd);

  IF p_cmd = 'INSERT' THEN
    v_sql := v_sql || format(' WITH CHECK (%s)', COALESCE(p_check, p_using));
  ELSE
    v_sql := v_sql || format(' USING (%s)', p_using);
    IF p_cmd IN ('ALL', 'UPDATE') THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', COALESCE(p_check, p_using));
    END IF;
  END IF;

  EXECUTE v_sql;
END;
$fn$;


-- ─── 3. Schema and sequence privileges ──────────────────────────────────────

DO $$
DECLARE
  v_schema TEXT;
BEGIN
  FOREACH v_schema IN ARRAY ARRAY['core', 'applicants', 'employers', 'esmdd', 'jobs', 'public', 'system'] LOOP
    IF to_regnamespace(v_schema) IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', v_schema);
      EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO authenticated', v_schema);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon', v_schema);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I REVOKE ALL ON TABLES FROM anon', v_schema);
    END IF;
  END LOOP;
END;
$$;

GRANT SELECT ON esmdd.gip_applicant_priority_scores TO authenticated;


-- ─── 4. core ────────────────────────────────────────────────────────────────

-- profiles: own row; PESO reads all and updates applicant accounts (needed by the 030 / 031
-- auto-verify triggers, which run under the approver's RLS). Role / status changes stay
-- blocked by trg_profiles_guard_privileged_columns (033).
SELECT pg_temp.reset_table('core.profiles');
SELECT pg_temp.add_policy('core.profiles', 'self_select', 'SELECT', $q$id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('core.profiles', 'self_insert', 'INSERT', $q$id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('core.profiles', 'self_update', 'UPDATE', $q$id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('core.profiles', 'peso_select', 'SELECT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);
SELECT pg_temp.add_policy('core.profiles', 'peso_update_applicants', 'UPDATE',
  $q$role::TEXT = 'applicant' AND (SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);

SELECT pg_temp.reset_table('core.profile_media');
SELECT pg_temp.add_policy('core.profile_media', 'self_all', 'ALL', $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('core.profile_media', 'peso_select', 'SELECT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);

-- Social links are shown on profile pages, so every signed-in user may read them
SELECT pg_temp.reset_table('core.profile_socials');
SELECT pg_temp.add_policy('core.profile_socials', 'authenticated_select', 'SELECT', $q$true$q$);
SELECT pg_temp.add_policy('core.profile_socials', 'self_insert', 'INSERT', $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('core.profile_socials', 'self_update', 'UPDATE', $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('core.profile_socials', 'self_delete', 'DELETE', $q$profile_id = (SELECT auth.uid())$q$);

SELECT pg_temp.reset_table('core.biometrics');
SELECT pg_temp.add_policy('core.biometrics', 'self_all', 'ALL', $q$user_id = (SELECT auth.uid())$q$);


-- ─── 5. applicants ──────────────────────────────────────────────────────────

-- NSRP registry: applicants own their record; Provincial PESO manages it (walk-in entry,
-- GIP / SPES / TUPAD referrals); Municipal PESO reads and updates; DOLE reads.
SELECT pg_temp.reset_table('applicants.applicants');
SELECT pg_temp.add_policy('applicants.applicants', 'applicant_own_select', 'SELECT',
  $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('applicants.applicants', 'applicant_own_insert', 'INSERT',
  $q$profile_id = (SELECT auth.uid()) AND (SELECT core.has_role('applicant'))$q$);
SELECT pg_temp.add_policy('applicants.applicants', 'applicant_own_update', 'UPDATE',
  $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('applicants.applicants', 'provincial_peso_all', 'ALL',
  $q$(SELECT core.has_role('provincial_peso'))$q$);
SELECT pg_temp.add_policy('applicants.applicants', 'municipal_peso_update', 'UPDATE',
  $q$(SELECT core.has_role('municipal_peso'))$q$);
SELECT pg_temp.add_policy('applicants.applicants', 'oversight_select', 'SELECT',
  $q$(SELECT core.has_role('municipal_peso', 'dole'))$q$);

-- Profile sub-records keyed by profile_id
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['applicants.applicant_experiences', 'applicants.applicant_skills'] LOOP
    PERFORM pg_temp.reset_table(t);
    PERFORM pg_temp.add_policy(t, 'applicant_own_all', 'ALL', $q$profile_id = (SELECT auth.uid())$q$);
    PERFORM pg_temp.add_policy(t, 'provincial_peso_all', 'ALL', $q$(SELECT core.has_role('provincial_peso'))$q$);
    PERFORM pg_temp.add_policy(t, 'oversight_select', 'SELECT', $q$(SELECT core.has_role('municipal_peso', 'dole'))$q$);
  END LOOP;
END;
$$;

SELECT pg_temp.reset_table('applicants.applicant_skill_media');
SELECT pg_temp.add_policy('applicants.applicant_skill_media', 'applicant_own_all', 'ALL',
  $q$EXISTS (
    SELECT 1 FROM applicants.applicant_skills s
    WHERE s.id = applicant_skill_media.applicant_skill_id
      AND s.profile_id = (SELECT auth.uid())
  )$q$);
SELECT pg_temp.add_policy('applicants.applicant_skill_media', 'provincial_peso_all', 'ALL',
  $q$(SELECT core.has_role('provincial_peso'))$q$);
SELECT pg_temp.add_policy('applicants.applicant_skill_media', 'oversight_select', 'SELECT',
  $q$(SELECT core.has_role('municipal_peso', 'dole'))$q$);

-- SPES application form: applicants read their own and write while it is unreviewed
-- (applicants.guard_spes_form_review keeps status / remarks staff-only).
SELECT pg_temp.reset_table('applicants.spes_form');
SELECT pg_temp.add_policy('applicants.spes_form', 'applicant_own_select', 'SELECT',
  $q$profile_id = (SELECT auth.uid())
     OR (applicant_id IS NOT NULL AND (SELECT applicants.owns_applicant(applicant_id)))$q$);
SELECT pg_temp.add_policy('applicants.spes_form', 'applicant_own_insert', 'INSERT',
  $q$profile_id = (SELECT auth.uid()) AND (SELECT core.has_role('applicant'))$q$);
SELECT pg_temp.add_policy('applicants.spes_form', 'applicant_own_update', 'UPDATE',
  $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('applicants.spes_form', 'provincial_peso_all', 'ALL',
  $q$(SELECT core.has_role('provincial_peso'))$q$);
SELECT pg_temp.add_policy('applicants.spes_form', 'oversight_select', 'SELECT',
  $q$(SELECT core.has_role('municipal_peso', 'dole'))$q$);

-- Requirement documents. Applicants write account documents (no spes_form_id) only as
-- 'pending', so they cannot approve themselves; SPES documents follow migration 017.
SELECT pg_temp.reset_table('applicants.applicant_requirements');
SELECT pg_temp.add_policy('applicants.applicant_requirements', 'applicant_own_account_docs', 'ALL',
  $q$spes_form_id IS NULL AND profile_id = (SELECT auth.uid())$q$,
  $q$spes_form_id IS NULL AND profile_id = (SELECT auth.uid())
     AND COALESCE(status::TEXT, 'pending') = 'pending'$q$);
SELECT pg_temp.add_policy('applicants.applicant_requirements', 'applicant_own_spes_docs', 'ALL',
  $q$spes_form_id IS NOT NULL AND applicants.owns_spes_form(spes_form_id)$q$,
  $q$spes_form_id IS NOT NULL AND applicants.can_edit_spes_form(spes_form_id)
     AND COALESCE(status::TEXT, 'pending') = 'pending'$q$);
SELECT pg_temp.add_policy('applicants.applicant_requirements', 'peso_all', 'ALL',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);
SELECT pg_temp.add_policy('applicants.applicant_requirements', 'dole_select', 'SELECT',
  $q$(SELECT core.has_role('dole'))$q$);

SELECT pg_temp.reset_table('applicants.applicant_requirement_media');
SELECT pg_temp.add_policy('applicants.applicant_requirement_media', 'applicant_own_account_docs', 'ALL',
  $q$EXISTS (
    SELECT 1 FROM applicants.applicant_requirements r
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND r.spes_form_id IS NULL
      AND r.profile_id = (SELECT auth.uid())
  )$q$);
SELECT pg_temp.add_policy('applicants.applicant_requirement_media', 'applicant_own_spes_docs', 'ALL',
  $q$EXISTS (
    SELECT 1 FROM applicants.applicant_requirements r
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND r.spes_form_id IS NOT NULL
      AND applicants.owns_spes_form(r.spes_form_id)
  )$q$,
  $q$EXISTS (
    SELECT 1 FROM applicants.applicant_requirements r
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND r.spes_form_id IS NOT NULL
      AND applicants.can_edit_spes_form(r.spes_form_id)
  )$q$);
SELECT pg_temp.add_policy('applicants.applicant_requirement_media', 'peso_all', 'ALL',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);
SELECT pg_temp.add_policy('applicants.applicant_requirement_media', 'dole_select', 'SELECT',
  $q$(SELECT core.has_role('dole'))$q$);


-- ─── 6. employers ───────────────────────────────────────────────────────────

SELECT pg_temp.reset_table('employers.companies');
SELECT pg_temp.add_policy('employers.companies', 'owner_select', 'SELECT', $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('employers.companies', 'owner_insert', 'INSERT',
  $q$profile_id = (SELECT auth.uid()) AND (SELECT core.has_role('company_owner'))$q$);
SELECT pg_temp.add_policy('employers.companies', 'owner_update', 'UPDATE', $q$profile_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('employers.companies', 'member_select', 'SELECT', $q$employers.is_company_member(id)$q$);
SELECT pg_temp.add_policy('employers.companies', 'staff_select', 'SELECT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole'))$q$);

SELECT pg_temp.reset_table('employers.company_members');
SELECT pg_temp.add_policy('employers.company_members', 'owner_all', 'ALL', $q$employers.is_company_owner(company_id)$q$);
SELECT pg_temp.add_policy('employers.company_members', 'member_select', 'SELECT', $q$employers.is_company_member(company_id)$q$);
SELECT pg_temp.add_policy('employers.company_members', 'staff_select', 'SELECT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole'))$q$);

-- Accreditation documents: the owner submits them as 'pending'; admin reviews (admin_all)
SELECT pg_temp.reset_table('employers.employer_requirements');
SELECT pg_temp.add_policy('employers.employer_requirements', 'owner_all', 'ALL',
  $q$employers.is_company_owner(employer_id)$q$,
  $q$employers.is_company_owner(employer_id) AND COALESCE(status::TEXT, 'pending') = 'pending'$q$);
SELECT pg_temp.add_policy('employers.employer_requirements', 'member_select', 'SELECT',
  $q$employers.is_company_member(employer_id)$q$);
SELECT pg_temp.add_policy('employers.employer_requirements', 'staff_select', 'SELECT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole'))$q$);

SELECT pg_temp.reset_table('employers.employer_requirement_files');
SELECT pg_temp.add_policy('employers.employer_requirement_files', 'owner_all', 'ALL',
  $q$EXISTS (
    SELECT 1 FROM employers.employer_requirements r
    WHERE r.id = employer_requirement_files.employer_requirement_id
      AND employers.is_company_owner(r.employer_id)
  )$q$);
SELECT pg_temp.add_policy('employers.employer_requirement_files', 'member_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM employers.employer_requirements r
    WHERE r.id = employer_requirement_files.employer_requirement_id
      AND employers.is_company_member(r.employer_id)
  )$q$);
SELECT pg_temp.add_policy('employers.employer_requirement_files', 'staff_select', 'SELECT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole'))$q$);

-- Only admin / Provincial PESO decide a company's verification. Others: new companies start
-- 'pending' and updates keep the current value.
CREATE OR REPLACE FUNCTION employers.guard_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR session_user IN ('postgres', 'supabase_admin')
     OR core.has_role('admin', 'provincial_peso') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
  ELSE
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('employers.companies') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_companies_guard_verification ON employers.companies;
    CREATE TRIGGER trg_companies_guard_verification
    BEFORE INSERT OR UPDATE ON employers.companies
    FOR EACH ROW
    EXECUTE FUNCTION employers.guard_company_verification();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION employers.guard_company_verification() FROM PUBLIC, anon, authenticated;


-- ─── 7. esmdd (PESO programs) ───────────────────────────────────────────────
-- Every program table: Provincial PESO full access, Municipal PESO / DOLE read.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'esmdd.job_fairs', 'esmdd.job_vacancies', 'esmdd.job_fair_attachments',
    'esmdd.job_fair_participants', 'esmdd.job_fair_applicants', 'esmdd.hots',
    'esmdd.gip_applicants', 'esmdd.gips', 'esmdd.gip_appointments',
    'esmdd.spes', 'esmdd.spes_appointments', 'esmdd.spes_completion_reports',
    'esmdd.tupad_applicants', 'esmdd.tupad_batch', 'esmdd.tupad', 'esmdd.tupad_attachments',
    'esmdd.tupad_applicant_documents'
  ] LOOP
    PERFORM pg_temp.reset_table(t);
    PERFORM pg_temp.add_policy(t, 'provincial_peso_all', 'ALL', $q$(SELECT core.has_role('provincial_peso'))$q$);
    PERFORM pg_temp.add_policy(t, 'oversight_select', 'SELECT', $q$(SELECT core.has_role('municipal_peso', 'dole'))$q$);
  END LOOP;
END;
$$;

-- Job fair events, vacancies and their files are listed to every signed-in user
SELECT pg_temp.add_policy('esmdd.job_fairs', 'authenticated_select', 'SELECT', $q$true$q$);
SELECT pg_temp.add_policy('esmdd.job_vacancies', 'authenticated_select', 'SELECT', $q$true$q$);
SELECT pg_temp.add_policy('esmdd.job_fair_attachments', 'authenticated_select', 'SELECT', $q$true$q$);

-- Companies see their own job fair registrations and the hires made at their booths
SELECT pg_temp.add_policy('esmdd.job_fair_participants', 'company_select', 'SELECT',
  $q$company_id IS NOT NULL AND employers.is_company_member(company_id)$q$);
SELECT pg_temp.add_policy('esmdd.hots', 'company_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.job_fair_participants p
    WHERE p.id = hots.participant_id
      AND p.company_id IS NOT NULL
      AND employers.is_company_member(p.company_id)
  )$q$);

-- Applicants read their own program rows
SELECT pg_temp.add_policy('esmdd.job_fair_applicants', 'applicant_own_select', 'SELECT',
  $q$applicants.owns_applicant(applicant_id)$q$);
SELECT pg_temp.add_policy('esmdd.hots', 'applicant_own_select', 'SELECT',
  $q$applicant_profile_id = (SELECT auth.uid())
     OR (applicant_id IS NOT NULL AND applicants.owns_applicant(applicant_id))$q$);

SELECT pg_temp.add_policy('esmdd.gip_applicants', 'applicant_own_select', 'SELECT',
  $q$applicants.owns_applicant(applicant_id)$q$);
SELECT pg_temp.add_policy('esmdd.gips', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.gip_applicants g
    WHERE g.id = gips.application_id
      AND applicants.owns_applicant(g.applicant_id)
  )$q$);
SELECT pg_temp.add_policy('esmdd.gip_appointments', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.gips g
    JOIN esmdd.gip_applicants ga ON ga.id = g.application_id
    WHERE g.id = gip_appointments.gip_id
      AND applicants.owns_applicant(ga.applicant_id)
  )$q$);

SELECT pg_temp.add_policy('esmdd.spes', 'applicant_own_select', 'SELECT',
  $q$application_id IS NOT NULL AND applicants.owns_spes_form(application_id)$q$);
SELECT pg_temp.add_policy('esmdd.spes_appointments', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.spes s
    WHERE s.id = spes_appointments.spes_id
      AND applicants.owns_spes_form(s.application_id)
  )$q$);

-- SPES beneficiaries upload their DTR / accomplishment report while the appointment is Active
SELECT pg_temp.add_policy('esmdd.spes_completion_reports', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.spes_appointments a
    JOIN esmdd.spes s ON s.id = a.spes_id
    WHERE a.id = spes_completion_reports.appointment_id
      AND applicants.owns_spes_form(s.application_id)
  )$q$);
SELECT pg_temp.add_policy('esmdd.spes_completion_reports', 'applicant_own_write', 'ALL',
  $q$EXISTS (
    SELECT 1 FROM esmdd.spes_appointments a
    JOIN esmdd.spes s ON s.id = a.spes_id
    WHERE a.id = spes_completion_reports.appointment_id
      AND a.status = 'Active'
      AND applicants.owns_spes_form(s.application_id)
  )$q$,
  $q$uploaded_by = (SELECT auth.uid())
     AND split_part(path, '/', 1) = (SELECT auth.uid())::TEXT
     AND EXISTS (
       SELECT 1 FROM esmdd.spes_appointments a
       JOIN esmdd.spes s ON s.id = a.spes_id
       WHERE a.id = spes_completion_reports.appointment_id
         AND a.status = 'Active'
         AND applicants.owns_spes_form(s.application_id)
     )$q$);

-- TUPAD: applicants fill in their own application while it is Pending and not in a batch
SELECT pg_temp.add_policy('esmdd.tupad_applicants', 'applicant_own_select', 'SELECT',
  $q$applicants.owns_applicant(applicant_id)$q$);
SELECT pg_temp.add_policy('esmdd.tupad_applicants', 'applicant_own_update', 'UPDATE',
  $q$esmdd.can_edit_own_tupad_application(id)$q$,
  $q$status = 'Pending' AND applicants.owns_applicant(applicant_id)$q$);
SELECT pg_temp.add_policy('esmdd.tupad', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.tupad_applicants ta
    WHERE ta.id = tupad.tupad_applicant_id
      AND applicants.owns_applicant(ta.applicant_id)
  )$q$);
SELECT pg_temp.add_policy('esmdd.tupad_batch', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.tupad t
    JOIN esmdd.tupad_applicants ta ON ta.id = t.tupad_applicant_id
    WHERE t.batch_id = tupad_batch.id
      AND applicants.owns_applicant(ta.applicant_id)
  )$q$);
SELECT pg_temp.add_policy('esmdd.tupad_attachments', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.tupad t
    JOIN esmdd.tupad_applicants ta ON ta.id = t.tupad_applicant_id
    WHERE t.id = tupad_attachments.tupad_id
      AND applicants.owns_applicant(ta.applicant_id)
  )$q$);
SELECT pg_temp.add_policy('esmdd.tupad_applicant_documents', 'applicant_own_select', 'SELECT',
  $q$EXISTS (
    SELECT 1 FROM esmdd.tupad_applicants ta
    WHERE ta.id = tupad_applicant_documents.tupad_applicant_id
      AND applicants.owns_applicant(ta.applicant_id)
  )$q$);
SELECT pg_temp.add_policy('esmdd.tupad_applicant_documents', 'applicant_own_write', 'ALL',
  $q$esmdd.can_edit_own_tupad_application(tupad_applicant_id)$q$,
  $q$uploaded_by = (SELECT auth.uid())
     AND split_part(path, '/', 1) = (SELECT auth.uid())::TEXT
     AND esmdd.can_edit_own_tupad_application(tupad_applicant_id)$q$);


-- ─── 8. jobs (not owner-scoped yet, see header) ─────────────────────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jobs.job_applications', 'jobs.job_application_attachments',
    'jobs.job_interview_schedules', 'jobs.referrals'
  ] LOOP
    PERFORM pg_temp.reset_table(t);
    PERFORM pg_temp.add_policy(t, 'peso_all', 'ALL', $q$(SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);
    PERFORM pg_temp.add_policy(t, 'dole_select', 'SELECT', $q$(SELECT core.has_role('dole'))$q$);
  END LOOP;
END;
$$;


-- ─── 9. public ──────────────────────────────────────────────────────────────

-- Reference data: read by every signed-in user, written by admin
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.regions', 'public.provinces', 'public.municipalities', 'public.barangays',
    'public.directories', 'public.requirement_templates'
  ] LOOP
    PERFORM pg_temp.reset_table(t);
    PERFORM pg_temp.add_policy(t, 'authenticated_select', 'SELECT', $q$true$q$);
  END LOOP;
END;
$$;

-- applicantRequirementUploadService creates a template when an upload label has none
SELECT pg_temp.add_policy('public.requirement_templates', 'uploader_insert', 'INSERT',
  $q$(SELECT core.has_role('applicant', 'provincial_peso', 'municipal_peso'))$q$);

SELECT pg_temp.reset_table('public.document_templates');
SELECT pg_temp.add_policy('public.document_templates', 'authenticated_select_active', 'SELECT',
  $q$is_active IS TRUE$q$);

-- Job postings: listed to every signed-in user, managed by PESO / DOLE
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.job_posting', 'public.job_posting_media', 'public.job_requirements',
    'public.job_posting_attachments'
  ] LOOP
    PERFORM pg_temp.reset_table(t);
    PERFORM pg_temp.add_policy(t, 'authenticated_select', 'SELECT', $q$true$q$);
    PERFORM pg_temp.add_policy(t, 'staff_all', 'ALL', $q$(SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole'))$q$);
  END LOOP;
END;
$$;

-- OCR results (033): Provincial PESO + admin
SELECT pg_temp.reset_table('public.applicant_forms');
SELECT pg_temp.add_policy('public.applicant_forms', 'provincial_peso_all', 'ALL',
  $q$(SELECT core.has_role('provincial_peso'))$q$);


-- ─── 10. system ─────────────────────────────────────────────────────────────

SELECT pg_temp.reset_table('system.notifications');
SELECT pg_temp.add_policy('system.notifications', 'recipient_select', 'SELECT', $q$recipient_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('system.notifications', 'recipient_update', 'UPDATE', $q$recipient_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('system.notifications', 'recipient_delete', 'DELETE', $q$recipient_id = (SELECT auth.uid())$q$);
SELECT pg_temp.add_policy('system.notifications', 'peso_insert', 'INSERT',
  $q$(SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);

-- Audit trail: admin reads, nobody edits from the client
SELECT pg_temp.reset_table('system.system_audit_logs', false);
SELECT pg_temp.add_policy('system.system_audit_logs', 'admin_select', 'SELECT', $q$(SELECT core.has_role('admin'))$q$);


-- ─── 11. storage.objects ────────────────────────────────────────────────────
-- Drops every policy that names one of these buckets, and every policy with no bucket filter
-- (those apply to all buckets). Policies for other buckets are kept and reported.

DO $$
DECLARE
  v_buckets TEXT[] := ARRAY[
    'documents', 'media', 'templates', 'applicant-forms',
    'job-posting-attachments', 'job-fair-attachments'
  ];
  v_policy RECORD;
  v_text TEXT;
BEGIN
  FOR v_policy IN
    SELECT polname,
           COALESCE(pg_get_expr(polqual, polrelid), '') || ' ' ||
           COALESCE(pg_get_expr(polwithcheck, polrelid), '') AS expr
    FROM pg_policy
    WHERE polrelid = 'storage.objects'::REGCLASS
  LOOP
    v_text := v_policy.expr;
    IF v_text NOT LIKE '%bucket_id%'
       OR EXISTS (SELECT 1 FROM unnest(v_buckets) b WHERE v_text LIKE '%''' || b || '''%') THEN
      EXECUTE format('DROP POLICY %I ON storage.objects', v_policy.polname);
    ELSE
      RAISE NOTICE 'Kept storage policy % (other bucket).', v_policy.polname;
    END IF;
  END LOOP;
END;
$$;

SELECT pg_temp.add_policy('storage.objects', 'admin_all_app_buckets', 'ALL',
  $q$bucket_id IN ('documents', 'media', 'templates', 'applicant-forms', 'job-posting-attachments', 'job-fair-attachments')
     AND (SELECT core.has_role('admin'))$q$);

-- documents (private): each user owns <uid>/...; PESO reads and removes any file and uploads
-- into its own folder; a user may also open a file linked to a row they can read (PESO uploads
-- for their SPES / TUPAD / requirement records sit in the staff member's folder).
SELECT pg_temp.add_policy('storage.objects', 'documents_owner_all', 'ALL',
  $q$bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT$q$);
SELECT pg_temp.add_policy('storage.objects', 'documents_peso_select', 'SELECT',
  $q$bucket_id = 'documents' AND (SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);
SELECT pg_temp.add_policy('storage.objects', 'documents_peso_delete', 'DELETE',
  $q$bucket_id = 'documents' AND (SELECT core.has_role('provincial_peso', 'municipal_peso'))$q$);
SELECT pg_temp.add_policy('storage.objects', 'documents_linked_select', 'SELECT',
  $q$bucket_id = 'documents' AND (
     EXISTS (SELECT 1 FROM applicants.applicant_requirement_media m WHERE m.path = objects.name)
     OR EXISTS (SELECT 1 FROM esmdd.spes_completion_reports r WHERE r.path = objects.name)
     OR EXISTS (SELECT 1 FROM esmdd.tupad_applicant_documents d WHERE d.path = objects.name)
   )$q$);

-- media (avatars / images): any signed-in user reads; users write their own <uid>/ folder
SELECT pg_temp.add_policy('storage.objects', 'media_authenticated_select', 'SELECT',
  $q$bucket_id = 'media'$q$);
SELECT pg_temp.add_policy('storage.objects', 'media_owner_insert', 'INSERT',
  $q$bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT$q$);
SELECT pg_temp.add_policy('storage.objects', 'media_owner_update', 'UPDATE',
  $q$bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT$q$);
SELECT pg_temp.add_policy('storage.objects', 'media_owner_delete', 'DELETE',
  $q$bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT$q$);

-- templates: any signed-in user downloads; admin manages (admin_all_app_buckets)
SELECT pg_temp.add_policy('storage.objects', 'templates_authenticated_select', 'SELECT',
  $q$bucket_id = 'templates'$q$);

-- applicant-forms (OCR scans): Provincial PESO
SELECT pg_temp.add_policy('storage.objects', 'applicant_forms_provincial_peso_all', 'ALL',
  $q$bucket_id = 'applicant-forms' AND (SELECT core.has_role('provincial_peso'))$q$);

-- job-posting-attachments: any signed-in user reads; PESO / DOLE write in their own folder
SELECT pg_temp.add_policy('storage.objects', 'job_posting_attachments_authenticated_select', 'SELECT',
  $q$bucket_id = 'job-posting-attachments'$q$);
SELECT pg_temp.add_policy('storage.objects', 'job_posting_attachments_staff_write', 'ALL',
  $q$bucket_id = 'job-posting-attachments'
     AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
     AND (SELECT core.has_role('provincial_peso', 'municipal_peso', 'dole'))$q$);

-- job-fair-attachments: any signed-in user reads; Provincial PESO manages
SELECT pg_temp.add_policy('storage.objects', 'job_fair_attachments_authenticated_select', 'SELECT',
  $q$bucket_id = 'job-fair-attachments'$q$);
SELECT pg_temp.add_policy('storage.objects', 'job_fair_attachments_provincial_peso_all', 'ALL',
  $q$bucket_id = 'job-fair-attachments' AND (SELECT core.has_role('provincial_peso'))$q$);


-- ─── Verification (run manually) ────────────────────────────────────────────
-- Every managed table should list admin_all plus the role policies above:
--
--   SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies
--   WHERE schemaname IN ('core', 'applicants', 'employers', 'esmdd', 'jobs', 'public', 'system', 'storage')
--   ORDER BY 1, 2, 3;
