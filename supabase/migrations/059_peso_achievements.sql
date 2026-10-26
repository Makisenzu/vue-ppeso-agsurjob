-- =============================================================================
-- Migration: 059_peso_achievements.sql
-- Purpose:   Achievements of the Provincial PESO (awards, recognitions, milestones), shown as a photo masonry
--            under the organizational chart on the public "What is PESO?" page and managed by PESO in
--            Site Contents → Achievements:
--              - Table system.peso_achievements  (one row per achievement photo)
--              - Storage policy: uploads under site-content-media/achievements/
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                         | admin / provincial_peso | other authenticated | anon
--   ---------------------------------|-------------------------|---------------------|------
--   peso_achievements                | full CRUD               | read                | read
--   site-content-media/achievements/ | full CRUD               | read (public bucket)| read (public bucket)
--
-- width / height are the photo's own pixel size, read in the browser at upload, so the masonry can lay
-- out each tile at the photo's aspect ratio before the image downloads.
--
-- anon exception: like 036, 046, 049–052, a deliberate exception to 034's "no anon table access", so
-- logged-out visitors see the achievements. Rows hold a photo path and an optional title only.
--
-- An early draft of this migration created system.peso_gallery_photos (caption, gallery/ folder); if it
-- was run, that table is renamed here instead of leaving it behind.
--
-- Storage path convention (enforced by the storage policy below):
--   site-content-media/achievements/<filename>
-- 046's staff policy already lets admin / provincial_peso read, replace and delete any file in the bucket.
-- =============================================================================

BEGIN;


-- ─── 1. Table ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regclass('system.peso_gallery_photos') IS NOT NULL AND to_regclass('system.peso_achievements') IS NULL THEN
    ALTER TABLE system.peso_gallery_photos RENAME TO peso_achievements;
    ALTER TABLE system.peso_achievements RENAME COLUMN caption TO title;
    ALTER TABLE system.peso_achievements DROP CONSTRAINT IF EXISTS peso_gallery_photos_image_path_check;
    ALTER INDEX IF EXISTS system.peso_gallery_photos_created_at_idx RENAME TO peso_achievements_created_at_idx;
    DROP POLICY IF EXISTS site_content_media_gallery_insert ON storage.objects;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS system.peso_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path TEXT NOT NULL,
  -- e.g. "Best PESO in Caraga, 2025"; shown on hover and read by screen readers
  title TEXT,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE system.peso_achievements
    ADD CONSTRAINT peso_achievements_image_path_check
    CHECK (image_path LIKE 'achievements/%' OR image_path LIKE 'gallery/%') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS peso_achievements_created_at_idx ON system.peso_achievements (created_at DESC);


-- ─── 2. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.peso_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select ON system.peso_achievements;
CREATE POLICY public_select ON system.peso_achievements
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS staff_insert ON system.peso_achievements;
CREATE POLICY staff_insert ON system.peso_achievements
FOR INSERT TO authenticated
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));

DROP POLICY IF EXISTS staff_update ON system.peso_achievements;
CREATE POLICY staff_update ON system.peso_achievements
FOR UPDATE TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')))
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));

DROP POLICY IF EXISTS staff_delete ON system.peso_achievements;
CREATE POLICY staff_delete ON system.peso_achievements
FOR DELETE TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')));


-- ─── 3. Grants ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT ON system.peso_achievements TO anon, authenticated;
GRANT INSERT (image_path, title, width, height) ON system.peso_achievements TO authenticated;
GRANT UPDATE (title) ON system.peso_achievements TO authenticated;
GRANT DELETE ON system.peso_achievements TO authenticated;
GRANT ALL ON system.peso_achievements TO service_role;


-- ─── 4. Storage: photos in 'site-content-media' ────────────────────────────
-- Permissive policies are OR'ed, so this only adds the achievements/ folder to 046's rule

DROP POLICY IF EXISTS site_content_media_achievements_insert ON storage.objects;
CREATE POLICY site_content_media_achievements_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND (storage.foldername(name))[1] = 'achievements'
);

COMMIT;
