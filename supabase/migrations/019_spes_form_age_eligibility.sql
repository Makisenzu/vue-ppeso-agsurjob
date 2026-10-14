-- =============================================================================
-- Migration: 019_spes_form_age_eligibility.sql
-- Purpose:   Only applicants aged 15 to 30 (inclusive) are eligible for SPES.
--            Mirrors SPES_MIN_AGE / SPES_MAX_AGE in src/helpers/common/spesFormHelper.ts
--            so the rule also holds for direct API writes.
-- Schema:    applicants
--
-- Notes:
--   - A CHECK constraint can't use the current date, so this is a trigger.
--   - Age is computed from date_of_birth against today's date in Asia/Manila.
--   - Runs on INSERT, and on UPDATE only when date_of_birth changes, so existing
--     forms of applicants who have since turned 31 can still be reviewed / updated.
-- =============================================================================

create or replace function applicants.check_spes_form_age()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  applicant_age int;
begin
  if tg_op = 'UPDATE' and new.date_of_birth is not distinct from old.date_of_birth then
    return new;
  end if;

  applicant_age := extract(
    year from age((now() at time zone 'Asia/Manila')::date, new.date_of_birth)
  )::int;

  if applicant_age < 15 or applicant_age > 30 then
    raise exception 'Only applicants aged 15 to 30 are eligible for SPES (age: %).', applicant_age
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger spes_form_check_age
before insert or update of date_of_birth on applicants.spes_form
for each row execute function applicants.check_spes_form_age();
