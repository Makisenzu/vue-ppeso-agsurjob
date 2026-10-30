import { format, isValid, parseISO } from 'date-fns'
import { VACANCY_STATUSES, type JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import * as z from 'zod'
import type { JobPostingRequirementValue, JobPostingStatusFilter } from '@/types/employer/jobPosting'
import {
  DEFAULT_VACANCY_REQUIREMENTS,
  JOB_APPLICATION_NSRP_DOCUMENT,
  MAX_VACANCY_REQUIREMENTS,
  REQUIREMENT_NAME_MAX_LENGTH,
  type JobVacancyRequirement,
} from '@/types/common/jobVacancyApplication'
import type { SearchSelectOption } from '@/types/common/searchSelect'

export const JOB_POSTING_PAGE_SIZE = 10

const STATUS_LABELS: Record<JobVacancyStatus, string> = {
  open: 'Open',
  filled: 'Filled',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

export const getJobPostingStatusLabel = (status: string | null | undefined) =>
  STATUS_LABELS[(status ?? 'open') as JobVacancyStatus] ?? 'Open'

/** Badge variant per status: open stands out, the rest are muted */
export function getJobPostingStatusVariant(status: string | null | undefined): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'filled':
      return 'secondary'
    case 'closed':
      return 'outline'
    case 'cancelled':
      return 'destructive'
    default:
      return 'default'
  }
}

export const JOB_POSTING_STATUS_FILTER_OPTIONS: SearchSelectOption[] = [
  { value: 'all', label: 'All statuses' },
  ...VACANCY_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
]

export const isJobPostingStatusFilter = (value: unknown): value is JobPostingStatusFilter =>
  value === 'all' || (VACANCY_STATUSES as readonly unknown[]).includes(value)

/** "Oct 30, 2026", or an em dash when unset */
export function formatJobPostingDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : '—'
}

/** A posting is past its period when "valid until" is before today (yyyy-mm-dd compares as text) */
export function isJobPostingExpired(validUntil: string | null | undefined, today = format(new Date(), 'yyyy-MM-dd')) {
  return !!validUntil && validUntil.slice(0, 10) < today
}

/** Generic messages only (SECURITY.md): a hire or an applicant on the posting blocks deleting it (087) */
export function toJobPostingErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '23503') return 'A posting with applicants or hires cannot be deleted. Close it instead.'
  if (code === '42501') return 'Only the company owner can change job postings.'
  if (code === '22023') return 'Add a position title, 1 to 30 skills and 1 to 15 requirements.'
  return fallback
}

// ─── Requirements applicants submit (migration 088) ───

/** Trimmed, single-spaced: how the requirement is saved */
export const cleanRequirementInput = (value: string) => value.trim().replace(/\s+/g, ' ')

/** The key migration 088 compares names on (requirement_key) */
export const toRequirementKey = (value: string) => cleanRequirementInput(value).toLowerCase()

/** The NSRP Form is PESO's (programs, job fairs, analytics), so it can't be one of the employer's requirements */
export const isNsrpRequirement = (value: string) => toRequirementKey(value) === toRequirementKey(JOB_APPLICATION_NSRP_DOCUMENT)

/** 1–15 distinct documents, none of them the NSRP Form; each one required or optional */
export const jobPostingRequirementsSchema = z
  .array(z.object({ name: z.string().trim().min(2).max(REQUIREMENT_NAME_MAX_LENGTH), isRequired: z.boolean() }))
  .min(1, 'Add at least one document applicants must submit.')
  .max(MAX_VACANCY_REQUIREMENTS, `Up to ${MAX_VACANCY_REQUIREMENTS} requirements.`)
  .refine((items) => !items.some((item) => isNsrpRequirement(item.name)), 'The NSRP Form is only used for PESO programs, not job applications.')
  .refine(
    (items) => new Set(items.map((item) => toRequirementKey(item.name))).size === items.length,
    'Each requirement can only be listed once.',
  )

/** Saved requirements as form values; a new posting starts with Resume (required) and Application Letter (optional) */
export function toJobPostingRequirementValues(
  requirements: readonly JobVacancyRequirement[] = DEFAULT_VACANCY_REQUIREMENTS,
): JobPostingRequirementValue[] {
  return requirements.map((item) => ({ name: item.requirement_name, isRequired: item.is_required }))
}

/** Form values as esmdd.save_job_vacancy's p_requirements, in the employer's order */
export function toJobVacancyRequirements(values: readonly JobPostingRequirementValue[]): JobVacancyRequirement[] {
  return values.map((item) => ({ requirement_name: cleanRequirementInput(item.name), is_required: item.isRequired }))
}
