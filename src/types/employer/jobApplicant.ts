import type { JobVacancyRow } from '@/types/peso/provincialPeso/jobFair'
import type { JobApplicationStage, JobVacancyRequirement } from '@/types/common/jobVacancyApplication'
import type { GipApplicantSummarySource } from '@/helpers/applicant/gipApplicationHelper'

/**
 * Applicants of the company's job vacancies (esmdd.job_vacancy_applications, migration 087).
 * The owner and the members of the company review them; names and details come through
 * SECURITY DEFINER RPCs that return only what the application needs (PRIVACY.md §4.3).
 */

/** 'all' or one stage */
export type ApplicantStageFilter = 'all' | JobApplicationStage

/** Applicants per stage, counted in SQL (esmdd.job_vacancy_application_stats) */
export type ApplicantStageCounts = Record<ApplicantStageFilter, number>

/** The vacancy whose applicants are listed */
export type ApplicantVacancySummary = Pick<
  JobVacancyRow,
  'id' | 'position_title' | 'status' | 'vacancy_count' | 'place_of_work' | 'valid_until'
> & {
  /** Documents applicants submit (migration 088) */
  requirements: JobVacancyRequirement[]
}

/** One applicant as esmdd.search_job_vacancy_applications returns it */
export interface VacancyApplicantRow {
  id: string
  full_name: string
  municipality: string | null
  stage: JobApplicationStage
  created_at: string
  updated_at: string
  /** Matching applicants before paging */
  total_count: number
}

export interface VacancyApplicantQuery {
  search: string
  stage: ApplicantStageFilter
  page: number
  pageSize: number
}

export interface VacancyApplicantPage {
  rows: VacancyApplicantRow[]
  total: number
}

/** One application as esmdd.get_job_vacancy_application returns it (the call is audit-logged) */
export interface VacancyApplicationDetails {
  id: string
  job_vacancy_id: string
  stage: JobApplicationStage
  status_remarks: string | null
  created_at: string
  updated_at: string
  applicant: GipApplicantSummarySource
}
