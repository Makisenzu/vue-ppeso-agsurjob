import { supabase } from '@/lib/supabaseClient'
import type { DirectoryRow } from '@/types/common/directory'

/**
 * Stateless service for querying `public.directories`.
 * Provides access to the provincial government office directory
 * used for GIP intern assignment and other office lookups.
 */
export const directoryService = {
  /**
   * Fetches all active offices from the directories table.
   * Results are ordered alphabetically by office_name.
   */
  async fetchActiveOffices(): Promise<DirectoryRow[]> {
    const { data, error } = await supabase
      .schema('public')
      .from('directories')
      .select('*')
      .eq('status', 'Active')
      .order('office_name')

    if (error) throw new Error(error.message || 'Failed to fetch office directory')
    return data ?? []
  },
}
