import type { JobFairStatus, JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import type { JobVacancyRequirement } from '@/types/common/jobVacancyApplication'
import type { JobVacancyMatching } from '@/types/common/jobVacancy'

// Rows returned by the job fair RPCs of migration 105. They are not in database.types.ts until
// `npm run types:gen`; switch to Database['esmdd']['Functions'][…]['Returns'] after regenerating.

/** esmdd.list_job_fair_events: a fair with its live status, counts and the caller's own part in it */
export type JobFairEventRow = {
  id: string
  title: string
  description: string | null
  location: string
  latitude: number | null
  longitude: number | null
  start_date: string
  end_date: string
  status: JobFairStatus
  status_remarks: string | null
  /** Confirmed / Attended companies */
  company_count: number
  /** Open openings offered by those companies */
  opening_count: number
  /** Applicant: their job_fair_applicants status ('Registered' / 'Attended'), null if not registered */
  my_registration_status: string | null
  /** Employer: their company's participant row, null if it hasn't joined */
  my_participant_id: string | null
  my_participant_status: string | null
  /** When PESO posted the fair (107) */
  created_at: string
  /** Its image attachments, oldest first (107); storage paths in the job-fair-attachments bucket */
  image_paths: string[]
}

/** A fair with the public URLs of its pictures, as the stores keep it */
export type JobFairEvent = JobFairEventRow & {
  image_urls: string[]
}

/** esmdd.list_job_fair_companies: a Confirmed / Attended participant as applicants see it */
export type JobFairCompanyRow = {
  participant_id: string
  business_name: string
  trade_name: string | null
  industry_line: string | null
  city_municipality: string | null
  province: string | null
  vacancy_count: number
  opening_count: number
}

/** esmdd.list_job_fair_vacancies (106): an open offer of a visible company, with its qualifications */
export type JobFairPublicVacancyRow = {
  /** job_fair_vacancies.id */
  id: string
  participant_id: string
  /** The posting behind the offer (esmdd.job_vacancies.id) */
  job_vacancy_id: string
  position_title: string
  job_description: string | null
  nature_of_work: string | null
  salary: string | null
  place_of_work: string | null
  educational_level: string | null
  course_shs_strand: string | null
  work_experience_months: number | null
  eligibility: string | null
  license: string | null
  certification: string | null
  training_hours: number | null
  other_qualifications: string[] | null
  opening_count: number | null
  accepts_pwd: boolean
}

/** An offer with the posting's skills and the documents to submit */
export type JobFairPublicVacancy = JobFairPublicVacancyRow & {
  skills: JobVacancyMatching['skills']
  requirements: JobVacancyRequirement[]
}

/** A company with its open vacancies, for the applicant's job fair page */
export type JobFairCompanyWithVacancies = JobFairCompanyRow & {
  vacancies: JobFairPublicVacancy[]
}

/** One of the employer's own offers at a fair (job_fair_vacancies + its posting) */
export type EmployerJobFairOffer = {
  id: string
  job_vacancy_id: string
  vacancy_count: number | null
  status: JobVacancyStatus
  position_title: string
  nature_of_work: string | null
  salary: string | null
}

/** An open posting of the employer that can still be offered at the fair */
export type EmployerOfferablePosting = {
  id: string
  position_title: string
  vacancy_count: number | null
}

export type JobFairListScope = 'active' | 'past'
