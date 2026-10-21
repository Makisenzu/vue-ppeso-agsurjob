-- ============================================================================
-- 044: Reference lists — core.religions and core.courses
-- ============================================================================
-- Shared dropdown lists so the same value is stored everywhere (applicant
-- NSRP Form 1, job vacancies, reports, skill matching). Rows are filled by
-- supabase/seeds/001_core_religions_courses.sql (re-runnable).
--
--   core.religions  PSA census religious affiliation groups, plus
--                   "None" and "Others" (the form then asks to specify).
--   core.courses    one list for every course-like field, by level:
--                     tertiary    CHED bachelor's programs (PSCED field)
--                     graduate    common master's / doctoral programs
--                     shs_strand  Senior High School tracks and strands
--                     techvoc     TESDA qualifications (NC levels)
--
-- Stored values stay plain text on existing columns (applicants.religion,
-- *_degree_course, job_vacancies.course_shs_strand), so free "Others" text
-- still works; these tables only drive the choices.
--
-- RLS: everyone (including signed-out users, for signup) reads active rows;
--      admin manages the lists.
-- ============================================================================

-- ─── 1. Shared updated_at stamp ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION core.reference_list_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─── 2. core.religions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.religions (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  -- "Others" asks the user to type the religion
  requires_specify BOOLEAN NOT NULL DEFAULT false,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT religions_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS religions_name_key ON core.religions (lower(name));
CREATE INDEX IF NOT EXISTS idx_religions_active_sort ON core.religions (sort_order, name) WHERE is_active;

DROP TRIGGER IF EXISTS trg_religions_updated_at ON core.religions;
CREATE TRIGGER trg_religions_updated_at
BEFORE UPDATE ON core.religions
FOR EACH ROW EXECUTE FUNCTION core.reference_list_touch_updated_at();

-- ─── 3. core.courses ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core.courses (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('tertiary', 'graduate', 'shs_strand', 'techvoc')),
  name TEXT NOT NULL,
  -- Common short form, e.g. BSIT, STEM, SMAW NC II (used for search)
  abbreviation TEXT,
  -- PSCED broad field for tertiary / graduate; track for SHS; sector for TESDA
  field TEXT,
  requires_specify BOOLEAN NOT NULL DEFAULT false,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT courses_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_level_name_key ON core.courses (level, lower(name));
CREATE INDEX IF NOT EXISTS idx_courses_level_active ON core.courses (level, sort_order, name) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_courses_field ON core.courses (field);

DROP TRIGGER IF EXISTS trg_courses_updated_at ON core.courses;
CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON core.courses
FOR EACH ROW EXECUTE FUNCTION core.reference_list_touch_updated_at();

-- ─── 4. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE core.religions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select_active ON core.religions;
CREATE POLICY public_select_active ON core.religions
  FOR SELECT TO anon, authenticated
  USING (is_active);

DROP POLICY IF EXISTS admin_all ON core.religions;
CREATE POLICY admin_all ON core.religions
  FOR ALL TO authenticated
  USING ((SELECT core.has_role('admin')))
  WITH CHECK ((SELECT core.has_role('admin')));

DROP POLICY IF EXISTS public_select_active ON core.courses;
CREATE POLICY public_select_active ON core.courses
  FOR SELECT TO anon, authenticated
  USING (is_active);

DROP POLICY IF EXISTS admin_all ON core.courses;
CREATE POLICY admin_all ON core.courses
  FOR ALL TO authenticated
  USING ((SELECT core.has_role('admin')))
  WITH CHECK ((SELECT core.has_role('admin')));

GRANT USAGE ON SCHEMA core TO anon, authenticated;
GRANT SELECT ON core.religions, core.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.religions, core.courses TO authenticated;
GRANT ALL ON core.religions, core.courses TO service_role;
