/**
 * The shared skill list (core.skills / core.skill_aliases, migration 099) and the PESO review queue
 * (migration 100). Matching compares skill ids, so "MS Excel" and "Microsoft Excel" are the same skill.
 */

export type SkillSource = 'nsrp' | 'tesda' | 'peso' | 'esco'

/** One picker suggestion (core.search_skills) */
export interface SkillSuggestion {
  id: number
  name: string
  category: string | null
  /** The other wording that matched the search, e.g. "MS Excel" for Microsoft Excel */
  matched_alias: string | null
}

/** A typed name and the skill the list maps it to (core.resolve_skill_names) */
export interface ResolvedSkillName {
  name: string
  skill_id: number | null
  skill_name: string | null
}

export interface SkillAlias {
  id: number
  alias: string
}

/** One skill as the Skill List page shows it */
export interface SkillRow {
  id: number
  name: string
  category: string | null
  source: SkillSource
  is_active: boolean
  sort_order: number
  skill_aliases: SkillAlias[]
}

export interface SkillFormValues {
  name: string
  category: string
}

/** One wording waiting for review (core.unmapped_skill_keys) */
export interface UnmappedSkillRow {
  wording_key: string
  example_text: string
  vacancy_count: number
  applicant_count: number
  total_count: number
}

export interface UnmappedSkillPage {
  rows: UnmappedSkillRow[]
  total: number
}

/** Wordings on the list, ignored ones left out (core.skill_link_coverage) */
export interface SkillLinkCoverage {
  vacancy_total: number
  vacancy_linked: number
  applicant_total: number
  applicant_linked: number
}
