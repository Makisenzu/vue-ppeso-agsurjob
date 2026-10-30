import type { JobVacancyRow } from '@/types/peso/provincialPeso/jobFair'
import type { JobVacancyAttachment } from '@/types/common/jobVacancyAttachment'
import type { JobApplicationStage, JobVacancyRequirement, JobVacancyStage } from '@/types/common/jobVacancyApplication'
import type { JobVacancySkillRow } from '@/types/common/jobVacancy'

/** One open vacancy as esmdd.search_open_job_vacancies (migration 087) returns it */
export interface OpenVacancyRow {
  id: string
  position_title: string
  company_name: string
  nature_of_work: string | null
  place_of_work: string | null
  salary: string | null
  vacancy_count: number | null
  posting_date: string | null
  valid_until: string | null
  status: string
  /** The signed-in applicant's application to it, if any */
  my_application_id: string | null
  my_stage: JobApplicationStage | null
  /** Name of the hiring step the applicant is at (migration 089) */
  my_stage_name: string | null
  /** Matching vacancies before paging */
  total_count: number
}

export interface OpenVacancyQuery {
  search: string
  page: number
  pageSize: number
}

export interface OpenVacancyPage {
  rows: OpenVacancyRow[]
  total: number
}

/** What the applicant reads about a vacancy before applying */
export type VacancyDetails = OpenVacancyRow &
  Pick<
    JobVacancyRow,
    | 'job_description'
    | 'educational_level'
    | 'course_shs_strand'
    | 'work_experience_months'
    | 'eligibility'
    | 'license'
    | 'certification'
    | 'language_dialect_spoken'
    | 'other_qualifications'
    | 'accepts_pwd'
  > & {
    skills: Pick<JobVacancySkillRow, 'skill_name' | 'is_required'>[]
    attachments: JobVacancyAttachment[]
    /** Documents to submit (migration 088) */
    requirements: JobVacancyRequirement[]
    /** The employer's hiring steps, in order (migration 089) */
    stages: JobVacancyStage[]
  }
