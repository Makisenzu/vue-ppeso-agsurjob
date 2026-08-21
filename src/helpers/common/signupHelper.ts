import type {
  SignupProfileForm,
  SignupApplicantForm,
  SignupCompanyForm,
  SignupRole,
  RoleOption,
  ProfileInsert,
  ApplicantInsert,
  CompanyInsert,
  GenderType,
  UserRole,
} from '@/types/common/signup'
import type { Json } from '@/types/database.types'
import { UserSearch, Building2 } from '@lucide/vue'

// ─── Step Metadata ───

export const STEP_META = [
  { title: 'Select Role', description: 'Choose the role that best describes you to get started.' },
  { title: 'Personal Details', description: 'Tell us about yourself.' },
  { title: 'Address & Status', description: 'Where are you located?' },
  { title: 'Account Credentials', description: 'Set up your login information.' },
  { title: 'Additional Information', description: 'Provide details relevant to your role.' },
  { title: 'Review & Submit', description: 'Verify your information before creating your account.' },
] as const

export const TOTAL_STEPS = STEP_META.length // 0..5

export const PROGRESS_STEPS = STEP_META.slice(1).map((meta, i) => ({
  step: i + 1,
  title: meta.title,
}))

// ─── Role Options ───

export const SIGNUP_ROLES: RoleOption[] = [
  {
    id: 'applicant',
    label: 'Applicant',
    description: 'Search for jobs and apply to opportunities.',
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

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'Employed', label: 'Employed' },
  { value: 'Unemployed', label: 'Unemployed' },
] as const

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'Wage employed', label: 'Wage Employed' },
  { value: 'Self-employed', label: 'Self-Employed' },
] as const

export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'Elementary', label: 'Elementary' },
  { value: 'High School', label: 'High School' },
  { value: 'Senior High School', label: 'Senior High School' },
  { value: 'Vocational', label: 'Vocational' },
  { value: 'College', label: 'College' },
  { value: 'Post Graduate', label: 'Post Graduate' },
] as const

export const CIVIL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' },
] as const

export const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export const BUSINESS_TYPE_OPTIONS = [
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Cooperative', label: 'Cooperative' },
  { value: 'Government', label: 'Government' },
  { value: 'NGO', label: 'NGO' },
] as const

// ─── Mapping Helpers ───

/**
 * Maps the core profile gender enum value to the strict 'Male' | 'Female' check constraint
 * enforced by PostgreSQL `applicants_sex_check` on `applicants.applicants`.
 */
export function mapGenderToSex(gender?: string | null): 'Male' | 'Female' | null {
  if (!gender) return null
  const normalized = gender.toLowerCase()
  if (
    normalized === 'man' ||
    normalized === 'male' ||
    normalized === 'cisgender_man' ||
    normalized === 'transgender_man'
  ) {
    return 'Male'
  }
  if (
    normalized === 'woman' ||
    normalized === 'female' ||
    normalized === 'cisgender_woman' ||
    normalized === 'transgender_woman'
  ) {
    return 'Female'
  }
  return null
}

// ─── Factory Functions ───

export function createEmptyProfileForm(): SignupProfileForm {
  return {
    firstname: '',
    middlename: '',
    lastname: '',
    birthdate: '',
    gender: '',
    contact_number: '',
    region: '',
    province: '',
    geographic: '',
    barangay: '',
    is_4ps: false,
    is_pwd: false,
    username: '',
    email: '',
    password: '',
  }
}

export function createEmptyApplicantForm(): SignupApplicantForm {
  return {
    employment_status: '',
    employment_type: '',
    civil_status: '',
    educational_background: { level: '', course: '' },
    preferred_occupations: '',
    preferred_local_locations: '',
  }
}

export function createEmptyCompanyForm(): SignupCompanyForm {
  return {
    company_name: '',
    company_email: '',
    company_contact: '',
    business_type: '',
    industry: '',
    company_address: '',
    company_description: '',
    website: '',
    registration_number: '',
  }
}

// ─── Payload Builders ───

export function buildProfileInsert(
  form: SignupProfileForm,
  userId: string,
  role: UserRole,
): ProfileInsert {
  return {
    id: userId,
    role,
    firstname: form.firstname || null,
    middlename: form.middlename || null,
    lastname: form.lastname || null,
    birthdate: form.birthdate || null,
    gender: (form.gender || null) as GenderType | null,
    contact_number: form.contact_number || null,
    region: form.region || null,
    province: form.province || null,
    geographic: form.geographic || null,
    barangay: form.barangay || null,
    is_4ps: form.is_4ps,
    is_pwd: form.is_pwd,
    username: form.username || null,
  }
}

export function buildApplicantInsert(
  applicantForm: SignupApplicantForm,
  profileForm: SignupProfileForm,
  userId: string,
): ApplicantInsert {
  // Build educational_background as Json array with a single entry
  const educationalBackground: Json = applicantForm.educational_background.level
    ? [
        {
          level: applicantForm.educational_background.level,
          course: applicantForm.educational_background.course || null,
        },
      ]
    : []

  // Build address from profile form PSGC data
  const address: Json = {
    region: profileForm.region || null,
    province: profileForm.province || null,
    city_municipality: profileForm.geographic || null,
    barangay: profileForm.barangay || null,
  }

  return {
    profile_id: userId,
    first_name: profileForm.firstname,
    surname: profileForm.lastname,
    middle_name: profileForm.middlename || null,
    date_of_birth: profileForm.birthdate,
    sex: mapGenderToSex(profileForm.gender),
    email: profileForm.email || null,
    contact_numbers: profileForm.contact_number ? [profileForm.contact_number] : null,
    civil_status: applicantForm.civil_status || null,
    employment_status: applicantForm.employment_status || null,
    employment_type: applicantForm.employment_type || null,
    educational_background: educationalBackground,
    preferred_occupations: parseCommaSeparated(applicantForm.preferred_occupations),
    preferred_local_locations: parseCommaSeparated(applicantForm.preferred_local_locations),
    is_4ps_beneficiary: profileForm.is_4ps,
    has_disability: profileForm.is_pwd,
    address,
  }
}

export function buildCompanyInsert(
  form: SignupCompanyForm,
  userId: string,
): CompanyInsert {
  return {
    profile_id: userId,
    company_name: form.company_name || null,
    company_email: form.company_email || null,
    company_contact: form.company_contact || null,
    business_type: form.business_type || null,
    industry: form.industry || null,
    company_address: form.company_address || null,
    company_description: form.company_description || null,
    website: form.website || null,
    registration_number: form.registration_number || null,
  }
}

// ─── Validation ───

export function validateStep(
  step: number,
  profileForm: SignupProfileForm,
  applicantForm: SignupApplicantForm,
  companyForm: SignupCompanyForm,
  confirmPassword: string,
  selectedRole: SignupRole | null,
): boolean {
  switch (step) {
    case 0:
      return selectedRole !== null
    case 1:
      return !!(
        profileForm.firstname.trim() &&
        profileForm.lastname.trim() &&
        profileForm.birthdate &&
        profileForm.gender &&
        profileForm.contact_number.trim()
      )
    case 2:
      return !!(
        profileForm.region.trim() &&
        profileForm.province.trim() &&
        profileForm.geographic.trim() &&
        profileForm.barangay.trim()
      )
    case 3:
      return !!(
        profileForm.email.trim() &&
        profileForm.password.length >= 6 &&
        confirmPassword === profileForm.password
      )
    case 4:
      if (selectedRole === 'applicant') {
        return !!(applicantForm.employment_status && applicantForm.civil_status)
      }
      if (selectedRole === 'company_owner') {
        return !!(
          companyForm.company_name.trim() &&
          companyForm.company_email.trim() &&
          companyForm.business_type
        )
      }
      return false
    case 5:
      return true
    default:
      return false
  }
}

// ─── Utility ───

/** Splits a comma-separated string into a trimmed string array, filtering empty entries. */
function parseCommaSeparated(value: string): string[] | null {
  if (!value.trim()) return null
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}
