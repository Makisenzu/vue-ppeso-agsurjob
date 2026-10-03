import type { Database } from '@/types/database.types'

export type ApplicantRow = Database['applicants']['Tables']['applicants']['Row']
export type ApplicantInsert = Database['applicants']['Tables']['applicants']['Insert']
export type ApplicantUpdate = Database['applicants']['Tables']['applicants']['Update']

export interface ParsedAddress {
  houseNumber?: string
  street?: string
  village?: string
  barangay: string
  municipality: string
  province: string
  region?: string
}

export interface EducationalBackgroundItem {
  level?: string
  school?: string
  course?: string
  year_graduated?: string | number
  awards?: string
  undergraduate_level_reached?: string
}

export interface WorkExperienceItem {
  company_name?: string
  address?: string
  position?: string
  job_title?: string
  inclusive_dates?: string
  number_of_months?: string | number
  monthly_salary?: string | number
  status_of_appointment?: string
}

export interface VocationalTrainingItem {
  course_training_title?: string
  duration?: string
  training_institution?: string
  skills_acquired?: string
  certificates_received?: string
}

export interface EligibilityItem {
  eligibility_title?: string
  rating?: string | number
  date_of_examination?: string
  place_of_examination?: string
}

export interface LanguageProficiencyItem {
  language?: string
  read?: boolean
  write?: boolean
  speak?: boolean
  understand?: boolean
}

export interface ApplicantEntryRecord {
  id: string
  profileId: string | null
  firstName: string
  middleName: string | null
  surname: string
  suffix: string | null
  fullName: string
  email: string | null
  contactNumber: string
  allContactNumbers: string[]
  dateOfBirth: string
  age: number | null
  sex: string
  civilStatus: string
  religion: string | null
  heightFt: number | null
  tin: string | null
  address: ParsedAddress
  fullAddressString: string
  employmentStatus: string
  employmentType: string | null
  unemployedReason: string | null
  selfEmployedType: string | null
  monthsLookingForWork: number | null
  is4psBeneficiary: boolean
  householdId4ps: string | null
  hasDisability: boolean
  disabilities: string[]
  disabilityOthers: string | null
  isOfw: boolean
  ofwCountry: string | null
  isFormerOfw: boolean
  formerOfwCountry: string | null
  formerOfwReturnDate: string | null
  currentlyInSchool: boolean
  highestEducationalAttainment: string
  educationalBackground: EducationalBackgroundItem[]
  workExperiences: WorkExperienceItem[]
  vocationalTrainings: VocationalTrainingItem[]
  eligibilities: EligibilityItem[]
  languageProficiencies: LanguageProficiencyItem[]
  preferredOccupations: string[]
  preferredLocalLocations: string[]
  preferredOverseasLocations: string[]
  jobTypePreference: string[]
  otherSkills: string[]
  otherSkillsSpecified: string | null
  referredPrograms: string[]
  assessedByName: string | null
  assessmentDate: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ApplicantStatsSummary {
  total: number
  gip: number
  tupad: number
  spes: number
}

export interface ProgramReferralSummary {
  program: string
  targetTable: string
  success: boolean
  recordId?: string
  error?: string
}

export interface ApplicantMatchProfile {
  id: string
  surname: string
  first_name: string
  middle_name?: string | null
  suffix?: string | null
  sex?: string | null
  date_of_birth?: string | null
  age?: number | null
  civil_status?: string | null
  address?: any
  contact_numbers?: any
  email?: string | null
  referred_programs?: string[] | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

export interface ExistingApplicantMatch {
  existingApplicant: ApplicantMatchProfile
  matchedBy: 'name_and_dob' | 'name_only'
  confidence: 'exact' | 'high' | 'possible'
  existingPrograms: string[]
}

export type DuplicateResolutionAction = 'link_program' | 'create_new' | 'skip'

export interface DuplicateResolutionChoice {
  applicantIndex?: number
  action: DuplicateResolutionAction
  targetProgram: string
  updateProfileInfo?: boolean
  existingApplicantId: string
}
