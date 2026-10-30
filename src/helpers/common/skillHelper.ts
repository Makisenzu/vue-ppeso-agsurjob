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
