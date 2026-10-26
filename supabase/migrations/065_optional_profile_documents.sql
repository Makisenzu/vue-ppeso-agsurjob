-- =============================================================================
-- Migration: 065_optional_profile_documents.sql
-- Purpose:   Two optional document types on the applicant profile (Profile → Documents):
--              - TOR/Diploma   (Transcript of Records, Form 137 / 138, or Diploma)
--              - Certificates  (training or award certificates)
--            Uploaded once, they fill in the matching requirement of every program / vacancy
--            application automatically (AGENTS.md rule 16), e.g. GIP's
--            "TOR/Form 137/Form 138/Diploma" and "Certificates".
-- Schema:    public
--
-- Optional: account verification (030) still counts only Application Form, Resume and Birth
-- Certificate, and the profile's upload order (REQUIRED_UPLOAD_ORDER) never blocks these two.
-- Skips a type that already exists under any spelling (case, spaces, '/', '_' and '-' ignored).
-- Safe to re-run.
-- =============================================================================

BEGIN;

INSERT INTO public.requirement_templates (requirement_type, name, description, sort_order)
SELECT 'applicant_requirements', t.name, t.description, t.sort_order
FROM (VALUES
  ('TOR/Diploma', 'Optional: Transcript of Records, Form 137 / 138, or Diploma', 4),
  ('Certificates', 'Optional: training or award certificates, in one file', 5)
) AS t (name, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.requirement_templates r
  WHERE r.requirement_type IN ('applicant_requirements', 'applicant_requirement')
    AND lower(regexp_replace(r.name, '[\s/_-]+', '', 'g')) = lower(regexp_replace(t.name, '[\s/_-]+', '', 'g'))
);

COMMIT;
