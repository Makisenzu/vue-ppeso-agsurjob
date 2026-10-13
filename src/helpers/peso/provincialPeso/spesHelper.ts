import { format, parseISO } from 'date-fns'
import type { SpesBeneficiaryType, SpesFormInsert, SpesFormRow } from '@/types/peso/provincialPeso/spes'
import type { ApplicantRow } from '@/types/peso/provincialPeso/applicantEntry'
import {
  SPES_CIVIL_STATUS_OPTIONS,
  SPES_SEX_OPTIONS,
  type SpesCivilStatus,
} from '@/types/common/spesForm'
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
    prefill.present_address = formatAddressString(parseApplicantAddress(applicant.address))
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
