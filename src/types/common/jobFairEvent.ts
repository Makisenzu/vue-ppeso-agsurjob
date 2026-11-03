import type { JobFairStatus, JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'

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

/** esmdd.list_job_fair_vacancies: an open offer of a visible company */
export type JobFairPublicVacancyRow = {
  /** job_fair_vacancies.id */
  id: string
  participant_id: string
  position_title: string
  nature_of_work: string | null
  salary: string | null
  place_of_work: string | null
  educational_level: string | null
  work_experience_months: number | null
  opening_count: number | null
  accepts_pwd: boolean
}

/** A company with its open vacancies, for the applicant's job fair page */
export type JobFairCompanyWithVacancies = JobFairCompanyRow & {
  vacancies: JobFairPublicVacancyRow[]
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
