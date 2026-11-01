import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { ResolvedSkillName, SkillSuggestion } from '@/types/common/skillCatalog'

/**
 * The RPCs of migration 099 are not in database.types.ts until `npm run types:gen` is re-run, so the
 * typed client rejects their names. Use `supabase` directly after regenerating.
 */
const untypedCore = () => (supabase as unknown as SupabaseClient).schema('core')

/** The shared skill list (migration 099), for the skill pickers */
export const skillCatalogService = {
  /** Active skills whose name or another wording contains the query, best first */
  async search(query: string, limit = 8): Promise<SkillSuggestion[]> {
    const { data, error } = await untypedCore().rpc('search_skills', { p_query: query, p_limit: limit })
    if (error) throw error
    return (data ?? []) as SkillSuggestion[]
  },

  /** Which typed names the list knows (up to 100), in the order given */
  async resolveNames(names: string[]): Promise<ResolvedSkillName[]> {
    if (names.length === 0) return []
    const { data, error } = await untypedCore().rpc('resolve_skill_names', { p_names: names.slice(0, 100) })
    if (error) throw error
    return (data ?? []) as ResolvedSkillName[]
  },
}
