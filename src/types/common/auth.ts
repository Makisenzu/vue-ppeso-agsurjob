import type { Database } from '@/types/database.types'

export type UserRole = Database['core']['Enums']['user_role']
export type GenderType = Database['core']['Enums']['gender_type']
export type StatusType = Database['core']['Enums']['status_type']

export type Role = 'admin' | 'employer' | 'applicant'

export interface RoleOption {
  id: Role
  label: string
  description: string
  icon: any
}

