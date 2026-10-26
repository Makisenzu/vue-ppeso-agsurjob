-- =============================================================================
-- Migration: 058_requirement_status_remarks.sql
-- Purpose:   Fix: `remarks` on applicants.applicant_requirements holds the document's NAME ("Application
--            Form", "Resume", "Birth Certificate"; set by applicantRequirementUploadService), and the
--            applicant's profile stepper / upload dialog find each document by it. The 055 review-remarks
--            change wrote staff remarks into that column, wiping the names (NULL on approve, the reason on
--            reject), so uploaded documents showed as missing. Review remarks now get their own column:
--              - applicants.applicant_requirements.status_remarks
--              - employers.employer_requirements.status_remarks
--              - Repair: move review text out of `remarks` and restore the document name
--              - system.notify_requirement_status() reads status_remarks
-- Schemas:   applicants, employers, system
-- Safe to re-run.
-- =============================================================================


-- ─── 1. Columns ─────────────────────────────────────────────────────────────

ALTER TABLE applicants.applicant_requirements ADD COLUMN IF NOT EXISTS status_remarks TEXT;
ALTER TABLE employers.employer_requirements  ADD COLUMN IF NOT EXISTS status_remarks TEXT;

COMMENT ON COLUMN applicants.applicant_requirements.remarks IS 'Document name the applicant uploaded it as (e.g. "Application Form"); matched by the profile stepper. Not for review notes.';
COMMENT ON COLUMN applicants.applicant_requirements.status_remarks IS 'Why the document was rejected; required by the app for Rejected (058).';
COMMENT ON COLUMN employers.employer_requirements.status_remarks IS 'Why the document was rejected; required by the app for Rejected (058).';


-- ─── 2. Repair the wiped document names ─────────────────────────────────────
-- Only legacy account-verification documents (no spes_form_id) whose `remarks` is not one of the three
-- names. A rejected row's `remarks` then holds the staff reason: keep it in status_remarks.

WITH damaged AS (
  SELECT
    r.id,
    r.status::TEXT AS status,
    r.remarks,
    CASE
      WHEN lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '', 'g')) LIKE '%applicationform%' THEN 'Application Form'
      WHEN lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '', 'g')) LIKE '%birthcertificate%' THEN 'Birth Certificate'
      WHEN lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '', 'g')) LIKE '%resume%' THEN 'Resume'
    END AS document_name
  FROM applicants.applicant_requirements r
  JOIN public.requirement_templates t ON t.id = r.requirement_id
  WHERE r.spes_form_id IS NULL
    AND (r.remarks IS NULL OR r.remarks NOT IN ('Application Form', 'Resume', 'Birth Certificate'))
)
UPDATE applicants.applicant_requirements r
SET
  status_remarks = CASE
    WHEN d.status = 'rejected' AND nullif(btrim(d.remarks), '') IS NOT NULL THEN coalesce(r.status_remarks, d.remarks)
    ELSE r.status_remarks
  END,
  remarks = d.document_name
FROM damaged d
WHERE r.id = d.id
  AND d.document_name IS NOT NULL;


-- ─── 3. Document notifications read the new column ──────────────────────────

CREATE OR REPLACE FUNCTION system.notify_requirement_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(t.name, t.requirement_type) INTO v_name
  FROM public.requirement_templates t
  WHERE t.id = NEW.requirement_id;
  v_name := coalesce(v_name, 'document');

  v_message := CASE NEW.status::TEXT
    WHEN 'approved' THEN 'Your ' || v_name || ' has been approved.'
    WHEN 'rejected' THEN 'Your ' || v_name || ' was rejected. Please upload a new copy.'
    WHEN 'pending'  THEN 'Your ' || v_name || ' is back under review.'
    ELSE 'Your ' || v_name || ' status is now ' || NEW.status::TEXT || '.'
  END;

  PERFORM system.notify(
    NEW.profile_id, 'document_status', 'Document Status Update', v_message,
    system.status_remarks(NEW.status::TEXT, NEW.status_remarks)
  );
  RETURN NULL;
END;
$$;
