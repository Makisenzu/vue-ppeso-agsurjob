import type { Database } from '@/types/database.types'
import type { Component } from 'vue'

// ─── DB-derived Row/Insert types ───

export type ProfileRow = Database['core']['Tables']['profiles']['Row']
export type ProfileInsert = Database['core']['Tables']['profiles']['Insert']

export type ApplicantRow = Database['applicants']['Tables']['applicants']['Row']
export type ApplicantInsert = Database['applicants']['Tables']['applicants']['Insert']

export type CompanyRow = Database['employers']['Tables']['companies']['Row']
export type CompanyInsert = Database['employers']['Tables']['companies']['Insert']

export type UserRole = Database['core']['Enums']['user_role']
export type GenderType = Database['core']['Enums']['gender_type']
export type StatusType = Database['core']['Enums']['status_type']

// ─── Signup Role Option ───

export type SignupRole = Extract<UserRole, 'applicant' | 'company_owner'>

export interface RoleOption {
  id: SignupRole
  label: string
  description: string
  icon: Component
}

// ─── Signup Form State Interfaces ───
// These mirror the DB columns relevant at signup time.
// Fields use the exact DB column names from database.types.ts.

/** Maps to `core.profiles` Insert (subset collected at signup). */
export interface SignupProfileForm {
  firstname: string
  middlename: string
  lastname: string
  birthdate: string
  gender: GenderType | ''
  contact_number: string
  region: string
  province: string
  geographic: string
  barangay: string
  is_4ps: boolean
  is_pwd: boolean
  username: string
  email: string
  password: string
}

/** Structured education entry stored as Json in `applicants.educational_background`. */
export interface EducationEntry {
  level: string
  course: string
}

/** Maps to `applicants.applicants` Insert (subset collected at signup). */
export interface SignupApplicantForm {
  employment_status: string
  employment_type: string
  civil_status: string
  educational_background: EducationEntry
  preferred_occupations: string
  preferred_local_locations: string
}

/** Maps to `employers.companies` Insert (subset collected at signup). */
export interface SignupCompanyForm {
  company_name: string
  company_email: string
  company_contact: string
  business_type: string
  industry: string
  company_address: string
  company_description: string
  website: string
  registration_number: string
}
