import type { DisabilityType, JobVacancyStatus, NATURE_OF_WORK_OPTIONS } from '@/types/peso/provincialPeso/jobFair'

/**
 * Form values for every `esmdd.job_vacancies` field (see jobVacancyHelper for the schema and
 * payload). List columns (languages, other qualifications) are edited as comma-separated text.
 */
export type JobVacancyFormValues = {
  positionTitle: string
  jobDescription: string
  natureOfWork: (typeof NATURE_OF_WORK_OPTIONS)[number]
  vacancyCount: number
  salary: string
  placeOfWork: string
  educationalLevel: string
  courseShsStrand: string
  workExperienceMonths: number
  eligibility: string
  license: string
  certification: string
  languages: string
  otherQualifications: string
  acceptsPwd: boolean
  pwdDisabilities: DisabilityType[]
  pwdOtherDisability: string
  acceptsReturningOfw: boolean
  postingDate: string
  validUntil: string
  status: JobVacancyStatus
  /** Skills used to match applicants (job_vacancy_skills, migration 084) */
  skills: JobVacancySkillValue[]
  /** Optional courses accepted besides courseShsStrand (job_vacancies.related_courses, migration 085) */
  relatedCourses: string[]
}

/** One skill a vacancy needs, as the skills field edits it */
export type JobVacancySkillValue = {
  name: string
  /** Must-have (true) or nice-to-have (false) */
  isRequired: boolean
}

/**
 * esmdd.job_vacancy_skills (migration 084). Typed by hand until `npm run types:gen` is re-run;
 * then derive it from database.types.ts.
 */
export type JobVacancySkillRow = {
  id: string
  job_vacancy_id: string
  skill_name: string
  skill_key: string
  is_required: boolean
  created_at: string
}

/** A vacancy's skills and related courses, as loaded for its form */
export type JobVacancyMatching = {
  skills: Pick<JobVacancySkillRow, 'skill_name' | 'is_required'>[]
  related_courses: string[]
}
