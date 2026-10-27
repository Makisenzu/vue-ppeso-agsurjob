-- =============================================================================
-- Migration: 069_admin_delete_account.sql
-- Purpose:   Admins can permanently delete an account and everything it owns:
--              core.admin_delete_account(p_profile_id) — admin only; not yourself, not the last admin.
--
--            What is deleted, in one transaction (all or nothing):
--              - the account's own rows (registry record, SPES form, requirements and their media,
--                experiences, skills, company / membership, profile media and socials, biometrics,
--                notifications, announcement reads), then core.profiles and auth.users
--              - every row that depends on those, found through the database's foreign keys
--                (pg_constraint), so program applications, appointments, documents, job postings
--                and the like go with them, whatever the base schema's ON DELETE rules are
--            What is kept: shared content the account only authored or last edited
--              (created_by / updated_by / uploaded_by / reviewed_by ...): the column is cleared.
--
--            Files: Postgres can't remove Storage objects, so the app deletes the account's folders
--            through the Storage API afterwards (admin_all_app_buckets, migration 034).
-- Schemas:   core, auth (+ every schema holding account data)
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Purge helper: delete rows and, first, everything that depends on them ──

-- Columns that only record who authored / changed shared content: cleared, never cascaded
CREATE OR REPLACE FUNCTION core.is_authorship_column(p_column TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_column IN ('created_by', 'updated_by', 'uploaded_by', 'reviewed_by', 'approved_by', 'decided_by', 'assigned_by');
$$;

REVOKE ALL ON FUNCTION core.is_authorship_column(TEXT) FROM PUBLIC, anon, authenticated;

/**
 * Deletes the rows of p_table matching p_where (an SQL condition on that table). Before that, for
 * every foreign key pointing at p_table:
 *   - ON DELETE SET NULL / SET DEFAULT → left to the database
 *   - an authorship column (core.is_authorship_column) that allows NULL → set to NULL
 *   - anything else (CASCADE, NO ACTION, RESTRICT) → those rows are purged the same way, recursively
 * Single-column foreign keys only; self-references are cleared or left to the database.
 */
CREATE OR REPLACE FUNCTION core.purge_rows(p_table REGCLASS, p_where TEXT, p_depth INT DEFAULT 0)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  fk RECORD;
  v_child_where TEXT;
BEGIN
  IF p_depth > 20 THEN
    RAISE EXCEPTION 'Account data is linked too deeply to delete safely (at %).', p_table;
  END IF;

  FOR fk IN
    SELECT
      c.conrelid::REGCLASS AS child_table,
      c.conrelid = c.confrelid AS is_self,
      c.confdeltype AS on_delete,
      child_col.attname AS child_column,
      NOT child_col.attnotnull AS is_nullable,
      parent_col.attname AS parent_column
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class child_rel ON child_rel.oid = c.conrelid
    JOIN pg_catalog.pg_namespace child_ns ON child_ns.oid = child_rel.relnamespace
    JOIN pg_catalog.pg_attribute child_col
      ON child_col.attrelid = c.conrelid AND child_col.attnum = c.conkey[1]
    JOIN pg_catalog.pg_attribute parent_col
      ON parent_col.attrelid = c.confrelid AND parent_col.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = p_table
      AND array_length(c.conkey, 1) = 1
      -- Supabase's own tables (sessions, identities, ...) follow their own ON DELETE rules
      AND child_ns.nspname NOT IN ('auth', 'storage')
  LOOP
    CONTINUE WHEN fk.on_delete IN ('n', 'd');

    v_child_where := format('%I IN (SELECT %I FROM %s WHERE %s)', fk.child_column, fk.parent_column, p_table, p_where);

    IF fk.is_nullable AND (core.is_authorship_column(fk.child_column) OR fk.is_self) THEN
      EXECUTE format('UPDATE %s SET %I = NULL WHERE %s', fk.child_table, fk.child_column, v_child_where);
    ELSIF NOT fk.is_self THEN
      PERFORM core.purge_rows(fk.child_table, v_child_where, p_depth + 1);
    END IF;
  END LOOP;

  EXECUTE format('DELETE FROM %s WHERE %s', p_table, p_where);
END;
$$;

REVOKE ALL ON FUNCTION core.purge_rows(REGCLASS, TEXT, INT) FROM PUBLIC, anon, authenticated;


-- ─── 2. Admin RPC ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION core.admin_delete_account(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
  v_owned RECORD;
  v_where TEXT;
BEGIN
  IF NOT core.has_role('admin') THEN
    RAISE EXCEPTION 'Only admins can delete accounts' USING ERRCODE = '42501';
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t delete your own account' USING ERRCODE = '42501';
  END IF;

  SELECT role::TEXT INTO v_role FROM core.profiles WHERE id = p_profile_id;
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM core.profiles WHERE role::TEXT = 'admin' AND id <> p_profile_id
  ) THEN
    RAISE EXCEPTION 'You can''t delete the last admin account' USING ERRCODE = '42501';
  END IF;

  -- The account's own rows, including those linked only by a plain column (no foreign key).
  -- Registry / company records first, so their applications and postings go with them.
  FOR v_owned IN
    SELECT * FROM (VALUES
      (1,  'applicants', 'applicants',                 'profile_id'),
      (2,  'applicants', 'spes_form',                  'profile_id'),
      (3,  'applicants', 'applicant_requirements',     'profile_id'),
      (4,  'applicants', 'applicant_requirement_media','profiles_id'),
      (5,  'applicants', 'applicant_experiences',      'profile_id'),
      (6,  'applicants', 'applicant_skills',           'profile_id'),
      (7,  'employers',  'companies',                  'profile_id'),
      (8,  'employers',  'company_members',            'profile_id'),
      (9,  'employers',  'employer_requirement_files', 'profile_id'),
      (10, 'core',       'profile_media',              'profile_id'),
      (11, 'core',       'profile_socials',            'profile_id'),
      (12, 'core',       'biometrics',                 'user_id'),
      (13, 'system',     'notifications',              'recipient_id'),
      (14, 'system',     'announcement_reads',         'user_id')
    ) AS owned(sort_order, schema_name, table_name, column_name)
    ORDER BY sort_order
  LOOP
    -- Skip a table or column this database doesn't have
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_owned.schema_name
        AND table_name = v_owned.table_name
        AND column_name = v_owned.column_name
    );
    v_where := format('%I = %L::UUID', v_owned.column_name, p_profile_id);
    PERFORM core.purge_rows(format('%I.%I', v_owned.schema_name, v_owned.table_name)::REGCLASS, v_where);
  END LOOP;

  -- Audit trail stays, without the person (or goes, if the log can't be kept without one)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'system' AND table_name = 'system_audit_logs' AND column_name = 'user_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'system' AND table_name = 'system_audit_logs' AND column_name = 'user_id' AND is_nullable = 'YES'
    ) THEN
      UPDATE system.system_audit_logs SET user_id = NULL WHERE user_id = p_profile_id;
    ELSE
      DELETE FROM system.system_audit_logs WHERE user_id = p_profile_id;
    END IF;
  END IF;

  PERFORM core.purge_rows('core.profiles'::REGCLASS, format('id = %L::UUID', p_profile_id));
  PERFORM core.purge_rows('auth.users'::REGCLASS, format('id = %L::UUID', p_profile_id));
END;
$$;

REVOKE ALL ON FUNCTION core.admin_delete_account(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.admin_delete_account(UUID) TO authenticated;

COMMIT;
