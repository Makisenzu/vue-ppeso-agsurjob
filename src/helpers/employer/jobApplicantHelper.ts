import { STATUS_REMARKS_REQUIRED_MESSAGE } from '@/helpers/common/statusRemarksHelper'
import type { JobVacancyStage } from '@/types/common/jobVacancyApplication'
import type { SearchSelectOption } from '@/types/common/searchSelect'

export const JOB_APPLICANT_PAGE_SIZE = 10
export const APPLICANT_VACANCY_PAGE_SIZE = 9

/**
 * "Move to" dropdown of the review sheet: the vacancy's hiring steps in order, from Paper Screening (where
 * every application starts, migration 091) to the last one, which hires; then Not selected (migration 089)
 */
export function toApplicantMoveOptions(steps: readonly JobVacancyStage[]): SearchSelectOption[] {
  const ordered = [...steps].sort((a, b) => a.sort_order - b.sort_order)
  return [
    ...ordered.map((step, index) => ({
      value: step.id,
      label: `${index + 1}. ${step.stage_name}`,
      description: index === ordered.length - 1 ? 'Marks the applicant as hired' : undefined,
    })),
    { value: 'rejected', label: 'Not selected' },
  ]
}

/** Generic messages only (SECURITY.md §12); messages written for users pass through */
export function toJobApplicantErrorMessage(error: unknown, fallback: string): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (code === '42501') return 'You can only review the applicants of your own job postings.'
  if (code === 'P0002') return 'This application could not be found.'
  if (code === '22023') return 'That hiring step is not part of this job posting. Reload the page and try again.'
  if (code === '23514' || message === STATUS_REMARKS_REQUIRED_MESSAGE) return STATUS_REMARKS_REQUIRED_MESSAGE
  return fallback
}
