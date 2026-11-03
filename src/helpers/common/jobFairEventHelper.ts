import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type { JobFairEventRow } from '@/types/common/jobFairEvent'

/** "11/20/2026" or "11/20/2026 – 11/22/2026" */
export function formatJobFairDateRange(startDate: string, endDate: string): string {
  const start = formatDisplayDate(startDate)
  const end = formatDisplayDate(endDate)
  return !end || start === end ? start : `${start} – ${end}`
}

export const JOB_FAIR_STATUS_BADGE_CLASS: Record<string, string> = {
  Upcoming: 'bg-primary/10 text-primary border-primary/30',
  Ongoing: 'bg-success/10 text-success border-success/30',
  Completed: 'bg-muted text-muted-foreground border-border',
  Cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

export const JOB_FAIR_PARTICIPANT_BADGE_CLASS: Record<string, string> = {
  Registered: 'bg-warning/10 text-warning border-warning/30',
  Confirmed: 'bg-success/10 text-success border-success/30',
  Attended: 'bg-success/10 text-success border-success/30',
  Cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

/** Registration and vacancy changes stay open until the fair ends */
export const isJobFairOpen = (status: string) => status === 'Upcoming' || status === 'Ongoing'

export const formatOpenings = (count: number | null | undefined) => {
  const value = count ?? 0
  return `${value} opening${value === 1 ? '' : 's'}`
}

export const formatExperience = (months: number | null | undefined) => {
  if (!months) return 'No experience needed'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} experience`
  const years = Math.floor(months / 12)
  return `${years}+ year${years === 1 ? '' : 's'} experience`
}

// Errors raised by the migration 105 RPCs are written for the user; anything else gets the fallback
const USER_FACING_CODES = new Set(['P0001', 'P0002', '22023', '23505', '42501'])

export function toJobFairErrorMessage(error: unknown, fallback: string): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (code === '23503') return 'PESO recorded hires for this vacancy, so it can no longer be removed.'
  if (code && message && USER_FACING_CODES.has(code)) return message
  return fallback
}

/** What a job fair card shows; `badge` is the viewer's own registration / participation */
export type JobFairEventCard = {
  id: string
  title: string
  dateRange: string
  location: string
  status: string
  statusClass: string
  companies: string
  openings: string
  badge: { label: string; class: string } | null
}

export function toJobFairEventCard(
  row: JobFairEventRow,
  myStatus: string | null,
): JobFairEventCard {
  return {
    id: row.id,
    title: row.title,
    dateRange: formatJobFairDateRange(row.start_date, row.end_date),
    location: row.location,
    status: row.status,
    statusClass: JOB_FAIR_STATUS_BADGE_CLASS[row.status] ?? '',
    companies: `${row.company_count} compan${row.company_count === 1 ? 'y' : 'ies'}`,
    openings: formatOpenings(row.opening_count),
    badge: myStatus ? { label: myStatus, class: JOB_FAIR_PARTICIPANT_BADGE_CLASS[myStatus] ?? '' } : null,
  }
}
