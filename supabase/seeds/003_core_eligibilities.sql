-- ============================================================================
-- Seed: core.eligibilities (migration 094)
-- ============================================================================
-- Re-runnable: rows are matched by kind and name and updated, never
-- duplicated. Rows added later by admin are left alone.
--
-- Sources:
--   Eligibilities  Civil Service Commission: career service examinations and
--                  eligibilities granted under special laws and CSC issuances.
--   Licenses       PRC regulated professions (board examinations), the Bar
--                  (Supreme Court), LTO driver's licenses, PNP-SOSIA security
--                  guard license.
-- Run in the Supabase SQL editor after migration 094.
-- ============================================================================

INSERT INTO core.eligibilities (kind, name, abbreviation, issuer, requires_specify, sort_order)
VALUES
  -- ─── Eligibilities ────────────────────────────────────────────────────────
  ('eligibility', 'Career Service Professional', 'CSE-PRO', 'Civil Service Commission', false, 1),
  ('eligibility', 'Career Service Subprofessional', 'CSE-SUBPRO', 'Civil Service Commission', false, 2),
  ('eligibility', 'RA 1080 (Board / Bar Passer)', 'RA 1080', 'Special laws', false, 3),
  ('eligibility', 'PD 907 (Honor Graduate)', 'PD 907', 'Special laws', false, 4),
  ('eligibility', 'Foreign School Honor Graduate', 'FSHGE', 'Special laws', false, 5),
  ('eligibility', 'PD 997 (Scientific and Technological Specialist)', 'PD 997', 'Special laws', false, 6),
  ('eligibility', 'Barangay Official (RA 7160)', 'BOE', 'Special laws', false, 7),
  ('eligibility', 'Barangay Health Worker (RA 7883)', 'BHWE', 'Special laws', false, 8),
  ('eligibility', 'Barangay Nutrition Scholar (PD 1569)', 'BNSE', 'Special laws', false, 9),
  ('eligibility', 'Sanggunian Member (RA 10156)', 'SME', 'Special laws', false, 10),
  ('eligibility', 'Skills Eligibility – Category II', 'SE', 'Civil Service Commission', false, 11),
  ('eligibility', 'Electronic Data Processing Specialist', 'EDPSE', 'Civil Service Commission', false, 12),
  ('eligibility', 'Veteran Preference Rating', 'VPR', 'Special laws', false, 13),
  ('eligibility', 'Police Officer (NAPOLCOM)', 'NAPOLCOM', 'National Police Commission', false, 14),
  ('eligibility', 'Fire Officer', 'FOE', 'Civil Service Commission', false, 15),
  ('eligibility', 'Penology Officer', 'POE', 'Civil Service Commission', false, 16),
  ('eligibility', 'Others', NULL, NULL, true, 99),

  -- ─── Licenses: PRC regulated professions ──────────────────────────────────
  ('license', 'Certified Public Accountant', 'CPA', 'PRC', false, 1),
  ('license', 'Aeronautical Engineer', NULL, 'PRC', false, 1),
  ('license', 'Agricultural and Biosystems Engineer', 'ABE', 'PRC', false, 1),
  ('license', 'Agriculturist', NULL, 'PRC', false, 1),
  ('license', 'Architect', NULL, 'PRC', false, 1),
  ('license', 'Chemical Engineer', 'ChE', 'PRC', false, 1),
  ('license', 'Chemist', NULL, 'PRC', false, 1),
  ('license', 'Chemical Technician', NULL, 'PRC', false, 1),
  ('license', 'Civil Engineer', 'CE', 'PRC', false, 1),
  ('license', 'Criminologist', NULL, 'PRC', false, 1),
  ('license', 'Customs Broker', NULL, 'PRC', false, 1),
  ('license', 'Dentist', NULL, 'PRC', false, 1),
  ('license', 'Registered Electrical Engineer', 'REE', 'PRC', false, 1),
  ('license', 'Registered Master Electrician', 'RME', 'PRC', false, 1),
  ('license', 'Electronics Engineer', 'ECE', 'PRC', false, 1),
  ('license', 'Electronics Technician', 'ECT', 'PRC', false, 1),
  ('license', 'Environmental Planner', 'EnP', 'PRC', false, 1),
  ('license', 'Fisheries Professional', NULL, 'PRC', false, 1),
  ('license', 'Food Technologist', NULL, 'PRC', false, 1),
  ('license', 'Forester', NULL, 'PRC', false, 1),
  ('license', 'Geodetic Engineer', 'GE', 'PRC', false, 1),
  ('license', 'Geologist', NULL, 'PRC', false, 1),
  ('license', 'Guidance Counselor', 'RGC', 'PRC', false, 1),
  ('license', 'Interior Designer', NULL, 'PRC', false, 1),
  ('license', 'Landscape Architect', NULL, 'PRC', false, 1),
  ('license', 'Librarian', NULL, 'PRC', false, 1),
  ('license', 'Licensed Professional Teacher', 'LPT', 'PRC', false, 1),
  ('license', 'Marine Deck Officer', NULL, 'PRC', false, 1),
  ('license', 'Marine Engineer Officer', NULL, 'PRC', false, 1),
  ('license', 'Mechanical Engineer', 'ME', 'PRC', false, 1),
  ('license', 'Medical Technologist', 'RMT', 'PRC', false, 1),
  ('license', 'Metallurgical Engineer', NULL, 'PRC', false, 1),
  ('license', 'Midwife', 'RM', 'PRC', false, 1),
  ('license', 'Mining Engineer', NULL, 'PRC', false, 1),
  ('license', 'Naval Architect and Marine Engineer', NULL, 'PRC', false, 1),
  ('license', 'Registered Nurse', 'RN', 'PRC', false, 1),
  ('license', 'Nutritionist-Dietitian', 'RND', 'PRC', false, 1),
  ('license', 'Occupational Therapist', 'OTRP', 'PRC', false, 1),
  ('license', 'Optometrist', NULL, 'PRC', false, 1),
  ('license', 'Pharmacist', 'RPh', 'PRC', false, 1),
  ('license', 'Physical Therapist', 'PTRP', 'PRC', false, 1),
  ('license', 'Physician', 'MD', 'PRC', false, 1),
  ('license', 'Psychologist', 'RPsy', 'PRC', false, 1),
  ('license', 'Psychometrician', 'RPm', 'PRC', false, 1),
  ('license', 'Radiologic Technologist', 'RRT', 'PRC', false, 1),
  ('license', 'X-Ray Technologist', NULL, 'PRC', false, 1),
  ('license', 'Real Estate Broker', 'REB', 'PRC', false, 1),
  ('license', 'Real Estate Appraiser', NULL, 'PRC', false, 1),
  ('license', 'Real Estate Consultant', NULL, 'PRC', false, 1),
  ('license', 'Respiratory Therapist', 'RTRP', 'PRC', false, 1),
  ('license', 'Sanitary Engineer', NULL, 'PRC', false, 1),
  ('license', 'Social Worker', 'RSW', 'PRC', false, 1),
  ('license', 'Speech-Language Pathologist', NULL, 'PRC', false, 1),
  ('license', 'Veterinarian', 'DVM', 'PRC', false, 1),

  -- ─── Licenses: other government-issued ────────────────────────────────────
  ('license', 'Lawyer (Bar)', 'Atty.', 'Supreme Court', false, 2),
  ('license', 'Professional Driver''s License', NULL, 'LTO', false, 3),
  ('license', 'Non-Professional Driver''s License', NULL, 'LTO', false, 3),
  ('license', 'Security Guard License', NULL, 'PNP-SOSIA', false, 4),
  ('license', 'Others', NULL, NULL, true, 99)
ON CONFLICT (kind, (lower(name))) DO UPDATE
SET abbreviation = EXCLUDED.abbreviation,
    issuer = EXCLUDED.issuer,
    requires_specify = EXCLUDED.requires_specify,
    sort_order = EXCLUDED.sort_order,
    is_active = true;
