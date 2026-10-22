-- =============================================================================
-- Migration: 047_site_contents_image_first.sql
-- Purpose:   Hero slides are image-first: the background photo is the one required part,
--            every text field and button is optional (a slide can be just a photo).
--              - system.site_contents.title becomes nullable (blank strings still rejected)
--              - CHECK: a published row must have an image
-- Schema:    system
--
-- Why a CHECK on published rows instead of NOT NULL on image_path: the storage policy (046)
-- only accepts files under an existing row id, so a row exists for a moment before its image.
-- The app inserts the row as a draft, uploads the image, then publishes it in one update.
--
-- The CHECK is NOT VALID so rows published before this migration (e.g. the 002 seed, which
-- has no images) stay as they are; it applies to every insert and update from now on.
-- =============================================================================

BEGIN;

ALTER TABLE system.site_contents
  ALTER COLUMN title DROP NOT NULL;

-- 046's inline CHECK on title gets the default name site_contents_title_check
ALTER TABLE system.site_contents
  DROP CONSTRAINT IF EXISTS site_contents_title_check;

ALTER TABLE system.site_contents
  DROP CONSTRAINT IF EXISTS site_contents_title_not_blank;
ALTER TABLE system.site_contents
  ADD CONSTRAINT site_contents_title_not_blank
  CHECK (title IS NULL OR length(btrim(title)) > 0);

ALTER TABLE system.site_contents
  DROP CONSTRAINT IF EXISTS site_contents_published_has_image;
ALTER TABLE system.site_contents
  ADD CONSTRAINT site_contents_published_has_image
  CHECK (status <> 'published' OR image_path IS NOT NULL) NOT VALID;

COMMIT;
