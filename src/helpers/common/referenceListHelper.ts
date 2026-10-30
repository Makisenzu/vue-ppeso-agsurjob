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

/** Stored on job_vacancies.course_shs_strand when a vacancy needs no particular course */
export const NO_COURSE_REQUIRED = 'None'

const COURSE_LEVEL_LABEL: Record<CourseLevel, string> = {
  tertiary: 'College',
  graduate: 'Graduate',
  shs_strand: 'SHS strand',
  techvoc: 'TESDA',
}

/**
 * Every course level in one list for vacancies, "None (not required)" first and "Others" last.
 * Group reads "College · Information Technology" so the level shows in the picker.
 */
export function toVacancyCourseOptions(rows: CourseRow[]): ReferenceOption[] {
  const none: ReferenceOption = { name: NO_COURSE_REQUIRED, abbreviation: null, group: 'Not required', requiresSpecify: false }
  const listed = rows
    .filter((row) => !row.requires_specify)
    .map((row) => ({
      name: row.name,
      abbreviation: row.abbreviation,
      group: [COURSE_LEVEL_LABEL[row.level as CourseLevel], row.field].filter(Boolean).join(' · ') || null,
      requiresSpecify: false,
    }))
  return withOthersFallback([none, ...listed])
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
