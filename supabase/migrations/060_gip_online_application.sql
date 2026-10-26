-- =============================================================================
-- Migration: 060_gip_online_application.sql
-- Purpose:   Lets a signed-in applicant apply to GIP from the GIP page by uploading soft copies of
--            the requirements. NSRP is not uploaded: it is the applicant's registry record
--            (applicants.applicants), filled in right after the account is created.
--
--              1. esmdd.gip_applicant_documents — one current file per required document
--              2. Uploads keep gip_applicants.document_submitted in step (the PESO review checklist)
--              3. RLS: applicants upload their own files while the application is still Pending
--                 and they are not yet an intern
--              4. RPC esmdd.apply_to_gip() — creates the application, notifies Provincial PESO
-- Schema:    esmdd, applicants, system
--
-- Data model:
--   gip_applicants ──< gip_applicant_documents (UNIQUE gip_applicant_id, document_name)
--
-- Access Matrix:
--   Resource                  | provincial_peso | municipal_peso / admin | applicant
--   --------------------------|-----------------|------------------------|-----------------------------------
--   gip_applicant_documents   | full CRUD       | read                   | read own; insert / update / delete
--                             |                 |                        | own while Pending, not yet an intern
--   esmdd.apply_to_gip()      | —               | —                      | execute (own registry record)
--
-- Same shape as TUPAD's 023. Applicants still have no INSERT / UPDATE policy on gip_applicants (034):
-- the RPC creates the row, so they can't pick their own status or remarks. Like PESO's referral
-- (applicantEntryService.referToGip) it adds 'GIP' to referred_programs, so a later registry save by
-- PESO keeps the application instead of removing it (unreferFromGip).
--
-- Storage path convention (same as 014 / 023): documents/<uploader auth.uid()>/<file>
-- PESO staff already read every file in the documents bucket (staff_documents_select, migration 014).
-- Document names must match GIP_UPLOAD_DOCUMENTS in src/types/common/gipProgram.ts and the review
-- checklist (DOCUMENT_OPTIONS in useApplicantNewEntry.ts).
-- =============================================================================

BEGIN;


-- ─── 1. gip_applicant_documents ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.gip_applicant_documents (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gip_applicant_id  UUID         NOT NULL REFERENCES esmdd.gip_applicants(id) ON DELETE CASCADE,
  document_name     TEXT         NOT NULL CHECK (document_name IN (
                                   'Resume', 'Application Letter', 'TOR/Form 137/Form 138/Diploma', 'Certificates'
                                 )),
  file_name         TEXT         NOT NULL,
  path              TEXT         NOT NULL,
  mime_type         TEXT,
  size              BIGINT       CHECK (size IS NULL OR size >= 0),
  uploaded_by       UUID         REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One current file per document; a new upload replaces the row
  CONSTRAINT gip_applicant_documents_name_key UNIQUE (gip_applicant_id, document_name)
);

COMMENT ON TABLE esmdd.gip_applicant_documents IS
  'Soft copies (documents bucket) of the GIP requirements, uploaded by the applicant.';

CREATE OR REPLACE FUNCTION esmdd.set_gip_document_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gip_applicant_documents_updated_at ON esmdd.gip_applicant_documents;
CREATE TRIGGER trg_gip_applicant_documents_updated_at
  BEFORE UPDATE ON esmdd.gip_applicant_documents
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_gip_document_updated_at();


-- ─── 2. Uploads tick the document in the review checklist ──────────────────
-- SECURITY DEFINER: applicants can't update gip_applicants themselves. A removed file unticks it;
-- PESO can still tick documents handed in on paper.

CREATE OR REPLACE FUNCTION esmdd.sync_gip_document_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE esmdd.gip_applicants
    SET document_submitted = array_remove(document_submitted, OLD.document_name)
    WHERE id = OLD.gip_applicant_id;
    RETURN NULL;
  END IF;

  UPDATE esmdd.gip_applicants
  SET document_submitted = array_append(coalesce(document_submitted, '{}'), NEW.document_name)
  WHERE id = NEW.gip_applicant_id
    AND NOT (NEW.document_name = ANY (coalesce(document_submitted, '{}')));
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.sync_gip_document_submitted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_gip_applicant_documents_sync ON esmdd.gip_applicant_documents;
CREATE TRIGGER trg_gip_applicant_documents_sync
  AFTER INSERT OR DELETE ON esmdd.gip_applicant_documents
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.sync_gip_document_submitted();


-- ─── 3. Applicant can still edit their GIP application ─────────────────────
-- Pending and not yet an intern (no esmdd.gips row). Used by the RLS policies below.

CREATE OR REPLACE FUNCTION esmdd.can_edit_own_gip_application(p_gip_applicant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM esmdd.gip_applicants ga
    JOIN applicants.applicants a ON a.id = ga.applicant_id
    WHERE ga.id = p_gip_applicant_id
      AND coalesce(ga.status, 'Pending') = 'Pending'
      AND a.profile_id = (SELECT auth.uid())
      AND NOT EXISTS (SELECT 1 FROM esmdd.gips g WHERE g.application_id = ga.id)
  );
$$;


-- ─── 4. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.gip_applicant_documents TO authenticated;
GRANT ALL ON esmdd.gip_applicant_documents TO service_role;

ALTER TABLE esmdd.gip_applicant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provincial_peso_gip_applicant_documents_all" ON esmdd.gip_applicant_documents;
CREATE POLICY "provincial_peso_gip_applicant_documents_all"
ON esmdd.gip_applicant_documents
FOR ALL
TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS "municipal_peso_and_admin_gip_applicant_documents_select" ON esmdd.gip_applicant_documents;
CREATE POLICY "municipal_peso_and_admin_gip_applicant_documents_select"
ON esmdd.gip_applicant_documents
FOR SELECT
TO authenticated
USING ((SELECT core.has_role('municipal_peso', 'admin')));

DROP POLICY IF EXISTS "applicant_own_gip_applicant_documents_select" ON esmdd.gip_applicant_documents;
CREATE POLICY "applicant_own_gip_applicant_documents_select"
ON esmdd.gip_applicant_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.gip_applicants ga
    WHERE ga.id = gip_applicant_documents.gip_applicant_id
      AND applicants.owns_applicant(ga.applicant_id)
  )
);

-- Applicants upload into their own storage folder, only while the application is still editable
DROP POLICY IF EXISTS "applicant_own_gip_applicant_documents_write" ON esmdd.gip_applicant_documents;
CREATE POLICY "applicant_own_gip_applicant_documents_write"
ON esmdd.gip_applicant_documents
FOR ALL
TO authenticated
USING (esmdd.can_edit_own_gip_application(gip_applicant_id))
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND split_part(path, '/', 1) = (SELECT auth.uid())::text
  AND esmdd.can_edit_own_gip_application(gip_applicant_id)
);


-- ─── 5. RPC: apply to GIP ──────────────────────────────────────────────────
-- Returns the existing application when there is one (applied before, or referred by PESO).
-- The applicant isn't notified (system.notify skips the acting user); the page confirms with a toast.

DROP FUNCTION IF EXISTS esmdd.apply_to_gip();

CREATE FUNCTION esmdd.apply_to_gip()
RETURNS esmdd.gip_applicants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applicant applicants.applicants%ROWTYPE;
  v_row esmdd.gip_applicants%ROWTYPE;
  v_name TEXT;
  v_staff UUID;
BEGIN
  IF NOT core.has_role('applicant') THEN
    RAISE EXCEPTION 'Only applicants can apply to GIP' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_applicant FROM applicants.applicants WHERE profile_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complete your NSRP profile before applying to GIP' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_row FROM esmdd.gip_applicants
  WHERE applicant_id = v_applicant.id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  UPDATE applicants.applicants
  SET referred_programs = array_append(coalesce(referred_programs, '{}'), 'GIP')
  WHERE id = v_applicant.id
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(referred_programs, '{}')) p WHERE upper(btrim(p)) LIKE '%GIP%');

  -- NSRP is the registry record itself, so it counts as submitted from the start
  INSERT INTO esmdd.gip_applicants (applicant_id, status, document_submitted, remarks)
  VALUES (v_applicant.id, 'Pending', ARRAY['NSRP'], ARRAY['Applied online through AGSURJOBS'])
  RETURNING * INTO v_row;

  v_name := coalesce(nullif(btrim(concat_ws(' ', v_applicant.first_name, v_applicant.surname)), ''), 'An applicant');
  FOR v_staff IN SELECT id FROM core.profiles WHERE role::TEXT = 'provincial_peso' LOOP
    PERFORM system.notify(
      v_staff,
      'application_status',
      'New GIP Application',
      v_name || ' applied to the Government Internship Program. Review their documents in GIP Applicants.'
    );
  END LOOP;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.apply_to_gip() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.apply_to_gip() TO authenticated;

COMMIT;
