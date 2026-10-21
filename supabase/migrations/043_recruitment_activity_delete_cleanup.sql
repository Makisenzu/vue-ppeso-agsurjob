-- ============================================================================
-- 043: Recruitment activities — deleting cleans up the agency's records
-- ============================================================================
-- An LRA/SRA job order's job (esmdd.job_vacancies) and the activity's agency
-- (employers.establishments) are entered for that activity, so they are
-- deleted with it — unless something else still uses them:
--   • Removing a job order deletes its job_vacancies row, unless another
--     activity or a job fair (job_fair_vacancies) still lists that job.
--   • Deleting an activity removes its job orders (and so their jobs, as
--     above), then deletes its establishment unless it is a company account's
--     (company_id set), or another activity, a job fair participant or any
--     remaining job_vacancies row still points to it.
-- SECURITY INVOKER: runs with the deleting user's RLS (PPESO / admin).
-- ============================================================================

-- ─── 1. Job order removed → delete its job if nothing else lists it ──────────

CREATE OR REPLACE FUNCTION esmdd.recruitment_activity_vacancies_delete_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM esmdd.job_vacancies jv
  WHERE jv.id = OLD.job_vacancy_id
    AND NOT EXISTS (SELECT 1 FROM esmdd.recruitment_activity_vacancies rav WHERE rav.job_vacancy_id = jv.id)
    AND NOT EXISTS (SELECT 1 FROM esmdd.job_fair_vacancies jfv WHERE jfv.job_vacancy_id = jv.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activity_vacancies_delete_job ON esmdd.recruitment_activity_vacancies;
CREATE TRIGGER trg_recruitment_activity_vacancies_delete_job
AFTER DELETE ON esmdd.recruitment_activity_vacancies
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activity_vacancies_delete_job();

-- ─── 2. Activity deleted → remove its job orders first ──────────────────────
-- Done explicitly (not left to ON DELETE CASCADE) so the jobs are gone before
-- step 3 checks whether the establishment is still in use.

CREATE OR REPLACE FUNCTION esmdd.recruitment_activities_delete_job_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM esmdd.recruitment_activity_vacancies WHERE activity_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activities_delete_job_orders ON esmdd.recruitment_activities;
CREATE TRIGGER trg_recruitment_activities_delete_job_orders
BEFORE DELETE ON esmdd.recruitment_activities
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activities_delete_job_orders();

-- ─── 3. Activity deleted → delete its establishment if nothing else uses it ──

CREATE OR REPLACE FUNCTION esmdd.recruitment_activities_delete_establishment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM employers.establishments e
  WHERE e.id = OLD.establishment_id
    AND e.company_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM esmdd.recruitment_activities ra WHERE ra.establishment_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM esmdd.job_fair_participants jfp WHERE jfp.establishment_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM esmdd.job_vacancies jv WHERE jv.establishment_id = e.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activities_delete_establishment ON esmdd.recruitment_activities;
CREATE TRIGGER trg_recruitment_activities_delete_establishment
AFTER DELETE ON esmdd.recruitment_activities
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activities_delete_establishment();
