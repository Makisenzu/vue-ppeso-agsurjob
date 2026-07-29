import type { Database } from '@/types/common/database.types'

export type ProfileRow = Database['core']['Tables']['profiles']['Row'] & {
  email?: string | null
}

export interface CreateAccountPayload {
  email: string
  password: string
  firstname: string
  lastname: string
  middlename?: string
  username: string
  role: Database['core']['Enums']['user_role']
  contact_number?: string
  gender?: Database['core']['Enums']['gender_type']
  birthdate?: string
  region?: string
  province?: string
  geographic?: string
  barangay?: string
  is_pwd?: boolean
  is_4ps?: boolean
}

export interface UserAccountState {
  profiles: ProfileRow[]
  isLoading: boolean
  isSubmitting: boolean
  errorMessage: string | null
  selectedProfile: ProfileRow | null
  isDetailsOpen: boolean
  isAddAccountOpen: boolean
  isEditStatusOpen: boolean
}
