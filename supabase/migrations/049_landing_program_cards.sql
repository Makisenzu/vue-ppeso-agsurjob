-- =============================================================================
-- Migration: 049_landing_program_cards.sql
-- Purpose:   Background photos of the landing page's "PESO Programs" gallery, managed by PESO:
--              - Enum  system.landing_program        (one value per program card)
--              - Table system.landing_program_cards  (one fixed row per program, seeded here)
--              - Storage policy: uploads under site-content-media/programs/<program>/
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                     | admin / provincial_peso | other authenticated | anon
--   -----------------------------|-------------------------|---------------------|------
--   landing_program_cards        | read, update            | read                | read
--   site-content-media/programs/ | full CRUD               | read (public bucket)| read (public bucket)
--
-- The cards are a fixed set (the programs PESO runs), so nobody inserts or deletes rows from the
-- app; PESO only sets or clears each card's photo. Labels and order live in the app
-- (LANDING_PROGRAMS in src/types/common/siteContent.ts). A card without a photo shows as a plain
-- panel with its name.
--
-- anon exception: like 036 and 046, a deliberate exception to 034's "no anon table access", so the
-- logged-out landing page can render the gallery. The rows hold no personal data.
--
-- Storage path convention (enforced by the storage policy below):
--   site-content-media/programs/<landing_program>/<filename>
-- 046's staff policy already lets admin / provincial_peso read, replace and delete any file in the
-- bucket; it only limits new files to site_contents folders, so this adds the programs folders.
-- =============================================================================

BEGIN;


-- ─── 1. Enum ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE system.landing_program AS ENUM ('tupad', 'gip', 'fly_now_pay_later', 'spes', 'skills_training');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;


-- ─── 2. Table: system.landing_program_cards ────────────────────────────────

CREATE TABLE IF NOT EXISTS system.landing_program_cards (
  program system.landing_program PRIMARY KEY,
  -- Path inside the 'site-content-media' bucket; NULL shows the plain panel
  image_path TEXT,
  updated_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (image_path IS NULL OR image_path LIKE 'programs/' || program::TEXT || '/%')
);

INSERT INTO system.landing_program_cards (program)
SELECT unnest(enum_range(NULL::system.landing_program))
ON CONFLICT (program) DO NOTHING;

CREATE OR REPLACE FUNCTION system.set_landing_program_cards_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_landing_program_cards_updated ON system.landing_program_cards;
CREATE TRIGGER trigger_landing_program_cards_updated
BEFORE UPDATE ON system.landing_program_cards
FOR EACH ROW
EXECUTE FUNCTION system.set_landing_program_cards_updated();


-- ─── 3. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.landing_program_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select ON system.landing_program_cards;
CREATE POLICY public_select ON system.landing_program_cards
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS staff_update ON system.landing_program_cards;
CREATE POLICY staff_update ON system.landing_program_cards
FOR UPDATE TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')))
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));


-- ─── 4. Grants ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT ON system.landing_program_cards TO anon, authenticated;
GRANT UPDATE (image_path) ON system.landing_program_cards TO authenticated;
GRANT ALL ON system.landing_program_cards TO service_role;


-- ─── 5. Storage: program photos in 'site-content-media' ────────────────────
-- Permissive policies are OR'ed, so this only adds the programs/<program>/ folders to 046's rule

DROP POLICY IF EXISTS site_content_media_program_cards_insert ON storage.objects;
CREATE POLICY site_content_media_program_cards_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND (storage.foldername(name))[1] = 'programs'
  AND (storage.foldername(name))[2] = ANY (enum_range(NULL::system.landing_program)::TEXT[])
);

COMMIT;
