-- =============================================================================
-- Migration: 086_job_vacancy_attachments.sql
-- Purpose:   Optional attachments on a vacancy (job poster, full job description, application form):
--              - Storage bucket 'job-vacancy-attachments' (PRIVATE: files open through signed URLs,
--                since the uploader decides what goes in and it must never be indexable)
--              - Table esmdd.job_vacancy_attachments (file metadata, up to 5 per vacancy)
-- Schema:    esmdd, storage
-- Depends on: 084_job_vacancy_skills.sql (esmdd.can_manage_job_vacancy)
--
-- Access Matrix (same rule as job_vacancies / job_vacancy_skills):
--   Resource                  | admin / provincial_peso | company_owner (own establishment) | other authenticated
--   --------------------------|-------------------------|-----------------------------------|--------------------
--   job_vacancy_attachments   | insert / delete, read   | insert / delete, read             | read
--   job-vacancy-attachments   | upload / delete, read   | upload / delete, read             | read (signed URL)
--
-- Storage path convention (enforced by the storage and table policies):
--   job-vacancy-attachments/<job_vacancy_id>/<uuid>-<filename>
-- Files are grouped by vacancy (not by uploader) so whoever may manage the vacancy can clean them up.
-- Deleting a vacancy cascades the rows; the app removes the stored files first (jobPostingService).
--
-- Notified events: none. Personal data: none expected (job information); the bucket stays private anyway.
-- After applying, re-run `npm run types:gen`. Safe to re-run.
-- =============================================================================

BEGIN;


-- ─── 1. Storage bucket (private) ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-vacancy-attachments',
  'job-vacancy-attachments',
  false,
  10485760, -- 10MB (BACKEND.md §19)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ─── 2. Folder → vacancy check ──────────────────────────────────────────────
-- The first folder must be a vacancy the caller may manage (never an arbitrary string)

CREATE OR REPLACE FUNCTION esmdd.can_manage_job_vacancy_folder(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM esmdd.job_vacancies v
    WHERE v.id::TEXT = (storage.foldername(p_object_name))[1]
      AND esmdd.can_manage_job_vacancy(v.id)
  );
$$;

REVOKE ALL ON FUNCTION esmdd.can_manage_job_vacancy_folder(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.can_manage_job_vacancy_folder(TEXT) TO authenticated;


-- ─── 3. Storage policies (storage.objects already has RLS enabled) ──────────

DROP POLICY IF EXISTS "authenticated_job_vacancy_attachments_select" ON storage.objects;
CREATE POLICY "authenticated_job_vacancy_attachments_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-vacancy-attachments');

DROP POLICY IF EXISTS "manager_job_vacancy_attachments_insert" ON storage.objects;
CREATE POLICY "manager_job_vacancy_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-vacancy-attachments'
  AND (SELECT esmdd.can_manage_job_vacancy_folder(name))
);

DROP POLICY IF EXISTS "manager_job_vacancy_attachments_delete" ON storage.objects;
CREATE POLICY "manager_job_vacancy_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-vacancy-attachments'
  AND (
    (SELECT esmdd.can_manage_job_vacancy_folder(name))
    -- The uploader can still clean up after the vacancy itself was deleted
    OR owner_id = (SELECT auth.uid())::TEXT
  )
);


-- ─── 4. Table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.job_vacancy_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_vacancy_id UUID NOT NULL REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL CHECK (char_length(btrim(filename)) BETWEEN 1 AND 200),
  mime_type TEXT,
  size BIGINT CHECK (size IS NULL OR size BETWEEN 0 AND 10485760),
  uploaded_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The row points at a file in its own vacancy's folder
  CONSTRAINT job_vacancy_attachments_path_in_folder CHECK (split_part(path, '/', 1) = job_vacancy_id::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_job_vacancy_attachments_vacancy
  ON esmdd.job_vacancy_attachments (job_vacancy_id, created_at);

-- Up to 5 attachments per vacancy
CREATE OR REPLACE FUNCTION esmdd.guard_job_vacancy_attachment_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Serialize inserts for the same vacancy so two uploads can't both pass the count
  PERFORM 1 FROM esmdd.job_vacancies WHERE id = NEW.job_vacancy_id FOR UPDATE;
  IF (SELECT count(*) FROM esmdd.job_vacancy_attachments WHERE job_vacancy_id = NEW.job_vacancy_id) >= 5 THEN
    RAISE EXCEPTION 'A vacancy can have up to 5 attachments' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_vacancy_attachment_limit ON esmdd.job_vacancy_attachments;
CREATE TRIGGER trg_job_vacancy_attachment_limit
BEFORE INSERT ON esmdd.job_vacancy_attachments
FOR EACH ROW EXECUTE FUNCTION esmdd.guard_job_vacancy_attachment_limit();


-- ─── 5. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE esmdd.job_vacancy_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_select ON esmdd.job_vacancy_attachments;
CREATE POLICY authenticated_select ON esmdd.job_vacancy_attachments
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS manager_insert ON esmdd.job_vacancy_attachments;
CREATE POLICY manager_insert ON esmdd.job_vacancy_attachments
FOR INSERT TO authenticated
WITH CHECK ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

DROP POLICY IF EXISTS manager_delete ON esmdd.job_vacancy_attachments;
CREATE POLICY manager_delete ON esmdd.job_vacancy_attachments
FOR DELETE TO authenticated
USING ((SELECT esmdd.can_manage_job_vacancy(job_vacancy_id)));

REVOKE ALL ON esmdd.job_vacancy_attachments FROM anon;
GRANT SELECT, INSERT, DELETE ON esmdd.job_vacancy_attachments TO authenticated;
GRANT ALL ON esmdd.job_vacancy_attachments TO service_role;

COMMIT;
