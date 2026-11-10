-- =============================================================================
-- Migration: 113_directory_office_head_position.sql
-- Purpose:   The office directory (public.directories) records the office head's position next to their
--            name. A GIP intern's accomplishment report (migration 112) is approved by the head of the office
--            they are appointed to: the report fills "Approved by" (name + position) from this directory entry.
-- Schema:    public
--
-- Access: unchanged — every signed-in user reads the directory (authenticated_select, migration 034), which is
-- how the intern's report finds its office head. Office heads' names and positions are public office information.
-- =============================================================================

BEGIN;

ALTER TABLE public.directories
  ADD COLUMN IF NOT EXISTS office_head_position TEXT;

ALTER TABLE public.directories
  DROP CONSTRAINT IF EXISTS directories_office_head_position_check;
ALTER TABLE public.directories
  ADD CONSTRAINT directories_office_head_position_check
  CHECK (office_head_position IS NULL OR char_length(btrim(office_head_position)) BETWEEN 1 AND 150);

COMMENT ON COLUMN public.directories.office_head_position IS
  'Position of the office head (e.g. Provincial Government Department Head); printed under their name on GIP accomplishment reports.';

COMMIT;
