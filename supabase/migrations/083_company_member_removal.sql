-- =============================================================================
-- Migration: 083_company_member_removal.sql
-- Purpose:   Team page (owner) follow-ups to 081 / 082:
--              * Drops employers.company_members.role: the legacy public.user_role column (left NULL
--                since 082). member_role (081) says what a member may do; companies.profile_id is the owner.
--              * Remove deletes the membership. When the person has no membership left, their account
--                is locked (employers.set_member_account_access):
--                  - core.profiles.status = 'inactive' (the app refuses inactive accounts, authService)
--                  - auth.users.banned_until set far ahead (Supabase Auth refuses the password and any
--                    refresh, so the API is closed too, not just the app)
--                  - auth.sessions deleted (open sessions cannot refresh; access tokens lapse within the hour)
--              * remove_company_members(ids[]): bulk remove in one request (DESIGN.md §13.1).
--              * Re-invite: an email whose account is a company_member with no membership may be invited
--                again. Inviting unlocks the account so the invitation's sign-in link works; accepting
--                rejoins the company with the same account (get_company_invitation says has_account, so the
--                page skips the set-up form); cancelling the invitation locks it again.
--              * list_company_members(): active members only, never the owner's own row.
--              * core.guard_profile_privileged_columns: one more trusted path, the transaction-local flag
--                agsurjobs.company_member_access, for status changes of company_member profiles.
--              * system.notify_profile_status: no "account verified / contact PESO" notification for
--                these changes (they are the owner's action, not a PESO decision).
--              * Clean-up of an owner-set member status tried during development (functions
--                set_company_member_status / notify_company_member_status, status 'closed').
-- Schemas:   core, employers, system, auth
-- Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 0. Redundant role column, dropped status experiment ───────────────────

-- No CASCADE: if anything still reads the column, this fails instead of dropping it silently
ALTER TABLE employers.company_members DROP COLUMN IF EXISTS role;

DROP TRIGGER IF EXISTS trg_company_members_notify_status ON employers.company_members;
DROP FUNCTION IF EXISTS system.notify_company_member_status();
DROP FUNCTION IF EXISTS employers.set_company_member_status(INT, TEXT);
UPDATE employers.company_members SET status = 'active', updated_at = now() WHERE status::TEXT = 'closed';


-- ─── 1. Profile guard: trusted company_member status changes ───────────────
-- Same as 081, plus the agsurjobs.company_member_access flag on UPDATE. Only the SECURITY DEFINER
-- function below sets it; clients cannot (PostgREST does not expose set_config).

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
    IF current_setting('agsurjobs.accepting_company_invitation', true) = 'on'
       AND NEW.id = auth.uid()
       AND NEW.role::TEXT = 'company_member' THEN
      RETURN NEW;
    END IF;

    IF NEW.role IS NULL OR NEW.role::TEXT NOT IN ('applicant', 'company_owner') THEN
      NEW.role := 'applicant';
    END IF;
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Locking / unlocking a member account (employers.set_member_account_access): status only
  IF current_setting('agsurjobs.company_member_access', true) = 'on'
     AND OLD.role::TEXT = 'company_member'
     AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to change account role or status.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;


-- ─── 2. Lock / unlock a company_member account (internal) ──────────────────

CREATE OR REPLACE FUNCTION employers.set_member_account_access(p_profile_id UUID, p_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only accounts that exist to work for a company; never an owner, applicant or staff account
  IF NOT EXISTS (SELECT 1 FROM core.profiles WHERE id = p_profile_id AND role::TEXT = 'company_member') THEN
    RETURN;
  END IF;

  PERFORM set_config('agsurjobs.company_member_access', 'on', true);
  UPDATE core.profiles
  SET status = (CASE WHEN p_enabled THEN 'approved' ELSE 'inactive' END)::core.status_type
  WHERE id = p_profile_id;
  PERFORM set_config('agsurjobs.company_member_access', 'off', true);

  UPDATE auth.users
  SET banned_until = CASE WHEN p_enabled THEN NULL ELSE now() + INTERVAL '100 years' END
  WHERE id = p_profile_id;

  IF NOT p_enabled THEN
    DELETE FROM auth.sessions WHERE user_id = p_profile_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION employers.set_member_account_access(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;


-- ─── 3. Remove: delete the membership, lock the account if none is left ────

CREATE OR REPLACE FUNCTION employers.remove_company_member(p_member_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  DELETE FROM employers.company_members m
  WHERE m.id = p_member_id
    AND m.profile_id IS DISTINCT FROM auth.uid()
    AND employers.is_company_owner(m.company_id)
  RETURNING m.profile_id INTO v_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_profile_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM employers.company_members WHERE profile_id = v_profile_id) THEN
    PERFORM employers.set_member_account_access(v_profile_id, false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION employers.remove_company_members(p_member_ids INT[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_ids UUID[];
  v_profile_id UUID;
BEGIN
  WITH removed AS (
    DELETE FROM employers.company_members m
    WHERE m.id = ANY (p_member_ids)
      AND m.profile_id IS DISTINCT FROM auth.uid()
      AND employers.is_company_owner(m.company_id)
    RETURNING m.profile_id
  )
  SELECT array_agg(profile_id) INTO v_profile_ids FROM removed;

  IF v_profile_ids IS NULL THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  FOREACH v_profile_id IN ARRAY v_profile_ids LOOP
    IF v_profile_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM employers.company_members WHERE profile_id = v_profile_id) THEN
      PERFORM employers.set_member_account_access(v_profile_id, false);
    END IF;
  END LOOP;

  RETURN cardinality(v_profile_ids);
END;
$$;


-- ─── 4. Invite: removed members may be invited again ───────────────────────

CREATE OR REPLACE FUNCTION employers.invite_company_member(p_email TEXT, p_member_role TEXT)
RETURNS TABLE (invitation_id UUID, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_email TEXT := lower(btrim(coalesce(p_email, '')));
  v_token TEXT := employers.new_invitation_token();
  v_id UUID;
  v_removed_member UUID;
BEGIN
  SELECT id INTO v_company_id FROM employers.companies WHERE profile_id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Only a company owner can invite members' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023';
  END IF;
  IF p_member_role NOT IN ('recruiter', 'viewer') THEN
    RAISE EXCEPTION 'Choose Recruiter or Viewer' USING ERRCODE = '22023';
  END IF;

  -- A removed member: a company_member account that belongs to no company any more
  SELECT p.id INTO v_removed_member
  FROM auth.users u
  JOIN core.profiles p ON p.id = u.id
  WHERE lower(u.email) = v_email
    AND p.role::TEXT = 'company_member'
    AND NOT EXISTS (SELECT 1 FROM employers.company_members m WHERE m.profile_id = p.id);

  -- One account, one role: any other email with an AGSURJOBS account must use a different email.
  -- Invited-but-not-accepted logins have no profile yet, so they can be invited again.
  IF v_removed_member IS NULL AND EXISTS (
    SELECT 1 FROM auth.users u JOIN core.profiles p ON p.id = u.id
    WHERE lower(u.email) = v_email
  ) THEN
    RAISE EXCEPTION 'This email already has an AGSURJOBS account. Ask them for a different email.'
      USING ERRCODE = '23505';
  END IF;

  UPDATE employers.company_invitations
  SET token_hash = employers.hash_invitation_token(v_token),
      member_role = p_member_role,
      invited_by = auth.uid(),
      expires_at = now() + INTERVAL '7 days',
      updated_at = now()
  WHERE company_id = v_company_id AND email = v_email AND status = 'pending'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO employers.company_invitations (company_id, email, member_role, token_hash)
    VALUES (v_company_id, v_email, p_member_role, employers.hash_invitation_token(v_token))
    RETURNING id INTO v_id;
  END IF;

  -- Unlock so the invitation's sign-in link works
  IF v_removed_member IS NOT NULL THEN
    PERFORM employers.set_member_account_access(v_removed_member, true);
  END IF;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;


-- ─── 5. Cancel an invitation: a removed member is locked again ─────────────

CREATE OR REPLACE FUNCTION employers.revoke_company_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT;
  v_removed_member UUID;
BEGIN
  UPDATE employers.company_invitations i
  SET status = 'revoked', updated_at = now()
  WHERE i.id = p_invitation_id
    AND i.status = 'pending'
    AND employers.is_company_owner(i.company_id)
  RETURNING i.email INTO v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  -- Still no company and no other pending invitation: back to locked
  SELECT p.id INTO v_removed_member
  FROM auth.users u
  JOIN core.profiles p ON p.id = u.id
  WHERE lower(u.email) = v_email
    AND p.role::TEXT = 'company_member'
    AND NOT EXISTS (SELECT 1 FROM employers.company_members m WHERE m.profile_id = p.id)
    AND NOT EXISTS (
      SELECT 1 FROM employers.company_invitations i
      WHERE i.email = v_email AND i.status = 'pending' AND i.expires_at > now()
    );

  IF v_removed_member IS NOT NULL THEN
    PERFORM employers.set_member_account_access(v_removed_member, false);
  END IF;
END;
$$;


-- ─── 6. Accept: a re-invited member rejoins with their existing account ────

CREATE OR REPLACE FUNCTION employers.accept_company_invitation(
  p_token TEXT,
  p_firstname TEXT,
  p_lastname TEXT,
  p_contact_number TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_invitation employers.company_invitations%ROWTYPE;
  v_existing_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Open the invitation link from your email first' USING ERRCODE = '42501';
  END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO v_invitation
  FROM employers.company_invitations
  WHERE token_hash = employers.hash_invitation_token(p_token)
    AND status = 'pending'
  FOR UPDATE;

  IF v_invitation.id IS NULL OR v_invitation.email IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'This invitation is not valid for your account' USING ERRCODE = '42501';
  END IF;
  IF v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired. Ask the company owner to invite you again.'
      USING ERRCODE = '22023';
  END IF;

  SELECT role::TEXT INTO v_existing_role FROM core.profiles WHERE id = v_uid;

  IF v_existing_role IS NULL THEN
    -- First time: create the company_member profile
    IF nullif(btrim(p_firstname), '') IS NULL OR nullif(btrim(p_lastname), '') IS NULL THEN
      RAISE EXCEPTION 'Enter your first and last name' USING ERRCODE = '22023';
    END IF;
    PERFORM set_config('agsurjobs.accepting_company_invitation', 'on', true);
    INSERT INTO core.profiles (id, firstname, lastname, contact_number, role, status)
    VALUES (v_uid, btrim(p_firstname), btrim(p_lastname), nullif(btrim(p_contact_number), ''),
            'company_member', 'approved');
    PERFORM set_config('agsurjobs.accepting_company_invitation', 'off', true);
  ELSIF v_existing_role = 'company_member'
        AND NOT EXISTS (SELECT 1 FROM employers.company_members WHERE profile_id = v_uid) THEN
    -- Removed earlier and invited again: rejoins with the same account (name, number, password kept)
    PERFORM employers.set_member_account_access(v_uid, true);
  ELSE
    RAISE EXCEPTION 'This email already has an AGSURJOBS account. Ask the owner to invite a different email.'
      USING ERRCODE = '23505';
  END IF;

  -- Access comes from the active membership (is_company_member, 034); member_role says what they do.
  INSERT INTO employers.company_members (company_id, profile_id, status, member_role)
  VALUES (v_invitation.company_id, v_uid, 'active', v_invitation.member_role);

  UPDATE employers.company_invitations
  SET status = 'accepted', accepted_by = v_uid, accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;
END;
$$;


-- Invitee: what they are joining, and whether they already have an account (a re-invited member
-- rejoins with it instead of setting one up). New column, so the function is re-created.
DROP FUNCTION IF EXISTS employers.get_company_invitation(TEXT);
CREATE FUNCTION employers.get_company_invitation(p_token TEXT)
RETURNS TABLE (company_name TEXT, email TEXT, member_role TEXT, is_expired BOOLEAN, has_account BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.company_name, i.email, i.member_role, i.expires_at < now(),
         EXISTS (SELECT 1 FROM core.profiles p WHERE p.id = auth.uid())
  FROM employers.company_invitations i
  JOIN employers.companies c ON c.id = i.company_id
  WHERE i.token_hash = employers.hash_invitation_token(p_token)
    AND i.status = 'pending'
    AND i.email = (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid());
$$;

REVOKE ALL ON FUNCTION employers.get_company_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.get_company_invitation(TEXT) TO authenticated;


-- ─── 7. No PESO-style account notification for member lock / unlock ────────

CREATE OR REPLACE FUNCTION system.notify_profile_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  -- Locked / unlocked by the Team page (083): the company owner's action, not a PESO decision
  IF current_setting('agsurjobs.company_member_access', true) = 'on' THEN
    RETURN NULL;
  END IF;

  v_message := CASE NEW.status::TEXT
    WHEN 'approved' THEN 'Congratulations! Your account has been verified. You can now apply for jobs and programs.'
    WHEN 'rejected' THEN 'Your account verification was not approved. Please review your submitted documents and try again.'
    WHEN 'pending'  THEN 'Your account is pending verification by PESO.'
    WHEN 'active'   THEN 'Your account is active. Welcome back!'
    WHEN 'inactive' THEN 'Your account has been deactivated. Please contact the PESO office for assistance.'
    ELSE 'Your account status is now ' || NEW.status::TEXT || '.'
  END;

  PERFORM system.notify(
    NEW.id, 'account_status', 'Account Status Update', v_message,
    system.status_remarks(NEW.status::TEXT, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;


-- ─── 8. Owner: the company's members (never the owner's own row) ───────────

CREATE OR REPLACE FUNCTION employers.list_company_members()
RETURNS TABLE (
  member_id INT,
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  member_role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    m.id,
    m.profile_id,
    nullif(btrim(concat_ws(' ', p.firstname, p.lastname)), ''),
    u.email::TEXT,
    m.member_role,
    COALESCE(m.status::TEXT, 'active'),
    m.created_at
  FROM employers.company_members m
  JOIN employers.companies c ON c.id = m.company_id
  LEFT JOIN core.profiles p ON p.id = m.profile_id
  LEFT JOIN auth.users u ON u.id = m.profile_id
  WHERE c.profile_id = auth.uid()
    AND m.profile_id IS DISTINCT FROM c.profile_id
    AND COALESCE(m.status::TEXT, 'active') IN ('active', 'approved')
  ORDER BY m.created_at;
$$;


-- ─── 9. Grants ─────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION employers.remove_company_members(INT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.remove_company_members(INT[]) TO authenticated;


-- ─── 10. Members removed before this migration: lock them now ──────────────
-- A company_member account with no membership and no open invitation

SELECT employers.set_member_account_access(p.id, false)
FROM core.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role::TEXT = 'company_member'
  AND NOT EXISTS (SELECT 1 FROM employers.company_members m WHERE m.profile_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM employers.company_invitations i
    WHERE i.email = lower(u.email) AND i.status = 'pending' AND i.expires_at > now()
  );

COMMIT;
