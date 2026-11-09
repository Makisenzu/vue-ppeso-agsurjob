import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { fetchAllPages } from '@/helpers/common/supabasePaging'
import type {
  SkillFormValues,
  SkillLinkCoverage,
  SkillRow,
  UnmappedSkillPage,
  UnmappedSkillRow,
} from '@/types/common/skillCatalog'

/**
 * core.skills / core.skill_aliases / core.skill_ignored_keys (migration 099) and the review queue RPCs
 * (migration 100) are not in database.types.ts until `npm run types:gen` is re-run. Use `supabase`
 * directly after regenerating. RLS lets only admin and provincial PESO write.
 */
const untypedCore = () => (supabase as unknown as SupabaseClient).schema('core')

const toCategory = (value: string) => value.trim() || null

/** PESO's Skill List page: the list, other wordings, and the queue of wordings not on it yet */
export const skillListService = {
  /** Every skill with its other wordings (a reference list: hundreds of rows at most) */
  async fetchSkills(): Promise<SkillRow[]> {
    const { data, error } = await fetchAllPages(() =>
      untypedCore()
        .from('skills')
        .select('id, name, category, source, is_active, sort_order, skill_aliases(id, alias)')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .order('id'),
    )
    if (error) throw error
    return ((data ?? []) as SkillRow[]).map((row) => ({
      ...row,
      skill_aliases: [...(row.skill_aliases ?? [])].sort((a, b) => a.alias.localeCompare(b.alias)),
    }))
  },

  async createSkill(values: SkillFormValues): Promise<void> {
    const { error } = await untypedCore()
      .from('skills')
      .insert({ name: values.name.trim(), category: toCategory(values.category), source: 'peso' })
    if (error) throw error
  },

  /** Renaming keeps the old name as another wording (migration 100), so links stay */
  async updateSkill(id: number, values: SkillFormValues): Promise<void> {
    const { error } = await untypedCore()
      .from('skills')
      .update({ name: values.name.trim(), category: toCategory(values.category) })
      .eq('id', id)
    if (error) throw error
  },

  /** Inactive skills leave the pickers; existing links keep matching */
  async setSkillActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await untypedCore().from('skills').update({ is_active: isActive }).eq('id', id)
    if (error) throw error
  },

  /** Moves the links and wordings of one skill to another, then removes it */
  async mergeSkills(fromId: number, intoId: number): Promise<void> {
    const { error } = await untypedCore().rpc('merge_skills', { p_from: fromId, p_into: intoId })
    if (error) throw error
  },

  /** Adds another wording; postings and applicants using it link at once */
  async addAlias(skillId: number, alias: string): Promise<void> {
    const { error } = await untypedCore().from('skill_aliases').insert({ skill_id: skillId, alias: alias.trim() })
    if (error) throw error
  },

  async removeAlias(aliasId: number): Promise<void> {
    const { error } = await untypedCore().from('skill_aliases').delete().eq('id', aliasId)
    if (error) throw error
  },

  // ─── Review queue ───

  async fetchUnmapped(search: string, page: number, pageSize: number): Promise<UnmappedSkillPage> {
    const { data, error } = await untypedCore().rpc('unmapped_skill_keys', {
      p_search: search.trim() || null,
      p_limit: pageSize,
      p_offset: page * pageSize,
    })
    if (error) throw error
    const rows = ((data ?? []) as UnmappedSkillRow[]).map((row) => ({
      ...row,
      vacancy_count: Number(row.vacancy_count),
      applicant_count: Number(row.applicant_count),
      total_count: Number(row.total_count),
    }))
    return { rows, total: rows[0]?.total_count ?? 0 }
  },

  /** A new skill from a queued wording (the wording is kept as another wording when it reads differently) */
  async addSkillFromWording(values: SkillFormValues, wording: string): Promise<void> {
    const { error } = await untypedCore().rpc('add_skill_from_wording', {
      p_name: values.name.trim(),
      p_category: toCategory(values.category),
      p_wording: wording,
    })
    if (error) throw error
  },

  /** Takes a wording off the queue ("n/a", "asap") */
  async ignoreWording(wordingKey: string): Promise<void> {
    const { error } = await untypedCore()
      .from('skill_ignored_keys')
      .upsert({ key: wordingKey }, { onConflict: 'key', ignoreDuplicates: true })
    if (error) throw error
  },

  async fetchCoverage(): Promise<SkillLinkCoverage> {
    const { data, error } = await untypedCore().rpc('skill_link_coverage')
    if (error) throw error
    const row = ((data ?? []) as SkillLinkCoverage[])[0]
    return {
      vacancy_total: Number(row?.vacancy_total ?? 0),
      vacancy_linked: Number(row?.vacancy_linked ?? 0),
      applicant_total: Number(row?.applicant_total ?? 0),
      applicant_linked: Number(row?.applicant_linked ?? 0),
    }
  },
}
