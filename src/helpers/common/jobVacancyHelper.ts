import * as z from 'zod'
import {
  DISABILITY_TYPE_OPTIONS,
  NATURE_OF_WORK_OPTIONS,
  VACANCY_STATUSES,
  type JobVacancyDetailsFields,
  type JobVacancyRow,
} from '@/types/peso/provincialPeso/jobFair'
import type { JobVacancyFormValues, JobVacancyMatching } from '@/types/common/jobVacancy'
import { MAX_VACANCY_SKILLS, SKILL_NAME_MAX_LENGTH } from '@/helpers/common/skillHelper'
import { NO_COURSE_REQUIRED } from '@/helpers/common/referenceListHelper'

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`)
const NONE_HINT = 'Type "None" if not required.'

export const MAX_RELATED_COURSES = 10

/**
 * Skills every vacancy needs for applicant matching (migrations 084 / 085): 1–30, at least one
 * must-have. Shared by the job fair, recruitment activity and employer vacancy forms.
 */
export const jobVacancySkillsSchema = z
  .array(z.object({ name: z.string().trim().min(2).max(SKILL_NAME_MAX_LENGTH), isRequired: z.boolean() }))
  .min(1, 'Add at least one skill.')
  .max(MAX_VACANCY_SKILLS, `Up to ${MAX_VACANCY_SKILLS} skills.`)
  .refine((skills) => skills.some((skill) => skill.isRequired), 'Mark at least one skill as "Must have".')

export const jobVacancyRelatedCoursesSchema = z
  .array(z.string().trim().min(1))
  .max(MAX_RELATED_COURSES, `Up to ${MAX_RELATED_COURSES} related courses.`)

/**
 * Zod shape of a complete `job_vacancies` entry; spread into a form's schema and add
 * `refineCompleteJobVacancyForm`. Qualifications that may not apply take "None".
 */
export const jobVacancyFormShape = {
  positionTitle: requiredText('Position title'),
  jobDescription: requiredText('Job description'),
  natureOfWork: z.enum(NATURE_OF_WORK_OPTIONS),
  vacancyCount: z.coerce.number().int('Must be a whole number.').min(1, 'At least 1 opening.'),
  salary: requiredText('Salary'),
  placeOfWork: requiredText('Place of work'),
  educationalLevel: requiredText('Educational level'),
  courseShsStrand: z.string().trim().min(1, NONE_HINT),
  workExperienceMonths: z.coerce.number().int('Must be a whole number.').min(0, 'Cannot be negative.'),
  eligibility: z.string().trim().min(1, NONE_HINT),
  license: z.string().trim().min(1, NONE_HINT),
  certification: z.string().trim().min(1, NONE_HINT),
  languages: requiredText('Languages / dialects'),
  otherQualifications: z.string().trim().min(1, NONE_HINT),
  acceptsPwd: z.boolean(),
  pwdDisabilities: z.array(z.enum(DISABILITY_TYPE_OPTIONS)),
  pwdOtherDisability: z.string().trim().optional(),
  acceptsReturningOfw: z.boolean(),
  postingDate: requiredText('Posting date'),
  validUntil: requiredText('Valid until'),
  status: z.enum(VACANCY_STATUSES),
  skills: jobVacancySkillsSchema,
  relatedCourses: jobVacancyRelatedCoursesSchema,
}

/** Cross-field rules: PWD details when PWDs are accepted, and a valid posting period. */
export function refineCompleteJobVacancyForm(values: Partial<JobVacancyFormValues>, ctx: z.RefinementCtx) {
  const issue = (path: keyof JobVacancyFormValues, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

  if (values.acceptsPwd && !values.pwdDisabilities?.length) {
    issue('pwdDisabilities', 'Select at least one disability that can be accommodated.')
  }
  if (values.acceptsPwd && values.pwdDisabilities?.includes('Others') && !values.pwdOtherDisability?.trim()) {
    issue('pwdOtherDisability', 'Please specify the other disability.')
  }
  // ISO yyyy-mm-dd strings compare correctly as plain strings
  if (values.postingDate && values.validUntil && values.validUntil < values.postingDate) {
    issue('validUntil', 'Valid until cannot be before the posting date.')
  }
}

export const EMPTY_JOB_VACANCY_FORM_VALUES: JobVacancyFormValues = {
  positionTitle: '',
  jobDescription: '',
  natureOfWork: 'Permanent',
  vacancyCount: 1,
  salary: '',
  placeOfWork: '',
  educationalLevel: '',
  courseShsStrand: '',
  workExperienceMonths: 0,
  eligibility: '',
  license: '',
  certification: '',
  languages: '',
  otherQualifications: '',
  acceptsPwd: false,
  pwdDisabilities: [],
  pwdOtherDisability: '',
  acceptsReturningOfw: false,
  postingDate: '',
  validUntil: '',
  status: 'open',
  skills: [],
  relatedCourses: [],
}

const joinList = (items?: string[] | null) => (items ?? []).join(', ')
const splitList = (value?: string) => {
  const items = (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  return items.length ? items : null
}
const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

type JobVacancyFormSource = Omit<JobVacancyRow, 'id' | 'establishment_id' | 'created_by' | 'created_at' | 'updated_at'>

/** A saved vacancy (or a job order flattened with it) and its skills / related courses as form values. */
export function toJobVacancyFormValues(
  row: JobVacancyFormSource,
  matching: JobVacancyMatching = { skills: [], related_courses: [] },
): JobVacancyFormValues {
  return {
    positionTitle: row.position_title,
    jobDescription: row.job_description ?? '',
    natureOfWork: row.nature_of_work,
    vacancyCount: row.vacancy_count ?? 1,
    salary: row.salary ?? '',
    placeOfWork: row.place_of_work ?? '',
    educationalLevel: row.educational_level ?? '',
    courseShsStrand: row.course_shs_strand ?? '',
    workExperienceMonths: row.work_experience_months ?? 0,
    eligibility: row.eligibility ?? '',
    license: row.license ?? '',
    certification: row.certification ?? '',
    languages: joinList(row.language_dialect_spoken),
    otherQualifications: joinList(row.other_qualifications),
    acceptsPwd: row.accepts_pwd ?? false,
    pwdDisabilities: row.pwd_disabilities ?? [],
    pwdOtherDisability: row.pwd_other_disability ?? '',
    acceptsReturningOfw: row.accepts_returning_ofw ?? false,
    postingDate: row.posting_date?.slice(0, 10) ?? '',
    validUntil: row.valid_until?.slice(0, 10) ?? '',
    status: (row.status ?? 'open') as JobVacancyFormValues['status'],
    skills: matching.skills.map((skill) => ({ name: skill.skill_name, isRequired: skill.is_required })),
    relatedCourses: [...matching.related_courses],
  }
}

/** True when the vacancy asks for a course (anything but blank / "None") */
export const requiresCourse = (course?: string | null) =>
  !!course?.trim() && course.trim().toLowerCase() !== NO_COURSE_REQUIRED.toLowerCase()

/** Form values as the skills / related courses saved with the vacancy (related courses only when a course is required) */
export function toJobVacancyMatching(values: Pick<JobVacancyFormValues, 'skills' | 'relatedCourses' | 'courseShsStrand'>): JobVacancyMatching {
  return {
    skills: values.skills.map((skill) => ({ skill_name: skill.name.trim(), is_required: skill.isRequired })),
    related_courses: requiresCourse(values.courseShsStrand)
      ? values.relatedCourses.map((course) => course.trim()).filter(Boolean)
      : [],
  }
}

/** Form values as `job_vacancies` columns (openings and status are saved by the caller). */
export function toJobVacancyFields(values: JobVacancyFormValues): JobVacancyDetailsFields {
  return {
    position_title: values.positionTitle.trim(),
    job_description: orNull(values.jobDescription),
    nature_of_work: values.natureOfWork,
    salary: orNull(values.salary),
    place_of_work: orNull(values.placeOfWork),
    educational_level: orNull(values.educationalLevel),
    course_shs_strand: orNull(values.courseShsStrand),
    work_experience_months: values.workExperienceMonths,
    eligibility: orNull(values.eligibility),
    license: orNull(values.license),
    certification: orNull(values.certification),
    language_dialect_spoken: splitList(values.languages),
    other_qualifications: splitList(values.otherQualifications),
    accepts_pwd: values.acceptsPwd,
    // PWD details only apply when the vacancy accepts PWD applicants.
    pwd_disabilities: values.acceptsPwd && values.pwdDisabilities.length ? values.pwdDisabilities : null,
    pwd_other_disability:
      values.acceptsPwd && values.pwdDisabilities.includes('Others') ? orNull(values.pwdOtherDisability) : null,
    accepts_returning_ofw: values.acceptsReturningOfw,
    posting_date: orNull(values.postingDate),
    valid_until: orNull(values.validUntil),
  }
}
