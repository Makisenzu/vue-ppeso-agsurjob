import * as z from 'zod'
import { differenceInYears, isValid, parseISO } from 'date-fns'
import type {
  ApplicantAddressJson,
  ApplicantInsert,
  ApplicantSex,
  GenderType,
  ProfileInsert,
  RoleOption,
  SignupFormValues,
  SignupRole,
  SignupStepKey,
  SignupStepMeta,
  UserRole,
} from '@/types/common/signup'
import { UserSearch, Building2 } from '@lucide/vue'

// ─── Constants ───

/** NSRP registration covers the working-age population (15 years old and above). */
export const MIN_SIGNUP_AGE = 15

/** SECURITY.md §6.1 — minimum password length. */
export const MIN_PASSWORD_LENGTH = 15

// ─── Step Metadata ───

const STEP_META: Record<SignupStepKey, SignupStepMeta> = {
  role: { key: 'role', title: 'Create an account', description: 'Choose the account type that describes you.' },
  representative: { key: 'representative', title: 'Your Details', description: 'You represent the company on AGSURJOBS. Your company details come after you sign in.' },
  personal: { key: 'personal', title: 'Personal Information', description: 'Enter your details exactly as they appear on a valid ID.' },
  address: { key: 'address', title: 'Address & Contact', description: 'Where you live and how PESO can reach you.' },
  account: { key: 'account', title: 'Account Credentials', description: 'Choose a username and password for signing in.' },
  review: { key: 'review', title: 'Review & Submit', description: 'Check your information before creating your account.' },
}

const ROLE_STEPS: Record<SignupRole, SignupStepKey[]> = {
  applicant: ['role', 'personal', 'address', 'account', 'review'],
  // The company's NSRP Form 2 is filled after signing in (employer complete-profile page)
  company_owner: ['role', 'representative', 'account', 'review'],
}

/** Ordered steps for a role (step 0 is always role selection). */
export function getSignupSteps(role: SignupRole | null): SignupStepMeta[] {
  return ROLE_STEPS[role ?? 'applicant'].map((key) => STEP_META[key])
}

// ─── Role Options ───

export const SIGNUP_ROLES: RoleOption[] = [
  {
    id: 'applicant',
    label: 'Applicant',
    description: 'Search for jobs and apply to PESO programs.',
    icon: UserSearch,
  },
  {
    id: 'company_owner',
    label: 'Company Owner',
    description: 'Post jobs and manage candidate applications.',
    icon: Building2,
  },
]

// ─── Select Options ───

export const SEX_OPTIONS: { value: ApplicantSex; label: string }[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]

/** Same values the PESO applicant entry form stores in `applicants.civil_status`. */
export const CIVIL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' },
  { value: 'Solo Parent', label: 'Solo Parent' },
] as const

export const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'] as const

// ─── Date / Age ───

/** Whole years between an ISO `YYYY-MM-DD` birth date and today; null when the date is invalid. */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  const dob = parseISO(dateOfBirth)
  if (!isValid(dob)) return null
  const age = differenceInYears(new Date(), dob)
  return age >= 0 && age < 125 ? age : null
}

/** Today as `YYYY-MM-DD`, for the date input's `max`. */
export function todayIsoDate(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** Maps the NSRP sex value to the `core.profiles.gender` enum. */
export function mapSexToGender(sex: ApplicantSex | ''): GenderType | null {
  if (sex === 'Male') return 'man'
  if (sex === 'Female') return 'woman'
  return null
}

// ─── Validation Schemas (one per step) ───

const requiredText = (message: string) => z.string().trim().min(1, message)
const optionalText = (max: number) => z.string().trim().max(max, `Maximum of ${max} characters.`)

const PH_MOBILE_PATTERN = /^(09|\+639)\d{9}$/
const TIN_PATTERN = /^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/
const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/

const personalSchema = z.object({
  surname: requiredText('Surname is required.').max(100),
  first_name: requiredText('First name is required.').max(100),
  middle_name: optionalText(100).optional(),
  suffix: optionalText(10).optional(),
  date_of_birth: z
    .string()
    .min(1, 'Date of birth is required.')
    .refine((value) => calculateAge(value) !== null, 'Enter a valid date of birth.')
    .refine(
      (value) => (calculateAge(value) ?? 0) >= MIN_SIGNUP_AGE,
      `You must be at least ${MIN_SIGNUP_AGE} years old to register.`,
    ),
  sex: z.enum(['Male', 'Female'], { errorMap: () => ({ message: 'Select your sex.' }) }),
  civil_status: requiredText('Select your civil status.'),
  religion: optionalText(100).optional(),
  height_ft: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z
      .number({ invalid_type_error: 'Enter your height in feet.' })
      .min(3, 'Enter a height between 3 and 8 ft.')
      .max(8, 'Enter a height between 3 and 8 ft.')
      .optional(),
  ),
  tin: z
    .string()
    .trim()
    .refine((value) => value === '' || TIN_PATTERN.test(value), 'Use the format 123-456-789-000.')
    .optional(),
})

const addressSchema = z.object({
  region: requiredText('Select your region.'),
  province: requiredText('Select your province.'),
  municipality: requiredText('Select your city or municipality.'),
  barangay: requiredText('Select your barangay.'),
  street: optionalText(150).optional(),
  village: optionalText(150).optional(),
  contact_number: z
    .string()
    .trim()
    .min(1, 'Contact number is required.')
    .regex(PH_MOBILE_PATTERN, 'Enter a valid mobile number, e.g. 09123456789.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
})

const accountSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters.')
      .max(30, 'Username must be 30 characters or fewer.')
      .regex(USERNAME_PATTERN, 'Use letters, numbers, dots, or underscores only.'),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirm_password: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

/** Company owner's own details: name, birth date and sex (core.profiles) plus how to reach them */
const representativeSchema = personalSchema
  .pick({ surname: true, first_name: true, middle_name: true, suffix: true, date_of_birth: true, sex: true })
  .merge(addressSchema.pick({ contact_number: true, email: true }))

const emptySchema = z.object({})

/** Validation schema for one step — vee-validate swaps it as the user moves between steps. */
export function getSignupStepSchema(step: SignupStepKey) {
  switch (step) {
    case 'personal':
      return personalSchema
    case 'address':
      return addressSchema
    case 'account':
      return accountSchema
    case 'representative':
      return representativeSchema
    default:
      return emptySchema
  }
}

// ─── Factory ───

export function createInitialSignupValues(): SignupFormValues {
  return {
    surname: '',
    first_name: '',
    middle_name: '',
    suffix: '',
    date_of_birth: '',
    sex: '',
    civil_status: '',
    religion: '',
    height_ft: '',
    tin: '',
    region: '',
    province: '',
    municipality: '',
    barangay: '',
    street: '',
    village: '',
    contact_number: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
  }
}

/**
 * vee-validate can report untouched / cleared optional fields as `undefined` (e.g. after the
 * step schema swaps), so fill every key back to a string before display or submit.
 */
export function normalizeSignupValues(values: Partial<Record<keyof SignupFormValues, unknown>>): SignupFormValues {
  const normalized = createInitialSignupValues()
  for (const key of Object.keys(normalized) as (keyof SignupFormValues)[]) {
    const value = values[key]
    if (value === undefined || value === null) continue
    if (key === 'height_ft') normalized.height_ft = typeof value === 'number' ? value : String(value)
    else if (key === 'sex') normalized.sex = value === 'Male' || value === 'Female' ? value : ''
    else normalized[key] = String(value)
  }
  return normalized
}

// ─── Display ───

export function formatSignupFullName(values: Pick<SignupFormValues, 'first_name' | 'middle_name' | 'surname' | 'suffix'>): string {
  return [values.first_name, values.middle_name, values.surname, values.suffix]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

export function formatSignupAddress(values: Pick<SignupFormValues, 'street' | 'village' | 'barangay' | 'municipality' | 'province'>): string {
  return [values.street, values.village, values.barangay && `Brgy. ${values.barangay}`, values.municipality, values.province]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ')
}

// ─── Payload Builders ───

const textOrNull = (value: string | null | undefined) => value?.trim() || null

function parseHeight(value: number | string): number | null {
  if (value === '' || value === null || value === undefined) return null
  const height = Number(value)
  return Number.isFinite(height) ? height : null
}

export function buildProfileInsert(values: SignupFormValues, userId: string, role: UserRole): ProfileInsert {
  return {
    id: userId,
    role,
    firstname: textOrNull(values.first_name),
    middlename: textOrNull(values.middle_name),
    lastname: textOrNull(values.surname),
    birthdate: values.date_of_birth || null,
    gender: mapSexToGender(values.sex),
    contact_number: textOrNull(values.contact_number),
    region: textOrNull(values.region),
    province: textOrNull(values.province),
    geographic: textOrNull(values.municipality),
    barangay: textOrNull(values.barangay),
    username: textOrNull(values.username),
  }
}

/** Personal-information subset of `applicants.applicants`; the rest is filled in on the complete-profile page. */
export function buildApplicantInsert(values: SignupFormValues, userId: string): ApplicantInsert {
  const address: ApplicantAddressJson = {
    street: textOrNull(values.street) ?? undefined,
    village: textOrNull(values.village) ?? undefined,
    barangay: values.barangay.trim(),
    municipality: values.municipality.trim(),
    province: values.province.trim(),
    region: values.region.trim(),
  }

  return {
    profile_id: userId,
    surname: values.surname.trim(),
    first_name: values.first_name.trim(),
    middle_name: textOrNull(values.middle_name),
    suffix: textOrNull(values.suffix),
    date_of_birth: values.date_of_birth,
    age: calculateAge(values.date_of_birth),
    sex: values.sex || null,
    civil_status: textOrNull(values.civil_status),
    religion: textOrNull(values.religion),
    height_ft: parseHeight(values.height_ft),
    tin: textOrNull(values.tin),
    address: { ...address },
    contact_numbers: values.contact_number.trim() ? [values.contact_number.trim()] : null,
    email: textOrNull(values.email),
  }
}
