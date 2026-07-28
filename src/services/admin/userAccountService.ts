import { supabase } from '@/lib/supabaseClient'
import type { ProfileRow } from '@/types/admin/userAccounts'

export const userAccountService = {
  async fetchAllProfiles(): Promise<ProfileRow[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Failed to fetch profiles')
    }

    return data || []
  },
}
