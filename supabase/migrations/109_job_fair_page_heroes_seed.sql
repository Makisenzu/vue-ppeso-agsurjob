-- =============================================================================
-- Migration: 109_job_fair_page_heroes_seed.sql
-- Purpose:   One system.public_page_heroes row for each Job Fairs page added in 108, so PESO can
--            edit them in Site Contents → Page banners. Empty text falls back to the built-in text
--            (PUBLIC_PAGES in src/types/common/siteContent.ts); without a PESO photo the page uses
--            the newest job fair post's picture.
--
-- Access: unchanged from 051. Personal data: none. Notified events: none.
-- Depends on 108 (run it first, separately). Safe to re-run. Then run `npm run types:gen`.
-- =============================================================================

BEGIN;

INSERT INTO system.public_page_heroes (page)
VALUES ('job_fairs_applicant'), ('job_fairs_employer')
ON CONFLICT (page) DO NOTHING;

COMMIT;
