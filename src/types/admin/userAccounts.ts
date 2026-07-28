import type { Database } from '@/types/common/database.types'

export type ProfileRow = Database['core']['Tables']['profiles']['Row']

export interface UserAccountState {
  profiles: ProfileRow[]
  isLoading: boolean
  errorMessage: string | null
  selectedProfile: ProfileRow | null
  isDetailsOpen: boolean
}
