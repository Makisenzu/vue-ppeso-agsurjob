import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { calculateAgeFromDateString, parseApplicantAddress } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { TUPAD_DOCUMENT_OPTIONS } from '@/types/peso/provincialPeso/tupad'
import type {
  TupadApplicantRow,
  TupadApplicantWithRegistry,
  TupadAttachmentWithUrl,
  TupadBatchRow,
  TupadDailyLog,
  TupadDailyLogDay,
  TupadDayStatus,
  TupadMember,
  TupadRegistryApplicant,
} from '@/types/peso/provincialPeso/tupad'

const FALLBACK_BADGE_CLASS = 'bg-muted text-muted-foreground border-border'

const TUPAD_STATUS_BADGE_CLASS: Record<string, string> = {
  // tupad_applicants
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  // tupad_batch
  ongoing: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
  // tupad
  active: 'bg-success/10 text-success border-success/30',
  completed: 'bg-info/10 text-info border-info/30',
  terminated: 'bg-destructive/10 text-destructive border-destructive/30',
}

/** Badge colors for every TUPAD status value (applicant, batch and engagement). */
export function getTupadStatusBadgeClass(status?: string | null): string {
  return TUPAD_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? FALLBACK_BADGE_CLASS
}

/** True when a referred_programs list includes TUPAD (case-insensitive, like the Entry of Applicants filter). */
export function hasTupadReferral(programs?: readonly (string | null)[] | null): boolean {
  return (programs ?? []).some((p) => (p || '').toUpperCase().includes('TUPAD'))
}

export function formatTupadRegistryName(applicant?: TupadRegistryApplicant | null): string {
  if (!applicant) return 'Unknown applicant'
  const middleInitial = applicant.middle_name?.trim() ? `${applicant.middle_name.trim().charAt(0)}.` : ''
  const given = [applicant.first_name, middleInitial].filter(Boolean).join(' ')
  const name = [applicant.surname, given].filter(Boolean).join(', ')
  return [name, applicant.suffix].filter(Boolean).join(' ') || 'Unknown applicant'
}

export function formatTupadApplicantName(row?: TupadApplicantWithRegistry | null): string {
  return formatTupadRegistryName(row?.applicant)
}

export function formatTupadMemberName(member?: TupadMember | null): string {
  return formatTupadApplicantName(member?.tupad_applicant)
}

export function getTupadMunicipality(applicant?: TupadRegistryApplicant | null): string {
  if (!applicant) return '—'
  return parseApplicantAddress(applicant.address).municipality || '—'
}

export function getTupadBarangay(applicant?: TupadRegistryApplicant | null): string {
  if (!applicant) return '—'
  const barangay = parseApplicantAddress(applicant.address).barangay
  return barangay && barangay !== 'N/A' ? barangay : '—'
}

/** Age today from the date of birth, else the age recorded in the registry. */
export function getTupadAge(applicant?: TupadRegistryApplicant | null): number | null {
  if (!applicant) return null
  return calculateAgeFromDateString(applicant.date_of_birth) ?? applicant.age ?? null
}

/** Sex as recorded in the registry, capitalized (e.g. "Male"). */
export function formatTupadSex(applicant?: TupadRegistryApplicant | null): string {
  const sex = applicant?.sex?.trim()
  return sex ? sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase() : '—'
}

/** All contact numbers of the applicant, comma-separated. */
export function formatTupadContact(applicant?: TupadRegistryApplicant | null): string {
  const numbers = (applicant?.contact_numbers ?? []).map((n) => n?.trim()).filter(Boolean)
  return numbers.length ? numbers.join(', ') : '—'
}

export function formatTupadDate(value?: string | null): string {
  if (!value) return '—'
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy')
}

export function formatTupadPeriod(batch?: Pick<TupadBatchRow, 'start_date' | 'end_date'> | null): string {
  if (!batch?.start_date && !batch?.end_date) return '—'
  return `${formatTupadDate(batch.start_date)} – ${formatTupadDate(batch.end_date)}`
}

export function formatTupadIncome(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

/** Default work days for a new engagement: the batch period (inclusive), else 10 days. */
export function getDefaultTupadDays(batch?: Pick<TupadBatchRow, 'start_date' | 'end_date'> | null): number {
  if (batch?.start_date && batch?.end_date) {
    const days = differenceInCalendarDays(parseISO(batch.end_date), parseISO(batch.start_date)) + 1
    if (days >= 1 && days <= 365) return days
  }
  return 10
}

/** Required documents (TUPAD_DOCUMENT_OPTIONS) the applicant has submitted. */
export function countTupadRequiredDocuments(row: Pick<TupadApplicantRow, 'doc_submitted'>): number {
  return TUPAD_DOCUMENT_OPTIONS.filter((doc) => row.doc_submitted.includes(doc)).length
}

/**
 * What a TUPAD applicant still lacks before they can join a batch: the monthly income and
 * every required document. Mirrors trg_tupad_guard_batch_requirements (migration 022).
 */
export function getTupadBatchMissingRequirements(
  row: Pick<TupadApplicantRow, 'monthly_income' | 'doc_submitted'>
): string[] {
  const missing: string[] = []
  if (row.monthly_income === null || row.monthly_income === undefined) missing.push('Monthly income')
  for (const doc of TUPAD_DOCUMENT_OPTIONS) {
    if (!row.doc_submitted.includes(doc)) missing.push(doc)
  }
  return missing
}

export function isTupadBatchReady(row: Pick<TupadApplicantRow, 'monthly_income' | 'doc_submitted'>): boolean {
  return getTupadBatchMissingRequirements(row).length === 0
}

/** Only Pending / Ongoing batches accept new applicants. */
export function isTupadBatchOpen(batch?: Pick<TupadBatchRow, 'status'> | null): boolean {
  return batch?.status === 'Pending' || batch?.status === 'Ongoing'
}

// ─── Daily attachment log ───

const MANILA_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar day (YYYY-MM-DD, Asia/Manila) of a timestamp — the day a file was uploaded. */
export function toTupadLocalDate(value: string | Date): string {
  return MANILA_DATE_FORMAT.format(typeof value === 'string' ? new Date(value) : value)
}

/**
 * One row per work day of a beneficiary (Day 1 … days_duration). Days are not fixed calendar dates:
 * each date the beneficiary uploaded at least one file becomes their next work day, so with uploads on
 * Oct 14 and Oct 16, Day 1 is Oct 14 and Day 2 is Oct 16. Several uploads on one date count as one day.
 */
export function buildTupadDailyLog(
  member: Pick<TupadMember, 'days_duration'>,
  attachments: TupadAttachmentWithUrl[]
): TupadDailyLog {
  const byDate = new Map<string, TupadAttachmentWithUrl[]>()
  for (const attachment of [...attachments].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const date = toTupadLocalDate(attachment.created_at)
    byDate.set(date, [...(byDate.get(date) ?? []), attachment])
  }

  const uploadDates = [...byDate.keys()].sort()
  const totalDays = Math.max(member.days_duration, 0)

  const days: TupadDailyLogDay[] = Array.from({ length: totalDays }, (_, index) => {
    const date = uploadDates[index] ?? null
    let status: TupadDayStatus = 'pending'
    if (date) status = 'submitted'
    else if (index === uploadDates.length) status = 'next'
    return { day: index + 1, date, status, attachments: date ? byDate.get(date) ?? [] : [] }
  })

  return {
    days,
    extraAttachments: uploadDates.slice(totalDays).flatMap((date) => byDate.get(date) ?? []),
    submitted: Math.min(uploadDates.length, totalDays),
    lastUploadDate: uploadDates.at(-1) ?? null,
  }
}

const TUPAD_DAY_STATUS_META: Record<TupadDayStatus, { label: string; badgeClass: string }> = {
  submitted: { label: 'Submitted', badgeClass: 'bg-success/10 text-success border-success/30' },
  next: { label: 'Next', badgeClass: 'bg-warning/10 text-warning border-warning/30' },
  pending: { label: 'Not yet submitted', badgeClass: FALLBACK_BADGE_CLASS },
}

export function getTupadDayStatusMeta(status: TupadDayStatus) {
  return TUPAD_DAY_STATUS_META[status]
}

export function formatTupadUploadTime(value: string): string {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  )
}

export function formatTupadFileSize(size?: number | null): string {
  if (size === null || size === undefined) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
