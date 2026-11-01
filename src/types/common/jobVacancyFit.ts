/**
 * How well an applicant meets a vacancy's requirements (esmdd.job_vacancy_fit_for, migration 098).
 * Computed in SQL from the vacancy's matching fields and the applicant's NSRP record; advisory only.
 */

export type FitStatus = 'met' | 'partial' | 'unmet' | 'unknown'

export type FitBand = 'strong' | 'partial' | 'low'

export type FitCriterionKey =
  | 'skills_required'
  | 'education'
  | 'course'
  | 'experience'
  | 'eligibility'
  | 'license'
  | 'training'
  | 'skills_optional'
  | 'language'

/** Why a criterion is unknown (or how it was met), as the SQL names it */
export type FitReason =
  | 'level_not_comparable'
  | 'no_education_on_profile'
  | 'any_bachelors_degree'
  | 'relevance_needs_review'
  | 'unlisted_eligibility_needs_review'
  | 'unlisted_license_needs_review'
  | 'duration_not_in_hours'

/** One criterion. Which of the optional fields are set depends on the key (see migration 098) */
export interface FitCriterion {
  key: FitCriterionKey
  weight: number
  status: FitStatus
  /** 0–1: share of the weight earned */
  ratio: number
  reason?: FitReason
  /** Skills / languages: names; education / eligibility / license: the name; course: accepted courses */
  required?: string | string[]
  /** Skills / languages: names found; course: the course that matched */
  matched?: string | string[]
  /** Skills / languages: names not found */
  missing?: string[]
  /** Education: the applicant's highest level; course: their courses */
  applicant?: string | string[]
  required_months?: number
  applicant_months?: number
  required_hours?: number
  applicant_hours?: number
}

export interface JobVacancyFit {
  /** 0–100; null when the vacancy asks for nothing that can be compared */
  score: number | null
  band: FitBand | null
  /** Requirements met / scored (nice-to-have skills are not counted) */
  met_count: number
  required_count: number
  /** Criteria that can't be judged from the data: check the documents */
  unknown_count: number
  criteria: FitCriterion[]
}

/** One criterion as the fit list shows it */
export interface FitCriterionView {
  key: FitCriterionKey
  label: string
  status: FitStatus
  statusLabel: string
  /** One line: what was asked and what the applicant has */
  detail: string
  /** Skills / languages not found, shown as chips */
  missing: string[]
  /** Nice-to-have: shown apart, never counted as a requirement */
  isOptional: boolean
}
