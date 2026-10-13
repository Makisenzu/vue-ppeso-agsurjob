-- =============================================================================
-- Migration: 009_job_fair_attachments.sql
-- Purpose:   Optional picture / PDF attachments for job fairs:
--              - Storage bucket 'job-fair-attachments'
--              - Table esmdd.job_fair_attachments (file metadata)
--            Both are protected by RLS.
-- Schema:    esmdd, storage
--
-- Access Matrix (mirrors 005_job_fair_rls_policies.sql):
--   Resource               | provincial_peso / admin | other authenticated
--   -----------------------|-------------------------|--------------------
--   job_fair_attachments   | full CRUD               | read
--   job-fair-attachments   | full CRUD               | read
--   (storage bucket)       |                         |
--
-- Storage path convention (enforced by the storage INSERT policy):
--   job-fair-attachments/<job_fair_id>/<filename>
-- Files are grouped by job fair instead of by uploader because job fairs are
-- shared records: any provincial PESO staff member must be able to clean up
-- the files of a job fair they delete. The first folder must be an existing
-- job fair id, so paths can never be built from arbitrary input.
-- =============================================================================

BEGIN;


-- ─── 1. Storage Bucket (public read) ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-fair-attachments',
  'job-fair-attachments',
  true,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ─── 2. Storage Policies (storage.objects already has RLS enabled) ─────────

-- Policy: Any signed-in user can view job fair attachments
DROP POLICY IF EXISTS "authenticated_job_fair_attachments_select" ON storage.objects;
CREATE POLICY "authenticated_job_fair_attachments_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-fair-attachments');

-- Policy: Provincial PESO / Admin can upload under an existing job fair folder
DROP POLICY IF EXISTS "provincial_peso_job_fair_attachments_insert" ON storage.objects;
CREATE POLICY "provincial_peso_job_fair_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-fair-attachments'
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
  AND EXISTS (
    SELECT 1 FROM esmdd.job_fairs
    WHERE job_fairs.id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Provincial PESO / Admin can replace attachments
DROP POLICY IF EXISTS "provincial_peso_job_fair_attachments_update" ON storage.objects;
CREATE POLICY "provincial_peso_job_fair_attachments_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-fair-attachments'
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'job-fair-attachments'
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
);

-- Policy: Provincial PESO / Admin can delete attachments
DROP POLICY IF EXISTS "provincial_peso_job_fair_attachments_delete" ON storage.objects;
CREATE POLICY "provincial_peso_job_fair_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-fair-attachments'
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
);


-- ─── 3. Table: esmdd.job_fair_attachments ──────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_fair_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_fair_id UUID NOT NULL
    REFERENCES esmdd.job_fairs (id) ON DELETE CASCADE,
  uploaded_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size BIGINT CHECK (size IS NULL OR size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_fair_attachments_job_fair_id
  ON esmdd.job_fair_attachments (job_fair_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION esmdd.set_job_fair_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_job_fair_attachments_updated_at ON esmdd.job_fair_attachments;
CREATE TRIGGER trigger_job_fair_attachments_updated_at
BEFORE UPDATE ON esmdd.job_fair_attachments
FOR EACH ROW
EXECUTE FUNCTION esmdd.set_job_fair_attachments_updated_at();


-- ─── 4. Enable Row Level Security ──────────────────────────────────────────

ALTER TABLE esmdd.job_fair_attachments ENABLE ROW LEVEL SECURITY;


-- ─── 5. esmdd.job_fair_attachments Policies ────────────────────────────────

-- Policy: Provincial PESO / Admin full access (CRUD)
DROP POLICY IF EXISTS "provincial_peso_job_fair_attachments_all" ON esmdd.job_fair_attachments;
CREATE POLICY "provincial_peso_job_fair_attachments_all"
ON esmdd.job_fair_attachments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'admin')
  )
);

-- Policy: Any signed-in user can view job fair attachments
DROP POLICY IF EXISTS "authenticated_job_fair_attachments_select" ON esmdd.job_fair_attachments;
CREATE POLICY "authenticated_job_fair_attachments_select"
ON esmdd.job_fair_attachments
FOR SELECT
TO authenticated
USING (true);


-- ─── 6. Grant permissions to Supabase roles ────────────────────────────────
-- Table privileges only open the door; the RLS policies above decide which
-- rows each role can actually read or write.

GRANT USAGE ON SCHEMA esmdd TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON esmdd.job_fair_attachments TO authenticated;
GRANT ALL ON esmdd.job_fair_attachments TO service_role;

COMMIT;
