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
  position?: string
  job_title?: string
  inclusive_dates?: string
  monthly_salary?: string | number
  status_of_appointment?: string
}

export interface VocationalTrainingItem {
  course_training_title?: string
  duration?: string
  training_institution?: string
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
