-- =============================================================================
-- Migration: 105_job_fair_self_service.sql
-- Purpose:   Job fairs for applicants and employers (until now only PESO encoded them).
--
--            Employers (company owner, verified company):
--              1. esmdd.join_job_fair(): register their establishment for an Upcoming / Ongoing fair.
--                 The participant starts 'Registered'; PESO sets it to 'Confirmed' on the existing
--                 Participants tab.
--              2. esmdd.withdraw_from_job_fair(): leave a fair (no hires yet, fair not over). Its
--                 offers go with it (job_fair_vacancies ON DELETE CASCADE).
--              3. job_fair_vacancies RLS: the owner offers / edits / removes their own postings at a
--                 fair they joined (not Cancelled). esmdd.add_job_fair_vacancy() (039, SECURITY
--                 INVOKER) now works for them; its sync trigger keeps offers to their own postings.
--
--            Applicants (verified account, rule 20):
--              4. esmdd.register_for_job_fair() / esmdd.cancel_job_fair_registration(): pre-register
--                 as an attendee (job_fair_applicants 'Registered'); cancel while still Registered.
--
--            Both:
--              5. esmdd.list_job_fair_events(): fairs with their live status, the number of confirmed
--                 companies and open openings, and the caller's own registration / participation.
--              6. esmdd.list_job_fair_companies() / esmdd.list_job_fair_vacancies(): what applicants
--                 see of a fair — Confirmed / Attended participants and their open offers only.
--
--            7. Notifications (BACKEND.md §17).
--
-- Access: RPCs are SECURITY DEFINER and check the caller themselves (role, ownership, verification).
--         PESO / admin keep their existing access (034 / 039).
-- Personal data: none new. job_fair_applicants already holds the attendee link (025); an applicant
--         only ever writes their own row. Companies see no attendee data.
--
-- Notified events:
--   Event                                   | Recipient           | type      | Title
--   ----------------------------------------|---------------------|-----------|--------------------------------
--   Company joins a job fair                | Provincial PESO     | job_fair  | New Job Fair Participant
--   Company withdraws from a job fair       | Provincial PESO     | job_fair  | Job Fair Participant Withdrew
--   Participant set to Confirmed / Cancelled| Company owner       | job_fair  | Job Fair Registration Confirmed / Cancelled
--   Job fair cancelled                      | Registered applicants (053) + participating company owners (new)
--
-- Depends on 025, 026, 034, 038, 039, 053, 057, 103. Safe to re-run. Then run `npm run types:gen`.
-- =============================================================================

BEGIN;


-- ─── Helpers ────────────────────────────────────────────────────────────────

-- The signed-in owner's establishment (NSRP Form 2); NULL when they own none
CREATE OR REPLACE FUNCTION esmdd.my_owned_establishment_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id
  FROM employers.establishments e
  JOIN employers.companies c ON c.id = e.company_id
  WHERE c.profile_id = auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION esmdd.my_owned_establishment_id() FROM PUBLIC, anon, authenticated;

-- Live status of a fair (026 only refreshes the stored one on write)
CREATE OR REPLACE FUNCTION esmdd.job_fair_live_status(p_job_fair esmdd.job_fairs)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT esmdd.job_fair_status_for(p_job_fair.start_date::date, p_job_fair.end_date::date, p_job_fair.status);
$$;
REVOKE ALL ON FUNCTION esmdd.job_fair_live_status(esmdd.job_fairs) FROM PUBLIC, anon, authenticated;


-- ─── 1. Employer: join a job fair ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.join_job_fair(p_job_fair_id UUID)
RETURNS esmdd.job_fair_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fair esmdd.job_fairs%ROWTYPE;
  v_establishment_id UUID;
  v_participant esmdd.job_fair_participants;
BEGIN
  IF NOT core.has_role('company_owner') THEN
    RAISE EXCEPTION 'Only the company owner can join a job fair.' USING ERRCODE = '42501';
  END IF;

  v_establishment_id := esmdd.my_owned_establishment_id();
  IF v_establishment_id IS NULL THEN
    RAISE EXCEPTION 'Complete your company profile before joining a job fair.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM employers.establishments e
    JOIN employers.companies c ON c.id = e.company_id
    WHERE e.id = v_establishment_id
      AND c.verification_status::TEXT = 'approved'
  ) THEN
    RAISE EXCEPTION 'Verify your company before joining a job fair. PESO verifies it once your company documents are approved.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_fair FROM esmdd.job_fairs WHERE id = p_job_fair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job fair not found.' USING ERRCODE = 'P0002';
  END IF;

  IF esmdd.job_fair_live_status(v_fair) NOT IN ('Upcoming', 'Ongoing') THEN
    RAISE EXCEPTION 'This job fair is no longer open for registration.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM esmdd.job_fair_participants
    WHERE job_fair_id = p_job_fair_id AND establishment_id = v_establishment_id
  ) THEN
    RAISE EXCEPTION 'Your company already joined this job fair.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO esmdd.job_fair_participants (job_fair_id, establishment_id, status, registered_at)
  VALUES (p_job_fair_id, v_establishment_id, 'Registered', now())
  RETURNING * INTO v_participant;

  RETURN v_participant;
END;
$$;
REVOKE ALL ON FUNCTION esmdd.join_job_fair(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.join_job_fair(UUID) TO authenticated;


-- ─── 2. Employer: withdraw from a job fair ──────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.withdraw_from_job_fair(p_job_fair_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fair esmdd.job_fairs%ROWTYPE;
  v_participant esmdd.job_fair_participants%ROWTYPE;
BEGIN
  SELECT * INTO v_participant
  FROM esmdd.job_fair_participants
  WHERE job_fair_id = p_job_fair_id
    AND establishment_id = esmdd.my_owned_establishment_id();

  IF NOT FOUND OR NOT core.has_role('company_owner') THEN
    RAISE EXCEPTION 'Your company is not registered for this job fair.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_fair FROM esmdd.job_fairs WHERE id = p_job_fair_id;
  IF esmdd.job_fair_live_status(v_fair) = 'Completed' THEN
    RAISE EXCEPTION 'This job fair is over, so your participation can no longer be withdrawn.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM esmdd.hots WHERE participant_id = v_participant.id) THEN
    RAISE EXCEPTION 'You already hired applicants at this job fair, so you can no longer withdraw.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM esmdd.job_fair_participants WHERE id = v_participant.id;
END;
$$;
REVOKE ALL ON FUNCTION esmdd.withdraw_from_job_fair(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.withdraw_from_job_fair(UUID) TO authenticated;


-- ─── 3. Employer: offer their postings at a fair they joined ────────────────

-- The participant belongs to the caller's company and is not Cancelled
CREATE OR REPLACE FUNCTION esmdd.owns_active_job_fair_participant(p_participant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM esmdd.job_fair_participants p
    JOIN employers.establishments e ON e.id = p.establishment_id
    WHERE p.id = p_participant_id
      AND coalesce(p.status, '') <> 'Cancelled'
      AND e.company_id IS NOT NULL
      AND employers.is_company_owner(e.company_id)
  );
$$;
REVOKE ALL ON FUNCTION esmdd.owns_active_job_fair_participant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.owns_active_job_fair_participant(UUID) TO authenticated;

DROP POLICY IF EXISTS company_owner_insert ON esmdd.job_fair_vacancies;
CREATE POLICY company_owner_insert ON esmdd.job_fair_vacancies
FOR INSERT TO authenticated
WITH CHECK ((SELECT esmdd.owns_active_job_fair_participant(participant_id)));

DROP POLICY IF EXISTS company_owner_update ON esmdd.job_fair_vacancies;
CREATE POLICY company_owner_update ON esmdd.job_fair_vacancies
FOR UPDATE TO authenticated
USING ((SELECT esmdd.owns_active_job_fair_participant(participant_id)))
WITH CHECK ((SELECT esmdd.owns_active_job_fair_participant(participant_id)));

DROP POLICY IF EXISTS company_owner_delete ON esmdd.job_fair_vacancies;
CREATE POLICY company_owner_delete ON esmdd.job_fair_vacancies
FOR DELETE TO authenticated
USING ((SELECT esmdd.owns_active_job_fair_participant(participant_id)));


-- ─── 4. Applicant: pre-register / cancel ────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.register_for_job_fair(p_job_fair_id UUID)
RETURNS esmdd.job_fair_applicants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fair esmdd.job_fairs%ROWTYPE;
  v_applicant_id UUID;
  v_row esmdd.job_fair_applicants;
BEGIN
  IF NOT core.has_role('applicant') THEN
    RAISE EXCEPTION 'Only applicants can register for a job fair.' USING ERRCODE = '42501';
  END IF;

  IF NOT applicants.is_verified_account() THEN
    RAISE EXCEPTION 'Verify your account before registering. PESO verifies it once your Application Form, Resume and Birth Certificate are approved.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_applicant_id FROM applicants.applicants WHERE profile_id = auth.uid() LIMIT 1;
  IF v_applicant_id IS NULL THEN
    RAISE EXCEPTION 'Complete your profile before registering for a job fair.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_fair FROM esmdd.job_fairs WHERE id = p_job_fair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job fair not found.' USING ERRCODE = 'P0002';
  END IF;

  IF esmdd.job_fair_live_status(v_fair) NOT IN ('Upcoming', 'Ongoing') THEN
    RAISE EXCEPTION 'This job fair is no longer open for registration.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO esmdd.job_fair_applicants (job_fair_id, applicant_id, status)
  VALUES (p_job_fair_id, v_applicant_id, 'Registered')
  ON CONFLICT (job_fair_id, applicant_id) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'You are already registered for this job fair.' USING ERRCODE = '23505';
  END IF;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION esmdd.register_for_job_fair(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.register_for_job_fair(UUID) TO authenticated;

-- Only while still Registered: an Attended record is PESO's
CREATE OR REPLACE FUNCTION esmdd.cancel_job_fair_registration(p_job_fair_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM esmdd.job_fair_applicants j
  USING applicants.applicants a
  WHERE j.job_fair_id = p_job_fair_id
    AND a.id = j.applicant_id
    AND a.profile_id = auth.uid()
    AND j.status = 'Registered';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'There is no registration to cancel. Attendance recorded by PESO stays on record.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION esmdd.cancel_job_fair_registration(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.cancel_job_fair_registration(UUID) TO authenticated;


-- ─── 5. Job fair list (applicants and employers) ────────────────────────────
-- p_job_fair_id: one fair (any status). Otherwise p_include_past = false lists Upcoming / Ongoing
-- (soonest first); true lists Completed / Cancelled (latest first, at most 50).

CREATE OR REPLACE FUNCTION esmdd.list_job_fair_events(
  p_include_past BOOLEAN DEFAULT false,
  p_job_fair_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  status_remarks TEXT,
  company_count INT,
  opening_count INT,
  my_registration_status TEXT,
  my_participant_id UUID,
  my_participant_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH fairs AS (
    SELECT f.*, esmdd.job_fair_live_status(f) AS live_status
    FROM esmdd.job_fairs f
    WHERE p_job_fair_id IS NULL OR f.id = p_job_fair_id
  ),
  me_applicant AS (
    SELECT a.id FROM applicants.applicants a WHERE a.profile_id = auth.uid()
  ),
  me_establishment AS (
    SELECT e.id
    FROM employers.establishments e
    WHERE e.company_id IS NOT NULL AND employers.is_company_member(e.company_id)
  )
  SELECT
    f.id,
    f.title::TEXT,
    f.description::TEXT,
    f.location::TEXT,
    f.latitude::DOUBLE PRECISION,
    f.longitude::DOUBLE PRECISION,
    f.start_date::TEXT,
    f.end_date::TEXT,
    f.live_status::TEXT,
    f.status_remarks::TEXT,
    (
      SELECT count(*)::INT FROM esmdd.job_fair_participants p
      WHERE p.job_fair_id = f.id AND p.status IN ('Confirmed', 'Attended')
    ),
    (
      SELECT coalesce(sum(coalesce(v.vacancy_count, 1)), 0)::INT
      FROM esmdd.job_fair_vacancies v
      JOIN esmdd.job_fair_participants p ON p.id = v.participant_id
      WHERE v.job_fair_id = f.id AND v.status = 'open' AND p.status IN ('Confirmed', 'Attended')
    ),
    (
      SELECT j.status::TEXT FROM esmdd.job_fair_applicants j
      WHERE j.job_fair_id = f.id AND j.applicant_id IN (SELECT ma.id FROM me_applicant ma)
      LIMIT 1
    ),
    mp.id,
    mp.status::TEXT
  FROM fairs f
  LEFT JOIN LATERAL (
    SELECT p.id, p.status FROM esmdd.job_fair_participants p
    WHERE p.job_fair_id = f.id AND p.establishment_id IN (SELECT me.id FROM me_establishment me)
    LIMIT 1
  ) mp ON true
  WHERE p_job_fair_id IS NOT NULL
     OR (NOT p_include_past AND f.live_status IN ('Upcoming', 'Ongoing'))
     OR (p_include_past AND f.live_status IN ('Completed', 'Cancelled'))
  ORDER BY
    CASE WHEN p_include_past THEN NULL ELSE f.start_date END ASC,
    CASE WHEN p_include_past THEN f.start_date END DESC
  LIMIT CASE WHEN p_include_past THEN 50 ELSE 200 END;
$$;
REVOKE ALL ON FUNCTION esmdd.list_job_fair_events(BOOLEAN, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.list_job_fair_events(BOOLEAN, UUID) TO authenticated;


-- ─── 6. What applicants see of a fair ───────────────────────────────────────

CREATE OR REPLACE FUNCTION esmdd.list_job_fair_companies(p_job_fair_id UUID)
RETURNS TABLE (
  participant_id UUID,
  business_name TEXT,
  trade_name TEXT,
  industry_line TEXT,
  city_municipality TEXT,
  province TEXT,
  vacancy_count INT,
  opening_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    e.business_name::TEXT,
    e.trade_name::TEXT,
    e.industry_line::TEXT,
    e.city_municipality::TEXT,
    e.province::TEXT,
    count(v.id)::INT,
    coalesce(sum(coalesce(v.vacancy_count, 1)), 0)::INT
  FROM esmdd.job_fair_participants p
  JOIN employers.establishments e ON e.id = p.establishment_id
  LEFT JOIN esmdd.job_fair_vacancies v ON v.participant_id = p.id AND v.status = 'open'
  WHERE p.job_fair_id = p_job_fair_id
    AND p.status IN ('Confirmed', 'Attended')
  GROUP BY p.id, e.business_name, e.trade_name, e.industry_line, e.city_municipality, e.province
  ORDER BY e.business_name;
$$;
REVOKE ALL ON FUNCTION esmdd.list_job_fair_companies(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.list_job_fair_companies(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION esmdd.list_job_fair_vacancies(p_job_fair_id UUID)
RETURNS TABLE (
  id UUID,
  participant_id UUID,
  position_title TEXT,
  nature_of_work TEXT,
  salary TEXT,
  place_of_work TEXT,
  educational_level TEXT,
  work_experience_months INT,
  opening_count INT,
  accepts_pwd BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.id,
    v.participant_id,
    j.position_title::TEXT,
    j.nature_of_work::TEXT,
    j.salary::TEXT,
    j.place_of_work::TEXT,
    j.educational_level::TEXT,
    j.work_experience_months::INT,
    v.vacancy_count::INT,
    coalesce(j.accepts_pwd, false)::BOOLEAN
  FROM esmdd.job_fair_vacancies v
  JOIN esmdd.job_vacancies j ON j.id = v.job_vacancy_id
  JOIN esmdd.job_fair_participants p ON p.id = v.participant_id
  WHERE v.job_fair_id = p_job_fair_id
    AND v.status = 'open'
    AND p.status IN ('Confirmed', 'Attended')
  ORDER BY j.position_title;
$$;
REVOKE ALL ON FUNCTION esmdd.list_job_fair_vacancies(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION esmdd.list_job_fair_vacancies(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_job_fair_participants_fair_status
  ON esmdd.job_fair_participants (job_fair_id, status);
CREATE INDEX IF NOT EXISTS idx_job_fair_vacancies_fair_status
  ON esmdd.job_fair_vacancies (job_fair_id, status);


-- ─── 7. Notifications ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION system.job_fair_label(p_job_fair_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(nullif(btrim(f.title), ''), 'a job fair')
    || ' (' || to_char(f.start_date::date, 'MM/DD/YYYY') || ')'
  FROM esmdd.job_fairs f WHERE f.id = p_job_fair_id;
$$;
REVOKE ALL ON FUNCTION system.job_fair_label(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION system.notify_job_fair_staff(p_title TEXT, p_message TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff UUID;
BEGIN
  FOR v_staff IN SELECT id FROM core.profiles WHERE role::TEXT = 'provincial_peso' LOOP
    PERFORM system.notify(v_staff, 'job_fair', p_title, p_message);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION system.notify_job_fair_staff(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- A company joined or withdrew on its own (PESO's own encoding is already in their hands)
CREATE OR REPLACE FUNCTION system.notify_job_fair_participant_self_service()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row esmdd.job_fair_participants%ROWTYPE;
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT core.has_role('company_owner', 'company_member') THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
  ELSE
    v_row := NEW;
  END IF;

  SELECT coalesce(nullif(btrim(e.business_name), ''), 'A company') INTO v_name
  FROM employers.establishments e WHERE e.id = v_row.establishment_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM system.notify_job_fair_staff(
      'New Job Fair Participant',
      v_name || ' registered for ' || system.job_fair_label(v_row.job_fair_id) || '. Confirm it in the job fair''s Participants.'
    );
  ELSE
    PERFORM system.notify_job_fair_staff(
      'Job Fair Participant Withdrew',
      v_name || ' withdrew from ' || system.job_fair_label(v_row.job_fair_id) || '.'
    );
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION system.notify_job_fair_participant_self_service() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_fair_participants_notify_self_service ON esmdd.job_fair_participants;
CREATE TRIGGER trg_job_fair_participants_notify_self_service
AFTER INSERT OR DELETE ON esmdd.job_fair_participants
FOR EACH ROW EXECUTE FUNCTION system.notify_job_fair_participant_self_service();

-- PESO's decision on a company's registration
CREATE OR REPLACE FUNCTION system.notify_job_fair_participant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner UUID;
  v_fair TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status NOT IN ('Confirmed', 'Cancelled') THEN
    RETURN NULL;
  END IF;

  SELECT system.company_profile_id(e.company_id) INTO v_owner
  FROM employers.establishments e WHERE e.id = NEW.establishment_id;

  v_fair := system.job_fair_label(NEW.job_fair_id);

  IF NEW.status = 'Confirmed' THEN
    PERFORM system.notify(v_owner, 'job_fair', 'Job Fair Registration Confirmed',
      'Your registration for ' || v_fair || ' is confirmed. Applicants can now see your company and vacancies.');
  ELSE
    PERFORM system.notify(v_owner, 'job_fair', 'Job Fair Registration Cancelled',
      'Your registration for ' || v_fair || ' was cancelled by PESO.');
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION system.notify_job_fair_participant_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_job_fair_participants_notify_status ON esmdd.job_fair_participants;
CREATE TRIGGER trg_job_fair_participants_notify_status
AFTER UPDATE OF status ON esmdd.job_fair_participants
FOR EACH ROW EXECUTE FUNCTION system.notify_job_fair_participant_status();

-- Job fair cancelled: registered applicants (057) and now the participating companies too
CREATE OR REPLACE FUNCTION system.notify_job_fair_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id UUID;
  v_message TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status IS DISTINCT FROM 'Cancelled' THEN
    RETURN NULL;
  END IF;

  v_message := initcap(left(system.job_fair_label(NEW.id), 1)) || substr(system.job_fair_label(NEW.id), 2)
    || ' has been cancelled.';

  FOR v_profile_id IN
    SELECT DISTINCT system.applicant_profile_id(a.applicant_id)
    FROM esmdd.job_fair_applicants a
    WHERE a.job_fair_id = NEW.id
    UNION
    SELECT DISTINCT system.company_profile_id(e.company_id)
    FROM esmdd.job_fair_participants p
    JOIN employers.establishments e ON e.id = p.establishment_id
    WHERE p.job_fair_id = NEW.id
      AND e.company_id IS NOT NULL
      AND coalesce(p.status, '') <> 'Cancelled'
  LOOP
    PERFORM system.notify(v_profile_id, 'job_fair', 'Job Fair Cancelled', v_message, NEW.status_remarks);
  END LOOP;
  RETURN NULL;
END;
$$;

COMMIT;
