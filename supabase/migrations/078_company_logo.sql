-- =============================================================================
-- Migration: 078_company_logo.sql
-- Purpose:   A company account can post a logo for its company profile.
--              - employers.companies.logo_path: path inside the 'media' bucket
-- Schemas:   employers
--
-- Same as the cover photo (076): the file lives in the owner's own folder,
-- media/<owner uid>/company-logo/<file>, so 034's media policies already apply and the account's
-- folders are removed with the account (069). The CHECK keeps the path in that folder.
-- RLS: companies.owner_update (034) already lets the owner set the column. No new grants.
-- Safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE employers.companies
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

ALTER TABLE employers.companies
  DROP CONSTRAINT IF EXISTS companies_logo_path_owner_folder;
ALTER TABLE employers.companies
  ADD CONSTRAINT companies_logo_path_owner_folder
  CHECK (logo_path IS NULL OR logo_path LIKE profile_id::TEXT || '/company-logo/%');

COMMENT ON COLUMN employers.companies.logo_path IS
  'Company logo: path in the media bucket, <owner uid>/company-logo/<file>; NULL = initials';

COMMIT;
