-- =============================================================================
-- Migration: 022_tupad_batch_requirements.sql
-- Purpose:   A TUPAD applicant can only be added to a batch once they have
--            submitted their monthly income and the 3 required documents:
--              NSRP Form, Valid ID, TUPAD Form
--
--              1. NSRP Form is always on the list (it is the registry entry itself):
--                 column default + backfill of existing rows
--              2. Guard trigger on esmdd.tupad: reject a beneficiary whose
--                 TUPAD applicant is missing the income or a required document
-- Schema:    esmdd
--
-- Document names must match TUPAD_DOCUMENT_OPTIONS in src/types/peso/provincialPeso/tupad.ts.
-- =============================================================================


-- ─── 1. NSRP Form is always submitted ──────────────────────────────────────

ALTER TABLE esmdd.tupad_applicants
  ALTER COLUMN doc_submitted SET DEFAULT ARRAY['NSRP Form']::TEXT[];

UPDATE esmdd.tupad_applicants
SET doc_submitted = array_prepend('NSRP Form', doc_submitted)
WHERE NOT ('NSRP Form' = ANY (doc_submitted));


-- ─── 2. Batch requirements guard ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.guard_tupad_batch_requirements()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_income  NUMERIC;
  v_docs    TEXT[];
  v_missing TEXT[] := '{}';
BEGIN
  -- Only a new beneficiary, or one moved to another TUPAD applicant, is checked;
  -- editing days / status / remarks of an existing beneficiary is not blocked
  IF TG_OP = 'UPDATE' AND NEW.tupad_applicant_id = OLD.tupad_applicant_id THEN
    RETURN NEW;
  END IF;

  SELECT ta.monthly_income, ta.doc_submitted
  INTO v_income, v_docs
  FROM esmdd.tupad_applicants ta
  WHERE ta.id = NEW.tupad_applicant_id;

  IF NOT FOUND THEN
    RETURN NEW; -- the foreign key reports the missing applicant
  END IF;

  IF v_income IS NULL THEN
    v_missing := array_append(v_missing, 'monthly income');
  END IF;
  IF NOT ('NSRP Form' = ANY (v_docs)) THEN
    v_missing := array_append(v_missing, 'NSRP Form');
  END IF;
  IF NOT ('Valid ID' = ANY (v_docs)) THEN
    v_missing := array_append(v_missing, 'Valid ID');
  END IF;
  IF NOT ('TUPAD Form' = ANY (v_docs)) THEN
    v_missing := array_append(v_missing, 'TUPAD Form');
  END IF;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'This applicant cannot be added to a TUPAD batch yet. Missing: %.', array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tupad_guard_batch_requirements ON esmdd.tupad;
CREATE TRIGGER trg_tupad_guard_batch_requirements
  BEFORE INSERT OR UPDATE OF tupad_applicant_id ON esmdd.tupad
  FOR EACH ROW
  EXECUTE FUNCTION esmdd.guard_tupad_batch_requirements();
