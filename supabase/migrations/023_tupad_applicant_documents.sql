-- =============================================================================
-- Migration: 023_tupad_applicant_documents.sql
-- Purpose:   Let applicants complete their own TUPAD application, the way SPES works:
--            they enter their monthly income / dependent and attach a file for every
--            required document they tick. PESO can tick documents without a file.
--
--              1. esmdd.tupad_applicant_documents — one current file per required document
--              2. NSRP Form can never be removed from tupad_applicants.doc_submitted
--              3. RLS: applicants edit their own TUPAD application and documents while it is
--                 still Pending and they are not yet in a batch
-- Schema:    esmdd
--
-- Data model:
--   tupad_applicants ──< tupad_applicant_documents (UNIQUE tupad_applicant_id, document_name)
--
-- Access Matrix:
--   Table                      | provincial_peso | municipal_peso / admin | applicant
--   ---------------------------|-----------------|------------------------|---------------------------------------
--   tupad_applicants           | (migration 020) | (migration 020)        | + update own while Pending, not in a batch
--   tupad_applicant_documents  | full CRUD       | read                   | read own; insert / update / delete own
--                              |                 |                        | while Pending, not in a batch
--
-- Storage path convention (same as 014 / 016): documents/<uploader auth.uid()>/<file>
-- PESO staff already read every file in the documents bucket (staff_documents_select, migration 014).
-- Document names must match TUPAD_DOCUMENT_OPTIONS in src/types/common/tupad.ts.
-- =============================================================================


-- ─── 1. tupad_applicant_documents ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.tupad_applicant_documents (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tupad_applicant_id  UUID         NOT NULL REFERENCES esmdd.tupad_applicants(id) ON DELETE CASCADE,
  document_name       TEXT         NOT NULL CHECK (document_name IN ('NSRP Form', 'Valid ID', 'TUPAD Form')),
  file_name           TEXT         NOT NULL,
  path                TEXT         NOT NULL,
  mime_type           TEXT,
  size                BIGINT       CHECK (size IS NULL OR size >= 0),
  uploaded_by         UUID         REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One current file per document; a new upload replaces the row
  CONSTRAINT tupad_applicant_documents_name_key UNIQUE (tupad_applicant_id, document_name)
);

COMMENT ON TABLE esmdd.tupad_applicant_documents IS
  'Files (documents bucket) the applicant attached to the required TUPAD documents ticked in tupad_applicants.doc_submitted.';

DROP TRIGGER IF EXISTS trg_tupad_applicant_documents_updated_at ON esmdd.tupad_applicant_documents;
CREATE TRIGGER trg_tupad_applicant_documents_updated_at
  BEFORE UPDATE ON esmdd.tupad_applicant_documents
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_tupad_updated_at();


-- ─── 2. NSRP Form is always submitted ──────────────────────────────────────
-- Migration 022 backfilled every row, so the constraint validates.

ALTER TABLE esmdd.tupad_applicants
  DROP CONSTRAINT IF EXISTS tupad_applicants_nsrp_form_check;
ALTER TABLE esmdd.tupad_applicants
  ADD CONSTRAINT tupad_applicants_nsrp_form_check CHECK ('NSRP Form' = ANY (doc_submitted));


-- ─── 3. Applicant can still edit their TUPAD application ───────────────────
-- Pending and not yet added to any batch. Used by the RLS policies below.

CREATE OR REPLACE FUNCTION esmdd.can_edit_own_tupad_application(p_tupad_applicant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM esmdd.tupad_applicants ta
    JOIN applicants.applicants a ON a.id = ta.applicant_id
    WHERE ta.id = p_tupad_applicant_id
      AND ta.status = 'Pending'
      AND a.profile_id = (SELECT auth.uid())
      AND NOT EXISTS (SELECT 1 FROM esmdd.tupad t WHERE t.tupad_applicant_id = ta.id)
  );
$$;


-- ─── 4. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.tupad_applicant_documents TO authenticated;
GRANT ALL ON esmdd.tupad_applicant_documents TO service_role;

ALTER TABLE esmdd.tupad_applicant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provincial_peso_tupad_applicant_documents_all" ON esmdd.tupad_applicant_documents;
CREATE POLICY "provincial_peso_tupad_applicant_documents_all"
ON esmdd.tupad_applicant_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'provincial_peso'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'provincial_peso'
  )
);

DROP POLICY IF EXISTS "municipal_peso_and_admin_tupad_applicant_documents_select" ON esmdd.tupad_applicant_documents;
CREATE POLICY "municipal_peso_and_admin_tupad_applicant_documents_select"
ON esmdd.tupad_applicant_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('municipal_peso', 'admin')
  )
);

DROP POLICY IF EXISTS "applicant_own_tupad_applicant_documents_select" ON esmdd.tupad_applicant_documents;
CREATE POLICY "applicant_own_tupad_applicant_documents_select"
ON esmdd.tupad_applicant_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.tupad_applicants ta
    JOIN applicants.applicants a ON a.id = ta.applicant_id
    WHERE ta.id = tupad_applicant_documents.tupad_applicant_id
      AND a.profile_id = (SELECT auth.uid())
  )
);

-- Applicants upload into their own storage folder, only while the application is still editable
DROP POLICY IF EXISTS "applicant_own_tupad_applicant_documents_write" ON esmdd.tupad_applicant_documents;
CREATE POLICY "applicant_own_tupad_applicant_documents_write"
ON esmdd.tupad_applicant_documents
FOR ALL
TO authenticated
USING (esmdd.can_edit_own_tupad_application(tupad_applicant_id))
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND split_part(path, '/', 1) = (SELECT auth.uid())::text
  AND esmdd.can_edit_own_tupad_application(tupad_applicant_id)
);

-- Applicants fill in their own income / dependent / documents; WITH CHECK keeps the status
-- Pending, so they cannot approve themselves
DROP POLICY IF EXISTS "applicant_own_tupad_applicants_update" ON esmdd.tupad_applicants;
CREATE POLICY "applicant_own_tupad_applicants_update"
ON esmdd.tupad_applicants
FOR UPDATE
TO authenticated
USING (esmdd.can_edit_own_tupad_application(id))
WITH CHECK (
  status = 'Pending'
  AND EXISTS (
    SELECT 1 FROM applicants.applicants a
    WHERE a.id = tupad_applicants.applicant_id
      AND a.profile_id = (SELECT auth.uid())
  )
);
