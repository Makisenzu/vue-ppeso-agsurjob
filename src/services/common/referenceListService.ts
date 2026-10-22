import { supabase } from '@/lib/supabaseClient'
import type { CourseRow, ReligionRow } from '@/types/common/referenceList'

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
    const { data, error } = await supabase
      .schema('core')
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load courses.')
    return data ?? []
  },
}
