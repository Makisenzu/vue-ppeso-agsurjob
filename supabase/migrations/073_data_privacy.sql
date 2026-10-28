-- =============================================================================
-- Migration: 073_data_privacy.sql
-- Purpose:   Data Privacy Act of 2012 (RA 10173) and its IRR: the database side of .agents/PRIVACY.md.
--              1. Storage: applicant files stay in private buckets (opened through signed URLs only)
--              2. Consent (Sec. 12, 13, 16(a)): core.privacy_consents, the current notice version, the
--                 signup consent (auth metadata → rows), the consent RPCs and the biometrics guard
--              3. Audit trail (Sec. 20, NPC Circular 16-01): every change another person makes to
--                 someone's personal data is logged by trigger, without copying the data itself;
--                 staff views and exports are logged through system.log_personal_data_access
--              4. Data subject rights (Sec. 16, 18): core.data_subject_requests, self-service export
--                 (core.export_my_data) and the admin queue RPCs
--              5. Retention (Sec. 11(e)): system.retention_policies + a daily pg_cron purge
--
--            Notified events (BACKEND.md §17):
--              | Event                                   | Recipient  | type            |
--              | A data subject request is submitted     | every admin| privacy_request |
--              | A data subject request changes status   | requester  | privacy_request |
--
--            Bump core.privacy_notice_version() whenever the Privacy Notice page changes in substance
--            (PRIVACY_NOTICE_VERSION in src/types/common/privacy.ts): every account is asked to accept again.
-- Schemas:   core, system, storage, cron
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── 1. Storage: personal files are never public ────────────────────────────
-- Requirement files, OCR scans and recruitment documents hold IDs, TORs and birth certificates.
-- A public bucket serves any file to anyone with its URL, bypassing the storage policies (034).
-- `media` (profile pictures) and the landing page buckets stay as they are.

UPDATE storage.buckets
SET public = false
WHERE id IN ('documents', 'applicant-forms', 'recruitment-activity-documents');


-- ─── 2. Consent ─────────────────────────────────────────────────────────────

/** Version of the Privacy Notice in force. Accounts that haven't accepted it are asked again. */
CREATE OR REPLACE FUNCTION core.privacy_notice_version()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT '2026-10-27'::TEXT;
$$;

GRANT EXECUTE ON FUNCTION core.privacy_notice_version() TO authenticated;

CREATE TABLE IF NOT EXISTS core.privacy_consents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES core.profiles (id) ON DELETE CASCADE,
  -- privacy_notice: processing as described in the notice (every account)
  -- sensitive_personal_information: age, civil status, religion, disability, 4Ps / OFW status,
  --   education and government IDs on the NSRP record (applicants, Sec. 13)
  -- biometrics: face data (core.biometrics); optional, never required to use the portal
  purpose TEXT NOT NULL CHECK (purpose IN ('privacy_notice', 'sensitive_personal_information', 'biometrics')),
  notice_version TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('signup', 'web', 'peso_office')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  CONSTRAINT privacy_consents_once_per_version UNIQUE (profile_id, purpose, notice_version)
);

COMMENT ON TABLE core.privacy_consents IS
  'Proof of consent (RA 10173 Sec. 3(b), 12(a), 13(a)): who agreed to what, under which notice version, when, and when it was withdrawn. Written only through the core consent RPCs and the signup trigger (073).';

CREATE INDEX IF NOT EXISTS privacy_consents_profile_idx ON core.privacy_consents (profile_id);

ALTER TABLE core.privacy_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON core.privacy_consents FROM anon, authenticated;
GRANT SELECT ON core.privacy_consents TO authenticated;

DROP POLICY IF EXISTS owner_select ON core.privacy_consents;
CREATE POLICY owner_select ON core.privacy_consents FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS admin_select ON core.privacy_consents;
CREATE POLICY admin_select ON core.privacy_consents FOR SELECT TO authenticated
  USING ((SELECT core.has_role('admin')));

/** Purposes an account must have accepted (current notice version) before using the portal. */
CREATE OR REPLACE FUNCTION core.required_privacy_purposes(p_role TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_role = 'applicant'
    THEN ARRAY['privacy_notice', 'sensitive_personal_information']
    ELSE ARRAY['privacy_notice']
  END;
$$;

REVOKE ALL ON FUNCTION core.required_privacy_purposes(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.required_privacy_purposes(TEXT) TO authenticated;

/** The signed-in account's consent state: notice version, missing purposes and history. */
CREATE OR REPLACE FUNCTION core.my_privacy_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_required TEXT[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;

  SELECT role::TEXT INTO v_role FROM core.profiles WHERE id = v_uid;
  v_required := core.required_privacy_purposes(v_role);

  RETURN jsonb_build_object(
    'notice_version', core.privacy_notice_version(),
    'required', to_jsonb(v_required),
    'missing', to_jsonb(ARRAY(
      SELECT p FROM unnest(v_required) AS p
      WHERE NOT EXISTS (
        SELECT 1 FROM core.privacy_consents c
        WHERE c.profile_id = v_uid
          AND c.purpose = p
          AND c.notice_version = core.privacy_notice_version()
          AND c.withdrawn_at IS NULL
      )
    )),
    'consents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'purpose', c.purpose,
        'notice_version', c.notice_version,
        'source', c.source,
        'granted_at', c.granted_at,
        'withdrawn_at', c.withdrawn_at
      ) ORDER BY c.granted_at DESC)
      FROM core.privacy_consents c
      WHERE c.profile_id = v_uid
    ), '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION core.my_privacy_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.my_privacy_status() TO authenticated;

/** Records the signed-in account's consent to the current notice version for each purpose. */
CREATE OR REPLACE FUNCTION core.accept_privacy_notice(p_purposes TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM core.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  IF p_purposes IS NULL OR cardinality(p_purposes) = 0
     OR EXISTS (SELECT 1 FROM unnest(p_purposes) p
                WHERE p NOT IN ('privacy_notice', 'sensitive_personal_information', 'biometrics')) THEN
    RAISE EXCEPTION 'Choose what you agree to.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO core.privacy_consents (profile_id, purpose, notice_version, source)
  SELECT v_uid, p, core.privacy_notice_version(), 'web'
  FROM unnest(p_purposes) AS p
  ON CONFLICT (profile_id, purpose, notice_version)
  DO UPDATE SET granted_at = now(), withdrawn_at = NULL, source = 'web';

  RETURN core.my_privacy_status();
END;
$$;

REVOKE ALL ON FUNCTION core.accept_privacy_notice(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.accept_privacy_notice(TEXT[]) TO authenticated;

/**
 * Withdraws an optional consent (Sec. 16(e)) and stops that processing: withdrawing biometrics
 * deletes the face data. Required purposes can't be withdrawn while the account exists, since the
 * portal can't serve the account without them: the person asks for erasure instead.
 */
CREATE OR REPLACE FUNCTION core.withdraw_privacy_consent(p_purpose TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  SELECT role::TEXT INTO v_role FROM core.profiles WHERE id = v_uid;
  IF p_purpose = ANY (core.required_privacy_purposes(v_role)) THEN
    RAISE EXCEPTION 'This consent is needed to keep your account. To withdraw it, request the deletion of your account.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE core.privacy_consents
  SET withdrawn_at = now()
  WHERE profile_id = v_uid AND purpose = p_purpose AND withdrawn_at IS NULL;

  IF p_purpose = 'biometrics' AND to_regclass('core.biometrics') IS NOT NULL THEN
    DELETE FROM core.biometrics WHERE user_id = v_uid;
  END IF;

  RETURN core.my_privacy_status();
END;
$$;

REVOKE ALL ON FUNCTION core.withdraw_privacy_consent(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.withdraw_privacy_consent(TEXT) TO authenticated;

-- Signup: the form sends the ticked purposes in the auth metadata (privacy_consent: {version, purposes});
-- this stores them when the profile row is created, with the server's time.
CREATE OR REPLACE FUNCTION core.record_signup_privacy_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_consent JSONB;
BEGIN
  SELECT raw_user_meta_data -> 'privacy_consent' INTO v_consent FROM auth.users WHERE id = NEW.id;
  IF v_consent IS NULL OR v_consent ->> 'version' IS DISTINCT FROM core.privacy_notice_version() THEN
    RETURN NULL;
  END IF;

  INSERT INTO core.privacy_consents (profile_id, purpose, notice_version, source)
  SELECT NEW.id, p, core.privacy_notice_version(), 'signup'
  FROM jsonb_array_elements_text(COALESCE(v_consent -> 'purposes', '[]'::JSONB)) AS p
  WHERE p IN ('privacy_notice', 'sensitive_personal_information', 'biometrics')
  ON CONFLICT (profile_id, purpose, notice_version) DO NOTHING;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION core.record_signup_privacy_consent() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_signup_privacy_consent ON core.profiles;
CREATE TRIGGER trg_profiles_signup_privacy_consent
  AFTER INSERT ON core.profiles
  FOR EACH ROW EXECUTE FUNCTION core.record_signup_privacy_consent();

-- Biometric data is never stored without its own, current consent (Sec. 13(a))
CREATE OR REPLACE FUNCTION core.guard_biometrics_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.privacy_consents
    WHERE profile_id = NEW.user_id AND purpose = 'biometrics' AND withdrawn_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Biometric data needs the person''s consent first.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.guard_biometrics_consent() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('core.biometrics') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_biometrics_require_consent ON core.biometrics;
    CREATE TRIGGER trg_biometrics_require_consent
      BEFORE INSERT OR UPDATE ON core.biometrics
      FOR EACH ROW EXECUTE FUNCTION core.guard_biometrics_consent();
  END IF;
END;
$$;


-- ─── 3. Audit trail ─────────────────────────────────────────────────────────
-- Who did what to whose record, never the data itself: old_values / new_values stay NULL for
-- automatic entries and changed_columns names the fields. The log is append-only for every client.

ALTER TABLE system.system_audit_logs ADD COLUMN IF NOT EXISTS subject_profile_id UUID;
ALTER TABLE system.system_audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE system.system_audit_logs ADD COLUMN IF NOT EXISTS changed_columns TEXT[];

COMMENT ON COLUMN system.system_audit_logs.subject_profile_id IS 'Account whose personal data was viewed / changed (073). NULL for registry records without an account.';
COMMENT ON COLUMN system.system_audit_logs.actor_role IS 'Role of user_id at the time (073), kept after the actor''s account is deleted.';
COMMENT ON COLUMN system.system_audit_logs.changed_columns IS 'Fields an UPDATE changed (073). Values are not copied into the log.';

CREATE INDEX IF NOT EXISTS system_audit_logs_created_idx ON system.system_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS system_audit_logs_subject_idx ON system.system_audit_logs (subject_profile_id, created_at);
CREATE INDEX IF NOT EXISTS system_audit_logs_user_idx ON system.system_audit_logs (user_id, created_at);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON system.system_audit_logs FROM anon, authenticated;

/** Writes one audit entry as the signed-in user. Internal: called by triggers and the logging RPC. */
CREATE OR REPLACE FUNCTION system.write_audit_log(
  p_action TEXT,
  p_table TEXT,
  p_record_id TEXT,
  p_subject_profile_id UUID,
  p_changed_columns TEXT[] DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_ip TEXT;
BEGIN
  BEGIN
    v_ip := split_part(current_setting('request.headers', true)::JSONB ->> 'x-forwarded-for', ',', 1);
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  INSERT INTO system.system_audit_logs
    (user_id, actor_role, action, table_name, record_id, subject_profile_id, changed_columns, new_values, ip_address)
  VALUES (
    v_actor,
    (SELECT role::TEXT FROM core.profiles WHERE id = v_actor),
    p_action,
    p_table,
    p_record_id,
    p_subject_profile_id,
    p_changed_columns,
    p_details,
    NULLIF(btrim(v_ip), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION system.write_audit_log(TEXT, TEXT, TEXT, UUID, TEXT[], JSONB) FROM PUBLIC, anon, authenticated;

/**
 * AFTER INSERT / UPDATE / DELETE on a table holding personal data. TG_ARGV[0] is the column that
 * names the data subject; TG_ARGV[1] says what it holds: 'profile' (core.profiles id) or 'applicant'
 * (applicants.applicants id). People editing their own data and system jobs (no auth.uid()) are not
 * logged; staff, admin and employer changes to someone else's record are.
 */
CREATE OR REPLACE FUNCTION system.audit_personal_data_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row JSONB;
  v_old JSONB;
  v_value TEXT;
  v_subject UUID;
  v_changed TEXT[];
BEGIN
  IF v_actor IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  v_value := v_row ->> TG_ARGV[0];
  IF v_value IS NOT NULL THEN
    IF TG_ARGV[1] = 'applicant' THEN
      v_subject := system.applicant_profile_id(v_value::UUID);
    ELSE
      v_subject := v_value::UUID;
    END IF;
  END IF;

  IF v_subject IS NOT DISTINCT FROM v_actor THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_changed := ARRAY(
      SELECT n.key FROM jsonb_each(v_row) AS n
      WHERE n.value IS DISTINCT FROM v_old -> n.key
        AND n.key NOT IN ('updated_at', 'last_login')
      ORDER BY n.key
    );
    IF cardinality(v_changed) = 0 THEN
      RETURN NULL;
    END IF;
  END IF;

  PERFORM system.write_audit_log(
    TG_OP,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row ->> 'id',
    v_subject,
    v_changed
  );
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION system.audit_personal_data_change() FROM PUBLIC, anon, authenticated;

-- One trigger per table that holds someone's personal data, keyed by the column naming the person.
-- Account columns win over applicant columns when a table has both.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (c.table_schema, c.table_name)
      c.table_schema, c.table_name, c.column_name,
      CASE WHEN c.column_name = 'applicant_id' THEN 'applicant' ELSE 'profile' END AS kind
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE t.table_type = 'BASE TABLE'
      AND c.data_type = 'uuid'
      AND (
        (c.table_schema IN ('core', 'applicants', 'employers', 'esmdd') AND c.column_name IN ('profile_id', 'profiles_id', 'user_id'))
        OR (c.table_schema IN ('applicants', 'esmdd') AND c.column_name = 'applicant_id')
        OR (c.table_schema = 'core' AND c.table_name = 'profiles' AND c.column_name = 'id')
      )
      -- Consent and request rows are their own record; logging them would only echo the RPCs
      AND NOT (c.table_schema = 'core' AND c.table_name IN ('privacy_consents', 'data_subject_requests'))
    ORDER BY c.table_schema, c.table_name,
      CASE c.column_name WHEN 'id' THEN 0 WHEN 'profile_id' THEN 1 WHEN 'profiles_id' THEN 2 WHEN 'user_id' THEN 3 ELSE 4 END
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_personal_data ON %I.%I', r.table_schema, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_personal_data AFTER INSERT OR UPDATE OR DELETE ON %I.%I '
      'FOR EACH ROW EXECUTE FUNCTION system.audit_personal_data_change(%L, %L)',
      r.table_schema, r.table_name, r.column_name, r.kind
    );
    RAISE NOTICE 'Audit trigger on %.% (% → %)', r.table_schema, r.table_name, r.column_name, r.kind;
  END LOOP;
END;
$$;

/**
 * Logs a staff member opening or exporting personal data (reads can't fire triggers).
 * p_action: VIEW (one record) or EXPORT (a list, p_details = {"rows": n}).
 */
CREATE OR REPLACE FUNCTION system.log_personal_data_access(
  p_action TEXT,
  p_table TEXT,
  p_record_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject UUID;
BEGIN
  IF NOT core.has_role('admin', 'provincial_peso', 'municipal_peso', 'dole') THEN
    RAISE EXCEPTION 'Only staff accounts are logged here' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('VIEW', 'EXPORT') OR p_table IS NULL OR char_length(p_table) > 100 THEN
    RAISE EXCEPTION 'Invalid audit entry' USING ERRCODE = '22023';
  END IF;

  IF p_table = 'applicants.applicants' AND p_record_id ~* '^[0-9a-f-]{36}$' THEN
    v_subject := system.applicant_profile_id(p_record_id::UUID);
  ELSIF p_table = 'core.profiles' AND p_record_id ~* '^[0-9a-f-]{36}$' THEN
    v_subject := p_record_id::UUID;
  END IF;

  PERFORM system.write_audit_log(p_action, p_table, left(p_record_id, 100), v_subject, NULL, p_details);
END;
$$;

REVOKE ALL ON FUNCTION system.log_personal_data_access(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION system.log_personal_data_access(TEXT, TEXT, TEXT, JSONB) TO authenticated;


-- ─── 4. Data subject rights ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kept (as NULL) after an erasure, as proof the request was handled
  profile_id UUID REFERENCES core.profiles (id) ON DELETE SET NULL,
  request_type TEXT NOT NULL
    CHECK (request_type IN ('access', 'rectification', 'erasure', 'objection', 'portability', 'complaint')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In progress', 'Completed', 'Rejected')),
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000),
  resolved_by UUID REFERENCES core.profiles (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A refusal always says why (BACKEND.md §17.8)
  CONSTRAINT data_subject_requests_rejection_reason
    CHECK (status <> 'Rejected' OR nullif(btrim(resolution_note), '') IS NOT NULL)
);

COMMENT ON TABLE core.data_subject_requests IS
  'Requests under RA 10173 Sec. 16 / 18 (access, rectification, erasure, objection, portability) and privacy complaints, handled by the admin / DPO queue (073).';

CREATE INDEX IF NOT EXISTS data_subject_requests_profile_idx ON core.data_subject_requests (profile_id);
CREATE INDEX IF NOT EXISTS data_subject_requests_status_idx ON core.data_subject_requests (status, created_at);
CREATE INDEX IF NOT EXISTS data_subject_requests_resolved_by_idx ON core.data_subject_requests (resolved_by);

ALTER TABLE core.data_subject_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON core.data_subject_requests FROM anon, authenticated;
GRANT SELECT ON core.data_subject_requests TO authenticated;

DROP POLICY IF EXISTS owner_select ON core.data_subject_requests;
CREATE POLICY owner_select ON core.data_subject_requests FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS admin_select ON core.data_subject_requests;
CREATE POLICY admin_select ON core.data_subject_requests FOR SELECT TO authenticated
  USING ((SELECT core.has_role('admin')));

CREATE OR REPLACE FUNCTION core.data_subject_request_label(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_type
    WHEN 'access' THEN 'access to your data'
    WHEN 'rectification' THEN 'correction of your data'
    WHEN 'erasure' THEN 'deletion of your account and data'
    WHEN 'objection' THEN 'objection to processing'
    WHEN 'portability' THEN 'a copy of your data'
    WHEN 'complaint' THEN 'privacy complaint'
    ELSE 'privacy request'
  END;
$$;

/** Files a request for the signed-in account. One open request per type at a time. */
CREATE OR REPLACE FUNCTION core.submit_data_subject_request(p_type TEXT, p_details TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
  v_admin UUID;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM core.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM core.data_subject_requests
    WHERE profile_id = v_uid AND request_type = p_type AND status IN ('Pending', 'In progress')
  ) THEN
    RAISE EXCEPTION 'You already have an open request of this kind. PESO will update you on it.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO core.data_subject_requests (profile_id, request_type, details)
  VALUES (v_uid, p_type, nullif(btrim(p_details), ''))
  RETURNING id INTO v_id;

  FOR v_admin IN SELECT id FROM core.profiles WHERE role::TEXT = 'admin' LOOP
    PERFORM system.notify(
      v_admin,
      'privacy_request',
      'New Data Privacy Request',
      'A user asked for ' || core.data_subject_request_label(p_type) || '. Review it in Privacy Requests.'
    );
  END LOOP;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION core.submit_data_subject_request(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.submit_data_subject_request(TEXT, TEXT) TO authenticated;

/** One page of the request queue for admins, with the requester's name and email. */
CREATE OR REPLACE FUNCTION core.admin_list_data_subject_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  requester_name TEXT,
  requester_email TEXT,
  requester_role TEXT,
  request_type TEXT,
  details TEXT,
  status TEXT,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin') THEN
    RAISE EXCEPTION 'Only admins can view privacy requests' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.profile_id,
    nullif(btrim(concat_ws(' ', p.firstname, p.lastname)), ''),
    u.email::TEXT,
    p.role::TEXT,
    r.request_type,
    r.details,
    r.status,
    r.resolution_note,
    r.resolved_at,
    r.created_at,
    count(*) OVER ()
  FROM core.data_subject_requests r
  LEFT JOIN core.profiles p ON p.id = r.profile_id
  LEFT JOIN auth.users u ON u.id = r.profile_id
  WHERE p_status IS NULL OR r.status = p_status
  ORDER BY (r.status IN ('Pending', 'In progress')) DESC, r.created_at ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION core.admin_list_data_subject_requests(TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.admin_list_data_subject_requests(TEXT, INT, INT) TO authenticated;

/** Moves a request along; Rejected needs a note (the CHECK constraint says so too). */
CREATE OR REPLACE FUNCTION core.admin_update_data_subject_request(p_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT core.has_role('admin') THEN
    RAISE EXCEPTION 'Only admins can update privacy requests' USING ERRCODE = '42501';
  END IF;
  IF p_status = 'Rejected' AND nullif(btrim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'Say why the request is rejected.' USING ERRCODE = '22023';
  END IF;

  UPDATE core.data_subject_requests
  SET status = p_status,
      resolution_note = COALESCE(nullif(btrim(p_note), ''), resolution_note),
      resolved_by = CASE WHEN p_status IN ('Completed', 'Rejected') THEN auth.uid() ELSE resolved_by END,
      resolved_at = CASE WHEN p_status IN ('Completed', 'Rejected') THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION core.admin_update_data_subject_request(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.admin_update_data_subject_request(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION system.notify_data_subject_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  PERFORM system.notify(
    NEW.profile_id,
    'privacy_request',
    'Data Privacy Request Update',
    'Your request for ' || core.data_subject_request_label(NEW.request_type) || ' is now ' || lower(NEW.status) || '.',
    CASE WHEN NEW.status = 'Rejected' THEN NEW.resolution_note END
  );
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION system.notify_data_subject_request_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_data_subject_request_status ON core.data_subject_requests;
CREATE TRIGGER trg_notify_data_subject_request_status
  AFTER UPDATE OF status ON core.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION system.notify_data_subject_request_status();

/**
 * Collects p_table's rows matching p_where into p_result ("schema.table" → rows), then the rows that
 * point at them through single-column foreign keys (applications, appointments, documents, ...).
 * Authorship columns (created_by, reviewed_by, ...) are not followed: that is content the person
 * worked on, not data about them.
 */
CREATE OR REPLACE FUNCTION core.collect_personal_data(p_table REGCLASS, p_where TEXT, p_depth INT, p_result JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  fk RECORD;
  v_rows JSONB;
  v_key TEXT := p_table::TEXT;
BEGIN
  IF p_depth > 4 THEN
    RETURN p_result;
  END IF;

  EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::JSONB) FROM %s t WHERE %s', p_table, p_where)
    INTO v_rows;
  IF jsonb_array_length(v_rows) = 0 THEN
    RETURN p_result;
  END IF;
  p_result := p_result || jsonb_build_object(v_key, COALESCE(p_result -> v_key, '[]'::JSONB) || v_rows);

  FOR fk IN
    SELECT
      c.conrelid::REGCLASS AS child_table,
      child_col.attname AS child_column,
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
      AND c.conrelid <> c.confrelid
      AND array_length(c.conkey, 1) = 1
      AND child_ns.nspname NOT IN ('auth', 'storage', 'cron')
      AND c.conrelid <> 'system.system_audit_logs'::REGCLASS
      AND NOT core.is_authorship_column(child_col.attname)
      AND child_col.attname <> 'resolved_by'
  LOOP
    p_result := core.collect_personal_data(
      fk.child_table,
      format('%I IN (SELECT %I FROM %s WHERE %s)', fk.child_column, fk.parent_column, p_table, p_where),
      p_depth + 1,
      p_result
    );
  END LOOP;

  RETURN p_result;
END;
$$;

REVOKE ALL ON FUNCTION core.collect_personal_data(REGCLASS, TEXT, INT, JSONB) FROM PUBLIC, anon, authenticated;

/**
 * Everything the portal holds about the signed-in applicant or employer, as JSON (Sec. 16(c), 18):
 * their rows, the rows linked to them, and who on the staff viewed or changed their record.
 * Staff accounts ask the DPO instead: their rows link to other people's records.
 */
CREATE OR REPLACE FUNCTION core.export_my_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_owned RECORD;
  v_data JSONB := '{}'::JSONB;
BEGIN
  SELECT role::TEXT INTO v_role FROM core.profiles WHERE id = v_uid;
  IF v_uid IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  IF v_role NOT IN ('applicant', 'company_owner', 'company_member', 'employer') THEN
    RAISE EXCEPTION 'Staff accounts request a copy of their data from the Data Protection Officer.' USING ERRCODE = '42501';
  END IF;

  v_data := core.collect_personal_data('core.profiles'::REGCLASS, format('id = %L::UUID', v_uid), 0, v_data);

  -- Rows that name the account in a plain column (no foreign key to core.profiles)
  FOR v_owned IN
    SELECT * FROM (VALUES
      ('applicants', 'applicants',                 'profile_id'),
      ('applicants', 'spes_form',                  'profile_id'),
      ('applicants', 'applicant_requirements',     'profile_id'),
      ('applicants', 'applicant_requirement_media','profiles_id'),
      ('applicants', 'applicant_experiences',      'profile_id'),
      ('applicants', 'applicant_skills',           'profile_id'),
      ('employers',  'companies',                  'profile_id'),
      ('employers',  'company_members',            'profile_id'),
      ('core',       'profile_media',              'profile_id'),
      ('core',       'profile_socials',            'profile_id'),
      ('core',       'biometrics',                 'user_id'),
      ('system',     'notifications',              'recipient_id')
    ) AS owned(schema_name, table_name, column_name)
  LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_owned.schema_name
        AND table_name = v_owned.table_name
        AND column_name = v_owned.column_name
    );
    v_data := core.collect_personal_data(
      format('%I.%I', v_owned.schema_name, v_owned.table_name)::REGCLASS,
      format('%I = %L::UUID', v_owned.column_name, v_uid),
      0,
      v_data
    );
  END LOOP;

  -- The same row can be reached twice (through the profile and through its own column)
  SELECT COALESCE(jsonb_object_agg(e.key, (SELECT jsonb_agg(DISTINCT x) FROM jsonb_array_elements(e.value) x)), '{}'::JSONB)
  INTO v_data
  FROM jsonb_each(v_data) e;

  RETURN jsonb_build_object(
    'exported_at', now(),
    'controller', 'Provincial Government of Agusan del Sur — Public Employment Service Office (AGSURJOBS)',
    'privacy_notice_version', core.privacy_notice_version(),
    'account', jsonb_build_object('id', v_uid, 'email', (SELECT email FROM auth.users WHERE id = v_uid), 'role', v_role),
    'data', v_data,
    'access_log', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'when', l.created_at,
        'action', l.action,
        'record', l.table_name,
        'fields', l.changed_columns,
        'by_role', l.actor_role
      ) ORDER BY l.created_at DESC)
      FROM system.system_audit_logs l
      WHERE l.subject_profile_id = v_uid
    ), '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION core.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION core.export_my_data() TO authenticated;


-- ─── 5. Retention ───────────────────────────────────────────────────────────
-- Personal data is kept only as long as its purpose needs (Sec. 11(e)). The periods below are
-- defaults for the Data Protection Officer to confirm; government records (NSRP registry, program
-- applications, appointments) are kept under the records schedule and are not purged here.

CREATE TABLE IF NOT EXISTS system.retention_policies (
  data_category TEXT PRIMARY KEY,
  keep_days INT NOT NULL CHECK (keep_days > 0),
  description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE system.retention_policies IS
  'How long each category of personal data is kept before system.apply_retention_policies() deletes it (073). Admin-editable; set with the DPO.';

INSERT INTO system.retention_policies (data_category, keep_days, description) VALUES
  ('read_notifications',      365,  'Notifications the recipient has already read'),
  ('audit_logs',              1825, 'Audit trail of views and changes to personal data (5 years)'),
  ('closed_privacy_requests', 1825, 'Completed or rejected data subject requests (5 years)')
ON CONFLICT (data_category) DO NOTHING;

ALTER TABLE system.retention_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON system.retention_policies FROM anon, authenticated;
GRANT SELECT, UPDATE ON system.retention_policies TO authenticated;

DROP POLICY IF EXISTS admin_select ON system.retention_policies;
CREATE POLICY admin_select ON system.retention_policies FOR SELECT TO authenticated
  USING ((SELECT core.has_role('admin')));
DROP POLICY IF EXISTS admin_update ON system.retention_policies;
CREATE POLICY admin_update ON system.retention_policies FOR UPDATE TO authenticated
  USING ((SELECT core.has_role('admin'))) WITH CHECK ((SELECT core.has_role('admin')));

/** Deletes data past its retention period; returns how many rows went per category. */
CREATE OR REPLACE FUNCTION system.apply_retention_policies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_days INT;
  v_count INT;
  v_result JSONB := '{}'::JSONB;
BEGIN
  SELECT keep_days INTO v_days FROM system.retention_policies WHERE data_category = 'read_notifications';
  IF v_days IS NOT NULL THEN
    DELETE FROM system.notifications
    WHERE is_read IS TRUE AND created_at < now() - make_interval(days => v_days);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('read_notifications', v_count);
  END IF;

  SELECT keep_days INTO v_days FROM system.retention_policies WHERE data_category = 'audit_logs';
  IF v_days IS NOT NULL THEN
    DELETE FROM system.system_audit_logs WHERE created_at < now() - make_interval(days => v_days);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('audit_logs', v_count);
  END IF;

  SELECT keep_days INTO v_days FROM system.retention_policies WHERE data_category = 'closed_privacy_requests';
  IF v_days IS NOT NULL THEN
    DELETE FROM core.data_subject_requests
    WHERE status IN ('Completed', 'Rejected') AND resolved_at < now() - make_interval(days => v_days);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('closed_privacy_requests', v_count);
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION system.apply_retention_policies() IS
  'Deletes personal data past system.retention_policies; run daily by pg_cron (personal-data-retention).';

REVOKE ALL ON FUNCTION system.apply_retention_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION system.apply_retention_policies() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 19:00 UTC = 03:00 Asia/Manila; re-running this migration updates the same job
SELECT cron.schedule(
  'personal-data-retention',
  '0 19 * * *',
  $$SELECT system.apply_retention_policies();$$
);

COMMIT;
