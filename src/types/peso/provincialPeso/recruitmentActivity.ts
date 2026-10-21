import type { Database } from '@/types/database.types'
import type { EstablishmentFormFields, EstablishmentRow } from '@/types/common/establishment'
import type { JobVacancyDetailsFields, JobVacancyRow, JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'

type EsmddTables = Database['esmdd']['Tables']

export type RecruitmentActivityRow = EsmddTables['recruitment_activities']['Row']
export type RecruitmentActivityInsert = EsmddTables['recruitment_activities']['Insert']
export type RecruitmentActivityUpdate = EsmddTables['recruitment_activities']['Update']

export type RecruitmentActivityRequirementRow = EsmddTables['recruitment_activity_requirements']['Row']
export type RecruitmentActivityAttachmentRow = EsmddTables['recruitment_activity_attachments']['Row']
export type RecruitmentActivityVacancyRow = EsmddTables['recruitment_activity_vacancies']['Row']

export const RECRUITMENT_ACTIVITY_TYPES = ['LRA', 'SRA'] as const
export type RecruitmentActivityType = (typeof RECRUITMENT_ACTIVITY_TYPES)[number]

export const RECRUITMENT_ACTIVITY_TYPE_LABELS: Record<RecruitmentActivityType, string> = {
  LRA: 'Local Recruitment Activity',
  SRA: 'Special Recruitment Activity (Overseas)',
}

export const RECRUITMENT_ACTIVITY_STATUSES = ['Pending', 'Approved', 'Conducted', 'Completed', 'Cancelled'] as const
export type RecruitmentActivityStatus = (typeof RECRUITMENT_ACTIVITY_STATUSES)[number]

/** List row: activity + its agency's name + checklist counts (establishments are fetched separately). */
export type RecruitmentActivityListItem = RecruitmentActivityRow & {
  agency_name: string
  recruitment_activity_requirements: { stage: string; is_submitted: boolean }[]
  recruitment_activity_vacancies: { count: number }[]
}

/** Checklist item with its uploaded files. */
export type RecruitmentActivityRequirement = RecruitmentActivityRequirementRow & {
  recruitment_activity_attachments: RecruitmentActivityAttachmentRow[]
}

/** Details page: the activity with its agency's full NSRP Form 2. */
export type RecruitmentActivityDetails = RecruitmentActivityRow & {
  establishment: EstablishmentRow
}

/** Activity job order with its job's details merged in; `id`, `vacancy_count`, `status` are the activity's. */
export type RecruitmentActivityVacancyDetails = RecruitmentActivityVacancyRow &
  Omit<JobVacancyRow, 'id' | 'vacancy_count' | 'status' | 'created_by' | 'created_at' | 'updated_at'>

/**
 * What the activity form saves. `establishment` is the agency's completed NSRP Form 2: it updates the
 * picked establishment (`establishmentId`) or registers a new one when `establishmentId` is null.
 */
export type RecruitmentActivityFormPayload = {
  activity: Pick<
    RecruitmentActivityInsert,
    'type' | 'representatives' | 'start_date' | 'end_date' | 'venue' | 'city_municipality' | 'remarks'
  >
  establishmentId: string | null
  establishment: EstablishmentFormFields
}

/** What the job order form saves: job details go to `job_vacancies`, the rest to the activity's job order. */
export type RecruitmentActivityVacancyFormPayload = {
  vacancy: JobVacancyDetailsFields
  vacancy_count: number
  status: JobVacancyStatus
  destination_country: string | null
  job_order_number: string | null
}

export const RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET = 'recruitment-activity-documents'
export const RECRUITMENT_ACTIVITY_DOCUMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf'
export const RECRUITMENT_ACTIVITY_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const RECRUITMENT_ACTIVITY_DOCUMENT_MAX_SIZE_MB = 20
/** Signed links to private documents stay valid this long. */
export const RECRUITMENT_ACTIVITY_DOCUMENT_URL_TTL_SECONDS = 60 * 10
