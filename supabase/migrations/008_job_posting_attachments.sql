-- =============================================================================
-- Migration: 008_job_posting_attachments.sql
-- Purpose:   Attachment uploads for job postings:
--              - Storage bucket 'job-posting-attachments'
--              - Table public.job_posting_attachments (file metadata)
--            Both are protected by RLS.
-- Schema:    public, storage
--
-- Access Matrix:
--   Resource                  | provincial_peso / municipal_peso / dole | admin       | everyone (anon + authenticated)
--   --------------------------|-----------------------------------------|-------------|--------------------------------
--   job_posting_attachments   | insert; update/delete own uploads       | full CRUD   | read
--   job-posting-attachments   | upload into own folder; update/delete   | full CRUD   | read
--   (storage bucket)          | own files                               |             |
--
-- Storage path convention (enforced by the storage policies):
--   job-posting-attachments/<uploader auth.uid()>/<job_posting_id>/<filename>
-- =============================================================================

BEGIN;


-- ─── 1. Storage Bucket (public read) ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-posting-attachments',
  'job-posting-attachments',
  true,
  20971520, -- 20MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ─── 2. Storage Policies (storage.objects already has RLS enabled) ─────────

-- Policy: Anyone can view / download attachments
DROP POLICY IF EXISTS "public_job_posting_attachments_select" ON storage.objects;
CREATE POLICY "public_job_posting_attachments_select"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'job-posting-attachments');

-- Policy: PESO / DOLE / Admin can upload into their own folder
DROP POLICY IF EXISTS "staff_job_posting_attachments_insert" ON storage.objects;
CREATE POLICY "staff_job_posting_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-posting-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole', 'admin')
  )
);

-- Policy: PESO / DOLE can update their own files; Admin can update any
DROP POLICY IF EXISTS "staff_job_posting_attachments_update" ON storage.objects;
CREATE POLICY "staff_job_posting_attachments_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-posting-attachments'
  AND (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM core.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole')
      )
    )
    OR EXISTS (
      SELECT 1 FROM core.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'job-posting-attachments'
  AND (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM core.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole')
      )
    )
    OR EXISTS (
      SELECT 1 FROM core.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
);

-- Policy: PESO / DOLE can delete their own files; Admin can delete any
DROP POLICY IF EXISTS "staff_job_posting_attachments_delete" ON storage.objects;
CREATE POLICY "staff_job_posting_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-posting-attachments'
  AND (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM core.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole')
      )
    )
    OR EXISTS (
      SELECT 1 FROM core.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
);


-- ─── 3. Table: public.job_posting_attachments ──────────────────────────────
-- Mirrors the column set of public.job_posting_media, plus uploader tracking.

CREATE TABLE IF NOT EXISTS public.job_posting_attachments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_posting_id BIGINT NOT NULL
    REFERENCES public.job_posting (id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE CASCADE,
  filename TEXT,
  path TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT CHECK (size IS NULL OR size >= 0),
  alt_text TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_posting_attachments_job_posting_id
  ON public.job_posting_attachments (job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_posting_attachments_uploaded_by
  ON public.job_posting_attachments (uploaded_by);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_job_posting_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_job_posting_attachments_updated_at ON public.job_posting_attachments;
CREATE TRIGGER trigger_job_posting_attachments_updated_at
BEFORE UPDATE ON public.job_posting_attachments
FOR EACH ROW
EXECUTE FUNCTION public.set_job_posting_attachments_updated_at();


-- ─── 4. Enable Row Level Security ──────────────────────────────────────────

ALTER TABLE public.job_posting_attachments ENABLE ROW LEVEL SECURITY;


-- ─── 5. public.job_posting_attachments Policies ────────────────────────────

-- Policy: Anyone can view attachment records
DROP POLICY IF EXISTS "public_job_posting_attachments_select" ON public.job_posting_attachments;
CREATE POLICY "public_job_posting_attachments_select"
ON public.job_posting_attachments
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: PESO / DOLE / Admin can add attachments as themselves
DROP POLICY IF EXISTS "staff_job_posting_attachments_insert" ON public.job_posting_attachments;
CREATE POLICY "staff_job_posting_attachments_insert"
ON public.job_posting_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole', 'admin')
  )
);

-- Policy: PESO / DOLE can update their own attachments; Admin can update any
DROP POLICY IF EXISTS "staff_job_posting_attachments_update" ON public.job_posting_attachments;
CREATE POLICY "staff_job_posting_attachments_update"
ON public.job_posting_attachments
FOR UPDATE
TO authenticated
USING (
  (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM core.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole')
    )
  )
  OR EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM core.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole')
    )
  )
  OR EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Policy: PESO / DOLE can delete their own attachments; Admin can delete any
DROP POLICY IF EXISTS "staff_job_posting_attachments_delete" ON public.job_posting_attachments;
CREATE POLICY "staff_job_posting_attachments_delete"
ON public.job_posting_attachments
FOR DELETE
TO authenticated
USING (
  (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM core.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('provincial_peso', 'municipal_peso', 'dole')
    )
  )
  OR EXISTS (
    SELECT 1 FROM core.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);


-- ─── 6. Grant permissions to Supabase roles ────────────────────────────────
-- Table privileges only open the door; the RLS policies above decide which
-- rows each role can actually read or write.

GRANT SELECT ON public.job_posting_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_posting_attachments TO authenticated;
GRANT ALL ON public.job_posting_attachments TO service_role;

COMMIT;
