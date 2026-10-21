import { format, isSameDay, parseISO } from 'date-fns'
import type {
  JobFairRegistryApplicant,
  HotsVacancyOption,
  HotsWithDetails,
  JobFairStatus,
  JobFairWithCounts,
} from '@/types/peso/provincialPeso/jobFair'

/**
 * Status the database assigns from the dates (esmdd.job_fair_status_for, migration 026).
 * Takes yyyy-mm-dd strings; blank dates count as Upcoming.
 */
export function getJobFairStatusForDates(startDate: string, endDate: string): Exclude<JobFairStatus, 'Cancelled'> {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (!startDate || today < startDate.slice(0, 10)) return 'Upcoming'
  if (endDate && today > endDate.slice(0, 10)) return 'Completed'
  return 'Ongoing'
}

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

/** Number of registry applicants who registered for / attended the job fair. */
export function getJobFairApplicantCount(row: JobFairWithCounts): number {
  return row.job_fair_applicants?.[0]?.count ?? 0
}

/** Number of applicants hired on the spot at the job fair. */
export function getJobFairHotsCount(row: JobFairWithCounts): number {
  return row.hots?.[0]?.count ?? 0
}

const ATTENDEE_STATUS_BADGE_CLASS: Record<string, string> = {
  registered: 'bg-info/10 text-info border-info/30',
  attended: 'bg-success/10 text-success border-success/30',
}

export function getAttendeeStatusBadgeClass(status?: string | null): string {
  return ATTENDEE_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

/** Total openings across every vacancy posted for the job fair. */
export function getJobFairVacancyTotal(row: JobFairWithCounts): number {
  return (row.job_fair_vacancies ?? []).reduce((sum, vacancy) => sum + (vacancy.vacancy_count ?? 0), 0)
}

// ─── Hired on the Spot ───

/** Full name of a hired applicant as stored on the HOTS record. */
export function formatHireName(
  row: Pick<HotsWithDetails, 'applicant_first_name' | 'applicant_middle_name' | 'applicant_last_name'>
): string {
  return [row.applicant_first_name, row.applicant_middle_name, row.applicant_last_name].filter(Boolean).join(' ')
}

/** Full name of a registry applicant (`applicants.applicants`). */
export function formatRegistryName(applicant: JobFairRegistryApplicant): string {
  return [applicant.first_name, applicant.middle_name, applicant.surname, applicant.suffix].filter(Boolean).join(' ')
}

/** First contact number of a registry applicant — the one the HOTS trigger copies (contact_numbers[1]). */
export function getRegistryPhone(applicant: JobFairRegistryApplicant): string {
  return applicant.contact_numbers?.[0]?.trim() ?? ''
}

/** Openings left on a vacancy; null when vacancy_count is not set (no limit). */
export function getVacancySlotsLeft(option: HotsVacancyOption): number | null {
  if (option.vacancy_count == null) return null
  return Math.max(option.vacancy_count - (option.hots?.[0]?.count ?? 0), 0)
}
