import type { JobVacancyRow } from '@/types/peso/provincialPeso/jobFair'
import type { JobApplicationStage, JobVacancyRequirement, JobVacancyStage } from '@/types/common/jobVacancyApplication'
import type { GipApplicantSummarySource } from '@/helpers/applicant/gipApplicationHelper'
import type { FitBand } from '@/types/common/jobVacancyFit'

/**
 * Applicants of the company's job vacancies (esmdd.job_vacancy_applications, migration 087).
 * The owner and the members of the company review them; names and details come through
 * SECURITY DEFINER RPCs that return only what the application needs (PRIVACY.md §4.3).
 */

/** Applicants per status of each vacancy, counted in SQL (esmdd.job_vacancy_application_stats) */
export type ApplicantStageCounts = Record<'all' | JobApplicationStage, number>

/**
 * Filter / target of one vacancy's applicants: 'all', 'applied' (New), 'rejected' (Not selected) or the
 * id of one of the vacancy's hiring steps (migration 089)
 */
export type ApplicantStageFilter = string

/** One vacancy's applicants per status and step, counted in SQL (esmdd.job_vacancy_application_stage_counts) */
export interface ApplicantStepCounts {
  all: number
  applied: number
  rejected: number
  /** In progress or hired, per hiring step id */
  byStep: Record<string, number>
}

/** The vacancy whose applicants are listed */
export type ApplicantVacancySummary = Pick<
  JobVacancyRow,
  'id' | 'position_title' | 'status' | 'vacancy_count' | 'place_of_work' | 'valid_until'
> & {
  /** Documents applicants submit (migration 088) */
  requirements: JobVacancyRequirement[]
  /** The employer's hiring steps, in order (migration 089) */
  stages: JobVacancyStage[]
}

/** One applicant as esmdd.search_job_vacancy_applications returns it */
export interface VacancyApplicantRow {
  id: string
  full_name: string
  municipality: string | null
  /** Storage path of the applicant's profile picture (migration 092); null shows initials */
  avatar_path: string | null
  /** Latest course (or level) of the NSRP educational background (migration 092) */
  course: string | null
  /** On the company's shortlist (migration 093) */
  is_shortlisted: boolean
  stage: JobApplicationStage
  stage_id: string | null
  stage_name: string | null
  /** Vacancy fit (migration 098): 0–100, null when the posting asks for nothing to compare */
  fit_score: number | null
  fit_band: FitBand | null
  fit_met_count: number | null
  fit_required_count: number | null
  fit_unknown_count: number | null
  created_at: string
  updated_at: string
  /** Matching applicants before paging */
  total_count: number
}

export interface VacancyApplicantQuery {
  search: string
  stage: ApplicantStageFilter
  /** Only the shortlisted ones (migration 093) */
  shortlistedOnly: boolean
  /** Best fit first instead of newest first (migration 098) */
  sortByFit: boolean
  /** Only applicants with a strong fit */
  strongFitOnly: boolean
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
  stage_id: string | null
  status_remarks: string | null
  created_at: string
  updated_at: string
  /** Latest profile picture (migration 101); null shows initials */
  avatar_path?: string | null
  applicant: GipApplicantSummarySource
}
