-- =============================================================================
-- Migration: 014_spes_form_requirement_attachments.sql
-- Purpose:   Attach an image / PDF to each documentary requirement checked on a
--            SPES form, reusing the applicant requirement tables.
--              1. public.requirement_templates rows for the SPES requirements
--              2. applicants.applicant_requirements.spes_form_id → applicants.spes_form.id
--              3. RLS for applicant_requirements / applicant_requirement_media
--              4. Storage policies for the 'documents' bucket
-- Schemas:   public, applicants, storage
--
-- Data model:
--   spes_form ──< applicant_requirements (spes_form_id, requirement_id = SPES template)
--                    └──< applicant_requirement_media (path in the 'documents' bucket)
--
-- Access Matrix:
--   Table / bucket                 | admin / provincial / municipal PESO | applicant
--   -------------------------------|-------------------------------------|------------------------------------
--   applicant_requirements (SPES)  | full CRUD                           | CRUD on rows of own spes_form
--   applicant_requirement_media    | full CRUD                           | CRUD on media of own requirements
--   storage 'documents'            | read / upload / delete any file     | read / upload / delete own folder
--
-- Storage path convention: documents/<uploader auth.uid()>/<file>
-- =============================================================================


-- ─── 1. SPES requirement templates ─────────────────────────────────────────
-- Names match SPES_DOCUMENT_REQUIREMENTS labels in src/types/common/spesForm.ts

INSERT INTO public.requirement_templates (name, requirement_type, description)
SELECT t.name, 'spes', t.description
FROM (VALUES
  ('Birth certificate', 'SPES: PSA / NSO copy'),
  ('Proof of family income', 'SPES: ITR, certificate of tax exemption, or indigency from the barangay'),
  ('Proof of passing grades', 'SPES: Report card or transcript for the last school term'),
  ('Registrar certification', 'SPES: Certificate of enrollment / attendance from the school registrar'),
  ('Out-of-school youth certification', 'SPES: From the barangay or DSWD — out-of-school youth only')
) AS t (name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.requirement_templates r
  WHERE r.requirement_type = 'spes' AND r.name = t.name
);


-- ─── 2. applicant_requirements → spes_form ─────────────────────────────────

ALTER TABLE applicants.applicant_requirements
  ADD COLUMN IF NOT EXISTS spes_form_id uuid;

ALTER TABLE applicants.applicant_requirements
  DROP CONSTRAINT IF EXISTS applicant_requirements_spes_form_id_fkey;
ALTER TABLE applicants.applicant_requirements
  ADD CONSTRAINT applicant_requirements_spes_form_id_fkey
  FOREIGN KEY (spes_form_id) REFERENCES applicants.spes_form (id) ON DELETE CASCADE;

-- One requirement record per SPES form and template
DROP INDEX IF EXISTS applicants.applicant_requirements_spes_form_requirement_key;
CREATE UNIQUE INDEX applicant_requirements_spes_form_requirement_key
  ON applicants.applicant_requirements (spes_form_id, requirement_id)
  WHERE spes_form_id IS NOT NULL;

-- Media rows go with their requirement (a SPES form delete cascades all the way down)
ALTER TABLE applicants.applicant_requirement_media
  DROP CONSTRAINT IF EXISTS applicant_requirement_media_applicant_requirement_id_fkey;
ALTER TABLE applicants.applicant_requirement_media
  ADD CONSTRAINT applicant_requirement_media_applicant_requirement_id_fkey
  FOREIGN KEY (applicant_requirement_id) REFERENCES applicants.applicant_requirements (id) ON DELETE CASCADE;


-- ─── 3. Row Level Security ─────────────────────────────────────────────────
-- Policies are OR-ed with the existing ones, so the applicant profile
-- requirement uploads keep working unchanged.

GRANT SELECT, INSERT, UPDATE, DELETE ON applicants.applicant_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON applicants.applicant_requirement_media TO authenticated;

-- applicants.applicant_requirements -----------------------------------------

DROP POLICY IF EXISTS "staff_applicant_requirements_all" ON applicants.applicant_requirements;
CREATE POLICY "staff_applicant_requirements_all"
ON applicants.applicant_requirements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
);

DROP POLICY IF EXISTS "applicant_own_spes_requirements_all" ON applicants.applicant_requirements;
CREATE POLICY "applicant_own_spes_requirements_all"
ON applicants.applicant_requirements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applicants.spes_form f
    WHERE f.id = applicant_requirements.spes_form_id
      AND f.profile_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applicants.spes_form f
    WHERE f.id = applicant_requirements.spes_form_id
      AND f.profile_id = (SELECT auth.uid())
      AND f.status = 'Pending'
  )
);

-- applicants.applicant_requirement_media ------------------------------------

DROP POLICY IF EXISTS "staff_applicant_requirement_media_all" ON applicants.applicant_requirement_media;
CREATE POLICY "staff_applicant_requirement_media_all"
ON applicants.applicant_requirement_media
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
);

DROP POLICY IF EXISTS "applicant_own_spes_requirement_media_all" ON applicants.applicant_requirement_media;
CREATE POLICY "applicant_own_spes_requirement_media_all"
ON applicants.applicant_requirement_media
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM applicants.applicant_requirements r
    JOIN applicants.spes_form f ON f.id = r.spes_form_id
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND f.profile_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applicants.applicant_requirements r
    JOIN applicants.spes_form f ON f.id = r.spes_form_id
    WHERE r.id = applicant_requirement_media.applicant_requirement_id
      AND f.profile_id = (SELECT auth.uid())
      AND f.status = 'Pending'
  )
);


-- ─── 4. Storage: 'documents' bucket ────────────────────────────────────────

DROP POLICY IF EXISTS "staff_documents_select" ON storage.objects;
CREATE POLICY "staff_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
);

DROP POLICY IF EXISTS "staff_documents_insert" ON storage.objects;
CREATE POLICY "staff_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
);

DROP POLICY IF EXISTS "staff_documents_delete" ON storage.objects;
CREATE POLICY "staff_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'provincial_peso', 'municipal_peso')
  )
);

DROP POLICY IF EXISTS "owner_documents_select" ON storage.objects;
CREATE POLICY "owner_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "owner_documents_insert" ON storage.objects;
CREATE POLICY "owner_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "owner_documents_delete" ON storage.objects;
CREATE POLICY "owner_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
