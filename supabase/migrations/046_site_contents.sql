-- =============================================================================
-- Migration: 046_site_contents.sql
-- Purpose:   PESO-managed content blocks for public pages (starting with the landing hero
--            carousel), kept apart from announcements so they never reach the bell badge
--            or the announcements feed:
--              - Enum  system.site_content_placement (where a row is shown)
--              - Table system.site_contents          (one row per slide / block)
--              - Storage bucket 'site-content-media'
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                 | admin / provincial_peso | other authenticated | anon
--   -------------------------|-------------------------|---------------------|-----------
--   site_contents            | full CRUD               | read live           | read live
--   site-content-media       | full CRUD               | read (public bucket)| read (public bucket)
--   (storage bucket)         |                         |                     |
--
-- "Live" = status 'published', published_at reached, expires_at not yet reached (same rule
-- and the same system.announcement_status enum as 036).
--
-- anon exception: like 036, this is a deliberate exception to 034's "no anon table access",
-- limited to live rows, so the logged-out landing page can render them.
--
-- The bucket is public so landing-page <img> tags load without a token. Images of a draft
-- are therefore reachable by anyone who has their exact URL (uuid paths, never listed).
--
-- Links: '/path' is an in-app route, '#id' a section of the same page, 'https://...' an
-- external page. Anything else (e.g. 'javascript:') is rejected by a CHECK.
--
-- Storage path convention (enforced by the storage write policy):
--   site-content-media/<site_content_id>/<filename>
-- =============================================================================

BEGIN;


-- ─── 1. Enum ───────────────────────────────────────────────────────────────
-- One value per spot on a public page. Add values later with ALTER TYPE ... ADD VALUE.

DO $$
BEGIN
  CREATE TYPE system.site_content_placement AS ENUM ('hero_carousel');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;


-- ─── 2. Table: system.site_contents ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system.site_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement system.site_content_placement NOT NULL DEFAULT 'hero_carousel',
  -- Short label above the title, e.g. the program's full name
  eyebrow TEXT,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  -- Path inside the 'site-content-media' bucket; the page shows a default image when empty
  image_path TEXT,
  image_alt TEXT,
  primary_label TEXT,
  primary_link TEXT,
  secondary_label TEXT,
  secondary_link TEXT,
  -- Optional "read more" target: the full announcement this block promotes
  announcement_id UUID
    REFERENCES system.announcements (id) ON DELETE SET NULL,
  -- Display order within a placement; lowest first
  sort_order INTEGER NOT NULL DEFAULT 0,
  status system.announcement_status NOT NULL DEFAULT 'draft',
  -- Set to a future time to schedule; filled with now() on publish when left empty
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at),
  -- A button needs both its label and its link
  CHECK ((primary_label IS NULL) = (primary_link IS NULL)),
  CHECK ((secondary_label IS NULL) = (secondary_link IS NULL)),
  CHECK (primary_link IS NULL OR primary_link ~ '^(/|#|https://)'),
  CHECK (secondary_link IS NULL OR secondary_link ~ '^(/|#|https://)')
);

CREATE INDEX IF NOT EXISTS idx_site_contents_placement
  ON system.site_contents (placement, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_site_contents_announcement_id
  ON system.site_contents (announcement_id);

-- updated_at, and published_at on first publish
CREATE OR REPLACE FUNCTION system.set_site_contents_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_site_contents_timestamps ON system.site_contents;
CREATE TRIGGER trigger_site_contents_timestamps
BEFORE INSERT OR UPDATE ON system.site_contents
FOR EACH ROW
EXECUTE FUNCTION system.set_site_contents_timestamps();


-- ─── 3. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.site_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all ON system.site_contents;
CREATE POLICY admin_all ON system.site_contents
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS provincial_peso_all ON system.site_contents;
CREATE POLICY provincial_peso_all ON system.site_contents
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

-- Public content: everyone, signed in or not, reads live rows
DROP POLICY IF EXISTS live_select ON system.site_contents;
CREATE POLICY live_select ON system.site_contents
FOR SELECT TO authenticated, anon
USING (
  status = 'published'
  AND published_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
);


-- ─── 4. Grants ─────────────────────────────────────────────────────────────
-- Table privileges only open the door; the RLS policies above decide the rows.

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.site_contents TO authenticated;
GRANT SELECT ON system.site_contents TO anon;
GRANT ALL ON system.site_contents TO service_role;


-- ─── 5. Storage bucket 'site-content-media' (public read) ──────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-content-media',
  'site-content-media',
  true,
  5242880, -- 5MB; hero images should be compressed before upload anyway
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Provincial PESO / admin manage files; new files must sit under an existing site_contents id
DROP POLICY IF EXISTS site_content_media_staff_all ON storage.objects;
CREATE POLICY site_content_media_staff_all ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
)
WITH CHECK (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND EXISTS (
    SELECT 1 FROM system.site_contents c
    WHERE c.id::TEXT = (storage.foldername(name))[1]
  )
);

COMMIT;
