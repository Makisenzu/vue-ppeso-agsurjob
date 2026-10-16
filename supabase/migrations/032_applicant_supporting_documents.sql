-- =============================================================================
-- Migration: 032_applicant_supporting_documents.sql
-- Purpose:   Make the supporting document mandatory for every technical / vocational training
--            and every eligibility / professional license an applicant puts on their NSRP
--            record (applicants.applicants). The frontend already requires it; this enforces it
--            for any write that bypasses the UI.
--
-- Rules (BEFORE INSERT / UPDATE of vocational_trainings or eligibilities):
--   * Applies only when the writer is an applicant (core.profiles.role = 'applicant').
--     PESO / admin writes (applicant entry, NSRP edits, imports) are not checked.
--   * Runs only when the list actually changes, so saving another NSRP section or the
--     core.profiles sync (migration 029) is never blocked by it.
--   * Every entry of a changed list needs a `document_path` that is an existing file in the
--     'documents' bucket, inside the record owner's own folder (documents/<profile_id>/...).
--     Made-up paths and other users' files are rejected.
--   * SECURITY DEFINER (search_path = '') so storage.objects can be read regardless of the
--     applicant's storage RLS; the function only reads.
-- Schemas:   applicants, core, storage
-- Safe to re-run.
-- =============================================================================


-- ─── 1. Validate one list of entries ────────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.assert_entries_have_documents(
  p_entries JSONB,
  p_owner_id UUID,
  p_title_key TEXT,
  p_kind TEXT
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry JSONB;
  v_path TEXT;
  v_title TEXT;
  v_index INT := 0;
BEGIN
  IF p_entries IS NULL OR jsonb_typeof(p_entries) = 'null' THEN
    RETURN;
  END IF;

  -- PESO data sometimes stores a single entry as an object instead of an array
  IF jsonb_typeof(p_entries) = 'object' THEN
    p_entries := jsonb_build_array(p_entries);
  END IF;

  IF jsonb_typeof(p_entries) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_entry IN SELECT value FROM jsonb_array_elements(p_entries)
  LOOP
    v_index := v_index + 1;
    v_path := NULLIF(btrim(COALESCE(v_entry ->> 'document_path', '')), '');
    v_title := COALESCE(NULLIF(btrim(v_entry ->> p_title_key), ''), p_kind || ' ' || v_index);

    IF v_path IS NULL THEN
      RAISE EXCEPTION 'Upload a supporting document for the % "%".', p_kind, v_title
        USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects o
      WHERE o.bucket_id = 'documents'
        AND o.name = v_path
        AND (storage.foldername(o.name))[1] = p_owner_id::TEXT
    ) THEN
      RAISE EXCEPTION 'The supporting document for the % "%" was not found. Upload it again.', p_kind, v_title
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
END;
$$;


-- ─── 2. Trigger on applicants.applicants ────────────────────────────────────

CREATE OR REPLACE FUNCTION applicants.require_applicant_supporting_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only applicants editing their NSRP record; staff and server-side jobs are exempt
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM core.profiles
    WHERE id = auth.uid()
      AND role::TEXT = 'applicant'
  ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.vocational_trainings::JSONB IS DISTINCT FROM OLD.vocational_trainings::JSONB THEN
    PERFORM applicants.assert_entries_have_documents(
      NEW.vocational_trainings::JSONB, NEW.profile_id, 'course_training_title', 'training'
    );
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.eligibilities::JSONB IS DISTINCT FROM OLD.eligibilities::JSONB THEN
    PERFORM applicants.assert_entries_have_documents(
      NEW.eligibilities::JSONB, NEW.profile_id, 'eligibility_title', 'eligibility'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applicants_require_supporting_documents ON applicants.applicants;
CREATE TRIGGER trg_applicants_require_supporting_documents
BEFORE INSERT OR UPDATE OF vocational_trainings, eligibilities
ON applicants.applicants
FOR EACH ROW
EXECUTE FUNCTION applicants.require_applicant_supporting_documents();

-- Internal helper: callable by the trigger only, not through the API
REVOKE ALL ON FUNCTION applicants.assert_entries_have_documents(JSONB, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
