-- =============================================================================
-- Migration: 051_public_page_heroes.sql
-- Purpose:   Hero banners of the public pages outside the landing page (first: "What is PESO?"),
--            managed by PESO:
--              - Enum  system.public_page          (one value per public page with a hero)
--              - Table system.public_page_heroes   (one fixed row per page, seeded here)
--              - Storage policy: uploads under site-content-media/pages/<page>/
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                   | admin / provincial_peso | other authenticated | anon
--   ---------------------------|-------------------------|---------------------|------
--   public_page_heroes         | read, update            | read                | read
--   site-content-media/pages/  | full CRUD               | read (public bucket)| read (public bucket)
--
-- Same shape as 049 and 050: the pages are a fixed set, so nobody inserts or deletes rows from the
-- app; PESO only edits each hero. Empty text columns fall back to the page's built-in text
-- (PUBLIC_PAGES in src/types/common/siteContent.ts), and a hero without a photo shows the plain band.
-- New public pages add an enum value and a seeded row in a later migration.
--
-- anon exception: like 036, 046, 049 and 050, a deliberate exception to 034's "no anon table access",
-- so logged-out visitors see the hero. The rows hold no personal data.
--
-- Storage path convention (enforced by the CHECK and the storage policy below):
--   site-content-media/pages/<public_page>/<filename>
-- 046's staff policy already lets admin / provincial_peso read, replace and delete any file in the
-- bucket; it only limits new files to site_contents folders, so this adds the pages folders.
-- =============================================================================

BEGIN;


-- ─── 1. Enum ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE system.public_page AS ENUM ('what_is_peso');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;


-- ─── 2. Table: system.public_page_heroes ───────────────────────────────────

CREATE TABLE IF NOT EXISTS system.public_page_heroes (
  page system.public_page PRIMARY KEY,
  -- NULL text falls back to the page's built-in text
  eyebrow TEXT CHECK (eyebrow IS NULL OR char_length(eyebrow) <= 80),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  -- Path inside the 'site-content-media' bucket; NULL shows the plain band
  image_path TEXT,
  image_alt TEXT CHECK (image_alt IS NULL OR char_length(image_alt) <= 200),
  updated_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (image_path IS NULL OR image_path LIKE 'pages/' || page::TEXT || '/%')
);

INSERT INTO system.public_page_heroes (page)
SELECT unnest(enum_range(NULL::system.public_page))
ON CONFLICT (page) DO NOTHING;

CREATE OR REPLACE FUNCTION system.set_public_page_heroes_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_public_page_heroes_updated ON system.public_page_heroes;
CREATE TRIGGER trigger_public_page_heroes_updated
BEFORE UPDATE ON system.public_page_heroes
FOR EACH ROW
EXECUTE FUNCTION system.set_public_page_heroes_updated();


-- ─── 3. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.public_page_heroes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select ON system.public_page_heroes;
CREATE POLICY public_select ON system.public_page_heroes
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS staff_update ON system.public_page_heroes;
CREATE POLICY staff_update ON system.public_page_heroes
FOR UPDATE TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')))
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));


-- ─── 4. Grants ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT ON system.public_page_heroes TO anon, authenticated;
GRANT UPDATE (eyebrow, title, description, image_path, image_alt) ON system.public_page_heroes TO authenticated;
GRANT ALL ON system.public_page_heroes TO service_role;


-- ─── 5. Storage: hero photos in 'site-content-media' ───────────────────────
-- Permissive policies are OR'ed, so this only adds the pages/<page>/ folders to 046's rule

DROP POLICY IF EXISTS site_content_media_page_heroes_insert ON storage.objects;
CREATE POLICY site_content_media_page_heroes_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND (storage.foldername(name))[1] = 'pages'
  AND (storage.foldername(name))[2] = ANY (enum_range(NULL::system.public_page)::TEXT[])
);

COMMIT;
