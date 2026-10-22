import {
  COURSE_LEVEL_BY_EDUCATION_LEVEL,
  type CourseLevel,
  type CourseRow,
  type ReferenceOption,
  type ReligionRow,
} from '@/types/common/referenceList'

/** Fallback when a list failed to load, so the user can still type a value. */
const OTHERS_OPTION: ReferenceOption = { name: 'Others', abbreviation: null, group: null, requiresSpecify: true }

const withOthersFallback = (options: ReferenceOption[]) =>
  options.some((option) => option.requiresSpecify) ? options : [...options, OTHERS_OPTION]

export function toReligionOptions(rows: ReligionRow[]): ReferenceOption[] {
  return withOthersFallback(
    rows.map((row) => ({ name: row.name, abbreviation: null, group: null, requiresSpecify: row.requires_specify }))
  )
}

export function toCourseOptions(rows: CourseRow[], level: CourseLevel): ReferenceOption[] {
  return withOthersFallback(
    rows
      .filter((row) => row.level === level)
      .map((row) => ({
        name: row.name,
        abbreviation: row.abbreviation,
        group: row.field,
        requiresSpecify: row.requires_specify,
      }))
  )
}

/** The course list for an NSRP education level, or null when that level has no courses (e.g. Elementary). */
export function getCourseLevel(educationLevel?: string | null): CourseLevel | null {
  return (educationLevel && COURSE_LEVEL_BY_EDUCATION_LEVEL[educationLevel]) || null
}

/** The listed option a stored value matches (case-insensitive), if any. */
export function findReferenceOption(options: ReferenceOption[], value?: string | null): ReferenceOption | undefined {
  const key = value?.trim().toLowerCase()
  if (!key) return undefined
  return options.find((option) => !option.requiresSpecify && option.name.toLowerCase() === key)
}

/** Search by name, abbreviation or group (e.g. "bsit", "nursing", "NC II"). */
export function filterReferenceOptions(options: ReferenceOption[], searchTerm: string): ReferenceOption[] {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return options
  return options.filter(
    (option) =>
      option.requiresSpecify ||
      option.name.toLowerCase().includes(term) ||
      option.abbreviation?.toLowerCase().includes(term) ||
      option.group?.toLowerCase().includes(term)
  )
}
