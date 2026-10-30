-- =============================================================================
-- Migration: 082_fix_accept_company_invitation.sql
-- Purpose:   Fixes employers.accept_company_invitation (081): it inserted role = 'company_member'
--            into employers.company_members.role, which is the legacy public.user_role enum
--            ('applicant' / 'employer' / 'peso_staff' / 'admin'), so accepting failed with
--            "invalid input value for enum". The column is now left NULL; access comes from the
--            active membership (is_company_member, 034) and member_role (081).
-- Schemas:   employers
-- Safe to re-run.
-- =============================================================================

BEGIN;

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

REVOKE ALL ON FUNCTION employers.accept_company_invitation(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employers.accept_company_invitation(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
