import { format, isSameDay, parseISO } from 'date-fns'
import type { JobFairWithCounts } from '@/types/peso/provincialPeso/jobFair'

const STATUS_BADGE_CLASS: Record<string, string> = {
  upcoming: 'bg-info/10 text-info border-info/30',
  ongoing: 'bg-success/10 text-success border-success/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getJobFairStatusBadgeClass(status?: string | null): string {
  return STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

export function formatJobFairSchedule(startDate: string, endDate: string): string {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (Number.isNaN(start.getTime())) return 'N/A'
  if (Number.isNaN(end.getTime()) || isSameDay(start, end)) return format(start, 'MMM d, yyyy')
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

const PARTICIPANT_STATUS_BADGE_CLASS: Record<string, string> = {
  registered: 'bg-info/10 text-info border-info/30',
  confirmed: 'bg-success/10 text-success border-success/30',
  attended: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getParticipantStatusBadgeClass(status?: string | null): string {
  return PARTICIPANT_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

const VACANCY_STATUS_BADGE_CLASS: Record<string, string> = {
  open: 'bg-success/10 text-success border-success/30',
  active: 'bg-success/10 text-success border-success/30',
  filled: 'bg-info/10 text-info border-info/30',
  closed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getVacancyStatusBadgeClass(status?: string | null): string {
  return VACANCY_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

export function formatParticipantAddress(parts: {
  street?: string | null
  barangay?: string | null
  city_municipality?: string | null
  province?: string | null
}): string {
  const address = [parts.street, parts.barangay, parts.city_municipality, parts.province]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ')
  return address || '—'
}

export function formatOptionalDate(value?: string | null): string {
  if (!value) return '—'
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy')
}

export function formatWorkExperience(months?: number | null): string {
  if (!months) return 'None required'
  if (months < 12) return `${months} mo${months > 1 ? 's' : ''}`
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yearLabel = `${years} yr${years > 1 ? 's' : ''}`
  return rest ? `${yearLabel} ${rest} mo${rest > 1 ? 's' : ''}` : yearLabel
}

export function formatCoordinate(value?: number | null): string {
  return typeof value === 'number' ? value.toFixed(6) : '—'
}

/** Number of employers participating in the job fair. */
export function getJobFairParticipantCount(row: JobFairWithCounts): number {
  return row.job_fair_participants?.[0]?.count ?? 0
}

/** Total openings across every vacancy posted for the job fair. */
export function getJobFairVacancyTotal(row: JobFairWithCounts): number {
  return (row.job_vacancies ?? []).reduce((sum, vacancy) => sum + (vacancy.vacancy_count ?? 0), 0)
}
