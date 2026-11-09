import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { fetchAllPages } from '@/helpers/common/supabasePaging'
import type { CourseRow, EligibilityRow, ReligionRow } from '@/types/common/referenceList'

export const referenceListService = {
  /** Active religions in display order ("None" and "Others" last). */
  async fetchReligions(): Promise<ReligionRow[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('religions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load religions.')
    return data ?? []
  },

  /** Active courses of every level, alphabetical within a level ("Others" last). */
  async fetchCourses(): Promise<CourseRow[]> {
    // Read every page: the course list can grow past PostgREST's 1,000-row limit
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('core')
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .order('id'),
    )

    if (error) throw new Error(error.message || 'Failed to load courses.')
    return data ?? []
  },

  /**
   * Active eligibilities and licenses (migration 094), "Others" last. Not in database.types.ts until
   * `npm run types:gen` is re-run, so read through the untyped client.
   */
  async fetchEligibilities(): Promise<EligibilityRow[]> {
    const { data, error } = await (supabase as unknown as SupabaseClient)
      .schema('core')
      .from('eligibilities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load eligibilities.')
    return (data ?? []) as EligibilityRow[]
  },
}
