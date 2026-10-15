import type { Database } from '@/types/database.types'

export type ApplicantRecordRow = Database['applicants']['Tables']['applicants']['Row']
export type ApplicantRecordInsert = Database['applicants']['Tables']['applicants']['Insert']
export type ApplicantRecordUpdate = Database['applicants']['Tables']['applicants']['Update']

/** Steps of the applicant NSRP completion wizard. */
export type CompletionStepKey = 'personal' | 'education' | 'experience' | 'preferences'

export interface CompletionStepMeta {
  key: CompletionStepKey
  title: string
  description: string
}

/** Personal fields the form asks for only when the record is missing them (normally set at signup). */
export type CompletionPersonalField = 'date_of_birth' | 'sex' | 'civil_status'

// ─── List entries (same JSON keys the PESO applicant entry form writes) ───

export interface EducationEntryForm {
  level: string
  school: string
  course: string
  year_graduated: string
  awards: string
  undergraduate_level_reached: string
}

export interface TrainingEntryForm {
  course_training_title: string
  duration: string
  training_institution: string
  skills_acquired: string
  certificates_received: string
}

export interface EligibilityEntryForm {
  eligibility_title: string
  rating: string
  date_of_examination: string
  place_of_examination: string
}

export interface WorkEntryForm {
  company_name: string
  address: string
  position: string
  inclusive_dates: string
  number_of_months: string
  monthly_salary: string
  status_of_appointment: string
}

export interface LanguageEntryForm {
  language: string
  read: boolean
  write: boolean
  speak: boolean
  understand: boolean
}

/**
 * Values of the applicant "Complete your NSRP profile" form — every applicant-fillable column
 * of `applicants.applicants` not collected at signup. Staff-only columns (`assessed_by_name`,
 * `assessment_date`, `referred_programs`, `documents_submitted`) are left to PESO.
 */
export interface ApplicantCompletionValues {
  // Personal
  date_of_birth: string
  sex: '' | 'Male' | 'Female'
  civil_status: string
  religion: string
  height_ft: number | string
  tin: string
  // Employment status
  employment_status: '' | 'Employed' | 'Unemployed'
  employment_type: '' | 'Wage employed' | 'Self-employed'
  self_employed_type: string
  unemployed_reason: string
  months_looking_for_work: number | string
  // Special categories
  is_4ps_beneficiary: boolean
  household_id_4ps: string
  has_disability: boolean
  disabilities: string[]
  disability_others: string
  is_ofw: boolean
  ofw_country: string
  is_former_ofw: boolean
  former_ofw_country: string
  former_ofw_return_date: string
  // Education & training
  currently_in_school: boolean
  educational_background: EducationEntryForm[]
  /** Optional — an empty list means none (same as the PESO applicant entry form). */
  vocational_trainings: TrainingEntryForm[]
  /** Optional — an empty list means none (same as the PESO applicant entry form). */
  eligibilities: EligibilityEntryForm[]
  // Work & skills
  work_experiences: WorkEntryForm[]
  no_work_experience: boolean
  language_proficiencies: LanguageEntryForm[]
  other_skills: string[]
  other_skills_specified: string
  // Job preference
  preferred_occupations: string
  preferred_local_locations: string
  preferred_overseas_locations: string
  job_type_preference: string[]
}
