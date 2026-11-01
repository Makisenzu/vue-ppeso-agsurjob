import type { Database } from '@/types/database.types'

type CoreTables = Database['core']['Tables']

/** Dropdown lists from migration 044 (seeded by supabase/seeds/001_core_religions_courses.sql). */
export type ReligionRow = CoreTables['religions']['Row']
export type CourseRow = CoreTables['courses']['Row']

export type CourseLevel = 'tertiary' | 'graduate' | 'shs_strand' | 'techvoc'

export type EligibilityKind = 'eligibility' | 'license'

/**
 * core.eligibilities (migration 094, seeded by supabase/seeds/003_core_eligibilities.sql). Typed by hand
 * until `npm run types:gen` is re-run.
 */
export interface EligibilityRow {
  id: number
  kind: EligibilityKind
  name: string
  abbreviation: string | null
  issuer: string | null
  requires_specify: boolean
  sort_order: number
  is_active: boolean
}

/** One choice in a ReferencePicker; `requiresSpecify` options ("Others") let the user type the value. */
export type ReferenceOption = {
  name: string
  abbreviation: string | null
  group: string | null
  requiresSpecify: boolean
}

/** Which course list an NSRP education level picks from; levels without courses are left out. */
export const COURSE_LEVEL_BY_EDUCATION_LEVEL: Record<string, CourseLevel> = {
  'Senior High School': 'shs_strand',
  'Technical-Vocational': 'techvoc',
  'College / Tertiary': 'tertiary',
  'Post-Graduate / Masteral': 'graduate',
}
