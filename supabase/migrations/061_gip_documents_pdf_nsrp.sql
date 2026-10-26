-- =============================================================================
-- Migration: 061_gip_documents_pdf_nsrp.sql
-- Purpose:   GIP application soft copies (060) become PDF only, and the NSRP Form 1 is attached too:
--            the application form generates it from the applicant's registry record and attaches the
--            PDF, which the applicant can view, remove or generate again.
--              1. esmdd.gip_applicant_documents.document_name also accepts 'NSRP'
--              2. mime_type must be application/pdf (NOT VALID: earlier image uploads stay readable)
--              3. Removing the NSRP file keeps 'NSRP' ticked in gip_applicants.document_submitted:
--                 the registry record itself is the NSRP, and PESO's review checklist locks it on
-- Schema:    esmdd
-- =============================================================================

BEGIN;

ALTER TABLE esmdd.gip_applicant_documents
  DROP CONSTRAINT IF EXISTS gip_applicant_documents_document_name_check;
ALTER TABLE esmdd.gip_applicant_documents
  ADD CONSTRAINT gip_applicant_documents_document_name_check CHECK (document_name IN (
    'NSRP', 'Resume', 'Application Letter', 'TOR/Form 137/Form 138/Diploma', 'Certificates'
  ));

ALTER TABLE esmdd.gip_applicant_documents
  DROP CONSTRAINT IF EXISTS gip_applicant_documents_pdf_check;
ALTER TABLE esmdd.gip_applicant_documents
  ADD CONSTRAINT gip_applicant_documents_pdf_check CHECK (mime_type = 'application/pdf') NOT VALID;

CREATE OR REPLACE FUNCTION esmdd.sync_gip_document_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.document_name <> 'NSRP' THEN
      UPDATE esmdd.gip_applicants
      SET document_submitted = array_remove(document_submitted, OLD.document_name)
      WHERE id = OLD.gip_applicant_id;
    END IF;
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

COMMIT;
