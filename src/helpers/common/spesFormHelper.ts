import { differenceInYears, format, isValid, parseISO } from 'date-fns'
import * as z from 'zod'
import {
  SPES_ATTACHMENT_MAX_BYTES,
  SPES_ATTACHMENT_MIME_TYPES,
  SPES_CIVIL_STATUS_OPTIONS,
  SPES_PARENTS_STATUS_OPTIONS,
  SPES_SEX_OPTIONS,
  SPES_STUDENT_CATEGORY_OPTIONS,
  type SpesFormInsert,
  type SpesFormRow,
  type SpesOwnAppointment,
} from '@/types/common/spesForm'
import { AGUSAN_DEL_SUR_MUNICIPALITIES } from '@/helpers/common/mapboxHelpers'

/** Agusan del Sur municipalities an applicant can belong to — the randomizer draws per municipality. */
export const SPES_MUNICIPALITY_OPTIONS: readonly string[] = AGUSAN_DEL_SUR_MUNICIPALITIES.map((entry) => entry.municipality)

const normalizeMunicipality = (value: string) =>
  value
    .toLowerCase()
    .replace(/city of|city|municipality of/g, '')
    .replace(/[^a-z]/g, '')

/** The municipality option named in free text (an address or registry value), or null when none matches. */
export function matchSpesMunicipality(text?: string | null): string | null {
  const haystack = normalizeMunicipality(text ?? '')
  if (!haystack) return null
  return SPES_MUNICIPALITY_OPTIONS.find((option) => haystack.includes(normalizeMunicipality(option))) ?? null
}

/** SPES eligibility: applicants must be 15 to 30 years old (inclusive). */
export const SPES_MIN_AGE = 15
export const SPES_MAX_AGE = 30

const optionalText = z.string().trim().max(255, 'Must be 255 characters or fewer.').optional()
const contactNumber = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]*$/, 'Use digits only (e.g. 09171234567).')
  .max(20, 'Must be 20 characters or fewer.')
  .optional()

/** Validation schema for `applicants.spes_form`; keys match the table columns. */
export const spesFormSchema = z.object({
  // 1. Personal Information
  surname: z.string().trim().min(1, 'Surname is required.'),
  first_name: z.string().trim().min(1, 'First name is required.'),
  middle_name: optionalText,
  gsis_beneficiary_relationship: optionalText,
  date_of_birth: z
    .string()
    .min(1, 'Date of birth is required.')
    .refine((v) => isValid(parseISO(v)) && parseISO(v) < new Date(), 'Enter a valid date of birth.')
    .refine(
      (v) => {
        const age = calculateSpesAge(v)
        return age === null || (age >= SPES_MIN_AGE && age <= SPES_MAX_AGE)
      },
      `Only applicants aged ${SPES_MIN_AGE} to ${SPES_MAX_AGE} are eligible for SPES.`
    ),
  place_of_birth: optionalText,
  age: z.number().int().min(0).max(120).nullable().optional(),
  citizenship: optionalText,
  contact_number: contactNumber,
  email_address: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional(),
  social_media_account: optionalText,
  civil_status: z.enum(SPES_CIVIL_STATUS_OPTIONS).optional(),
  sex: z.enum(SPES_SEX_OPTIONS, { message: 'Select your sex.' }),
  student_category: z.enum(SPES_STUDENT_CATEGORY_OPTIONS, { message: 'Select your student category.' }),
  parents_status: z.array(z.enum(SPES_PARENTS_STATUS_OPTIONS)),
  municipality: z
    .string({ message: 'Select your municipality.' })
    .refine((value) => SPES_MUNICIPALITY_OPTIONS.includes(value), 'Select your municipality.'),
  present_address: z.string().trim().min(1, 'Present address is required.'),
  permanent_address: optionalText,

  // 3. Parents / Guardian
  father_name: optionalText,
  father_contact_no: contactNumber,
  father_occupation: optionalText,
  mother_maiden_name: optionalText,
  mother_contact_no: contactNumber,
  mother_occupation: optionalText,

  // 4. Educational Background
  elementary_school_name: optionalText,
  elementary_degree_course: optionalText,
  elementary_year_level: optionalText,
  elementary_date_of_attendance: optionalText,
  secondary_school_name: optionalText,
  secondary_degree_course: optionalText,
  secondary_year_level: optionalText,
  secondary_date_of_attendance: optionalText,
  tertiary_school_name: optionalText,
  tertiary_degree_course: optionalText,
  tertiary_year_level: optionalText,
  tertiary_date_of_attendance: optionalText,
  techvoc_school_name: optionalText,
  techvoc_degree_course: optionalText,
  techvoc_year_level: optionalText,
  techvoc_date_of_attendance: optionalText,

  // 5. Documentary Requirements
  has_birth_certificate: z.boolean(),
  has_income_proof: z.boolean(),
  has_passing_grade_proof: z.boolean(),
  has_registrar_certification: z.boolean(),
  has_osy_certification: z.boolean(),

  // 6. Additional Skills & History
  special_skills: z.array(z.string().trim().min(1)),
  availment_1_establishment: optionalText,
  availment_1_year: optionalText,
  availment_1_spes_id: optionalText,
  availment_2_establishment: optionalText,
  availment_2_year: optionalText,
  availment_2_spes_id: optionalText,
  availment_3_establishment: optionalText,
  availment_3_year: optionalText,
  availment_3_spes_id: optionalText,
  availment_4_establishment: optionalText,
  availment_4_year: optionalText,
  availment_4_spes_id: optionalText,
  other_dole_interventions: z.string().trim().max(1000, 'Must be 1000 characters or fewer.').optional(),
})

export type SpesFormValues = z.infer<typeof spesFormSchema>
export type SpesFormField = keyof SpesFormValues

/** Form state before validation: required selects may still be unset. */
export type SpesFormDraft = Omit<SpesFormValues, 'sex' | 'student_category' | 'municipality'> &
  Partial<Pick<SpesFormValues, 'sex' | 'student_category' | 'municipality'>>

const SPES_FORM_FIELDS = Object.keys(spesFormSchema.shape) as SpesFormField[]

/** Blank form; select-type fields start as `undefined` so their placeholder shows. */
export function createEmptySpesFormValues(): SpesFormDraft {
  const values = Object.fromEntries(SPES_FORM_FIELDS.map((key) => [key, ''])) as Record<string, unknown>
  return {
    ...values,
    age: null,
    citizenship: 'Filipino',
    civil_status: undefined,
    sex: undefined,
    student_category: undefined,
    municipality: undefined,
    parents_status: [],
    special_skills: [],
    has_birth_certificate: false,
    has_income_proof: false,
    has_passing_grade_proof: false,
    has_registrar_certification: false,
    has_osy_certification: false,
  } as unknown as SpesFormDraft
}

/** Maps a saved `spes_form` row back into form values (nulls → blank defaults). */
export function toSpesFormValues(row: SpesFormRow): SpesFormDraft {
  const empty = createEmptySpesFormValues() as Record<string, unknown>
  const values = Object.fromEntries(
    SPES_FORM_FIELDS.map((key) => {
      const saved = row[key]
      return [key, saved === null || saved === undefined ? empty[key] : saved]
    })
  )
  return values as SpesFormDraft
}

/** Maps form values to a `spes_form` payload: trims text and stores blanks as NULL. */
export function buildSpesFormPayload(values: SpesFormValues): Omit<SpesFormInsert, 'profile_id'> {
  const normalized = Object.fromEntries(
    SPES_FORM_FIELDS.map((key) => {
      const value = values[key]
      if (typeof value === 'string') return [key, value.trim() || null]
      return [key, value ?? null]
    })
  )
  return {
    ...normalized,
    surname: values.surname.trim(),
    first_name: values.first_name.trim(),
    date_of_birth: values.date_of_birth,
    parents_status: values.parents_status ?? [],
    special_skills: (values.special_skills ?? []).map((skill) => skill.trim()).filter(Boolean),
  } as Omit<SpesFormInsert, 'profile_id'>
}

/** Whole years between the birth date (yyyy-mm-dd) and today, or null when invalid. */
export function calculateSpesAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = parseISO(dateOfBirth)
  if (!isValid(dob)) return null
  const age = differenceInYears(new Date(), dob)
  return age >= 0 ? age : null
}

/** Fields validated before leaving each step of the entry form. */
export const SPES_FORM_STEP_FIELDS: Record<number, SpesFormField[]> = {
  1: [
    'surname', 'first_name', 'middle_name', 'date_of_birth', 'age', 'place_of_birth', 'sex', 'civil_status',
    'citizenship', 'contact_number', 'email_address', 'social_media_account', 'gsis_beneficiary_relationship',
    'student_category', 'parents_status', 'municipality', 'present_address', 'permanent_address',
  ],
  2: ['father_name', 'father_contact_no', 'father_occupation', 'mother_maiden_name', 'mother_contact_no', 'mother_occupation'],
  3: SPES_FORM_FIELDS.filter((key) => /^(elementary|secondary|tertiary|techvoc)_/.test(key)),
  4: SPES_FORM_FIELDS.filter((key) => key.startsWith('has_') || key.startsWith('availment_') || key === 'special_skills' || key === 'other_dole_interventions'),
  5: [],
}

const APPLICATION_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getSpesApplicationStatusBadgeClass(status?: string | null): string {
  return APPLICATION_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

/** "Brgy. X, Municipality, Province" — barangay / province are missing on appointments made before migration 018. */
export function formatSpesAssignment(
  appointment: Pick<SpesOwnAppointment, 'assigned_province' | 'assigned_municipality' | 'assigned_barangay'>
): string {
  const parts = [
    appointment.assigned_barangay ? `Brgy. ${appointment.assigned_barangay}` : null,
    appointment.assigned_municipality,
    appointment.assigned_province,
  ].filter((part): part is string => !!part?.trim())
  return parts.length ? parts.join(', ') : '—'
}

/** "MMM d, yyyy", or an em dash when the date is missing or invalid. */
export function formatSpesFormDate(value?: string | null): string {
  if (!value) return '—'
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : '—'
}

/** "SPES-APP-2026-1A2B": same shape as GIP's reference (gipApplicationCode); the year is the round's. */
export function spesApplicationCode(id: string, appliedAt?: string | null): string {
  const year = (appliedAt ? new Date(appliedAt).getFullYear() : NaN) || new Date().getFullYear()
  return `SPES-APP-${year}-${id.slice(0, 4).toUpperCase()}`
}

/** Why a picked requirement file can't be used, or null when it can. */
export function validateSpesAttachment(file: File): string | null {
  if (!(SPES_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Upload an image (JPG, PNG, WEBP) or a PDF file.'
  }
  if (file.size > SPES_ATTACHMENT_MAX_BYTES) {
    return `The file must be ${SPES_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB or smaller.`
  }
  return null
}

/** The registry fields a first SPES form starts from. */
export interface SpesPrefillSource {
  sex?: string | null
  civil_status?: string | null
  surname?: string | null
  first_name?: string | null
  middle_name?: string | null
  date_of_birth?: string | null
  contact_numbers?: string[] | null
  email?: string | null
  address?: unknown
}

/** A blank SPES form filled in with what the applicant already gave in their jobseeker profile. */
export function buildSpesPrefill(applicant: SpesPrefillSource | null | undefined, accountEmail?: string | null): SpesFormDraft {
  const base = createEmptySpesFormValues()
  if (!applicant) return { ...base, email_address: accountEmail ?? '' }

  const sex = applicant.sex
    ? SPES_SEX_OPTIONS.find((option) => option.toLowerCase() === applicant.sex!.toLowerCase())
    : undefined
  const civilStatus = applicant.civil_status
    ? SPES_CIVIL_STATUS_OPTIONS.find((option) => option.toLowerCase() === applicant.civil_status!.toLowerCase())
    : undefined

  const address = (applicant.address && typeof applicant.address === 'object' ? applicant.address : {}) as Record<string, unknown>
  const municipality = matchSpesMunicipality(String(address.city_municipality ?? address.municipality ?? address.city ?? ''))

  return {
    ...base,
    municipality: municipality ?? undefined,
    surname: applicant.surname ?? '',
    first_name: applicant.first_name ?? '',
    middle_name: applicant.middle_name ?? '',
    date_of_birth: applicant.date_of_birth ?? '',
    age: calculateSpesAge(applicant.date_of_birth),
    sex,
    civil_status: civilStatus,
    contact_number: applicant.contact_numbers?.[0] ?? '',
    email_address: applicant.email ?? accountEmail ?? '',
  }
}

/** The saved details an applicant reviews before applying, label → value; empty values left out. */
export function describeSpesApplicant(row: SpesFormRow): { label: string; value: string }[] {
  const latestSchool =
    [row.tertiary_school_name, row.techvoc_school_name, row.secondary_school_name, row.elementary_school_name].find(
      (school) => !!school?.trim()
    ) ?? null
  return [
    { label: 'Name', value: [row.first_name, row.middle_name, row.surname].filter(Boolean).join(' ') },
    { label: 'Date of birth', value: row.date_of_birth ? `${formatSpesFormDate(row.date_of_birth)} (${calculateSpesAge(row.date_of_birth) ?? '—'})` : '' },
    { label: 'Sex', value: row.sex ?? '' },
    { label: 'Student category', value: row.student_category ?? '' },
    { label: 'Municipality', value: row.municipality ?? '' },
    { label: 'School', value: latestSchool ?? '' },
    { label: 'Contact', value: [row.contact_number, row.email_address].filter(Boolean).join(' · ') },
    { label: 'Parents / guardian', value: [row.father_name, row.mother_maiden_name].filter(Boolean).join(' · ') },
  ].filter((detail) => detail.value)
}
