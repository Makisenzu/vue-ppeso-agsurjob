-- =============================================================================
-- Migration: 052_org_chart.sql
-- Purpose:   Organizational structure & staffing pattern of the Provincial PESO, shown on the public
--            "What is PESO?" page and fully managed by PESO (divisions, positions, holders, photos):
--              - Enum  system.org_employment_status  (the office's legend: elected / permanent / casual / job order)
--              - Table system.org_chart_units         (divisions / units, in display order)
--              - Table system.org_chart_positions     (one row per position; NULL holder = vacant)
--              - Storage policy: photos under site-content-media/org-chart/<position id>/
--              - Seed: the chart as of October 2026, only when both tables are empty
-- Schema:    system, storage
--
-- Access Matrix:
--   Resource                     | admin / provincial_peso | other authenticated | anon
--   -----------------------------|-------------------------|---------------------|------
--   org_chart_units              | full CRUD               | read                | read
--   org_chart_positions          | full CRUD               | read                | read
--   site-content-media/org-chart/| full CRUD               | read (public bucket)| read (public bucket)
--
-- Positions with unit_id NULL sit at the top of the chart (Governor, PESO Manager); is_head marks the
-- office head there and each unit's head below. At most one head per unit, and one at the top.
-- A unit can only be deleted once it has no positions (FK RESTRICT), so nobody loses staff by accident.
--
-- anon exception: like 036, 046, 049, 050 and 051, a deliberate exception to 034's "no anon table
-- access", so logged-out visitors see the chart. The rows hold staff names, titles and photos that the
-- office publishes on its own printed chart; no contact or personal details.
--
-- Storage path convention (enforced by the CHECK and the storage policy below):
--   site-content-media/org-chart/<org_chart_positions.id>/<filename>
-- 046's staff policy already lets admin / provincial_peso read, replace and delete any file in the
-- bucket; it only limits new files to site_contents folders, so this adds the org-chart folders.
-- =============================================================================

BEGIN;


-- ─── 1. Enum ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE system.org_employment_status AS ENUM ('elected', 'permanent', 'casual', 'job_order');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;


-- ─── 2. Tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system.org_chart_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  abbreviation TEXT CHECK (abbreviation IS NULL OR char_length(btrim(abbreviation)) BETWEEN 1 AND 20),
  sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system.org_chart_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL: top of the chart (Governor, PESO Manager)
  unit_id UUID REFERENCES system.org_chart_units (id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  -- NULL: vacant position
  holder_name TEXT CHECK (holder_name IS NULL OR char_length(btrim(holder_name)) BETWEEN 1 AND 120),
  employment_status system.org_employment_status NOT NULL DEFAULT 'permanent',
  is_head BOOLEAN NOT NULL DEFAULT false,
  -- Path inside the 'site-content-media' bucket; NULL shows the holder's initials
  photo_path TEXT,
  sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (photo_path IS NULL OR photo_path LIKE 'org-chart/' || id::TEXT || '/%')
);

CREATE INDEX IF NOT EXISTS org_chart_positions_unit_id_idx ON system.org_chart_positions (unit_id);

-- One head per unit, and one office head at the top (NULL unit_id folded into one key)
CREATE UNIQUE INDEX IF NOT EXISTS org_chart_positions_one_head_idx
ON system.org_chart_positions ((COALESCE(unit_id::TEXT, 'top')))
WHERE is_head;

CREATE OR REPLACE FUNCTION system.set_org_chart_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_org_chart_units_updated ON system.org_chart_units;
CREATE TRIGGER trigger_org_chart_units_updated
BEFORE UPDATE ON system.org_chart_units
FOR EACH ROW
EXECUTE FUNCTION system.set_org_chart_updated();

DROP TRIGGER IF EXISTS trigger_org_chart_positions_updated ON system.org_chart_positions;
CREATE TRIGGER trigger_org_chart_positions_updated
BEFORE UPDATE ON system.org_chart_positions
FOR EACH ROW
EXECUTE FUNCTION system.set_org_chart_updated();


-- ─── 3. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE system.org_chart_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.org_chart_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select ON system.org_chart_units;
CREATE POLICY public_select ON system.org_chart_units
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS staff_all ON system.org_chart_units;
CREATE POLICY staff_all ON system.org_chart_units
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')))
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));

DROP POLICY IF EXISTS public_select ON system.org_chart_positions;
CREATE POLICY public_select ON system.org_chart_positions
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS staff_all ON system.org_chart_positions;
CREATE POLICY staff_all ON system.org_chart_positions
FOR ALL TO authenticated
USING ((SELECT core.has_role('provincial_peso', 'admin')))
WITH CHECK ((SELECT core.has_role('provincial_peso', 'admin')));


-- ─── 4. Grants ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT ON system.org_chart_units, system.org_chart_positions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON system.org_chart_units, system.org_chart_positions TO authenticated;
GRANT ALL ON system.org_chart_units, system.org_chart_positions TO service_role;


-- ─── 5. Storage: photos in 'site-content-media' ────────────────────────────
-- Permissive policies are OR'ed, so this only adds the org-chart/<position id>/ folders to 046's rule

DROP POLICY IF EXISTS site_content_media_org_chart_insert ON storage.objects;
CREATE POLICY site_content_media_org_chart_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-content-media'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND (storage.foldername(name))[1] = 'org-chart'
  AND EXISTS (
    SELECT 1 FROM system.org_chart_positions p
    WHERE p.id::TEXT = (storage.foldername(name))[2]
  )
);


-- ─── 6. Seed: the chart as of October 2026 (only into empty tables) ────────

DO $$
DECLARE
  asu UUID;
  esmdd UUID;
  sdd UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM system.org_chart_units) OR EXISTS (SELECT 1 FROM system.org_chart_positions) THEN
    RETURN;
  END IF;

  INSERT INTO system.org_chart_units (name, abbreviation, sort_order)
  VALUES ('Administrative Support Unit', 'ASU', 1) RETURNING id INTO asu;
  INSERT INTO system.org_chart_units (name, abbreviation, sort_order)
  VALUES ('Employment Services and Migration Development Division', 'ESMDD', 0) RETURNING id INTO esmdd;
  INSERT INTO system.org_chart_units (name, abbreviation, sort_order)
  VALUES ('Skills Development Division', 'SDD', 2) RETURNING id INTO sdd;

  INSERT INTO system.org_chart_positions (unit_id, title, holder_name, employment_status, is_head, sort_order) VALUES
    (NULL, 'Provincial Governor', 'Hon. Santiago B. Cane, Jr.', 'elected', false, 0),
    (NULL, 'Provincial Government Department Head (PESO Manager)', 'Pauline J. Ang', 'permanent', true, 1),

    (asu, 'Administrative Officer II (Administrative Officer I), Unit Head', 'Sharon Rose T. Capa', 'permanent', true, 0),
    (asu, 'Administrative Assistant II (Storekeeper)', 'Nellie G. Cellan', 'permanent', false, 1),
    (asu, 'Administrative Assistant II (Administrative Assistant)', 'Maria Cleofe Anne L., LPT', 'permanent', false, 2),
    (asu, 'Process Server', 'Mark John Paul L. Rialo', 'casual', false, 3),
    (asu, 'Administrative Aide IV (Driver II)', 'Joemarie T. Telen', 'casual', false, 4),
    (asu, 'Clerk', 'Jonel Eunes', 'job_order', false, 5),
    (asu, 'Utility Worker', 'Leonilo A. Patis', 'job_order', false, 6),

    (esmdd, 'Supervising Labor & Employment Officer, Division Head', NULL, 'permanent', true, 0),
    (esmdd, 'Labor & Employment Officer II', 'Jake E. Abunda', 'permanent', false, 1),
    (esmdd, 'Labor & Employment Assistant', 'Christesely M. Gonzaga', 'permanent', false, 2),
    (esmdd, 'Administrative Aide IV (Clerk II)', 'Cristy Mae E. Enso', 'casual', false, 3),
    (esmdd, 'Administrative Aide IV (Clerk II)', 'Jonahrie D. Corvera', 'casual', false, 4),
    (esmdd, 'Clerk', 'Rogelyn S. Yatoc', 'job_order', false, 5),
    (esmdd, 'Clerk', 'Denmark B. Rivera', 'job_order', false, 6),

    (sdd, 'Supervising Manpower Development Officer, Division Head', 'Mary Grace B. Sumiling', 'permanent', true, 0),
    (sdd, 'Manpower Development Officer II', 'Indah Mariz L. Retuerto', 'permanent', false, 1),
    (sdd, 'Manpower Development Assistant', 'Analou Vanessa U. Arcay', 'permanent', false, 2),
    (sdd, 'Administrative Aide III (Clerk I)', NULL, 'casual', false, 3),
    (sdd, 'Administrative Aide III (Clerk I)', 'Clent Joel M. Bañas', 'casual', false, 4);
END;
$$;

COMMIT;
