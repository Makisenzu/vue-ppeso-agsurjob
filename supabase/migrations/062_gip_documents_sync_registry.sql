-- =============================================================================
-- Migration: 062_gip_documents_sync_registry.sql
-- Purpose:   Files the applicant uploads to their GIP application (060 / 061) now also tick the
--            document in their registry record, applicants.applicants.documents_submitted.
--            PESO's "Edit GIP Applicant" checklist reads that column first (mapToGipApplicantRecord),
--            and PESO's own review saves both columns, so the trigger keeps them in step the same way.
--            Existing uploads are backfilled into both columns.
-- Schema:    esmdd, applicants
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION esmdd.sync_gip_document_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_gip_applicant_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.gip_applicant_id ELSE NEW.gip_applicant_id END;
  v_document TEXT := CASE WHEN TG_OP = 'DELETE' THEN OLD.document_name ELSE NEW.document_name END;
  v_applicant_id UUID;
BEGIN
  SELECT applicant_id INTO v_applicant_id FROM esmdd.gip_applicants WHERE id = v_gip_applicant_id;

  IF TG_OP = 'DELETE' THEN
    -- The registry record itself is the NSRP, so removing its PDF keeps it ticked
    IF v_document <> 'NSRP' THEN
      UPDATE esmdd.gip_applicants
      SET document_submitted = array_remove(document_submitted, v_document)
      WHERE id = v_gip_applicant_id;

      UPDATE applicants.applicants
      SET documents_submitted = array_remove(documents_submitted, v_document)
      WHERE id = v_applicant_id;
    END IF;
    RETURN NULL;
  END IF;

  UPDATE esmdd.gip_applicants
  SET document_submitted = array_append(coalesce(document_submitted, '{}'), v_document)
  WHERE id = v_gip_applicant_id
    AND NOT (v_document = ANY (coalesce(document_submitted, '{}')));

  UPDATE applicants.applicants
  SET documents_submitted = array_append(coalesce(documents_submitted, '{}'), v_document)
  WHERE id = v_applicant_id
    AND NOT (v_document = ANY (coalesce(documents_submitted, '{}')));
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION esmdd.sync_gip_document_submitted() FROM PUBLIC, anon, authenticated;


-- ─── Backfill uploads made before this migration ───────────────────────────

UPDATE esmdd.gip_applicants ga
SET document_submitted = (
  SELECT array_agg(DISTINCT d)
  FROM unnest(coalesce(ga.document_submitted, '{}') || docs.names) d
)
FROM (
  SELECT gip_applicant_id, array_agg(document_name) AS names
  FROM esmdd.gip_applicant_documents
  GROUP BY gip_applicant_id
) docs
WHERE docs.gip_applicant_id = ga.id
  AND NOT (docs.names <@ coalesce(ga.document_submitted, '{}'));

UPDATE applicants.applicants a
SET documents_submitted = (
  SELECT array_agg(DISTINCT d)
  FROM unnest(coalesce(a.documents_submitted, '{}') || docs.names) d
)
FROM (
  SELECT ga.applicant_id, array_agg(gd.document_name) AS names
  FROM esmdd.gip_applicant_documents gd
  JOIN esmdd.gip_applicants ga ON ga.id = gd.gip_applicant_id
  WHERE ga.applicant_id IS NOT NULL
  GROUP BY ga.applicant_id
) docs
WHERE docs.applicant_id = a.id
  AND NOT (docs.names <@ coalesce(a.documents_submitted, '{}'));

COMMIT;
