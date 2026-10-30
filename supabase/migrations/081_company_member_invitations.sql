-- =============================================================================
-- Migration: 081_company_member_invitations.sql
-- Purpose:   A company owner invites people to work in the company's account. Each person signs
--            in with their own account (role company_member); the owner never creates accounts
--            or knows their passwords.
--              1. employers.company_members.member_role: 'recruiter' / 'viewer'
--              2. Table employers.company_invitations (one pending invite per company + email)
--              3. core.guard_profile_privileged_columns: accepting an invitation may create a
--                 company_member profile (only inside employers.accept_company_invitation)
--              4. RPCs: invite_company_member, revoke_company_invitation, list_company_members,
--                 remove_company_member, get_company_invitation, accept_company_invitation
-- Schemas:   employers, core
--
-- Flow:
--   owner → invite_company_member(email, role)  → returns the invitation id + a one-time token
--   app   → Edge Function invite-company-member  → emails the invite link (/accept-invite?token=…)
--   invitee opens the link (signed in by the email link), sets a password and their name
--   invitee → accept_company_invitation(token, …) → core.profiles (company_member) + company_members
--   Members then accept the Privacy Notice like every account (router guard, 073). They never fill
--   in NSRP Form 1 (applicants) or Form 2 (owners).
--
-- Rules:
--   * An email that already has an AGSURJOBS account cannot be invited (one account, one role):
--     the person uses a different (work) email.
--   * Only the token's SHA-256 is stored; the token itself is only in the email link.
--   * Invitations expire after 7 days. Re-inviting the same email rotates the token.
--   * Removing a member closes the membership (status 'closed'); is_company_member (034) then
--     denies access. The account itself stays (the person can request its deletion, 069 / 073).
--
-- Access Matrix:
--   Resource                  | owner                 | member | provincial_peso | admin
--   --------------------------|-----------------------|--------|-----------------|------
--   company_invitations       | read (RPCs write)     |   —    |       —         | all
--   company_members (034)     | all                   | read   | read            | all
--
-- Privacy (RA 10173): an invitation holds the invitee's email only until it is accepted, revoked
-- or the company is deleted (ON DELETE CASCADE).
-- Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Member role ────────────────────────────────────────────────────────

ALTER TABLE employers.company_members ADD COLUMN IF NOT EXISTS member_role TEXT;

ALTER TABLE employers.company_members DROP CONSTRAINT IF EXISTS company_members_member_role_check;
ALTER TABLE employers.company_members
  ADD CONSTRAINT company_members_member_role_check
  CHECK (member_role IS NULL OR member_role IN ('recruiter', 'viewer'));

COMMENT ON COLUMN employers.company_members.member_role IS
  'What the member may do: recruiter (post jobs, review applicants) or viewer (read only) (081)';


-- ─── 2. Invitations ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employers.company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES employers.companies (id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  member_role TEXT NOT NULL CHECK (member_role IN ('recruiter', 'viewer')),
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by UUID DEFAULT auth.uid() REFERENCES core.profiles (id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_by UUID REFERENCES core.profiles (id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_one_pending
  ON employers.company_invitations (company_id, email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS company_invitations_token_hash_idx
  ON employers.company_invitations (token_hash) WHERE status = 'pending';

ALTER TABLE employers.company_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON employers.company_invitations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON employers.company_invitations FROM authenticated;
GRANT SELECT ON employers.company_invitations TO authenticated;

DROP POLICY IF EXISTS owner_select ON employers.company_invitations;
CREATE POLICY owner_select ON employers.company_invitations
FOR SELECT TO authenticated
USING (employers.is_company_owner(company_id));

DROP POLICY IF EXISTS admin_all ON employers.company_invitations;
CREATE POLICY admin_all ON employers.company_invitations
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));


-- ─── 3. Profile guard: invitation acceptance may create a company_member ───
-- Same as 033, plus one trusted path: employers.accept_company_invitation sets the transaction-
-- local flag below right before inserting the invitee's profile. Clients cannot set it: they only
-- reach the database through PostgREST, which does not expose set_config.

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

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to change account role or status.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION core.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;


-- ─── 4. RPCs ───────────────────────────────────────────────────────────────

-- Hex token from two random UUIDs (~244 random bits), so no extension is needed
CREATE OR REPLACE FUNCTION employers.new_invitation_token()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT replace(gen_random_uuid()::TEXT || gen_random_uuid()::TEXT, '-', '');
$$;

CREATE OR REPLACE FUNCTION employers.hash_invitation_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

REVOKE ALL ON FUNCTION employers.new_invitation_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION employers.hash_invitation_token(TEXT) FROM PUBLIC, anon, authenticated;


-- Owner: invite (or re-invite) an email. Returns the token once, for the invite email.
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

  -- One account, one role: an email with an AGSURJOBS account must use a different email.
  -- Invited-but-not-accepted logins have no profile yet, so they can be invited again.
  IF EXISTS (
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

  RETURN QUERY SELECT v_id, v_token;
END;
$$;


-- Owner: cancel a pending invitation (its link stops working)
CREATE OR REPLACE FUNCTION employers.revoke_company_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE employers.company_invitations i
  SET status = 'revoked', updated_at = now()
  WHERE i.id = p_invitation_id
    AND i.status = 'pending'
    AND employers.is_company_owner(i.company_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;


-- Owner: the company's members with their names and emails (core.profiles of other people is not
-- readable by the owner through RLS, so this returns only what the Team page shows)
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
    m.status::TEXT,
    m.created_at
  FROM employers.company_members m
  JOIN employers.companies c ON c.id = m.company_id
  LEFT JOIN core.profiles p ON p.id = m.profile_id
  LEFT JOIN auth.users u ON u.id = m.profile_id
  WHERE c.profile_id = auth.uid()
    AND m.status::TEXT IN ('active', 'approved')
  ORDER BY m.created_at;
$$;


-- Owner: remove a member (closes the membership; access ends at once)
CREATE OR REPLACE FUNCTION employers.remove_company_member(p_member_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE employers.company_members m
  SET status = 'closed', updated_at = now()
  WHERE m.id = p_member_id
    AND m.profile_id IS DISTINCT FROM auth.uid()
    AND employers.is_company_owner(m.company_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;


-- Invitee (signed in through the invite email): what they are joining
CREATE OR REPLACE FUNCTION employers.get_company_invitation(p_token TEXT)
RETURNS TABLE (company_name TEXT, email TEXT, member_role TEXT, is_expired BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.company_name, i.email, i.member_role, i.expires_at < now()
  FROM employers.company_invitations i
  JOIN employers.companies c ON c.id = i.company_id
  WHERE i.token_hash = employers.hash_invitation_token(p_token)
    AND i.status = 'pending'
    AND i.email = (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid());
$$;


-- Invitee: accept. Creates their company_member profile and membership in one step.
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Open the invitation link from your email first' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(p_firstname), '') IS NULL OR nullif(btrim(p_lastname), '') IS NULL THEN
    RAISE EXCEPTION 'Enter your first and last name' USING ERRCODE = '22023';
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
  IF EXISTS (SELECT 1 FROM core.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'This email already has an AGSURJOBS account. Ask the owner to invite a different email.'
      USING ERRCODE = '23505';
  END IF;

  -- Lets core.guard_profile_privileged_columns accept this one company_member profile
  PERFORM set_config('agsurjobs.accepting_company_invitation', 'on', true);
  INSERT INTO core.profiles (id, firstname, lastname, contact_number, role, status)
  VALUES (v_uid, btrim(p_firstname), btrim(p_lastname), nullif(btrim(p_contact_number), ''),
          'company_member', 'approved');
  PERFORM set_config('agsurjobs.accepting_company_invitation', 'off', true);

  -- company_members.role is the legacy public.user_role (no company_member value): left NULL.
  -- Access comes from the active membership (is_company_member, 034); member_role says what they do.
  INSERT INTO employers.company_members (company_id, profile_id, status, member_role)
  VALUES (v_invitation.company_id, v_uid, 'active', v_invitation.member_role);

  UPDATE employers.company_invitations
  SET status = 'accepted', accepted_by = v_uid, accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;
END;
$$;

REVOKE ALL ON FUNCTION employers.invite_company_member(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.revoke_company_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.list_company_members() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.remove_company_member(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.get_company_invitation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION employers.accept_company_invitation(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.invite_company_member(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION employers.revoke_company_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION employers.list_company_members() TO authenticated;
GRANT EXECUTE ON FUNCTION employers.remove_company_member(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION employers.get_company_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION employers.accept_company_invitation(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
