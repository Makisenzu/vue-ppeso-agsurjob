import type { Database } from '@/types/common/database.types'

export type ProfileRow = Database['core']['Tables']['profiles']['Row']

export interface CreateAccountPayload {
  email: string
  password: string
  firstname: string
  lastname: string
  middlename?: string
  username: string
  role: string
  contact_number?: string
  gender?: string
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
}
