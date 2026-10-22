-- ============================================================================
-- 045: Normalize free-text religion and course values in applicants.applicants
-- ============================================================================
-- Older entries typed religion and courses freely ("Catholic", "BSIT",
-- "BSED - Math"). This rewrites the values that clearly mean a listed item
-- to the exact core.religions / core.courses name, so pick lists, reports and
-- skill matching see one spelling.
--
-- Only explicit mappings below are applied (matched case-insensitively,
-- ignoring surrounding spaces). Ambiguous values are left as typed and still
-- show as "Others" in the pick lists, e.g.:
--   religion: Christian, Baptist, Southern Baptist, PCGAMI, DECCAVI, LGMM,
--             River of Life Christian
--   course:   BSED (no major), BSBA (no major), BSED - Physics, BSAM,
--             BSC-Management, BS in Economic Science, N/A,
--             Masters in English Teaching
--
-- Before running: re-run supabase/seeds/001_core_religions_courses.sql (adds
-- BS Agroforestry and the BTLEd majors). The migration stops if any target
-- name is missing from the lists.
--
-- Undo: original values are kept in applicants.applicants_backup_045
-- (RLS on, no policies, so only the service role / SQL editor can read it):
--   UPDATE applicants.applicants a
--   SET religion = b.religion, educational_background = b.educational_background
--   FROM applicants.applicants_backup_045 b WHERE b.id = a.id;
-- Drop the backup once the result is checked.
-- ============================================================================

BEGIN;

-- ─── 1. Mappings ────────────────────────────────────────────────────────────

CREATE TEMP TABLE religion_map (old_value TEXT PRIMARY KEY, new_value TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO religion_map (old_value, new_value) VALUES
  ('catholic', 'Roman Catholic'),
  ('roman catholi', 'Roman Catholic'),
  ('seventh day adventist', 'Seventh-day Adventist'),
  ('assembly of god', 'Assemblies of God');

-- Applied to "College / Tertiary" education records only
CREATE TEMP TABLE course_map (old_value TEXT PRIMARY KEY, new_value TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO course_map (old_value, new_value) VALUES
  ('bsit', 'Bachelor of Science in Information Technology'),
  ('bs in information technology', 'Bachelor of Science in Information Technology'),
  ('bscrim', 'Bachelor of Science in Criminology'),
  ('bs in criminology', 'Bachelor of Science in Criminology'),
  ('bs in environmental science', 'Bachelor of Science in Environmental Science'),
  ('beed', 'Bachelor of Elementary Education'),
  ('bsed-english', 'Bachelor of Secondary Education major in English'),
  ('bsed - math', 'Bachelor of Secondary Education major in Mathematics'),
  ('bsed-science', 'Bachelor of Secondary Education major in Science'),
  ('bsed - soc studies', 'Bachelor of Secondary Education major in Social Studies'),
  ('btled - afa', 'Bachelor of Technology and Livelihood Education major in Agri-Fishery Arts'),
  ('btled - he', 'Bachelor of Technology and Livelihood Education major in Home Economics'),
  ('bs entrep', 'Bachelor of Science in Entrepreneurship'),
  ('bs in entrepreneurship', 'Bachelor of Science in Entrepreneurship'),
  ('bshm', 'Bachelor of Science in Hospitality Management'),
  -- Hotel and Restaurant Management was renamed Hospitality Management (CHED CMO 62, s. 2017)
  ('bshrm', 'Bachelor of Science in Hospitality Management'),
  ('bs in agroforestry', 'Bachelor of Science in Agroforestry'),
  ('bs agriculture', 'Bachelor of Science in Agriculture'),
  ('bs in agriculture', 'Bachelor of Science in Agriculture'),
  ('bsba - financial management', 'Bachelor of Science in Business Administration major in Financial Management'),
  ('bsba-finance', 'Bachelor of Science in Business Administration major in Financial Management'),
  ('bsba - marketing management', 'Bachelor of Science in Business Administration major in Marketing Management'),
  ('bs in real estate management', 'Bachelor of Science in Real Estate Management'),
  ('bs in applied mathematics', 'Bachelor of Science in Applied Mathematics'),
  ('a.b philosophy', 'Bachelor of Arts in Philosophy');

-- ─── 2. Every target must be a listed name ──────────────────────────────────

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT string_agg(DISTINCT m.new_value, ', ') INTO v_missing
  FROM religion_map m
  WHERE NOT EXISTS (SELECT 1 FROM core.religions r WHERE r.name = m.new_value);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Religions missing from core.religions: %. Run the seeder first.', v_missing;
  END IF;

  SELECT string_agg(DISTINCT m.new_value, ', ') INTO v_missing
  FROM course_map m
  WHERE NOT EXISTS (SELECT 1 FROM core.courses c WHERE c.level = 'tertiary' AND c.name = m.new_value);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Courses missing from core.courses: %. Run the seeder first.', v_missing;
  END IF;
END;
$$;

-- ─── 3. Backup of the rows that will change ─────────────────────────────────

CREATE TABLE IF NOT EXISTS applicants.applicants_backup_045 (
  id UUID PRIMARY KEY,
  religion TEXT,
  educational_background JSONB,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE applicants.applicants_backup_045 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON applicants.applicants_backup_045 FROM anon, authenticated;

INSERT INTO applicants.applicants_backup_045 (id, religion, educational_background)
SELECT a.id, a.religion, a.educational_background
FROM applicants.applicants a
WHERE EXISTS (SELECT 1 FROM religion_map m WHERE m.old_value = lower(btrim(a.religion)))
   OR (
     jsonb_typeof(a.educational_background) = 'array'
     AND EXISTS (
       SELECT 1
       FROM jsonb_array_elements(a.educational_background) e
       JOIN course_map m ON m.old_value = lower(btrim(e->>'course'))
       WHERE e->>'level' = 'College / Tertiary'
     )
   )
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Religion ────────────────────────────────────────────────────────────

UPDATE applicants.applicants a
SET religion = m.new_value
FROM religion_map m
WHERE m.old_value = lower(btrim(a.religion));

-- ─── 5. Courses inside educational_background (order and other keys kept) ───

UPDATE applicants.applicants a
SET educational_background = fixed.records
FROM (
  SELECT
    a2.id,
    jsonb_agg(
      CASE
        WHEN e.value->>'level' = 'College / Tertiary' AND m.new_value IS NOT NULL
          THEN jsonb_set(e.value, '{course}', to_jsonb(m.new_value))
        ELSE e.value
      END
      ORDER BY e.ordinality
    ) AS records
  FROM applicants.applicants a2
  CROSS JOIN LATERAL jsonb_array_elements(a2.educational_background) WITH ORDINALITY AS e(value, ordinality)
  LEFT JOIN course_map m ON m.old_value = lower(btrim(e.value->>'course'))
  WHERE jsonb_typeof(a2.educational_background) = 'array'
  GROUP BY a2.id
  HAVING bool_or(e.value->>'level' = 'College / Tertiary' AND m.new_value IS NOT NULL)
) AS fixed
WHERE fixed.id = a.id;

COMMIT;
