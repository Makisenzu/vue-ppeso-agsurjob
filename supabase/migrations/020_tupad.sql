-- =============================================================================
-- Migration: 020_tupad.sql
-- Purpose:   Create the TUPAD (Tulong Panghanapbuhay sa Ating Disadvantaged /
--            Displaced Workers) tables under the esmdd schema.
--              1. esmdd.tupad_applicants   (registry applicant referred to TUPAD)
--              2. esmdd.tupad_batch        (one batch per EDL number)
--              3. esmdd.tupad              (an applicant's engagement in a batch)
--              4. esmdd.tupad_attachments  (files of a TUPAD engagement)
--              5. Auto-update `updated_at` triggers
--              6. Grants & RLS
-- Schema:    esmdd
--
-- Data model:
--   applicants.applicants ──< tupad_applicants ──< tupad >── tupad_batch
--                                                   │
--                                                   └──< tupad_attachments
--
--   An applicant is engaged at most once per batch: (batch_id, tupad_applicant_id) is UNIQUE.
--
-- Status values:
--   tupad_applicants : Pending → Approved | Rejected
--   tupad_batch      : Pending → Ongoing → Completed | Cancelled
--   tupad            : Active → Completed | Terminated
--
-- Access Matrix:
--   Table              | provincial_peso | municipal_peso / admin | applicant
--   -------------------|-----------------|------------------------|---------------------------------
--   tupad_applicants   | full CRUD       | read                   | read own (via applicants.profile_id)
--   tupad_batch        | full CRUD       | read                   | read batches they are engaged in
--   tupad              | full CRUD       | read                   | read own
--   tupad_attachments  | full CRUD       | read                   | read own
--
-- Storage path convention (same as 014 / 016): documents/<uploader auth.uid()>/<file>
-- =============================================================================


-- ─── 1. tupad_applicants ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.tupad_applicants (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    UUID           NOT NULL REFERENCES applicants.applicants(id) ON DELETE CASCADE,
  monthly_income  NUMERIC(12,2)  CHECK (monthly_income IS NULL OR monthly_income >= 0),
  dependent_name  TEXT,
  doc_submitted   TEXT[]         NOT NULL DEFAULT '{}',
  status          TEXT           NOT NULL DEFAULT 'Pending'
                                 CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),

  -- One TUPAD application per registry applicant
  CONSTRAINT tupad_applicants_applicant_id_key UNIQUE (applicant_id)
);

COMMENT ON TABLE esmdd.tupad_applicants IS
  'Registry applicants (applicants.applicants) referred to TUPAD, with the income / dependent details and submitted documents PESO reviews.';
COMMENT ON COLUMN esmdd.tupad_applicants.doc_submitted IS
  'Names of the documentary requirements the applicant has submitted.';


-- ─── 2. tupad_batch ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.tupad_batch (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  edl_number  TEXT         NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'Pending'
                           CHECK (status IN ('Pending', 'Ongoing', 'Completed', 'Cancelled')),
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT tupad_batch_edl_number_key UNIQUE (edl_number),
  CONSTRAINT tupad_batch_dates_check CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE esmdd.tupad_batch IS
  'A TUPAD batch, identified by its EDL number, with the period the beneficiaries work.';


-- ─── 3. tupad ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.tupad (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID         NOT NULL REFERENCES esmdd.tupad_batch(id) ON DELETE CASCADE,
  tupad_applicant_id  UUID         NOT NULL REFERENCES esmdd.tupad_applicants(id) ON DELETE CASCADE,
  days_duration       INT          NOT NULL CHECK (days_duration BETWEEN 1 AND 365),
  status              TEXT         NOT NULL DEFAULT 'Active'
                                   CHECK (status IN ('Active', 'Completed', 'Terminated')),
  remarks             TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- An applicant is engaged at most once per batch
  CONSTRAINT tupad_batch_applicant_key UNIQUE (batch_id, tupad_applicant_id)
);

COMMENT ON TABLE esmdd.tupad IS
  'A TUPAD applicant''s engagement in a batch (esmdd.tupad_batch).';


-- ─── 4. tupad_attachments ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esmdd.tupad_attachments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tupad_id    UUID         NOT NULL REFERENCES esmdd.tupad(id) ON DELETE CASCADE,
  file_name   TEXT         NOT NULL,
  path        TEXT         NOT NULL,
  mime_type   TEXT,
  size        BIGINT       CHECK (size IS NULL OR size >= 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE esmdd.tupad_attachments IS
  'Files (documents bucket) attached to a TUPAD engagement (esmdd.tupad).';


-- ─── 5. Indexes for performance ────────────────────────────────────────────
-- tupad_applicants.applicant_id, tupad_batch.edl_number and
-- tupad (batch_id, tupad_applicant_id) are already covered by their UNIQUE constraints.

CREATE INDEX IF NOT EXISTS idx_tupad_applicants_status
  ON esmdd.tupad_applicants (status);

CREATE INDEX IF NOT EXISTS idx_tupad_batch_status_start_date
  ON esmdd.tupad_batch (status, start_date);

-- Applicant → engagements lookup (the composite key leads with batch_id)
CREATE INDEX IF NOT EXISTS idx_tupad_tupad_applicant_id
  ON esmdd.tupad (tupad_applicant_id);

CREATE INDEX IF NOT EXISTS idx_tupad_status
  ON esmdd.tupad (status);

CREATE INDEX IF NOT EXISTS idx_tupad_attachments_tupad_id
  ON esmdd.tupad_attachments (tupad_id);


-- ─── 6. Auto-update `updated_at` triggers ──────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.set_tupad_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_applicants_updated_at ON esmdd.tupad_applicants;
CREATE TRIGGER trg_tupad_applicants_updated_at
  BEFORE UPDATE ON esmdd.tupad_applicants
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_tupad_updated_at();

DROP TRIGGER IF EXISTS trg_tupad_batch_updated_at ON esmdd.tupad_batch;
CREATE TRIGGER trg_tupad_batch_updated_at
  BEFORE UPDATE ON esmdd.tupad_batch
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_tupad_updated_at();

DROP TRIGGER IF EXISTS trg_tupad_updated_at ON esmdd.tupad;
CREATE TRIGGER trg_tupad_updated_at
  BEFORE UPDATE ON esmdd.tupad
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_tupad_updated_at();

DROP TRIGGER IF EXISTS trg_tupad_attachments_updated_at ON esmdd.tupad_attachments;
CREATE TRIGGER trg_tupad_attachments_updated_at
  BEFORE UPDATE ON esmdd.tupad_attachments
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.set_tupad_updated_at();


-- ─── 7. Grants & Row Level Security ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON esmdd.tupad_applicants, esmdd.tupad_batch, esmdd.tupad, esmdd.tupad_attachments
  TO authenticated;
GRANT ALL
  ON esmdd.tupad_applicants, esmdd.tupad_batch, esmdd.tupad, esmdd.tupad_attachments
  TO service_role;

ALTER TABLE esmdd.tupad_applicants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.tupad_batch       ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.tupad             ENABLE ROW LEVEL SECURITY;
ALTER TABLE esmdd.tupad_attachments ENABLE ROW LEVEL SECURITY;

-- Provincial PESO: full CRUD; Municipal PESO / Admin: read — on all four tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tupad_applicants', 'tupad_batch', 'tupad', 'tupad_attachments']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON esmdd.%I', 'provincial_peso_' || t || '_all', t);
    EXECUTE format(
      $p$CREATE POLICY %I ON esmdd.%I
         FOR ALL TO authenticated
         USING (
           EXISTS (
             SELECT 1 FROM core.profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role = 'provincial_peso'
           )
         )
         WITH CHECK (
           EXISTS (
             SELECT 1 FROM core.profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role = 'provincial_peso'
           )
         )$p$,
      'provincial_peso_' || t || '_all', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON esmdd.%I', 'municipal_peso_and_admin_' || t || '_select', t);
    EXECUTE format(
      $p$CREATE POLICY %I ON esmdd.%I
         FOR SELECT TO authenticated
         USING (
           EXISTS (
             SELECT 1 FROM core.profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role IN ('municipal_peso', 'admin')
           )
         )$p$,
      'municipal_peso_and_admin_' || t || '_select', t
    );
  END LOOP;
END;
$$;

-- Applicants read their own rows through applicants.applicants.profile_id
DROP POLICY IF EXISTS "applicant_own_tupad_applicants_select" ON esmdd.tupad_applicants;
CREATE POLICY "applicant_own_tupad_applicants_select"
ON esmdd.tupad_applicants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applicants.applicants a
    WHERE a.id = tupad_applicants.applicant_id
      AND a.profile_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "applicant_own_tupad_batch_select" ON esmdd.tupad_batch;
CREATE POLICY "applicant_own_tupad_batch_select"
ON esmdd.tupad_batch
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.tupad t
    JOIN esmdd.tupad_applicants ta ON ta.id = t.tupad_applicant_id
    JOIN applicants.applicants a ON a.id = ta.applicant_id
    WHERE t.batch_id = tupad_batch.id
      AND a.profile_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "applicant_own_tupad_select" ON esmdd.tupad;
CREATE POLICY "applicant_own_tupad_select"
ON esmdd.tupad
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.tupad_applicants ta
    JOIN applicants.applicants a ON a.id = ta.applicant_id
    WHERE ta.id = tupad.tupad_applicant_id
      AND a.profile_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "applicant_own_tupad_attachments_select" ON esmdd.tupad_attachments;
CREATE POLICY "applicant_own_tupad_attachments_select"
ON esmdd.tupad_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM esmdd.tupad t
    JOIN esmdd.tupad_applicants ta ON ta.id = t.tupad_applicant_id
    JOIN applicants.applicants a ON a.id = ta.applicant_id
    WHERE t.id = tupad_attachments.tupad_id
      AND a.profile_id = (SELECT auth.uid())
  )
);
