import type { Database } from '@/types/database.types'
import type { Component } from 'vue'

// ─── DB-derived Row/Insert types ───

export type ProfileRow = Database['core']['Tables']['profiles']['Row']
export type ProfileInsert = Database['core']['Tables']['profiles']['Insert']

export type ApplicantRow = Database['applicants']['Tables']['applicants']['Row']
export type ApplicantInsert = Database['applicants']['Tables']['applicants']['Insert']

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

/** `applicants.applicants.sex` check constraint (`applicants_sex_check`). */
export type ApplicantSex = 'Male' | 'Female'

// ─── Signup Steps ───

export type SignupStepKey = 'role' | 'personal' | 'representative' | 'address' | 'account' | 'review'

export interface SignupStepMeta {
  key: SignupStepKey
  title: string
  description: string
}

// ─── Signup Form Values ───
// Personal + address/contact fields follow the NSRP "Personal Information" section of
// `applicants.applicants` (surname → email / contact number), in the same order.

export interface SignupFormValues {
  // Personal information
  surname: string
  first_name: string
  middle_name: string
  suffix: string
  date_of_birth: string
  sex: ApplicantSex | ''
  civil_status: string
  religion: string
  height_ft: number | string
  tin: string
  // Address & contact
  region: string
  province: string
  municipality: string
  barangay: string
  street: string
  village: string
  contact_number: string
  email: string
  // Account
  username: string
  password: string
  confirm_password: string
}

/** Shape stored in `applicants.applicants.address` (same keys as the PESO applicant entry form). */
export interface ApplicantAddressJson {
  street?: string
  village?: string
  barangay: string
  municipality: string
  province: string
  region: string
}
