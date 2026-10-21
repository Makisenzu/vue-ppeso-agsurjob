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
}
