-- =============================================================================
-- Migration: 048_site_contents_video.sql
-- Purpose:   Hero slides can use a background video instead of a photo:
--              - Enum   system.site_content_media_type ('image', 'video')
--              - Column system.site_contents.media_type (what image_path points to)
--              - Bucket 'site-content-media' accepts MP4 / WebM, limit raised to 50MB
-- Schema:    system, storage
--
-- image_path keeps its name and now holds the background media of either type; the 047 CHECK
-- (a published row must have one) applies to videos too. The landing page plays videos muted,
-- looped and without controls.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  CREATE TYPE system.site_content_media_type AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE system.site_contents
  ADD COLUMN IF NOT EXISTS media_type system.site_content_media_type NOT NULL DEFAULT 'image';

UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50MB, room for a short looping clip
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
WHERE id = 'site-content-media';

COMMIT;
