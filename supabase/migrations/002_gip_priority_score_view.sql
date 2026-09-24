-- =============================================================================
-- Migration: 002_gip_priority_score_view.sql
-- Purpose:   Create a PostgreSQL view in the `esmdd` schema that auto-calculates
--            a priority score (max 100 pts) for GIP applicants.
-- Joins:     esmdd.gip_applicants → applicants.applicants (on applicant_id = id)
-- =============================================================================

DROP VIEW IF EXISTS esmdd.gip_applicant_priority_scores CASCADE;

CREATE OR REPLACE VIEW esmdd.gip_applicant_priority_scores AS
SELECT
  -- ── Applicant identity columns ──
  a.id                          AS applicant_id,
  a.profile_id,
  a.first_name,
  a.surname,
  a.middle_name,
  a.suffix,
  a.date_of_birth,
  a.age,
  a.sex,
  a.civil_status,
  a.email,
  a.contact_numbers,
  a.address,
  a.religion,
  a.height_ft,
  a.tin,

  -- ── Employment / education ──
  a.employment_status,
  a.employment_type,
  a.self_employed_type,
  a.currently_in_school,
  a.unemployed_reason,
  a.months_looking_for_work,
  a.educational_background,
  a.vocational_trainings,
  a.eligibilities,
  a.work_experiences,
  a.language_proficiencies,

  -- ── Flags ──
  a.has_disability,
  a.disabilities,
  a.disability_others,
  a.is_4ps_beneficiary,
  a.household_id_4ps,
  a.is_ofw,
  a.ofw_country,
  a.is_former_ofw,
  a.former_ofw_country,
  a.former_ofw_return_date,

  -- ── Preferences ──
  a.preferred_occupations,
  a.preferred_local_locations,
  a.preferred_overseas_locations,
  a.job_type_preference,
  a.other_skills,
  a.other_skills_specified,
  a.referred_programs,

  -- ── Assessment ──
  a.assessed_by_name,
  a.assessment_date,

  -- ── GIP-specific columns ──
  ga.id                         AS gip_applicant_id,
  ga.status                     AS gip_status,
  ga.document_submitted,
  ga.remarks,
  ga.created_at                 AS gip_created_at,
  ga.updated_at                 AS gip_updated_at,

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PRIORITY SUB-SCORES
  -- ═══════════════════════════════════════════════════════════════════════════

  -- 1. Status Score (max 15 pts)
  --    15 pts if currently_in_school = true  (working student)
  --    OR unemployed_reason ILIKE '%fresh grad%'
  CASE
    WHEN a.currently_in_school = true THEN 15
    WHEN a.unemployed_reason ILIKE '%fresh grad%' THEN 15
    ELSE 0
  END AS status_score,

  -- 2. Academic Awards Score (max 15 pts)
  --    15 pts if ANY element in educational_background jsonb array
  --    has a non-empty 'awards' field
  CASE
    WHEN a.educational_background IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements(a.educational_background::jsonb) AS elem
           WHERE elem->>'awards' IS NOT NULL
             AND TRIM(elem->>'awards') <> ''
         )
    THEN 15
    ELSE 0
  END AS academic_score,

  -- 3. Civil Service / Board Exam Score (max 10 pts)
  --    10 pts if civil service eligibility or professional board license is present in eligibilities
  CASE
    WHEN a.eligibilities IS NOT NULL
         AND jsonb_array_length(a.eligibilities::jsonb) > 0
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements(a.eligibilities::jsonb) AS el
           WHERE el->>'eligibility_title' IS NOT NULL
             AND TRIM(el->>'eligibility_title') <> ''
         )
    THEN 10
    ELSE 0
  END AS eligibility_score,

  -- 4. TESDA Certifications Score (max 10 pts)
  --    10 pts if ANY vocational_training has non-empty certificates_received or training course
  CASE
    WHEN a.vocational_trainings IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements(a.vocational_trainings::jsonb) AS vt
           WHERE (vt->>'certificates_received' IS NOT NULL AND TRIM(vt->>'certificates_received') <> '')
              OR (vt->>'course_training_title' IS NOT NULL AND TRIM(vt->>'course_training_title') <> '')
         )
    THEN 10
    ELSE 0
  END AS cert_score,

  -- 5. Poverty Incidence — LPII (max 25 pts)
  --    25 pts if municipality IN Top 5 poverty LGUs
  --    else 10 pts (baseline for all GIP applicants)
  CASE
    WHEN a.address->>'municipality' IN (
      'Loreto', 'Bayugan', 'Esperanza', 'San Francisco', 'La Paz'
    ) THEN 25
    ELSE 10
  END AS poverty_score,

  -- 6. Unemployment Rate — LPII (max 25 pts)
  --    25 pts if municipality IN Top 5 unemployment LGUs
  --    else 10 pts (baseline for all GIP applicants)
  CASE
    WHEN a.address->>'municipality' IN (
      'Talacogon', 'Rosario', 'Veruela', 'Sibagat', 'San Francisco'
    ) THEN 25
    ELSE 10
  END AS unemployment_score,

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TOTAL PRIORITY SCORE (sum of all sub-scores, max 100)
  -- ═══════════════════════════════════════════════════════════════════════════
  (
    -- status_score (15 pts)
    CASE
      WHEN a.currently_in_school = true THEN 15
      WHEN a.unemployed_reason ILIKE '%fresh grad%' THEN 15
      ELSE 0
    END
    +
    -- academic_score (15 pts)
    CASE
      WHEN a.educational_background IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a.educational_background::jsonb) AS elem
             WHERE elem->>'awards' IS NOT NULL
               AND TRIM(elem->>'awards') <> ''
           )
      THEN 15
      ELSE 0
    END
    +
    -- eligibility_score (10 pts)
    CASE
      WHEN a.eligibilities IS NOT NULL
           AND jsonb_array_length(a.eligibilities::jsonb) > 0
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a.eligibilities::jsonb) AS el
             WHERE el->>'eligibility_title' IS NOT NULL
               AND TRIM(el->>'eligibility_title') <> ''
           )
      THEN 10
      ELSE 0
    END
    +
    -- cert_score (10 pts)
    CASE
      WHEN a.vocational_trainings IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a.vocational_trainings::jsonb) AS vt
             WHERE (vt->>'certificates_received' IS NOT NULL AND TRIM(vt->>'certificates_received') <> '')
                OR (vt->>'course_training_title' IS NOT NULL AND TRIM(vt->>'course_training_title') <> '')
           )
      THEN 10
      ELSE 0
    END
    +
    -- poverty_score (25 pts)
    CASE
      WHEN a.address->>'municipality' IN (
        'Loreto', 'Bayugan', 'Esperanza', 'San Francisco', 'La Paz'
      ) THEN 25
      ELSE 10
    END
    +
    -- unemployment_score (25 pts)
    CASE
      WHEN a.address->>'municipality' IN (
        'Talacogon', 'Rosario', 'Veruela', 'Sibagat', 'San Francisco'
      ) THEN 25
      ELSE 10
    END
  ) AS total_priority_score

FROM esmdd.gip_applicants ga
JOIN applicants.applicants a ON ga.applicant_id = a.id

ORDER BY (
    CASE
      WHEN a.currently_in_school = true THEN 15
      WHEN a.unemployed_reason ILIKE '%fresh grad%' THEN 15
      ELSE 0
    END
    +
    CASE
      WHEN a.educational_background IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a.educational_background::jsonb) AS elem
             WHERE elem->>'awards' IS NOT NULL
               AND TRIM(elem->>'awards') <> ''
           )
      THEN 15
      ELSE 0
    END
    +
    CASE
      WHEN a.eligibilities IS NOT NULL
           AND jsonb_array_length(a.eligibilities::jsonb) > 0
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a.eligibilities::jsonb) AS el
             WHERE el->>'eligibility_title' IS NOT NULL
               AND TRIM(el->>'eligibility_title') <> ''
           )
      THEN 10
      ELSE 0
    END
    +
    CASE
      WHEN a.vocational_trainings IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(a.vocational_trainings::jsonb) AS vt
             WHERE (vt->>'certificates_received' IS NOT NULL AND TRIM(vt->>'certificates_received') <> '')
                OR (vt->>'course_training_title' IS NOT NULL AND TRIM(vt->>'course_training_title') <> '')
           )
      THEN 10
      ELSE 0
    END
    +
    CASE
      WHEN a.address->>'municipality' IN (
        'Loreto', 'Bayugan', 'Esperanza', 'San Francisco', 'La Paz'
      ) THEN 25
      ELSE 10
    END
    +
    CASE
      WHEN a.address->>'municipality' IN (
        'Talacogon', 'Rosario', 'Veruela', 'Sibagat', 'San Francisco'
      ) THEN 25
      ELSE 10
    END
  ) DESC;

-- Grant permissions to Supabase roles
GRANT SELECT ON esmdd.gip_applicant_priority_scores TO authenticated;
GRANT SELECT ON esmdd.gip_applicant_priority_scores TO anon;
GRANT SELECT ON esmdd.gip_applicant_priority_scores TO service_role;

