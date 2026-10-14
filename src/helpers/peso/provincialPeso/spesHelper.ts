import { addBusinessDays, differenceInCalendarDays, format, isWeekend, nextMonday, parseISO, startOfToday } from 'date-fns'
import type {
  SpesAppointmentRow,
  SpesAppointmentTiming,
  SpesBeneficiaryType,
  SpesDrawCandidate,
  SpesDrawMunicipality,
  SpesFormInsert,
  SpesFormRow,
  SpesHomeLocation,
} from '@/types/peso/provincialPeso/spes'
import type { ApplicantRow } from '@/types/peso/provincialPeso/applicantEntry'
import {
  SPES_CIVIL_STATUS_OPTIONS,
  SPES_COMPLETION_REPORTS,
  SPES_DOCUMENT_REQUIREMENTS,
  SPES_SEX_OPTIONS,
  type SpesCivilStatus,
  type SpesCompletionReportMap,
  type SpesDocumentKey,
} from '@/types/common/spesForm'
import { matchSpesMunicipality } from '@/helpers/common/spesFormHelper'
import {
  formatAddressString,
  parseApplicantAddress,
  parseEducationalBackground,
  parseVocationalTrainings,
} from '@/helpers/peso/provincialPeso/applicantEntryHelper'

const FALLBACK_BADGE_CLASS = 'bg-muted text-muted-foreground border-border'

const SPES_APPLICANT_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getSpesApplicantStatusBadgeClass(status?: string | null): string {
  return SPES_APPLICANT_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? FALLBACK_BADGE_CLASS
}

const SPES_STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/30',
  completed: 'bg-info/10 text-info border-info/30',
  terminated: 'bg-destructive/10 text-destructive border-destructive/30',
  'expiring soon': 'bg-warning/10 text-warning border-warning/30',
  expired: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getSpesStatusBadgeClass(status?: string | null): string {
  return SPES_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? FALLBACK_BADGE_CLASS
}

/** "Surname, First Middle" — falls back to an em dash when the form is missing. */
export function formatSpesFormName(form?: Pick<SpesFormRow, 'surname' | 'first_name' | 'middle_name'> | null): string {
  if (!form) return '—'
  const given = [form.first_name, form.middle_name].map((v) => v?.trim()).filter(Boolean).join(' ')
  return [form.surname?.trim(), given].filter(Boolean).join(', ') || '—'
}

/** Highest school level the applicant has filled in on the SPES form. */
export function getSpesEducationSummary(form?: SpesFormRow | null): string {
  if (!form) return '—'
  const levels = [
    { school: form.tertiary_school_name, course: form.tertiary_degree_course, year: form.tertiary_year_level },
    { school: form.techvoc_school_name, course: form.techvoc_degree_course, year: form.techvoc_year_level },
    { school: form.secondary_school_name, course: form.secondary_degree_course, year: form.secondary_year_level },
    { school: form.elementary_school_name, course: form.elementary_degree_course, year: form.elementary_year_level },
  ]
  const latest = levels.find((level) => level.school?.trim())
  if (!latest) return '—'
  return [latest.school, latest.course, latest.year].map((v) => v?.trim()).filter(Boolean).join(' · ')
}

/** "Returning" when the form lists a previous SPES availment, otherwise "New". */
export function getSpesBeneficiaryType(form?: SpesFormRow | null): SpesBeneficiaryType {
  if (!form) return 'New'
  const availments = [
    form.availment_1_establishment,
    form.availment_2_establishment,
    form.availment_3_establishment,
    form.availment_4_establishment,
  ]
  return availments.some((value) => value?.trim()) ? 'Returning' : 'New'
}

export function formatSpesDate(value?: string | null): string {
  if (!value) return '—'
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy')
}

export function formatSpesDays(value?: string | null): string {
  if (!value?.trim()) return '—'
  return /^\d+$/.test(value.trim()) ? `${value.trim()} days` : value
}

/**
 * Where an appointee lives, to prefill their assignment: the Entry of Applicants address,
 * else the municipality on their SPES form. Null when neither is recorded.
 */
export function getSpesHomeLocation(
  address: unknown,
  form: Pick<SpesFormRow, 'municipality'> | null | undefined
): SpesHomeLocation | null {
  // parseApplicantAddress fills defaults for missing parts, so drop those again
  if (address && typeof address === 'object' && Object.keys(address).length > 0) {
    const parsed = parseApplicantAddress(address)
    const municipality = parsed.municipality === parsed.province ? '' : parsed.municipality
    return {
      province: parsed.province,
      municipality,
      barangay: municipality && parsed.barangay !== 'N/A' ? parsed.barangay : '',
    }
  }
  if (form?.municipality?.trim()) {
    return { province: 'Agusan del Sur', municipality: form.municipality.trim(), barangay: '' }
  }
  return null
}

/** Loose PSGC name key: "City of Bayugan", "Bayugan City" and "bayugan" all match. */
export function normalizePsgcName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/^city of\s+/, '')
    .replace(/\s+city$/, '')
    .replace(/[^a-z0-9]/g, '')
}

// ─── Appointments (esmdd.spes_appointments) ───

/** Days before end_date at which an Active SPES appointment is flagged "Expiring Soon". */
export const SPES_EXPIRING_SOON_DAYS = 7

/**
 * Date-derived state of an appointment, like calculateAppointmentStatus for GIP:
 * a concluded appointment keeps its stored status, an Active one becomes
 * "Expiring Soon" / "Expired" as its end date approaches / passes.
 */
export function getSpesAppointmentTiming(appointment: Pick<SpesAppointmentRow, 'status' | 'end_date'>): SpesAppointmentTiming {
  if (appointment.status !== 'Active') {
    return { displayStatus: appointment.status, daysRemaining: null, isExpiringSoon: false, isExpired: false }
  }

  const end = parseISO(appointment.end_date)
  if (Number.isNaN(end.getTime())) {
    return { displayStatus: 'Active', daysRemaining: null, isExpiringSoon: false, isExpired: false }
  }

  const daysRemaining = differenceInCalendarDays(end, startOfToday())
  if (daysRemaining < 0) return { displayStatus: 'Expired', daysRemaining, isExpiringSoon: false, isExpired: true }
  if (daysRemaining <= SPES_EXPIRING_SOON_DAYS) {
    return { displayStatus: 'Expiring Soon', daysRemaining, isExpiringSoon: true, isExpired: false }
  }
  return { displayStatus: 'Active', daysRemaining, isExpiringSoon: false, isExpired: false }
}

/** "SPES-2026-AB12" — unique per beneficiary and year, matching the migration backfill. */
export function generateSpesAppointmentCode(spesYear: number, spesId: string): string {
  return `SPES-${spesYear}-${spesId.slice(0, 4).toUpperCase()}`
}

/** Calendar days from start to end date, inclusive; null when either date is missing or invalid. */
export function countSpesCalendarDays(startDate?: string | null, endDate?: string | null): number | null {
  if (!startDate || !endDate) return null
  const days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
  return Number.isNaN(days) ? null : days
}

/** Documentary requirements checklist from the SPES form, in display order. */
export function getSpesDocumentChecklist(form: SpesFormRow): { label: string; submitted: boolean }[] {
  return [
    { label: 'Birth certificate', submitted: form.has_birth_certificate },
    { label: 'Proof of income', submitted: form.has_income_proof },
    { label: 'Proof of passing grades', submitted: form.has_passing_grade_proof },
    { label: 'Registrar certification', submitted: form.has_registrar_certification },
    { label: 'OSY certification', submitted: form.has_osy_certification },
  ]
}

/** Last working day (Mon–Fri) of an appointment of `days` working days starting on `startDate`. */
export function computeSpesEndDate(startDate?: string | null, days?: number | null): string | null {
  if (!startDate || !days || days < 1) return null
  const start = parseISO(startDate)
  if (Number.isNaN(start.getTime())) return null
  const firstWorkingDay = isWeekend(start) ? nextMonday(start) : start
  return format(addBusinessDays(firstWorkingDay, days - 1), 'yyyy-MM-dd')
}

// ─── Randomizer draw (per municipality) ───

/**
 * A form is drawable once all 5 documentary requirements are checked and each has a file
 * attached (`attachedKeys` = requirements with an `applicant_requirement_media` row).
 */
export function hasCompleteSpesDocuments(form: SpesFormRow, attachedKeys: readonly SpesDocumentKey[] = []): boolean {
  return SPES_DOCUMENT_REQUIREMENTS.every((doc) => form[doc.key] && attachedKeys.includes(doc.key))
}

/** Label used for forms whose municipality has not been filled in. */
export const SPES_UNSPECIFIED_MUNICIPALITY = 'Municipality not set'

/** Pending applicants with complete documents, grouped by municipality (alphabetical, unspecified last). */
export function groupSpesDrawPool(
  forms: SpesFormRow[],
  attachedKeysByForm: Record<string, SpesDocumentKey[]>
): SpesDrawMunicipality[] {
  const groups = new Map<string, SpesDrawCandidate[]>()
  for (const form of forms) {
    if ((form.status ?? 'Pending').toLowerCase() !== 'pending') continue
    if (!hasCompleteSpesDocuments(form, attachedKeysByForm[form.id])) continue
    const municipality = form.municipality?.trim() || SPES_UNSPECIFIED_MUNICIPALITY
    groups.set(municipality, [...(groups.get(municipality) ?? []), { form, name: formatSpesFormName(form) }])
  }
  return [...groups]
    .map(([municipality, candidates]) => ({
      municipality,
      candidates: candidates.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (a.municipality === SPES_UNSPECIFIED_MUNICIPALITY) return 1
      if (b.municipality === SPES_UNSPECIFIED_MUNICIPALITY) return -1
      return a.municipality.localeCompare(b.municipality)
    })
}

/** Uniform random integer in [0, max) from the Web Crypto API (no modulo bias). */
export function secureRandomIndex(max: number): number {
  if (max <= 1) return 0
  const limit = Math.floor(0x100000000 / max) * max
  const buffer = new Uint32Array(1)
  do {
    crypto.getRandomValues(buffer)
  } while (buffer[0]! >= limit)
  return buffer[0]! % max
}

/** `count` distinct random picks from `pool` (partial Fisher–Yates), in the order they were drawn. */
export function drawRandomSpesCandidates<T>(pool: readonly T[], count: number, randomIndex = secureRandomIndex): T[] {
  const remaining = [...pool]
  const picks: T[] = []
  while (picks.length < count && remaining.length) {
    const [picked] = remaining.splice(randomIndex(remaining.length), 1)
    picks.push(picked!)
  }
  return picks
}

/** Remark stored on a form approved through the randomizer. */
export function buildSpesDrawRemark(municipality: string, drawnAt: Date = new Date()): string {
  return `Selected through the SPES randomizer draw for ${municipality} on ${format(drawnAt, 'MMM d, yyyy h:mm a')}.`
}

// ─── Completion reports ───

/** Both the DTR and the Accomplishment Report have been submitted. */
export function hasAllSpesCompletionReports(reports?: SpesCompletionReportMap | null): boolean {
  return SPES_COMPLETION_REPORTS.every((report) => !!reports?.[report.key])
}

export function countSpesCompletionReports(reports?: SpesCompletionReportMap | null): number {
  return SPES_COMPLETION_REPORTS.filter((report) => !!reports?.[report.key]).length
}

// ─── Applicant registry → SPES form ───

/** SPES form fields that can be carried over from an Entry of Applicants record. */
export type SpesFormPrefill = Omit<SpesFormInsert, 'id' | 'profile_id' | 'created_at' | 'updated_at' | 'status' | 'remarks'>

type SpesEducationKey = 'elementary' | 'secondary' | 'tertiary' | 'techvoc'

const SPES_EDUCATION_KEYWORDS: [SpesEducationKey, RegExp][] = [
  ['techvoc', /voc|tech|tesda/i],
  ['elementary', /elem|primary|grade school/i],
  ['secondary', /second|high school|junior|senior|shs|jhs/i],
  ['tertiary', /tert|college|bachelor|univ|graduate|post/i],
]

const blankToNull = (value: unknown): string | null => {
  const text = value == null ? '' : String(value).trim()
  return text && text.toUpperCase() !== 'N/A' ? text : null
}

const SPES_CIVIL_STATUS_ALIASES: Record<string, SpesCivilStatus> = {
  widowed: 'Widow/er',
  widow: 'Widow/er',
  widower: 'Widow/er',
}

function toSpesCivilStatus(value: string | null): SpesCivilStatus | null {
  const key = (value ?? '').trim().toLowerCase()
  if (!key) return null
  return SPES_CIVIL_STATUS_OPTIONS.find((o) => o.toLowerCase() === key) ?? SPES_CIVIL_STATUS_ALIASES[key] ?? null
}

/** Maps an Entry of Applicants record onto the SPES form so PESO only has to fill in what is missing. */
export function buildSpesFormPrefill(applicant: ApplicantRow): SpesFormPrefill {
  const prefill: SpesFormPrefill = {
    surname: applicant.surname,
    first_name: applicant.first_name,
    middle_name: blankToNull(applicant.middle_name),
    date_of_birth: applicant.date_of_birth,
    age: applicant.age,
    contact_number: blankToNull(applicant.contact_numbers?.[0]),
    email_address: blankToNull(applicant.email),
    sex: SPES_SEX_OPTIONS.find((o) => o.toLowerCase() === (applicant.sex ?? '').trim().toLowerCase()) ?? null,
    civil_status: toSpesCivilStatus(applicant.civil_status),
    student_category:
      applicant.currently_in_school == null ? null : applicant.currently_in_school ? 'Student' : 'out-of-school (OSY)',
    special_skills: [...(applicant.other_skills ?? []), applicant.other_skills_specified ?? '']
      .map((skill) => skill.trim())
      .filter(Boolean),
  }

  // parseApplicantAddress fills defaults for missing parts, so only format a real address
  if (applicant.address && typeof applicant.address === 'object' && Object.keys(applicant.address).length > 0) {
    const address = parseApplicantAddress(applicant.address)
    prefill.present_address = formatAddressString(address)
    prefill.municipality = matchSpesMunicipality(address.municipality)
  }

  // The most recent entry per level wins
  for (const item of parseEducationalBackground(applicant.educational_background)) {
    const key = SPES_EDUCATION_KEYWORDS.find(([, pattern]) => pattern.test(item.level ?? ''))?.[0]
    if (!key) continue
    prefill[`${key}_school_name`] = blankToNull(item.school)
    prefill[`${key}_degree_course`] = blankToNull(item.course)
    prefill[`${key}_year_level`] = blankToNull(item.undergraduate_level_reached)
    prefill[`${key}_date_of_attendance`] = blankToNull(item.year_graduated)
  }

  const training = parseVocationalTrainings(applicant.vocational_trainings)[0]
  if (training && !prefill.techvoc_school_name) {
    prefill.techvoc_school_name = blankToNull(training.training_institution)
    prefill.techvoc_degree_course = blankToNull(training.course_training_title)
    prefill.techvoc_date_of_attendance = blankToNull(training.duration)
  }

  return prefill
}

const isBlankSpesValue = (value: unknown) =>
  value == null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)

/** Only the prefill values for fields the existing form still has blank — never overwrites encoded data. */
export function pickBlankSpesFields(form: SpesFormRow, prefill: SpesFormPrefill): Partial<SpesFormPrefill> {
  const current = form as unknown as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(prefill).filter(([field, value]) => !isBlankSpesValue(value) && isBlankSpesValue(current[field]))
  ) as Partial<SpesFormPrefill>
}
