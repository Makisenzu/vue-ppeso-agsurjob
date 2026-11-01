/**
 * NSRP Form 1 "Other skills acquired without certificate" checklist. Applicants tick these, so
 * offering the same names on vacancies makes them match exactly.
 */
export const NSRP_SKILL_OPTIONS = [
  'Auto Mechanic',
  'Beautician',
  'Carpentry Work',
  'Computer Literate',
  'Domestic Chores',
  'Driver',
  'Electrician',
  'Embroidery',
  'Gardening',
  'Masonry',
  'Painter/Artist',
  'Painting Jobs',
  'Photography',
  'Plumbing',
  'Sewing Dresses',
  'Stenography',
  'Tailoring',
] as const

export const MAX_VACANCY_SKILLS = 30
export const SKILL_NAME_MAX_LENGTH = 80

/** Trimmed, single-spaced display name */
export const cleanSkillInput = (value: string) => value.trim().replace(/\s+/g, ' ')

/** Same key as esmdd.job_vacancy_skills.skill_key (migration 084): lower case, single spaces */
export const toSkillKey = (value: string) => cleanSkillInput(value).toLowerCase()

/** Categories offered when PESO adds a skill to the list (core.skills.category, migration 099); same as seeds/004 */
export const SKILL_CATEGORY_OPTIONS = [
  'Soft Skills',
  'Communication & Language',
  'Computer / ICT',
  'Office / Clerical',
  'Finance & Accounting',
  'Sales & Service',
  'Management & Supervision',
  'Education & Training',
  'Health & Care',
  'Beauty & Wellness',
  'Household & Personal Care',
  'Food & Hospitality',
  'Construction & Trades',
  'Automotive & Machinery',
  'Manufacturing & Production',
  'Logistics & Warehousing',
  'Agriculture',
  'Creative',
  'Security & Safety',
] as const

/**
 * NSRP free-text skill fields ("Others, specify", training "skills acquired") as a list: split on commas,
 * semicolons and new lines like migration 100 does, cleaned, duplicates dropped.
 */
export function splitSkillText(value: string | null | undefined): string[] {
  const seen = new Set<string>()
  const list: string[] = []
  for (const part of (value ?? '').split(/[,;\n]/)) {
    const name = cleanSkillInput(part).slice(0, SKILL_NAME_MAX_LENGTH)
    const key = toSkillKey(name)
    if (name.length < 2 || seen.has(key)) continue
    seen.add(key)
    list.push(name)
  }
  return list
}

/** The list back into the stored text, "Welding, Microsoft Excel" */
export const joinSkillText = (names: readonly string[]) => names.join(', ')

/** DOM id of one option in a skill suggestion list (aria-activedescendant) */
export const skillOptionId = (listId: string, index: number) => `${listId}-option-${index}`

/** Readable message for a Skill List save; the database's own "already…" messages are shown as they are */
export function toSkillListErrorMessage(error: unknown, fallback: string): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (code === '42501') return 'Only PESO can manage the skill list.'
  if (code === 'P0002') return 'This skill could not be found. Reload the page and try again.'
  if (code === '23505') {
    if (message?.includes(' is already ')) return message
    if (message?.includes('skill_aliases')) return 'That wording is already on the list.'
    return 'A skill with that name is already on the list.'
  }
  if (code === '23514') return 'Names need 2 to 80 characters.'
  return fallback
}

/** "92% linked (230 of 250)"; "Nothing to link yet" when there's nothing */
export function formatSkillCoverage(linked: number, total: number): { percent: string; detail: string } {
  if (!total) return { percent: '—', detail: 'Nothing to link yet' }
  return { percent: `${Math.round((linked / total) * 100)}%`, detail: `${linked} of ${total} wordings on the list` }
}
