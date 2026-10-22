import type { Database } from '@/types/database.types'

type CoreTables = Database['core']['Tables']

/** Dropdown lists from migration 044 (seeded by supabase/seeds/001_core_religions_courses.sql). */
export type ReligionRow = CoreTables['religions']['Row']
export type CourseRow = CoreTables['courses']['Row']

export type CourseLevel = 'tertiary' | 'graduate' | 'shs_strand' | 'techvoc'

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
