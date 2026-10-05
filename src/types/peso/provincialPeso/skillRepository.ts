import type { Database } from '@/types/database.types'

export type LpiiCategory = Database['public']['Enums']['lpii_type']

export interface ExtractedSkill {
  name: string
  category: string
  source: 'applicant_skills' | 'other_skills' | 'vocational'
}

export interface ApplicantSkillProfile {
  id: string
  profileId: string | null
  fullName: string
  firstName: string
  surname: string
  middleName?: string | null
  municipality: string
  barangay: string
  province: string
  lpiiTag: LpiiCategory | null
  skills: ExtractedSkill[]
  skillNames: string[]
  contactNumber?: string | null
  email?: string | null
  employmentStatus?: string | null
  highestEducation?: string | null
}

export interface SkillCountEntry {
  name: string
  count: number
  category: string
}

export interface MunicipalitySkillSummaryRow {
  name: string
  province: string
  isAgusanDelSur: boolean
  barangays: number
  totalApplicants: number
  lowlandApplicants: number
  uplandApplicants: number
  wetlandApplicants: number
  topSkills: SkillCountEntry[]
  allSkills: SkillCountEntry[]
  uniqueSkillsCount: number
}

export interface BarangaySkillRow {
  name: string
  lpiiTag: LpiiCategory | null
  applicantsCount: number
  topSkills: SkillCountEntry[]
  allSkills: string[]
}

export interface MunicipalitySkillDetail {
  municipality: string
  province: string
  isAgusanDelSur: boolean
  totalApplicants: number
  lowlandApplicants: number
  uplandApplicants: number
  wetlandApplicants: number
  uniqueSkillsCount: number
  skillsBreakdown: SkillCountEntry[]
  categories: string[]
  barangayRows: BarangaySkillRow[]
  applicants: ApplicantSkillProfile[]
}

export interface SkillRepositoryStats {
  totalApplicants: number
  totalUniqueSkills: number
  lowlandApplicants: number
  uplandApplicants: number
  wetlandApplicants: number
  municipalitiesCovered: number
  agusanApplicants: number
  outsideApplicants: number
  outsideMunicipalitiesCount: number
}
