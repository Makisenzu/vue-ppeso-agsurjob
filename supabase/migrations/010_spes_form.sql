-- ============================================================================
-- 010_spes_form.sql
-- SPES (Special Program for Employment of Students) application form
-- Schema: applicants
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type applicants.spes_civil_status_type as enum (
  'Single',
  'Married',
  'Widow/er',
  'Separated'
);

create type applicants.spes_sex_type as enum (
  'Male',
  'Female'
);

create type applicants.spes_student_category_type as enum (
  'Student',
  'ALS student',
  'out-of-school (OSY)'
);

create type applicants.spes_parents_status_type as enum (
  'Living together',
  'Solo Parent',
  'Separated',
  'Person With Disability',
  'Senior Citizen',
  'Sugar Plantation Worker',
  'Indigenous People',
  'Displaced Worker (1) Local',
  'Displaced Worker (2) OFW'
);

-- ----------------------------------------------------------------------------
-- Table: applicants.spes_form
-- ----------------------------------------------------------------------------
create table applicants.spes_form (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references core.profiles (id) on delete cascade,

  -- 1. Personal Information
  surname text not null,
  first_name text not null,
  middle_name text,
  gsis_beneficiary_relationship text,
  date_of_birth date not null,
  place_of_birth text,
  age int4 check (age is null or age >= 0),
  citizenship text,
  contact_number text,
  email_address text,
  social_media_account text,
  civil_status applicants.spes_civil_status_type,
  sex applicants.spes_sex_type,
  student_category applicants.spes_student_category_type,
  parents_status applicants.spes_parents_status_type[] not null default '{}',
  present_address text,
  permanent_address text,

  -- 3. Parents / Guardian Information
  father_name text,
  father_contact_no text,
  father_occupation text,
  mother_maiden_name text,
  mother_contact_no text,
  mother_occupation text,

  -- 4. Educational Background
  elementary_school_name text,
  elementary_degree_course text,
  elementary_year_level text,
  elementary_date_of_attendance text,

  secondary_school_name text,
  secondary_degree_course text,
  secondary_year_level text,
  secondary_date_of_attendance text,

  tertiary_school_name text,
  tertiary_degree_course text,
  tertiary_year_level text,
  tertiary_date_of_attendance text,

  techvoc_school_name text,
  techvoc_degree_course text,
  techvoc_year_level text,
  techvoc_date_of_attendance text,

  -- 5. Documentary Requirements Checklist
  has_birth_certificate boolean not null default false,
  has_income_proof boolean not null default false,
  has_passing_grade_proof boolean not null default false,
  has_registrar_certification boolean not null default false,
  has_osy_certification boolean not null default false,

  -- 6. Additional Skills & History
  special_skills text[] not null default '{}',

  availment_1_establishment text,
  availment_1_year text,
  availment_1_spes_id text,
  availment_2_establishment text,
  availment_2_year text,
  availment_2_spes_id text,
  availment_3_establishment text,
  availment_3_year text,
  availment_3_spes_id text,
  availment_4_establishment text,
  availment_4_year text,
  availment_4_spes_id text,

  other_dole_interventions text,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index spes_form_profile_id_idx on applicants.spes_form (profile_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function applicants.set_spes_form_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger spes_form_set_updated_at
before update on applicants.spes_form
for each row execute function applicants.set_spes_form_updated_at();

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on applicants.spes_form to authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table applicants.spes_form enable row level security;

-- Applicants: manage their own SPES form(s)
create policy "spes_form_select_own"
on applicants.spes_form for select
to authenticated
using (profile_id = (select auth.uid()));

create policy "spes_form_insert_own"
on applicants.spes_form for insert
to authenticated
with check (profile_id = (select auth.uid()));

create policy "spes_form_update_own"
on applicants.spes_form for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy "spes_form_delete_own"
on applicants.spes_form for delete
to authenticated
using (profile_id = (select auth.uid()));

-- Admin / PESO staff: full access for processing SPES applications
create policy "spes_form_staff_all"
on applicants.spes_form for all
to authenticated
using (
  exists (
    select 1 from core.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'provincial_peso', 'municipal_peso')
  )
)
with check (
  exists (
    select 1 from core.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'provincial_peso', 'municipal_peso')
  )
);
