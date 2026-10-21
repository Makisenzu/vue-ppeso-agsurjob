-- ============================================================================
-- 042: Recruitment activities — NSRP Form 2 checklist item starts submitted
-- ============================================================================
-- Every activity is created with its agency's completed NSRP Form 2
-- (establishment_id is NOT NULL), so the "NSRP Form 2" checklist item is
-- ticked when the checklist is seeded instead of by a follow-up client call.
-- The item cannot be unchecked afterwards. Also ticks the item on
-- activities created before this migration.
-- ============================================================================

CREATE OR REPLACE FUNCTION esmdd.recruitment_activities_seed_requirements()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO esmdd.recruitment_activity_requirements (activity_id, template_id, requirement_name, stage, sort_order, is_submitted)
  SELECT NEW.id, t.id, t.name, COALESCE(t.stage, 'before'), t.sort_order,
         t.name ~* '^\s*NSRP Form 2\M'
  FROM public.requirement_templates t
  WHERE t.requirement_type = lower(NEW.type)
    AND t.name IS NOT NULL
  ON CONFLICT (activity_id, requirement_name) DO NOTHING;
  RETURN NULL;
END;
$$;

-- The NSRP Form 2 item stays checked: unchecking it is refused
CREATE OR REPLACE FUNCTION esmdd.recruitment_activity_requirements_lock_nsrp_form2()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_submitted AND NOT NEW.is_submitted
     AND OLD.requirement_name ~* '^\s*NSRP Form 2\M' THEN
    RAISE EXCEPTION 'NSRP Form 2 is completed when the activity is created and cannot be unchecked.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_activity_requirements_lock_nsrp_form2 ON esmdd.recruitment_activity_requirements;
CREATE TRIGGER trg_recruitment_activity_requirements_lock_nsrp_form2
BEFORE UPDATE OF is_submitted ON esmdd.recruitment_activity_requirements
FOR EACH ROW EXECUTE FUNCTION esmdd.recruitment_activity_requirements_lock_nsrp_form2();

-- Backfill: existing activities already have their establishment's Form 2
UPDATE esmdd.recruitment_activity_requirements
SET is_submitted = true
WHERE NOT is_submitted
  AND requirement_name ~* '^\s*NSRP Form 2\M';
