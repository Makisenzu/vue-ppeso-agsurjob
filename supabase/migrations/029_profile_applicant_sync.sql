-- =============================================================================
-- Migration: 029_profile_applicant_sync.sql
-- Purpose:   Keep core.profiles and the applicant's NSRP record (applicants.applicants)
--            aligned. Saving either one updates the other in the same transaction, so the
--            client sends ONE update.
--
--              1. core.profiles → applicants.applicants  (trg_profiles_sync_applicant)
--              2. applicants.applicants → core.profiles  (trg_applicants_sync_profile)
--              3. Backfill core.profiles from the NSRP records
-- Schemas:   core, applicants
--
-- Column map:
--   core.profiles      | applicants.applicants
--   -------------------|----------------------------------------------
--   firstname          | first_name
--   middlename         | middle_name
--   lastname           | surname
--   birthdate          | date_of_birth (+ age)
--   gender             | sex   (man/cisgender_man ↔ Male, woman/cisgender_woman ↔ Female;
--                      |        other genders leave sex as it is)
--   contact_number     | contact_numbers[1] (other numbers are kept)
--   region             | address->>'region'
--   province           | address->>'province'
--   geographic         | address->>'municipality'
--   barangay           | address->>'barangay'  (street / village stay NSRP-only)
--   is_4ps             | is_4ps_beneficiary
--   is_pwd             | has_disability
--
-- Rules:
--   * Blank / NULL values never wipe the other side (except middle name, which may be removed).
--   * A row is only written when a mapped value actually changes.
--   * pg_trigger_depth() stops the two triggers from bouncing off each other.
--   * SECURITY INVOKER: the mirror write runs under the caller's RLS. An applicant editing their
--     own data (migration 027 + "Users can … own" policies) syncs both ways. A writer without
--     rights on the other table (e.g. PESO, who cannot update core.profiles) only updates its
--     own table — RLS filters the mirror UPDATE to zero rows instead of failing the save.
-- Safe to re-run.
-- =============================================================================


-- ─── 1. core.profiles → applicants.applicants ───────────────────────────────

CREATE OR REPLACE FUNCTION core.sync_applicant_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  rec applicants.applicants%ROWTYPE;
  v_first_name TEXT;
  v_middle_name TEXT;
  v_surname TEXT;
  v_date_of_birth DATE;
  v_age INT;
  v_sex TEXT;
  v_contact TEXT;
  v_contact_numbers TEXT[];
  v_address JSONB;
  v_is_4ps BOOLEAN;
  v_has_disability BOOLEAN;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO rec FROM applicants.applicants WHERE profile_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_first_name := COALESCE(NULLIF(btrim(NEW.firstname), ''), rec.first_name);
  v_middle_name := NULLIF(btrim(NEW.middlename), '');
  v_surname := COALESCE(NULLIF(btrim(NEW.lastname), ''), rec.surname);
  v_date_of_birth := COALESCE(NEW.birthdate, rec.date_of_birth);
  v_age := CASE
    WHEN NEW.birthdate IS NOT NULL THEN date_part('year', age(current_date, NEW.birthdate))::INT
    ELSE rec.age
  END;
  v_sex := CASE
    WHEN NEW.gender IN ('man', 'cisgender_man') THEN 'Male'
    WHEN NEW.gender IN ('woman', 'cisgender_woman') THEN 'Female'
    ELSE rec.sex
  END;

  v_contact := NULLIF(btrim(NEW.contact_number), '');
  v_contact_numbers := CASE
    WHEN v_contact IS NULL THEN rec.contact_numbers
    ELSE ARRAY[v_contact] || COALESCE(array_remove(rec.contact_numbers[2:], v_contact), '{}'::TEXT[])
  END;

  v_address := COALESCE(rec.address, '{}'::JSONB) || jsonb_strip_nulls(jsonb_build_object(
    'region', NULLIF(btrim(NEW.region), ''),
    'province', NULLIF(btrim(NEW.province), ''),
    'municipality', NULLIF(btrim(NEW.geographic), ''),
    'barangay', NULLIF(btrim(NEW.barangay), '')
  ));

  v_is_4ps := COALESCE(NEW.is_4ps, rec.is_4ps_beneficiary);
  v_has_disability := COALESCE(NEW.is_pwd, rec.has_disability);

  IF (rec.first_name, rec.middle_name, rec.surname, rec.date_of_birth, rec.age, rec.sex,
      rec.contact_numbers, rec.address, rec.is_4ps_beneficiary, rec.has_disability)
     IS DISTINCT FROM
     (v_first_name, v_middle_name, v_surname, v_date_of_birth, v_age, v_sex,
      v_contact_numbers, v_address, v_is_4ps, v_has_disability)
  THEN
    UPDATE applicants.applicants
    SET first_name = v_first_name,
        middle_name = v_middle_name,
        surname = v_surname,
        date_of_birth = v_date_of_birth,
        age = v_age,
        sex = v_sex,
        contact_numbers = v_contact_numbers,
        address = v_address,
        is_4ps_beneficiary = v_is_4ps,
        has_disability = v_has_disability
    WHERE id = rec.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_sync_applicant ON core.profiles;
CREATE TRIGGER trg_profiles_sync_applicant
AFTER UPDATE OF firstname, middlename, lastname, birthdate, gender, contact_number,
                region, province, geographic, barangay, is_4ps, is_pwd
ON core.profiles
FOR EACH ROW
EXECUTE FUNCTION core.sync_applicant_from_profile();


-- ─── 2. applicants.applicants → core.profiles ───────────────────────────────

CREATE OR REPLACE FUNCTION applicants.sync_profile_from_applicant()
RETURNS TRIGGER AS $$
DECLARE
  prof core.profiles%ROWTYPE;
  v_gender core.gender_type;
  v_contact TEXT;
  v_region TEXT;
  v_province TEXT;
  v_geographic TEXT;
  v_barangay TEXT;
  v_is_4ps BOOLEAN;
  v_is_pwd BOOLEAN;
BEGIN
  IF pg_trigger_depth() > 1 OR NEW.profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO prof FROM core.profiles WHERE id = NEW.profile_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Only overwrite gender when it contradicts the NSRP sex (or is empty)
  v_gender := CASE
    WHEN NEW.sex = 'Male' AND (prof.gender IS NULL OR prof.gender IN ('woman', 'cisgender_woman')) THEN 'man'
    WHEN NEW.sex = 'Female' AND (prof.gender IS NULL OR prof.gender IN ('man', 'cisgender_man')) THEN 'woman'
    ELSE prof.gender
  END;
  v_contact := COALESCE(NULLIF(btrim(NEW.contact_numbers[1]), ''), prof.contact_number);
  v_region := COALESCE(NULLIF(btrim(NEW.address->>'region'), ''), prof.region);
  v_province := COALESCE(NULLIF(btrim(NEW.address->>'province'), ''), prof.province);
  v_geographic := COALESCE(NULLIF(btrim(NEW.address->>'municipality'), ''), prof.geographic);
  v_barangay := COALESCE(NULLIF(btrim(NEW.address->>'barangay'), ''), prof.barangay);
  v_is_4ps := COALESCE(NEW.is_4ps_beneficiary, prof.is_4ps);
  v_is_pwd := COALESCE(NEW.has_disability, prof.is_pwd);

  IF (prof.firstname, prof.middlename, prof.lastname, prof.birthdate, prof.gender, prof.contact_number,
      prof.region, prof.province, prof.geographic, prof.barangay, prof.is_4ps, prof.is_pwd)
     IS DISTINCT FROM
     (NEW.first_name::VARCHAR, NEW.middle_name::VARCHAR, NEW.surname::VARCHAR, NEW.date_of_birth, v_gender,
      v_contact::VARCHAR, v_region, v_province, v_geographic, v_barangay, v_is_4ps, v_is_pwd)
  THEN
    UPDATE core.profiles
    SET firstname = NEW.first_name,
        middlename = NEW.middle_name,
        lastname = NEW.surname,
        birthdate = NEW.date_of_birth,
        gender = v_gender,
        contact_number = v_contact,
        region = v_region,
        province = v_province,
        geographic = v_geographic,
        barangay = v_barangay,
        is_4ps = v_is_4ps,
        is_pwd = v_is_pwd
    WHERE id = prof.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applicants_sync_profile ON applicants.applicants;
CREATE TRIGGER trg_applicants_sync_profile
AFTER INSERT OR UPDATE OF first_name, middle_name, surname, date_of_birth, sex, contact_numbers,
                          address, is_4ps_beneficiary, has_disability, profile_id
ON applicants.applicants
FOR EACH ROW
EXECUTE FUNCTION applicants.sync_profile_from_applicant();


-- ─── 3. Backfill: the NSRP record is the source of truth ────────────────────
-- Touching each linked record fires trg_applicants_sync_profile, which copies it onto the
-- profile; the profile trigger then finds nothing to change (depth guard + distinct check).

UPDATE applicants.applicants
SET profile_id = profile_id
WHERE profile_id IS NOT NULL;
