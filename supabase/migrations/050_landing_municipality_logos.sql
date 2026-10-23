-- =============================================================================
-- Migration: 050_landing_municipality_logos.sql
-- Purpose:   Logos of Agusan del Sur's 13 municipalities and 1 city for the landing page's
--            municipalities section (InfiniteSpiral), managed by PESO:
--              - Enum  system.agsur_municipality           (one value per LGU)
--              - Table system.landing_municipality_logos   (one fixed row per LGU, seeded here)
--              - Storage policy: uploads under site-content-media/municipalities/<municipality>/
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                           | admin / provincial_peso | other authenticated | anon
--   -----------------------------------|-------------------------|---------------------|------
--   landing_municipality_logos         | read, update            | read                | read
--   site-content-media/municipalities/ | full CRUD               | read (public bucket)| read (public bucket)
--
-- Same shape as 049 (program cards): the LGUs are a fixed set, so nobody inserts or deletes rows
-- from the app; PESO only sets or clears each logo. Names and order live in the app
-- (LANDING_MUNICIPALITIES in src/types/common/siteContent.ts). An LGU without a logo shows the
-- province seal in the spiral.
--
-- anon exception: like 036, 046 and 049, a deliberate exception to 034's "no anon table access", so
-- the logged-out landing page can render the logos. The rows hold no personal data.
--
-- Storage path convention (enforced by the storage policy below):
--   site-content-media/municipalities/<agsur_municipality>/<filename>
-- 046's staff policy already lets admin / provincial_peso read, replace and delete any file in the
-- bucket; it only limits new files to site_contents folders, so this adds the municipalities folders.
-- =============================================================================

BEGIN;


-- ─── 1. Enum ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE system.agsur_municipality AS ENUM (
    'bayugan', 'bunawan', 'esperanza', 'la_paz', 'loreto', 'prosperidad', 'rosario',
    'san_francisco', 'san_luis', 'santa_josefa', 'sibagat', 'talacogon', 'trento', 'veruela'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;


-- ─── 2. Table: system.landing_municipality_logos ───────────────────────────

CREATE TABLE IF NOT EXISTS system.landing_municipality_logos (
  municipality system.agsur_municipality PRIMARY KEY,
  -- Path inside the 'site-content-media' bucket; NULL shows the province seal
  image_path TEXT,
  updated_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (image_path IS NULL OR image_path LIKE 'municipalities/' || municipality::TEXT || '/%')
);

INSERT INTO system.landing_municipality_logos (municipality)
SELECT unnest(enum_range(NULL::system.agsur_municipality))
ON CONFLICT (municipality) DO NOTHING;

CREATE OR REPLACE FUNCTION system.set_landing_municipality_logos_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_landing_municipality_logos_updated ON system.landing_municipality_logos;
CREATE TRIGGER trigger_landing_municipality_logos_updated
BEFORE UPDATE ON system.landing_municipality_logos
FOR EACH ROW
EXECUTE FUNCTION system.set_landing_municipality_logos_updated();


-- ─── 3. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.landing_municipality_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select ON system.landing_municipality_logos;
CREATE POLICY public_select ON system.landing_municipality_logos
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS staff_update ON system.landing_municipality_logos;
CREATE POLICY staff_update ON system.landing_municipality_logos
FOR UPDATE TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')))
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));


-- ─── 4. Grants ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT ON system.landing_municipality_logos TO anon, authenticated;
GRANT UPDATE (image_path) ON system.landing_municipality_logos TO authenticated;
GRANT ALL ON system.landing_municipality_logos TO service_role;


-- ─── 5. Storage: logos in 'site-content-media' ─────────────────────────────
-- Permissive policies are OR'ed, so this only adds the municipalities/<municipality>/ folders to 046's rule

DROP POLICY IF EXISTS site_content_media_municipality_logos_insert ON storage.objects;
CREATE POLICY site_content_media_municipality_logos_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND (storage.foldername(name))[1] = 'municipalities'
  AND (storage.foldername(name))[2] = ANY (enum_range(NULL::system.agsur_municipality)::TEXT[])
);

COMMIT;
