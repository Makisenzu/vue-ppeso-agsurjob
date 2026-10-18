-- =============================================================================
-- Migration: 033_lock_down_staff_only_access.sql
-- Purpose:   Close database-level gaps where data meant for PESO staff was
--            reachable by any API caller holding the publishable key.
--
--   1. esmdd.gip_applicant_priority_scores ran as its owner (bypassing RLS on
--      applicants.applicants) and was granted to anon. It now runs as the
--      caller (security_invoker), so the existing PESO/admin policies apply.
--   2. core.profiles: the own-row policy let users change their own `role`
--      and `status`. A trigger now restricts those columns to admins.
--   3. OCR (public.applicant_forms + 'applicant-forms' bucket): policies used
--      `auth.role() = 'authenticated'`, which is true for every logged-in user.
--      Access is now limited to Provincial PESO and admin.
-- =============================================================================


-- ─── 1. GIP priority score view runs with the caller's RLS ──────────────────

ALTER VIEW esmdd.gip_applicant_priority_scores SET (security_invoker = true);

REVOKE SELECT ON esmdd.gip_applicant_priority_scores FROM anon;
REVOKE SELECT ON esmdd.gip_appointments FROM anon;


-- ─── 2. Protect core.profiles.role / status ─────────────────────────────────
-- Trusted callers (SQL editor, migrations, service role) and admins may set any
-- value. Everyone else:
--   * INSERT  → role is coerced to 'applicant' unless it is a self-signup role
--               ('applicant', 'company_owner'); status is forced to 'pending'.
--               Coercing (instead of raising) keeps the admin "create account"
--               flow working: its temp-client signUp may create the row first,
--               then the admin's own upsert sets the real role.
--   * UPDATE  → changing role or status raises. Nested trigger updates are exempt
--               (pg_trigger_depth() > 1): the 030/031 auto-verify triggers set
--               status when staff approve documents, and the 029 sync only
--               touches name/contact fields.
-- SECURITY INVOKER on purpose, so auth.role() and the caller's own-row read of
-- core.profiles reflect the real requester.

CREATE OR REPLACE FUNCTION core.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_trusted BOOLEAN;
BEGIN
  v_is_trusted :=
    auth.role() = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
    OR EXISTS (
      SELECT 1 FROM core.profiles
      WHERE id = auth.uid()
        AND role::TEXT = 'admin'
    );

  IF v_is_trusted THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role::TEXT NOT IN ('applicant', 'company_owner') THEN
      NEW.role := 'applicant';
    END IF;
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to change account role or status.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privileged_columns ON core.profiles;
CREATE TRIGGER trg_profiles_guard_privileged_columns
BEFORE INSERT OR UPDATE
ON core.profiles
FOR EACH ROW
EXECUTE FUNCTION core.guard_profile_privileged_columns();

REVOKE ALL ON FUNCTION core.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;


-- ─── 3. OCR table: Provincial PESO + admin only ─────────────────────────────
-- Skipped when public.applicant_forms does not exist (001 was never applied to
-- this database). DROP POLICY IF EXISTS still errors on a missing table, so the
-- statements run dynamically behind a to_regclass() check.

DO $$
BEGIN
  IF to_regclass('public.applicant_forms') IS NULL THEN
    RAISE NOTICE 'public.applicant_forms not found; skipping OCR table policies.';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own applicant forms" ON public.applicant_forms';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own applicant forms" ON public.applicant_forms';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own applicant forms" ON public.applicant_forms';

  EXECUTE 'DROP POLICY IF EXISTS "staff_applicant_forms_all" ON public.applicant_forms';
  EXECUTE $policy$
    CREATE POLICY "staff_applicant_forms_all"
    ON public.applicant_forms
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM core.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('provincial_peso', 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM core.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('provincial_peso', 'admin')
      )
    )
  $policy$;
END;
$$;


-- ─── 4. OCR bucket 'applicant-forms': Provincial PESO + admin only ──────────

DROP POLICY IF EXISTS "Authenticated users can upload applicant form images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view applicant form images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update applicant form images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete applicant form images" ON storage.objects;

DROP POLICY IF EXISTS "staff_applicant_forms_objects_all" ON storage.objects;
CREATE POLICY "staff_applicant_forms_objects_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'applicant-forms'
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'applicant-forms'
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
);
