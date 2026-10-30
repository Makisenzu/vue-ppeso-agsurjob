import { format, isValid, parseISO } from 'date-fns'
import { VACANCY_STATUSES, type JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import type { JobPostingStatusFilter } from '@/types/employer/jobPosting'
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

/** Generic messages only (SECURITY.md): a hire on the posting blocks deleting it */
export function toJobPostingErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '23503') return 'A posting with hires cannot be deleted. Close it instead.'
  if (code === '42501') return 'Only the company owner can change job postings.'
  if (code === '22023') return 'Add a position title and 1 to 30 skills.'
  return fallback
}
