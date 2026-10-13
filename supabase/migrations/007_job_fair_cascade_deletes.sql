-- =============================================================================
-- Migration: 007_job_fair_cascade_deletes.sql
-- Purpose:   Let deletes flow down the Job Fair hierarchy:
--              job_fairs ──► job_fair_participants ──► job_vacancies
--            Deleting a job fair removes its participants and vacancies;
--            deleting a participant removes its vacancies.
-- Schema:    esmdd
--
-- Note: esmdd.hots (Hired on the Spot) is intentionally NOT cascaded. Hire
-- records are applicant outcomes, so a job fair with hires cannot be deleted
-- until those records are handled explicitly.
-- =============================================================================

BEGIN;

ALTER TABLE esmdd.job_fair_participants
  DROP CONSTRAINT IF EXISTS job_fair_participants_job_fair_id_fkey,
  ADD CONSTRAINT job_fair_participants_job_fair_id_fkey
    FOREIGN KEY (job_fair_id) REFERENCES esmdd.job_fairs (id) ON DELETE CASCADE;

ALTER TABLE esmdd.job_vacancies
  DROP CONSTRAINT IF EXISTS job_vacancies_job_fair_id_fkey,
  ADD CONSTRAINT job_vacancies_job_fair_id_fkey
    FOREIGN KEY (job_fair_id) REFERENCES esmdd.job_fairs (id) ON DELETE CASCADE;

ALTER TABLE esmdd.job_vacancies
  DROP CONSTRAINT IF EXISTS job_vacancies_participant_id_fkey,
  ADD CONSTRAINT job_vacancies_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES esmdd.job_fair_participants (id) ON DELETE CASCADE;

COMMIT;
