import { JOB_APPLICATION_STAGES } from '@/types/common/jobVacancyApplication'
import { JOB_APPLICATION_STAGE_LABELS, isJobApplicationStage } from '@/helpers/common/jobVacancyApplicationHelper'
import { STATUS_REMARKS_REQUIRED_MESSAGE } from '@/helpers/common/statusRemarksHelper'
import type { ApplicantStageFilter } from '@/types/employer/jobApplicant'
import type { SearchSelectOption } from '@/types/common/searchSelect'

export const JOB_APPLICANT_PAGE_SIZE = 10
export const APPLICANT_VACANCY_PAGE_SIZE = 9

/** Stage dropdown of the review sheet */
export const JOB_APPLICATION_STAGE_OPTIONS: SearchSelectOption[] = JOB_APPLICATION_STAGES.map((stage) => ({
  value: stage,
  label: JOB_APPLICATION_STAGE_LABELS[stage],
}))

export const isApplicantStageFilter = (value: unknown): value is ApplicantStageFilter =>
  value === 'all' || isJobApplicationStage(value)

/** Generic messages only (SECURITY.md §12); messages written for users pass through */
export function toJobApplicantErrorMessage(error: unknown, fallback: string): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (code === '42501') return 'You can only review the applicants of your own job postings.'
  if (code === 'P0002') return 'This application could not be found.'
  if (code === '23514' || message === STATUS_REMARKS_REQUIRED_MESSAGE) return STATUS_REMARKS_REQUIRED_MESSAGE
  return fallback
}
