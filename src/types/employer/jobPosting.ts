import type { JobVacancyDetailsFields, JobVacancyRow, JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import type { JobVacancySkillRow } from '@/types/common/jobVacancy'
import type { JobVacancyAttachment } from '@/types/common/jobVacancyAttachment'

/**
 * An employer's job posting is its establishment's `esmdd.job_vacancies` row (migration 039 lets
 * the company owner create / edit / delete them). The same row is what PESO lists in job fairs.
 */

export type JobPostingSkill = Pick<JobVacancySkillRow, 'skill_name' | 'is_required'>

/** Columns the postings list shows, with its skills; the full row is loaded only when editing */
export type JobPostingListRow = JobPostingListColumns & { skills: JobPostingSkill[] }

type JobPostingListColumns = Pick<
  JobVacancyRow,
  | 'id'
  | 'position_title'
  | 'nature_of_work'
  | 'vacancy_count'
  | 'place_of_work'
  | 'posting_date'
  | 'valid_until'
  | 'status'
  | 'created_at'
>

export const JOB_POSTING_LIST_COLUMNS =
  'id, position_title, nature_of_work, vacancy_count, place_of_work, posting_date, valid_until, status, created_at'

/** 'all' or one vacancy status */
export type JobPostingStatusFilter = 'all' | JobVacancyStatus

export interface JobPostingQuery {
  search: string
  status: JobPostingStatusFilter
  page: number
  pageSize: number
}

export interface JobPostingPage {
  rows: JobPostingListRow[]
  total: number
}

/** Counted in SQL per status (BACKEND.md §19) */
export type JobPostingStats = Record<JobPostingStatusFilter, number>

/** A posting being edited: every vacancy field, its skills, related courses and attachments */
export type JobPostingDetails = JobVacancyRow & {
  skills: JobPostingSkill[]
  related_courses: string[]
  attachments: JobVacancyAttachment[]
}

/** Attachment edits staged in the sheet, applied after the posting saves (a new posting has no id before) */
export type JobPostingAttachmentChanges = {
  add: File[]
  remove: Pick<JobVacancyAttachment, 'id' | 'path'>[]
}

/** What the posting form saves (esmdd.save_job_vacancy, migration 084) */
export type JobPostingPayload = {
  vacancy: JobVacancyDetailsFields & {
    vacancy_count: number
    status: JobVacancyStatus
    related_courses: string[]
  }
  skills: JobPostingSkill[]
}
