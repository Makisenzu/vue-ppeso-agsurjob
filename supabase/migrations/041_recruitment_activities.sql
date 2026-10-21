-- =============================================================================
-- Migration: 041_recruitment_activities.sql
-- Purpose:   Local (LRA) and Special (SRA, overseas) Recruitment Activities in one model, typed by
--            `type`. The two checklists only differ in which requirements they list, so the lists
--            are data (public.requirement_templates), not columns.
--
--              employers.establishments ──< esmdd.recruitment_activities (LRA / SRA)
--                recruitment_activities ──< recruitment_activity_requirements ──< recruitment_activity_attachments
--                recruitment_activities ──< recruitment_activity_vacancies >── esmdd.job_vacancies
--
--            1. public.requirement_templates gets `stage` (before / after) and `sort_order`;
--               LRA and SRA checklists are seeded as requirement_type 'lra' / 'sra'
--            2. esmdd.recruitment_activities: agency (establishment), representatives, date range,
--               venue, status, SRA-only CONO / recruitment fee, assessment, terminal report due date
--            3. esmdd.recruitment_activity_requirements: the activity's checklist, created from the
--               templates when the activity is created (names are copied, so later template edits
--               don't rewrite history)
--            4. esmdd.recruitment_activity_attachments + private bucket 'recruitment-activity-documents'
--               (requirement files; the terminal report is the 'after' requirement's attachment)
--            5. esmdd.recruitment_activity_vacancies: the job orders, like job_fair_vacancies, plus
--               SRA destination country and DMW job order number
--            6. Status guard: 'Approved' needs every 'before' requirement checked (and a CONO number
--               for SRA); 'Completed' needs every 'after' requirement checked with a file attached
-- Requires:  039_job_fair_vacancies.sql (job_vacancies.establishment_id)
-- Schema:    public, esmdd, storage
--
-- Access Matrix (Municipal PESO write access comes later):
--   Resource                        | admin / provincial_peso | municipal_peso / dole | company (owner / member)
--   --------------------------------|-------------------------|-----------------------|--------------------------
--   recruitment_activities          | full CRUD               | read                  | read own agency's
--   recruitment_activity_requirements / _vacancies | full CRUD | read                | read own agency's
--   recruitment_activity_attachments + bucket      | full CRUD | read               | none (staff documents)
--
-- Not yet modelled: the per-applicant terminal report (name, address, contact, education, age, sex,
-- position, principal / employer, jobsite country, Q / NQ / FFI / MP / NDR / SNA). For now PPESO
-- uploads the signed report as the 'Terminal Report' requirement's attachment.
-- =============================================================================

BEGIN;


-- ─── 1. Checklist templates ─────────────────────────────────────────────────

ALTER TABLE public.requirement_templates
  ADD COLUMN IF NOT EXISTS stage TEXT
    CHECK (stage IS NULL OR stage IN ('before', 'after')),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

INSERT INTO public.requirement_templates (requirement_type, name, description, stage, sort_order)
SELECT t.requirement_type, t.name, t.description, t.stage, t.sort_order
FROM (VALUES
  ('lra', 'Letter of Intent addressed to the Governor', 'Addressed to the Provincial Governor, thru the PESO Manager', 'before', 1),
  ('lra', 'NSRP Form 2 - Establishment Registration Form', NULL, 'before', 2),
  ('lra', 'Company''s Profile', NULL, 'before', 3),
  ('lra', 'BIR Certification (TIN) / SEC / Mayor''s Permit', NULL, 'before', 4),
  ('lra', 'Valid Job Orders', NULL, 'before', 5),
  ('lra', 'PhilJobNet / PEIS Registered', NULL, 'before', 6),
  ('lra', 'Order of Payment', NULL, 'before', 7),
  ('lra', 'Terminal Report', 'Submitted within 10 days from the end of the recruitment activity', 'after', 8),
  ('sra', 'Letter of Intent addressed to the Governor', 'Addressed to the Provincial Governor, thru the PESO Manager', 'before', 1),
  ('sra', 'NSRP Form 2 - Establishment Registration Form', NULL, 'before', 2),
  ('sra', 'Agency License issued by DMW', NULL, 'before', 3),
  ('sra', 'Valid Job Orders accredited by DMW', NULL, 'before', 4),
  ('sra', 'Recruitment Fee (P1,000.00) - Ord. 6 s. 1994', NULL, 'before', 5),
  ('sra', 'Letter of Acknowledgment (LOA)', NULL, 'before', 6),
  ('sra', 'PhilJobNet / PEIS Registered', NULL, 'before', 7),
  ('sra', 'Order of Payment', NULL, 'before', 8),
  ('sra', 'Terminal Report', 'Submitted within 10 days from the end of the recruitment activity', 'after', 9)
) AS t(requirement_type, name, description, stage, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.requirement_templates r
  WHERE r.requirement_type = t.requirement_type AND r.name = t.name
);


-- ─── 2. Table: esmdd.recruitment_activities ─────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.recruitment_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('LRA', 'SRA')),
  -- The agency / employer conducting it; its NSRP Form 2
  establishment_id UUID NOT NULL
    REFERENCES employers.establishments (id) ON DELETE RESTRICT,
  representatives TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue TEXT,
  city_municipality TEXT,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Conducted', 'Completed', 'Cancelled')),

  -- SRA only: CONO issued by Provincial PESO on approval, and the recruitment fee
  cono_number TEXT UNIQUE,
  cono_issued_at TIMESTAMPTZ,
  cono_issued_by UUID
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  recruitment_fee NUMERIC(10, 2) CHECK (recruitment_fee IS NULL OR recruitment_fee >= 0),
  fee_or_number TEXT,

  -- Checklist assessment ("Assessed By / Date"), stamped on approval
  assessed_by UUID
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ,
  remarks TEXT,

  -- Terminal report is due within 10 days from the end of the activity
  terminal_report_due_date DATE GENERATED ALWAYS AS (end_date + 10) STORED,

  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT recruitment_activities_dates_check CHECK (end_date >= start_date),
  CONSTRAINT recruitment_activities_sra_only_check CHECK (
    type = 'SRA'
    OR (cono_number IS NULL AND cono_issued_at IS NULL AND cono_issued_by IS NULL
        AND recruitment_fee IS NULL AND fee_or_number IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_recruitment_activities_type_dates
  ON esmdd.recruitment_activities (type, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_recruitment_activities_establishment_id
  ON esmdd.recruitment_activities (establishment_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_activities_status
  ON esmdd.recruitment_activities (status);


-- ─── 3. Table: esmdd.recruitment_activity_requirements ──────────────────────

CREATE TABLE IF NOT EXISTS esmdd.recruitment_activity_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL
    REFERENCES esmdd.recruitment_activities (id) ON DELETE CASCADE,
  template_id INTEGER
    REFERENCES public.requirement_templates (id) ON DELETE SET NULL,
  -- Copied from the template so the checklist keeps its wording
  requirement_name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('before', 'after')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_activity_requirements_name_key UNIQUE (activity_id, requirement_name)
);

CREATE INDEX IF NOT EXISTS idx_recruitment_activity_requirements_activity
  ON esmdd.recruitment_activity_requirements (activity_id, stage, sort_order);


-- ─── 4. Table: esmdd.recruitment_activity_attachments ───────────────────────

CREATE TABLE IF NOT EXISTS esmdd.recruitment_activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL
    REFERENCES esmdd.recruitment_activities (id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL
    REFERENCES esmdd.recruitment_activity_requirements (id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size BIGINT CHECK (size IS NULL OR size >= 0),
  uploaded_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_activity_attachments_requirement
  ON esmdd.recruitment_activity_attachments (requirement_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_activity_attachments_activity
  ON esmdd.recruitment_activity_attachments (activity_id);


-- ─── 5. Table: esmdd.recruitment_activity_vacancies ─────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.recruitment_activity_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL
    REFERENCES esmdd.recruitment_activities (id) ON DELETE CASCADE,
  job_vacancy_id UUID NOT NULL
    REFERENCES esmdd.job_vacancies (id) ON DELETE CASCADE,
  -- Openings for this activity; defaults to the vacancy's own count, NULL = no limit
  vacancy_count INTEGER CHECK (vacancy_count IS NULL OR vacancy_count > 0),
  status esmdd.job_vacancy_status NOT NULL DEFAULT 'open',
  -- SRA job orders: jobsite country and the DMW-accredited job order number
  destination_country TEXT,
  job_order_number TEXT,
  created_by UUID DEFAULT auth.uid()
    REFERENCES core.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_activity_vacancies_activity_vacancy_key UNIQUE (activity_id, job_vacancy_id)
);

CREATE INDEX IF NOT EXISTS idx_recruitment_activity_vacancies_job_vacancy_id
  ON esmdd.recruitment_activity_vacancies (job_vacancy_id);


-- ─── 6. Triggers ────────────────────────────────────────────────────────────

-- Shared updated_at stamp for the child tables
CREATE OR REPLACE FUNCTION esmdd.set_recruitment_activity_child_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activity_attachments_updated_at ON esmdd.recruitment_activity_attachments;
CREATE TRIGGER trg_recruitment_activity_attachments_updated_at
BEFORE UPDATE ON esmdd.recruitment_activity_attachments
FOR EACH ROW EXECUTE FUNCTION esmdd.set_recruitment_activity_child_updated_at();

-- Requirements: stamp who checked an item, clear it when unchecked
CREATE OR REPLACE FUNCTION esmdd.recruitment_activity_requirements_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' OR NEW.is_submitted IS DISTINCT FROM OLD.is_submitted THEN
    IF NEW.is_submitted THEN
      NEW.checked_by := auth.uid();
      NEW.checked_at := now();
    ELSE
      NEW.checked_by := NULL;
      NEW.checked_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activity_requirements_stamp ON esmdd.recruitment_activity_requirements;
CREATE TRIGGER trg_recruitment_activity_requirements_stamp
BEFORE INSERT OR UPDATE ON esmdd.recruitment_activity_requirements
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activity_requirements_stamp();

-- Vacancies: only the agency's own jobs; default openings from the vacancy
CREATE OR REPLACE FUNCTION esmdd.recruitment_activity_vacancies_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_activity_establishment UUID;
  v_vacancy esmdd.job_vacancies%ROWTYPE;
BEGIN
  SELECT establishment_id INTO v_activity_establishment
  FROM esmdd.recruitment_activities WHERE id = NEW.activity_id;

  SELECT * INTO v_vacancy FROM esmdd.job_vacancies WHERE id = NEW.job_vacancy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job vacancy % does not exist', NEW.job_vacancy_id;
  END IF;

  IF v_vacancy.establishment_id IS DISTINCT FROM v_activity_establishment THEN
    RAISE EXCEPTION '"%" belongs to another employer', v_vacancy.position_title;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.vacancy_count IS NULL THEN
    NEW.vacancy_count := v_vacancy.vacancy_count;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activity_vacancies_sync ON esmdd.recruitment_activity_vacancies;
CREATE TRIGGER trg_recruitment_activity_vacancies_sync
BEFORE INSERT OR UPDATE ON esmdd.recruitment_activity_vacancies
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activity_vacancies_sync();

-- Activities: SRA fee default, type is fixed, status guard, approval / CONO stamps
CREATE OR REPLACE FUNCTION esmdd.recruitment_activities_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_missing TEXT;
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' THEN
    -- The checklist is created after the insert, so an activity always starts unapproved
    IF NEW.status NOT IN ('Pending', 'Cancelled') THEN
      RAISE EXCEPTION 'A new recruitment activity starts as Pending';
    END IF;
    -- Ord. 6 s. 1994 recruitment fee
    IF NEW.type = 'SRA' AND NEW.recruitment_fee IS NULL THEN
      NEW.recruitment_fee := 1000.00;
    END IF;
  ELSIF NEW.type IS DISTINCT FROM OLD.type THEN
    -- The checklist was built for the original type
    RAISE EXCEPTION 'The activity type cannot be changed; create a new activity instead';
  END IF;

  -- CONO issued: stamp who / when
  IF NEW.cono_number IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cono_number IS DISTINCT FROM OLD.cono_number) THEN
    NEW.cono_issued_at := now();
    NEW.cono_issued_by := auth.uid();
  ELSIF NEW.cono_number IS NULL THEN
    NEW.cono_issued_at := NULL;
    NEW.cono_issued_by := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Approved' THEN
      SELECT string_agg(requirement_name, ', ' ORDER BY sort_order) INTO v_missing
      FROM esmdd.recruitment_activity_requirements
      WHERE activity_id = NEW.id AND stage = 'before' AND NOT is_submitted;

      IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot approve: these requirements are not yet submitted: %', v_missing;
      END IF;
      IF NEW.type = 'SRA' AND NEW.cono_number IS NULL THEN
        RAISE EXCEPTION 'Cannot approve an SRA without its CONO number';
      END IF;

      NEW.assessed_by := auth.uid();
      NEW.assessed_at := now();
    ELSIF NEW.status = 'Completed' THEN
      SELECT string_agg(r.requirement_name, ', ' ORDER BY r.sort_order) INTO v_missing
      FROM esmdd.recruitment_activity_requirements r
      WHERE r.activity_id = NEW.id
        AND r.stage = 'after'
        AND (NOT r.is_submitted
             OR NOT EXISTS (SELECT 1 FROM esmdd.recruitment_activity_attachments a WHERE a.requirement_id = r.id));

      IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot complete: submit and attach %', v_missing;
      END IF;
    ELSIF NEW.status = 'Pending' THEN
      NEW.assessed_by := NULL;
      NEW.assessed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activities_guard ON esmdd.recruitment_activities;
CREATE TRIGGER trg_recruitment_activities_guard
BEFORE INSERT OR UPDATE ON esmdd.recruitment_activities
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activities_guard();

-- New activity: copy its type's checklist from the templates
CREATE OR REPLACE FUNCTION esmdd.recruitment_activities_seed_requirements()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO esmdd.recruitment_activity_requirements (activity_id, template_id, requirement_name, stage, sort_order)
  SELECT NEW.id, t.id, t.name, COALESCE(t.stage, 'before'), t.sort_order
  FROM public.requirement_templates t
  WHERE t.requirement_type = lower(NEW.type)
    AND t.name IS NOT NULL
  ON CONFLICT (activity_id, requirement_name) DO NOTHING;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activities_seed_requirements ON esmdd.recruitment_activities;
CREATE TRIGGER trg_recruitment_activities_seed_requirements
AFTER INSERT ON esmdd.recruitment_activities
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activities_seed_requirements();


-- ─── 7. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE esmdd.recruitment_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.recruitment_activity_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.recruitment_activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.recruitment_activity_vacancies ENABLE ROW LEVEL SECURITY;

-- Same base policies as every esmdd program table (034): admin / Provincial PESO full access,
-- Municipal PESO / DOLE read
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'esmdd.recruitment_activities', 'esmdd.recruitment_activity_requirements',
    'esmdd.recruitment_activity_attachments', 'esmdd.recruitment_activity_vacancies'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all ON %s', t);
    EXECUTE format(
      'CREATE POLICY admin_all ON %s FOR ALL TO authenticated '
      'USING ((SELECT core.has_role(''admin''))) WITH CHECK ((SELECT core.has_role(''admin'')))', t);
    EXECUTE format('DROP POLICY IF EXISTS provincial_peso_all ON %s', t);
    EXECUTE format(
      'CREATE POLICY provincial_peso_all ON %s FOR ALL TO authenticated '
      'USING ((SELECT core.has_role(''provincial_peso''))) WITH CHECK ((SELECT core.has_role(''provincial_peso'')))', t);
    EXECUTE format('DROP POLICY IF EXISTS oversight_select ON %s', t);
    EXECUTE format(
      'CREATE POLICY oversight_select ON %s FOR SELECT TO authenticated '
      'USING ((SELECT core.has_role(''municipal_peso'', ''dole'')))', t);
    EXECUTE format('REVOKE ALL ON %s FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO authenticated', t);
    EXECUTE format('GRANT ALL ON %s TO service_role', t);
  END LOOP;
END;
$$;

-- The agency reads its own activities, checklist status and job orders (not the staff files)
DROP POLICY IF EXISTS company_select ON esmdd.recruitment_activities;
CREATE POLICY company_select ON esmdd.recruitment_activities
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employers.establishments e
    WHERE e.id = recruitment_activities.establishment_id
      AND e.company_id IS NOT NULL
      AND employers.is_company_member(e.company_id)
  )
);

DROP POLICY IF EXISTS company_select ON esmdd.recruitment_activity_requirements;
CREATE POLICY company_select ON esmdd.recruitment_activity_requirements
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM esmdd.recruitment_activities a WHERE a.id = recruitment_activity_requirements.activity_id));

DROP POLICY IF EXISTS company_select ON esmdd.recruitment_activity_vacancies;
CREATE POLICY company_select ON esmdd.recruitment_activity_vacancies
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM esmdd.recruitment_activities a WHERE a.id = recruitment_activity_vacancies.activity_id));


-- ─── 8. Storage bucket 'recruitment-activity-documents' (private) ───────────
-- Permits, licenses and reports are not public; the app opens them with signed URLs.
-- Path: <activity_id>/<requirement_id>/<random>-<filename>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recruitment-activity-documents',
  'recruitment-activity-documents',
  false,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS recruitment_activity_documents_staff_all ON storage.objects;
CREATE POLICY recruitment_activity_documents_staff_all ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'recruitment-activity-documents'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
)
WITH CHECK (
  bucket_id = 'recruitment-activity-documents'
  AND (SELECT core.has_role('provincial_peso', 'admin'))
  AND EXISTS (
    SELECT 1 FROM esmdd.recruitment_activities a
    WHERE a.id::TEXT = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS recruitment_activity_documents_oversight_select ON storage.objects;
CREATE POLICY recruitment_activity_documents_oversight_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'recruitment-activity-documents'
  AND (SELECT core.has_role('municipal_peso', 'dole'))
);

COMMIT;
