-- =============================================================================
-- Migration: 013_spes_form_applicant_link.sql
-- Purpose:   Let a SPES referral from Entry of Applicants create the applicant's
--            SPES form directly, like GIP referrals do for esmdd.gip_applicants.
--              1. applicants.spes_form.applicant_id → applicants.applicants.id
--              2. profile_id becomes optional (walk-in applicants have no account)
--              3. Every form still belongs to an account or a registry applicant
-- Schema:    applicants
--
-- RLS is unchanged: the *_own policies match profile_id = auth.uid(), so forms
-- without an account stay visible to PESO staff only (spes_form_staff_all).
-- =============================================================================


-- ─── 1. Link to the registry applicant ─────────────────────────────────────

ALTER TABLE applicants.spes_form
  ADD COLUMN IF NOT EXISTS applicant_id uuid;

ALTER TABLE applicants.spes_form
  DROP CONSTRAINT IF EXISTS spes_form_applicant_id_fkey;
ALTER TABLE applicants.spes_form
  ADD CONSTRAINT spes_form_applicant_id_fkey
  FOREIGN KEY (applicant_id) REFERENCES applicants.applicants (id) ON DELETE CASCADE;

-- One SPES form per registry applicant
DROP INDEX IF EXISTS applicants.spes_form_applicant_id_key;
CREATE UNIQUE INDEX spes_form_applicant_id_key
  ON applicants.spes_form (applicant_id)
  WHERE applicant_id IS NOT NULL;

-- Link each account's latest form to its registry record
UPDATE applicants.spes_form f
SET applicant_id = latest.applicant_id
FROM (
  SELECT DISTINCT ON (a.id) a.id AS applicant_id, sf.id AS form_id
  FROM applicants.applicants a
  JOIN applicants.spes_form sf ON sf.profile_id = a.profile_id
  ORDER BY a.id, sf.created_at DESC
) latest
WHERE f.id = latest.form_id
  AND f.applicant_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM applicants.spes_form o WHERE o.applicant_id = latest.applicant_id);


-- ─── 2. Account link is optional ───────────────────────────────────────────

ALTER TABLE applicants.spes_form
  ALTER COLUMN profile_id DROP NOT NULL;


-- ─── 3. A form must belong to someone ──────────────────────────────────────

ALTER TABLE applicants.spes_form DROP CONSTRAINT IF EXISTS spes_form_owner_check;
ALTER TABLE applicants.spes_form
  ADD CONSTRAINT spes_form_owner_check CHECK (profile_id IS NOT NULL OR applicant_id IS NOT NULL);
