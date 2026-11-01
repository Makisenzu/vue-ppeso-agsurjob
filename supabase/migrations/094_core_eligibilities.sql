-- ============================================================================
-- 094: Reference list — core.eligibilities (eligibilities and licenses)
-- ============================================================================
-- Dropdown list for the Eligibility and License fields of a job vacancy, so
-- employers and PESO pick the same names instead of typing them freely (same
-- idea as core.courses, 044). Rows are filled by
-- supabase/seeds/003_core_eligibilities.sql (re-runnable).
--
--   kind = 'eligibility'  Civil service eligibilities: CSC examinations and
--                         those granted under special laws (RA 1080, PD 907,
--                         Barangay Official, ...).
--   kind = 'license'      Professional licenses: PRC board professions, the
--                         Bar, and other government-issued licenses (LTO
--                         driver's license, PNP security guard license).
--   issuer                Who grants it, shown as the group in the picker.
--
-- Stored values stay plain text on job_vacancies.eligibility / .license, so
-- "Others" (free text) and older typed values still work; this table only
-- drives the choices.
--
-- RLS: everyone (including signed-out users) reads active rows; admin manages
--      the list. No personal data.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS core.eligibilities (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('eligibility', 'license')),
  name TEXT NOT NULL,
  -- Common short form, e.g. CSE-PRO, CPA, RN, LPT (used for search)
  abbreviation TEXT,
  issuer TEXT,
  -- "Others" asks the user to type the value
  requires_specify BOOLEAN NOT NULL DEFAULT false,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eligibilities_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS eligibilities_kind_name_key ON core.eligibilities (kind, lower(name));
CREATE INDEX IF NOT EXISTS idx_eligibilities_kind_active ON core.eligibilities (kind, sort_order, name) WHERE is_active;

DROP TRIGGER IF EXISTS trg_eligibilities_updated_at ON core.eligibilities;
CREATE TRIGGER trg_eligibilities_updated_at
BEFORE UPDATE ON core.eligibilities
FOR EACH ROW EXECUTE FUNCTION core.reference_list_touch_updated_at();

ALTER TABLE core.eligibilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select_active ON core.eligibilities;
CREATE POLICY public_select_active ON core.eligibilities
  FOR SELECT TO anon, authenticated
  USING (is_active);

DROP POLICY IF EXISTS admin_all ON core.eligibilities;
CREATE POLICY admin_all ON core.eligibilities
  FOR ALL TO authenticated
  USING ((SELECT core.has_role('admin')))
  WITH CHECK ((SELECT core.has_role('admin')));

GRANT SELECT ON core.eligibilities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.eligibilities TO authenticated;
GRANT ALL ON core.eligibilities TO service_role;

COMMIT;
