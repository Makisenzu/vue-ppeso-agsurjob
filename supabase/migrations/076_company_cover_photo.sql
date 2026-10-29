-- =============================================================================
-- Migration: 076_company_cover_photo.sql
-- Purpose:   A company account can post a cover photo for its company profile.
--              - employers.companies.cover_photo_path: path inside the 'media' bucket
-- Schemas:   employers
--
-- Storage: the file lives in the owner's own folder, media/<owner uid>/company-cover/<file>, so
-- 034's media policies already apply (owner writes its folder, signed-in users read) and the
-- account's folders are removed with the account (069). The CHECK keeps the path in that folder.
-- RLS: companies.owner_update (034) already lets the owner set the column. No new grants.
-- Safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE employers.companies
  ADD COLUMN IF NOT EXISTS cover_photo_path TEXT;

ALTER TABLE employers.companies
  DROP CONSTRAINT IF EXISTS companies_cover_photo_path_owner_folder;
ALTER TABLE employers.companies
  ADD CONSTRAINT companies_cover_photo_path_owner_folder
  CHECK (cover_photo_path IS NULL OR cover_photo_path LIKE profile_id::TEXT || '/company-cover/%');

COMMENT ON COLUMN employers.companies.cover_photo_path IS
  'Company profile cover photo: path in the media bucket, <owner uid>/company-cover/<file>; NULL = no cover';

COMMIT;
