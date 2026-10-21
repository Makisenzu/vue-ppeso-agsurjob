-- =============================================================================
-- Migration: 036_announcements.sql
-- Purpose:   PESO announcements, posted once and shown to an audience (instead of one
--            system.notifications row per recipient):
--              - Enums system.announcement_type / announcement_status / announcement_audience
--              - Table system.announcements        (one row per posting)
--              - Table system.announcement_media   (pictures / videos / PDFs of a posting)
--              - Table system.announcement_reads   (per-user read tracking for the bell badge)
--              - Storage bucket 'announcement-media'
--              - Functions system.current_audience(), system.unread_announcement_count()
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                 | admin / provincial_peso | other authenticated          | anon
--   -------------------------|-------------------------|------------------------------|-----------------------
--   announcements            | full CRUD               | read live, own audience      | read live, 'public'
--   announcement_media       | full CRUD               | read, if posting is readable | read, if posting is readable
--   announcement_reads       | admin: full             | own rows (read / mark / undo)| none
--   announcement-media       | full CRUD               | read (public bucket)         | read (public bucket)
--   (storage bucket)         |                         |                              |
--
-- "Live" = status 'published', published_at reached, expires_at not yet reached.
-- Audience by role: applicant -> 'applicant'; company_owner / company_member -> 'employer';
-- provincial_peso / municipal_peso / dole / admin -> 'peso'. 'public' reaches everyone,
-- including logged-out visitors of the landing page.
--
-- anon exception: 034 gives anon no table access. Announcements and their media are the one
-- deliberate exception, limited to live 'public' postings, so the landing page can list them.
--
-- The bucket is public so landing-page <img>/<video> tags load without a token. Files of a
-- draft are therefore reachable by anyone who has their exact URL (uuid paths, never listed).
--
-- Storage path convention (enforced by the storage write policy):
--   announcement-media/<announcement_id>/<filename>
-- =============================================================================

BEGIN;


-- ─── 1. Enums ──────────────────────────────────────────────────────────────
-- Enums instead of free text: a value like 'System Announcement' is rejected on insert
-- instead of silently never matching. Add values later with ALTER TYPE ... ADD VALUE.

DO $$
BEGIN
  CREATE TYPE system.announcement_type AS ENUM (
    'general', 'gip', 'spes', 'tupad', 'fnplp', 'job_fair', 'vacancy', 'skills_training'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE system.announcement_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE system.announcement_audience AS ENUM ('public', 'applicant', 'employer', 'peso');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;


-- ─── 2. Table: system.announcements ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type system.announcement_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  body TEXT NOT NULL DEFAULT '',
  audience system.announcement_audience[] NOT NULL DEFAULT ARRAY['public']::system.announcement_audience[]
    CHECK (cardinality(audience) > 0),
  status system.announcement_status NOT NULL DEFAULT 'draft',
  -- Set to a future time to schedule; filled with now() on publish when left empty
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at)
);

CREATE INDEX IF NOT EXISTS idx_announcements_feed
  ON system.announcements (status, is_pinned DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_type
  ON system.announcements (type);

-- updated_at, and published_at on first publish
CREATE OR REPLACE FUNCTION system.set_announcements_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_announcements_timestamps ON system.announcements;
CREATE TRIGGER trigger_announcements_timestamps
BEFORE INSERT OR UPDATE ON system.announcements
FOR EACH ROW
EXECUTE FUNCTION system.set_announcements_timestamps();


-- ─── 3. Table: system.announcement_media ───────────────────────────────────

CREATE TABLE IF NOT EXISTS system.announcement_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL
    REFERENCES system.announcements (id) ON DELETE CASCADE,
  uploaded_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size BIGINT CHECK (size IS NULL OR size >= 0),
  alt_text TEXT,
  -- Display order; the lowest is the cover image
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_media_announcement_id
  ON system.announcement_media (announcement_id, sort_order);

CREATE OR REPLACE FUNCTION system.set_announcement_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_announcement_media_updated_at ON system.announcement_media;
CREATE TRIGGER trigger_announcement_media_updated_at
BEFORE UPDATE ON system.announcement_media
FOR EACH ROW
EXECUTE FUNCTION system.set_announcement_media_updated_at();


-- ─── 4. Table: system.announcement_reads ───────────────────────────────────

CREATE TABLE IF NOT EXISTS system.announcement_reads (
  announcement_id UUID NOT NULL
    REFERENCES system.announcements (id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id
  ON system.announcement_reads (user_id);


-- ─── 5. Functions ──────────────────────────────────────────────────────────

-- Audience of the signed-in user. SECURITY DEFINER so policies can read the role without
-- running into the RLS of core.profiles (same reason as core.has_role).
CREATE OR REPLACE FUNCTION system.current_audience()
RETURNS system.announcement_audience
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p.role::TEXT
    WHEN 'applicant' THEN 'applicant'
    WHEN 'company_owner' THEN 'employer'
    WHEN 'company_member' THEN 'employer'
    WHEN 'provincial_peso' THEN 'peso'
    WHEN 'municipal_peso' THEN 'peso'
    WHEN 'dole' THEN 'peso'
    WHEN 'admin' THEN 'peso'
  END::system.announcement_audience
  FROM core.profiles p
  WHERE p.id = auth.uid();
$$;

-- Unread live announcements addressed to the signed-in user (bell badge). SECURITY INVOKER:
-- RLS still applies; the audience filter is repeated because PESO staff can read every row.
CREATE OR REPLACE FUNCTION system.unread_announcement_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT count(*)::INTEGER
  FROM system.announcements a
  WHERE a.status = 'published'
    AND a.published_at <= now()
    AND (a.expires_at IS NULL OR a.expires_at > now())
    AND ('public' = ANY (a.audience) OR system.current_audience() = ANY (a.audience))
    AND NOT EXISTS (
      SELECT 1 FROM system.announcement_reads r
      WHERE r.announcement_id = a.id
        AND r.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION system.current_audience() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION system.unread_announcement_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION system.current_audience() TO authenticated;
GRANT EXECUTE ON FUNCTION system.unread_announcement_count() TO authenticated;


-- ─── 6. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.announcement_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.announcement_reads ENABLE ROW LEVEL SECURITY;

-- announcements
DROP POLICY IF EXISTS admin_all ON system.announcements;
CREATE POLICY admin_all ON system.announcements
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS provincial_peso_all ON system.announcements;
CREATE POLICY provincial_peso_all ON system.announcements
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS audience_select ON system.announcements;
CREATE POLICY audience_select ON system.announcements
FOR SELECT TO authenticated
USING (
  status = 'published'
  AND published_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
  AND ('public' = ANY (audience) OR (SELECT system.current_audience()) = ANY (audience))
);

DROP POLICY IF EXISTS anon_public_select ON system.announcements;
CREATE POLICY anon_public_select ON system.announcements
FOR SELECT TO anon
USING (
  status = 'published'
  AND published_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
  AND 'public' = ANY (audience)
);

-- announcement_media: readable whenever its posting is readable (the subquery runs with the
-- caller's RLS on system.announcements)
DROP POLICY IF EXISTS admin_all ON system.announcement_media;
CREATE POLICY admin_all ON system.announcement_media
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS provincial_peso_all ON system.announcement_media;
CREATE POLICY provincial_peso_all ON system.announcement_media
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso')))
WITH CHECK ((SELECT core.has_role('provincial_peso')));

DROP POLICY IF EXISTS announcement_visible_select ON system.announcement_media;
CREATE POLICY announcement_visible_select ON system.announcement_media
FOR SELECT TO authenticated, anon
USING (
  EXISTS (SELECT 1 FROM system.announcements a WHERE a.id = announcement_media.announcement_id)
);

-- announcement_reads: each user manages their own read markers
DROP POLICY IF EXISTS admin_all ON system.announcement_reads;
CREATE POLICY admin_all ON system.announcement_reads
FOR ALL TO authenticated
USING ((SELECT core.has_role('admin')))
WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS self_select ON system.announcement_reads;
CREATE POLICY self_select ON system.announcement_reads
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS self_insert ON system.announcement_reads;
CREATE POLICY self_insert ON system.announcement_reads
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM system.announcements a WHERE a.id = announcement_reads.announcement_id)
);

DROP POLICY IF EXISTS self_delete ON system.announcement_reads;
CREATE POLICY self_delete ON system.announcement_reads
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));


-- ─── 7. Grants ─────────────────────────────────────────────────────────────
-- Table privileges only open the door; the RLS policies above decide the rows.

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.announcement_media TO authenticated;
GRANT SELECT, INSERT, DELETE ON system.announcement_reads TO authenticated;
GRANT SELECT ON system.announcements TO anon;
GRANT SELECT ON system.announcement_media TO anon;
GRANT ALL ON system.announcements, system.announcement_media, system.announcement_reads TO service_role;


-- ─── 8. Storage bucket 'announcement-media' (public read) ──────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-media',
  'announcement-media',
  true,
  52428800, -- 50MB, room for short videos
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Provincial PESO / admin manage files; new files must sit under an existing announcement id
DROP POLICY IF EXISTS announcement_media_staff_all ON storage.objects;
CREATE POLICY announcement_media_staff_all ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'announcement-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
)
WITH CHECK (
  bucket_id = 'announcement-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND EXISTS (
    SELECT 1 FROM system.announcements a
    WHERE a.id::TEXT = (storage.foldername(name))[1]
  )
);

COMMIT;
