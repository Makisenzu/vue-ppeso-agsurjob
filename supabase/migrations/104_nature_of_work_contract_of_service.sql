-- =============================================================================
-- Migration: 104_nature_of_work_contract_of_service.sql
-- Purpose:   Rename the job vacancy "Nature of Work" option 'Contractual' to
--            'Contract of Service' (esmdd.nature_of_work_enum). RENAME VALUE updates
--            every existing row that uses it, so no data backfill is needed.
--
-- Access: unchanged. Personal data: none. Notified events: none. Safe to re-run.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'esmdd'
      AND t.typname = 'nature_of_work_enum'
      AND e.enumlabel = 'Contractual'
  ) THEN
    ALTER TYPE esmdd.nature_of_work_enum RENAME VALUE 'Contractual' TO 'Contract of Service';
  END IF;
END
$$;

COMMIT;
