import { Constants, type Database } from '@/types/database.types'

type EsmddTables = Database['esmdd']['Tables']
type EsmddEnums = Database['esmdd']['Enums']

export type JobFairRow = EsmddTables['job_fairs']['Row']
export type JobFairInsert = EsmddTables['job_fairs']['Insert']
export type JobFairUpdate = EsmddTables['job_fairs']['Update']

/** Job fair row joined with its participant count and the openings of each vacancy. */
export type JobFairWithCounts = JobFairRow & {
  job_fair_participants: { count: number }[]
  job_vacancies: { vacancy_count: number | null }[]
}

// ─── Attachments ───
export type JobFairAttachmentRow = EsmddTables['job_fair_attachments']['Row']
export type JobFairAttachmentInsert = EsmddTables['job_fair_attachments']['Insert']

export const JOB_FAIR_ATTACHMENT_BUCKET = 'job-fair-attachments'
export const JOB_FAIR_ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const JOB_FAIR_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf'
export const JOB_FAIR_ATTACHMENT_MAX_SIZE_MB = 20
export const JOB_FAIR_ATTACHMENT_MAX_FILES = 10

export const JOB_FAIR_STATUSES =['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] as const
export type JobFairStatus = (typeof JOB_FAIR_STATUSES)[number]

// ─── Participants ───
export type JobFairParticipantRow = EsmddTables['job_fair_participants']['Row']
export type JobFairParticipantInsert = EsmddTables['job_fair_participants']['Insert']
export type JobFairParticipantUpdate = EsmddTables['job_fair_participants']['Update']

/** Participant row joined with the aggregate count of its job fair vacancies. */
export type JobFairParticipantWithCount = JobFairParticipantRow & {
  job_vacancies: { count: number }[]
}

export type EmployerCategory = EsmddEnums['employer_category_enum']
export type PublicEmployerType = EsmddEnums['public_employer_type_enum']
export type PrivateEmployerType = EsmddEnums['private_employer_type_enum']
export type TotalWorkforce = EsmddEnums['total_workforce_enum']

export const EMPLOYER_CATEGORIES = Constants.esmdd.Enums.employer_category_enum
export const PUBLIC_EMPLOYER_TYPES = Constants.esmdd.Enums.public_employer_type_enum
export const PRIVATE_EMPLOYER_TYPES = Constants.esmdd.Enums.private_employer_type_enum
export const TOTAL_WORKFORCE_OPTIONS = Constants.esmdd.Enums.total_workforce_enum

export const PARTICIPANT_STATUSES = ['Registered', 'Confirmed', 'Attended', 'Cancelled'] as const

// ─── Vacancies ───
export type JobVacancyRow = EsmddTables['job_vacancies']['Row']
export type JobVacancyInsert = EsmddTables['job_vacancies']['Insert']
export type JobVacancyUpdate = EsmddTables['job_vacancies']['Update']
export type NatureOfWork = EsmddEnums['nature_of_work_enum']
export type DisabilityType = EsmddEnums['disability_type_enum']

export const NATURE_OF_WORK_OPTIONS = Constants.esmdd.Enums.nature_of_work_enum
export const DISABILITY_TYPE_OPTIONS = Constants.esmdd.Enums.disability_type_enum
export const VACANCY_STATUSES = Constants.esmdd.Enums.job_vacancy_status
