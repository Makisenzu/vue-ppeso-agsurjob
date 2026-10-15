import * as z from 'zod'
import type { Json } from '@/types/database.types'
import type {
  ApplicantCompletionValues,
  ApplicantRecordRow,
  ApplicantRecordUpdate,
  CompletionPersonalField,
  CompletionStepKey,
  CompletionStepMeta,
  EducationEntryForm,
  EligibilityEntryForm,
  LanguageEntryForm,
  TrainingEntryForm,
  WorkEntryForm,
} from '@/types/applicant/applicantCompletion'
import { calculateAge, MIN_SIGNUP_AGE } from '@/helpers/common/signupHelper'

// ─── Steps ───

export const COMPLETION_STEPS: CompletionStepMeta[] = [
  { key: 'personal', title: 'Personal & Employment', description: 'Background, employment status, and special categories.' },
  { key: 'education', title: 'Education & Training', description: 'Schools attended, vocational trainings, and eligibilities.' },
  { key: 'experience', title: 'Work & Skills', description: 'Work experience, languages, and skills.' },
  { key: 'preferences', title: 'Job Preference', description: 'The jobs and locations you are looking for.' },
]

// ─── Options (same values the PESO applicant entry form stores) ───

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'Employed', label: 'Employed' },
  { value: 'Unemployed', label: 'Unemployed' },
] as const

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'Wage employed', label: 'Wage employed' },
  { value: 'Self-employed', label: 'Self-employed' },
] as const

export const UNEMPLOYED_REASON_OPTIONS = [
  'Fresh Graduate',
  'Finished Contract',
  'Resigned',
  'Laid Off / Terminated',
  'Retired',
  'Family Responsibilities',
  'Other',
] as const

export const EDUCATION_LEVEL_OPTIONS = [
  'Elementary',
  'Secondary / High School',
  'Senior High School',
  'Technical-Vocational',
  'College / Tertiary',
  'Post-Graduate / Masteral',
] as const

export const APPOINTMENT_STATUS_OPTIONS = ['Permanent', 'Contractual', 'Casual', 'Job Order', 'Part-Time'] as const

export const DISABILITY_OPTIONS = [
  'Visual',
  'Hearing',
  'Speech',
  'Physical / Orthopedic',
  'Mental / Psychosocial',
  'Chronic Illness / Learning Disability',
] as const

export const JOB_TYPE_OPTIONS = [
  'Full-Time',
  'Part-Time',
  'Contractual',
  'Project-Based',
  'Remote / Work From Home',
] as const

export const SKILL_OPTIONS = [
  'Auto Mechanic',
  'Beautician',
  'Carpentry Work',
  'Computer Literate',
  'Domestic Chores',
  'Driver',
  'Electrician',
  'Embroidery',
  'Gardening',
  'Masonry',
  'Painter/Artist',
  'Painting Jobs',
  'Photography',
  'Plumbing',
  'Sewing Dresses',
  'Stenography',
  'Tailoring',
] as const

export const LANGUAGE_ABILITIES = ['read', 'write', 'speak', 'understand'] as const

export const COMPLETION_SEX_OPTIONS = ['Male', 'Female'] as const
export const COMPLETION_CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent'] as const

// ─── Empty entries ───

export const createEducationEntry = (): EducationEntryForm => ({
  level: '',
  school: '',
  course: '',
  year_graduated: '',
  awards: '',
  undergraduate_level_reached: '',
})

export const createTrainingEntry = (): TrainingEntryForm => ({
  course_training_title: '',
  duration: '',
  training_institution: '',
  skills_acquired: '',
  certificates_received: '',
})

export const createEligibilityEntry = (): EligibilityEntryForm => ({
  eligibility_title: '',
  rating: '',
  date_of_examination: '',
  place_of_examination: '',
})

export const createWorkEntry = (): WorkEntryForm => ({
  company_name: '',
  address: '',
  position: '',
  inclusive_dates: '',
  number_of_months: '',
  monthly_salary: '',
  status_of_appointment: '',
})

export const createLanguageEntry = (language = ''): LanguageEntryForm => ({
  language,
  read: false,
  write: false,
  speak: false,
  understand: false,
})

const DEFAULT_LANGUAGES = ['English', 'Tagalog / Filipino', 'Cebuano / Bisaya']

// ─── Completeness ───
// `work_experiences` uses `null` = not answered yet and `[]` = answered "none".
// Vocational trainings and eligibilities are optional, as on the PESO entry form.

/** Fields that decide completeness — loose types so reactive (unwrapped) rows are accepted too. */
export interface ApplicantCompletenessInput {
  date_of_birth: string | null
  sex: string | null
  civil_status: string | null
  religion: string | null
  height_ft: number | null
  employment_status: string | null
  educational_background: unknown
  work_experiences: unknown
  language_proficiencies: unknown
  other_skills: readonly string[] | null
  other_skills_specified: string | null
  preferred_occupations: readonly string[] | null
}

const isAnswered = (value: unknown) => value !== null && value !== undefined
const hasEntries = (value: unknown) => (Array.isArray(value) ? value.length > 0 : !!value && typeof value === 'object')

/** Which wizard steps still have unanswered NSRP data. */
export function getIncompleteSteps(row: ApplicantCompletenessInput | null | undefined): CompletionStepKey[] {
  if (!row) return COMPLETION_STEPS.map((step) => step.key)
  const incomplete: CompletionStepKey[] = []

  if (!(row.date_of_birth && row.sex && row.civil_status && row.religion && row.height_ft !== null && row.employment_status)) {
    incomplete.push('personal')
  }
  if (!hasEntries(row.educational_background)) {
    incomplete.push('education')
  }
  if (
    !(
      isAnswered(row.work_experiences) &&
      hasEntries(row.language_proficiencies) &&
      ((row.other_skills?.length ?? 0) > 0 || !!row.other_skills_specified)
    )
  ) {
    incomplete.push('experience')
  }
  if (!((row.preferred_occupations?.length ?? 0) > 0)) incomplete.push('preferences')

  return incomplete
}

/**
 * True once the applicant's `applicants.applicants` record has every applicant-fillable NSRP section.
 * Applicants without a complete record are sent to the complete-profile page by the router guard.
 */
export function isApplicantRecordComplete(row: ApplicantCompletenessInput | null | undefined): boolean {
  return getIncompleteSteps(row).length === 0
}

/** Personal fields the form must ask for because the values are blank. */
export function getMissingPersonalFields(
  values: Pick<ApplicantCompletionValues, CompletionPersonalField>,
): CompletionPersonalField[] {
  return (['date_of_birth', 'sex', 'civil_status'] as const).filter((field) => !values[field])
}

// ─── Validation (one schema per step) ───

const text = (max: number) => z.string().trim().max(max, `Maximum of ${max} characters.`)
const requiredText = (message: string, max = 200) =>
  z.string().trim().min(1, message).max(max, `Maximum of ${max} characters.`)
const optionalYear = z
  .string()
  .trim()
  .refine((value) => value === '' || /^(19|20)\d{2}$/.test(value), 'Enter a 4-digit year, e.g. 2020.')
const optionalAmount = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), `Enter a valid ${label}.`)

const optionalWholeNumber = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z
    .number({ invalid_type_error: 'Enter a number.' })
    .int('Enter a whole number.')
    .min(0, 'Enter 0 or more.')
    .max(600, 'Enter a realistic number of months.')
    .optional(),
)

type IssueAdder = (path: (string | number)[], ok: boolean, message: string) => void
const issueAdder =
  (ctx: z.RefinementCtx): IssueAdder =>
  (path, ok, message) => {
    if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message })
  }

function createPersonalSchema(requiredPersonal: readonly CompletionPersonalField[]) {
  const needs = (field: CompletionPersonalField) => requiredPersonal.includes(field)

  return z
    .object({
      date_of_birth: z.string(),
      sex: z.string(),
      civil_status: z.string(),
      religion: requiredText('Enter your religion (or "None").', 100),
      // A refine (not z.number) so a blank height doesn't abort the superRefine checks below
      height_ft: z.union([z.string(), z.number()]).refine((value) => {
        const height = Number(value)
        return value !== '' && Number.isFinite(height) && height >= 3 && height <= 8
      }, 'Enter your height in feet (3–8).'),
      tin: z
        .string()
        .trim()
        .refine((value) => value === '' || /^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/.test(value), 'Use the format 123-456-789-000.'),
      employment_status: z.string().min(1, 'Select your employment status.'),
      employment_type: z.string(),
      self_employed_type: text(150),
      unemployed_reason: z.string(),
      months_looking_for_work: optionalWholeNumber,
      is_4ps_beneficiary: z.boolean(),
      household_id_4ps: text(50),
      has_disability: z.boolean(),
      disabilities: z.array(z.string()),
      disability_others: text(150),
      is_ofw: z.boolean(),
      ofw_country: text(100),
      is_former_ofw: z.boolean(),
      former_ofw_country: text(100),
      former_ofw_return_date: z.string(),
    })
    .superRefine((values, ctx) => {
      const require = issueAdder(ctx)

      if (needs('date_of_birth')) {
        const age = calculateAge(values.date_of_birth)
        require(['date_of_birth'], age !== null, 'Enter a valid date of birth.')
        require(['date_of_birth'], age === null || age >= MIN_SIGNUP_AGE, `You must be at least ${MIN_SIGNUP_AGE} years old.`)
      }
      if (needs('sex')) require(['sex'], !!values.sex, 'Select your sex.')
      if (needs('civil_status')) require(['civil_status'], !!values.civil_status, 'Select your civil status.')

      if (values.employment_status === 'Employed') {
        require(['employment_type'], !!values.employment_type, 'Select your employment type.')
        if (values.employment_type === 'Self-employed') {
          require(['self_employed_type'], !!values.self_employed_type.trim(), 'Describe your self-employment.')
        }
      }
      if (values.employment_status === 'Unemployed') {
        require(['unemployed_reason'], !!values.unemployed_reason, 'Select why you are unemployed.')
      }
      if (values.is_4ps_beneficiary) {
        require(['household_id_4ps'], !!values.household_id_4ps.trim(), 'Enter your 4Ps household ID.')
      }
      if (values.has_disability) {
        require(
          ['disabilities'],
          values.disabilities.length > 0 || !!values.disability_others.trim(),
          'Select at least one disability or describe it under "Others".',
        )
      }
      if (values.is_ofw) require(['ofw_country'], !!values.ofw_country.trim(), 'Enter the country where you work.')
      if (values.is_former_ofw) {
        require(['former_ofw_country'], !!values.former_ofw_country.trim(), 'Enter the country where you worked.')
        require(['former_ofw_return_date'], !!values.former_ofw_return_date, 'Enter the date you returned.')
      }
    })
}

const educationEntrySchema = z.object({
  level: z.string().min(1, 'Select a level.'),
  school: requiredText('Enter the school name.'),
  course: text(200),
  year_graduated: optionalYear,
  awards: text(200),
  undergraduate_level_reached: text(100),
})

const trainingEntrySchema = z.object({
  course_training_title: requiredText('Enter the training title.'),
  duration: text(100),
  training_institution: requiredText('Enter the institution.'),
  skills_acquired: text(300),
  certificates_received: text(200),
})

const eligibilityEntrySchema = z.object({
  eligibility_title: requiredText('Enter the eligibility or license.'),
  rating: text(20),
  date_of_examination: z.string(),
  place_of_examination: text(150),
})

const educationSchema = z.object({
  currently_in_school: z.boolean(),
  educational_background: z.array(educationEntrySchema).min(1, 'Add at least one school you attended.'),
  // Optional lists — added entries must still be filled in
  vocational_trainings: z.array(trainingEntrySchema),
  eligibilities: z.array(eligibilityEntrySchema),
})

const workEntrySchema = z.object({
  company_name: requiredText('Enter the company name.'),
  address: text(200),
  position: requiredText('Enter your position.', 150),
  inclusive_dates: requiredText('Enter the dates, e.g. Jan 2022 – Dec 2023.', 100),
  number_of_months: optionalAmount('number of months'),
  monthly_salary: optionalAmount('salary'),
  status_of_appointment: z.string(),
})

const languageEntrySchema = z.object({
  language: requiredText('Enter the language.', 60),
  read: z.boolean(),
  write: z.boolean(),
  speak: z.boolean(),
  understand: z.boolean(),
})

const experienceSchema = z
  .object({
    no_work_experience: z.boolean(),
    work_experiences: z.array(workEntrySchema),
    language_proficiencies: z.array(languageEntrySchema),
    other_skills: z.array(z.string()),
    other_skills_specified: text(300),
  })
  .superRefine((values, ctx) => {
    const require = issueAdder(ctx)
    require(
      ['work_experiences'],
      values.no_work_experience || values.work_experiences.length > 0,
      'Add a job or tick "I have no work experience yet".',
    )
    require(
      ['language_proficiencies'],
      values.language_proficiencies.some((entry) => LANGUAGE_ABILITIES.some((ability) => entry[ability])),
      'Tick at least one ability for a language you know.',
    )
    require(
      ['other_skills'],
      values.other_skills.length > 0 || !!values.other_skills_specified.trim(),
      'Select at least one skill or list your skills under "Other skills".',
    )
  })

const preferencesSchema = z.object({
  preferred_occupations: requiredText('Enter at least one occupation you are looking for.', 500),
  preferred_local_locations: text(500),
  preferred_overseas_locations: text(500),
  job_type_preference: z.array(z.string()).min(1, 'Select at least one job type.'),
})

export function getCompletionStepSchema(step: CompletionStepKey, requiredPersonal: readonly CompletionPersonalField[]) {
  switch (step) {
    case 'personal':
      return createPersonalSchema(requiredPersonal)
    case 'education':
      return educationSchema
    case 'experience':
      return experienceSchema
    case 'preferences':
      return preferencesSchema
  }
}

// ─── Row → form ───

export function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** PESO stores 'N/A' for blank fields; show those as empty inputs. */
function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  const result = String(value)
  return result === 'N/A' ? '' : result
}

type JsonRecord = Record<string, unknown>
function jsonList(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is JsonRecord => !!item && typeof item === 'object')
  return value && typeof value === 'object' ? [value as JsonRecord] : []
}

/** Fallback personal values for an applicant without a registry record yet (from `core.profiles`). */
export interface CompletionPersonalFallback {
  date_of_birth?: string | null
  sex?: string | null
  civil_status?: string | null
}

export function toCompletionValues(
  row: ApplicantRecordRow | null,
  fallback: CompletionPersonalFallback = {},
): ApplicantCompletionValues {
  const sex = row?.sex ?? fallback.sex ?? ''
  const languages = jsonList(row?.language_proficiencies).map((item) => ({
    language: str(item.language),
    read: !!item.read,
    write: !!item.write,
    speak: !!item.speak,
    understand: !!item.understand,
  }))

  return {
    date_of_birth: row?.date_of_birth ?? fallback.date_of_birth ?? '',
    sex: sex === 'Male' || sex === 'Female' ? sex : '',
    civil_status: row?.civil_status ?? fallback.civil_status ?? '',
    religion: row?.religion ?? '',
    height_ft: row?.height_ft ?? '',
    tin: row?.tin ?? '',
    employment_status:
      row?.employment_status === 'Employed' || row?.employment_status === 'Unemployed' ? row.employment_status : '',
    employment_type:
      row?.employment_type === 'Wage employed' || row?.employment_type === 'Self-employed' ? row.employment_type : '',
    self_employed_type: row?.self_employed_type ?? '',
    unemployed_reason: row?.unemployed_reason ?? '',
    months_looking_for_work: row?.months_looking_for_work ?? '',
    is_4ps_beneficiary: row?.is_4ps_beneficiary ?? false,
    household_id_4ps: row?.household_id_4ps ?? '',
    has_disability: row?.has_disability ?? false,
    disabilities: row?.disabilities ?? [],
    disability_others: row?.disability_others ?? '',
    is_ofw: row?.is_ofw ?? false,
    ofw_country: row?.ofw_country ?? '',
    is_former_ofw: row?.is_former_ofw ?? false,
    former_ofw_country: row?.former_ofw_country ?? '',
    former_ofw_return_date: row?.former_ofw_return_date ?? '',
    currently_in_school: row?.currently_in_school ?? false,
    educational_background: jsonList(row?.educational_background).map((item) => ({
      level: str(item.level ?? item.education_level),
      school: str(item.school ?? item.school_name),
      course: str(item.course),
      year_graduated: str(item.year_graduated),
      awards: str(item.awards),
      undergraduate_level_reached: str(item.undergraduate_level_reached),
    })),
    vocational_trainings: jsonList(row?.vocational_trainings).map((item) => ({
      course_training_title: str(item.course_training_title),
      duration: str(item.duration),
      training_institution: str(item.training_institution),
      skills_acquired: str(item.skills_acquired),
      certificates_received: str(item.certificates_received),
    })),
    eligibilities: jsonList(row?.eligibilities).map((item) => ({
      eligibility_title: str(item.eligibility_title),
      rating: str(item.rating),
      date_of_examination: str(item.date_of_examination),
      place_of_examination: str(item.place_of_examination),
    })),
    work_experiences: jsonList(row?.work_experiences).map((item) => ({
      company_name: str(item.company_name),
      address: str(item.address),
      position: str(item.position ?? item.job_title),
      inclusive_dates: str(item.inclusive_dates),
      number_of_months: str(item.number_of_months),
      monthly_salary: str(item.monthly_salary),
      status_of_appointment: str(item.status_of_appointment),
    })),
    no_work_experience: Array.isArray(row?.work_experiences) && row.work_experiences.length === 0,
    language_proficiencies: languages.length > 0 ? languages : DEFAULT_LANGUAGES.map((name) => createLanguageEntry(name)),
    other_skills: row?.other_skills ?? [],
    other_skills_specified: row?.other_skills_specified ?? '',
    preferred_occupations: (row?.preferred_occupations ?? []).join(', '),
    preferred_local_locations: (row?.preferred_local_locations ?? []).join(', '),
    preferred_overseas_locations: (row?.preferred_overseas_locations ?? []).join(', '),
    job_type_preference: row?.job_type_preference ?? [],
  }
}

/** First step with unanswered data, so a returning applicant resumes where they left off. */
export function getResumeStepIndex(row: ApplicantCompletenessInput | null): number {
  const first = getIncompleteSteps(row)[0]
  const index = COMPLETION_STEPS.findIndex((step) => step.key === first)
  return index >= 0 ? index : 0
}

// ─── Form → patch ───

const textOrNull = (value: string | null | undefined) => value?.trim() || null

function toNumberOrNull(value: number | string): number | null {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const listOrNull = (items: string[]) => (items.length > 0 ? items : null)

/**
 * A step the applicant has not validated yet must stay "unanswered" (null), so an answered-none
 * list (`[]`) is only written once its step was validated.
 */
function answeredList(entries: object[], none: boolean, reached: boolean): Json | null {
  if (entries.length > 0) return entries as unknown as Json
  return none && reached ? [] : null
}

/** Builds the full `applicants.applicants` update; `reachedStep` is the furthest validated step index. */
export function buildCompletionPatch(values: ApplicantCompletionValues, reachedStep: number): ApplicantRecordUpdate {
  const isEmployed = values.employment_status === 'Employed'
  const isUnemployed = values.employment_status === 'Unemployed'
  const isSelfEmployed = isEmployed && values.employment_type === 'Self-employed'
  const reached = (key: CompletionStepKey) => COMPLETION_STEPS.findIndex((step) => step.key === key) <= reachedStep

  const education = values.educational_background
    .filter((entry) => entry.level || entry.school.trim())
    .map((entry) => ({
      level: entry.level,
      school: entry.school.trim(),
      course: entry.course.trim() || 'N/A',
      year_graduated: entry.year_graduated.trim(),
      awards: entry.awards.trim(),
      undergraduate_level_reached: entry.undergraduate_level_reached.trim(),
    }))

  const trainings = values.vocational_trainings
        .filter((entry) => entry.course_training_title.trim())
        .map((entry) => ({
          course_training_title: entry.course_training_title.trim(),
          duration: entry.duration.trim(),
          training_institution: entry.training_institution.trim(),
          skills_acquired: entry.skills_acquired.trim(),
          certificates_received: entry.certificates_received.trim(),
        }))

  const eligibilities = values.eligibilities
        .filter((entry) => entry.eligibility_title.trim())
        .map((entry) => ({
          eligibility_title: entry.eligibility_title.trim(),
          rating: entry.rating.trim(),
          date_of_examination: entry.date_of_examination,
          place_of_examination: entry.place_of_examination.trim(),
        }))

  const work = values.no_work_experience
    ? []
    : values.work_experiences
        .filter((entry) => entry.company_name.trim() || entry.position.trim())
        .map((entry) => ({
          company_name: entry.company_name.trim(),
          address: entry.address.trim(),
          position: entry.position.trim(),
          job_title: entry.position.trim(),
          inclusive_dates: entry.inclusive_dates.trim(),
          number_of_months: toNumberOrNull(entry.number_of_months),
          monthly_salary: toNumberOrNull(entry.monthly_salary),
          status_of_appointment: entry.status_of_appointment || 'Permanent',
        }))

  const languages = values.language_proficiencies
    .filter((entry) => entry.language.trim() && LANGUAGE_ABILITIES.some((ability) => entry[ability]))
    .map((entry) => ({ ...entry, language: entry.language.trim() }))

  return {
    // Personal
    date_of_birth: values.date_of_birth || undefined,
    age: calculateAge(values.date_of_birth),
    sex: values.sex || null,
    civil_status: textOrNull(values.civil_status),
    religion: textOrNull(values.religion),
    height_ft: toNumberOrNull(values.height_ft),
    tin: textOrNull(values.tin),
    // Employment — `applicants_employment_status_check` allows only 'Employed' | 'Unemployed'
    employment_status: values.employment_status || null,
    employment_type: isEmployed ? values.employment_type || null : null,
    self_employed_type: isSelfEmployed ? textOrNull(values.self_employed_type) : null,
    unemployed_reason: isUnemployed ? values.unemployed_reason || null : null,
    months_looking_for_work: isUnemployed ? toNumberOrNull(values.months_looking_for_work) : null,
    // Special categories
    is_4ps_beneficiary: values.is_4ps_beneficiary,
    household_id_4ps: values.is_4ps_beneficiary ? textOrNull(values.household_id_4ps) : null,
    has_disability: values.has_disability,
    disabilities: values.has_disability ? listOrNull(values.disabilities) : null,
    disability_others: values.has_disability ? textOrNull(values.disability_others) : null,
    is_ofw: values.is_ofw,
    ofw_country: values.is_ofw ? textOrNull(values.ofw_country) : null,
    is_former_ofw: values.is_former_ofw,
    former_ofw_country: values.is_former_ofw ? textOrNull(values.former_ofw_country) : null,
    former_ofw_return_date: values.is_former_ofw && values.former_ofw_return_date ? values.former_ofw_return_date : null,
    // Education & training
    currently_in_school: values.currently_in_school,
    educational_background: education.length > 0 ? (education as Json) : null,
    vocational_trainings: trainings.length > 0 ? (trainings as unknown as Json) : null,
    eligibilities: eligibilities.length > 0 ? (eligibilities as unknown as Json) : null,
    // Work & skills
    work_experiences: answeredList(work, values.no_work_experience, reached('experience')),
    // The prefilled default languages have no ability ticked, so they drop out until the applicant answers
    language_proficiencies: languages.length > 0 ? (languages as unknown as Json) : null,
    other_skills: listOrNull(values.other_skills),
    other_skills_specified: textOrNull(values.other_skills_specified),
    // Job preference
    preferred_occupations: listOrNull(splitCommaList(values.preferred_occupations)),
    preferred_local_locations: listOrNull(splitCommaList(values.preferred_local_locations)),
    preferred_overseas_locations: listOrNull(splitCommaList(values.preferred_overseas_locations)),
    job_type_preference: listOrNull(values.job_type_preference),
  }
}

/** Adds or removes an item from a checkbox-list value. */
export function toggleListValue(
  current: readonly string[] | undefined,
  item: string,
  checked: boolean | 'indeterminate',
): string[] {
  const list = current ?? []
  if (checked === true) return list.includes(item) ? [...list] : [...list, item]
  return list.filter((value) => value !== item)
}
