-- =============================================================================
-- Migration: 108_job_fair_page_heroes.sql
-- Purpose:   Provincial PESO edits the hero of the applicant and employer Job Fairs pages in
--            Site Contents → Page banners, like "What is PESO?" (051).
--            This file only adds the enum values; 109 seeds their rows.
--
--            Split because a new enum value cannot be used in the transaction that adds it
--            (55P04), and the Supabase SQL editor runs a whole file as one transaction.
--
-- Access: unchanged from 051. 051's storage policy reads the enum at run time, so photos under
--         pages/job_fairs_*/ are allowed as is.
-- Personal data: none. Notified events: none. Depends on 051. Safe to re-run.
-- Run 109 after this, then `npm run types:gen`.
-- =============================================================================

ALTER TYPE system.public_page ADD VALUE IF NOT EXISTS 'job_fairs_applicant';
ALTER TYPE system.public_page ADD VALUE IF NOT EXISTS 'job_fairs_employer';
