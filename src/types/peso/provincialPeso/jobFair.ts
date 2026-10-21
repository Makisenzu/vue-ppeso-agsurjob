import { Constants, type Database } from '@/types/database.types'
import type { EstablishmentFormFields } from '@/types/common/establishment'

type EsmddTables = Database['esmdd']['Tables']
type EsmddEnums = Database['esmdd']['Enums']

export type JobFairRow = EsmddTables['job_fairs']['Row']
export type JobFairInsert = EsmddTables['job_fairs']['Insert']
export type JobFairUpdate = EsmddTables['job_fairs']['Update']

/** Job fair row joined with its employer / applicant / hire counts and the openings of each vacancy. */
export type JobFairWithCounts = JobFairRow & {
  job_fair_participants: { count: number }[]
  job_vacancies: { vacancy_count: number | null }[]
  job_fair_applicants: { count: number }[]
  hots: { count: number }[]
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
/** Link row only (job fair + establishment + participation status); Form 2 data is in the establishment. */
export type JobFairParticipantRow = EsmddTables['job_fair_participants']['Row']
export type JobFairParticipantUpdate = EsmddTables['job_fair_participants']['Update']

/** Participant with its establishment's NSRP Form 2 fields merged in (fetched separately — no cross-schema embeds). */
export type JobFairParticipantDetails = JobFairParticipantRow & EstablishmentFormFields

/** Participant details plus the aggregate count of its job fair vacancies. */
export type JobFairParticipantWithCount = JobFairParticipantDetails & {
  job_vacancies: { count: number }[]
}

/** What the participant form saves: Form 2 fields go to the establishment, `status` to the participant. */
export type JobFairParticipantFormPayload = {
  establishment: EstablishmentFormFields
  status: string | null
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

// ─── Hired on the Spot (HOTS) ───
export type HotsRow = EsmddTables['hots']['Row']
/** job_fair_id / participant_id are copied from the vacancy by `trg_hots_sync_job_fair_links`. */
export type HotsInsert = EsmddTables['hots']['Insert']
export type HotsUpdate = EsmddTables['hots']['Update']

/** HOTS row joined with the hiring employer and the vacancy filled. `business_name` comes from the establishment. */
export type HotsWithDetails = HotsRow & {
  job_fair_participants: { business_name: string } | null
  job_vacancies: { position_title: string } | null
}

/** A vacancy that can take hires, with its employer and the number of hires so far. */
export type HotsVacancyOption = {
  id: string
  participant_id: string
  position_title: string
  vacancy_count: number | null
  job_fair_participants: { business_name: string } | null
  hots: { count: number }[]
}

/** Registry record (`applicants.applicants`) picked as an attendee or hired applicant. */
export type JobFairRegistryApplicant = {
  id: string
  profile_id: string | null
  first_name: string
  middle_name: string | null
  surname: string
  suffix: string | null
  sex: string | null
  email: string | null
  contact_numbers: string[] | null
}

// ─── Attendees (job_fair_applicants) ───
export type JobFairApplicantRow = EsmddTables['job_fair_applicants']['Row']
export type JobFairApplicantInsert = EsmddTables['job_fair_applicants']['Insert']
export type JobFairApplicantUpdate = EsmddTables['job_fair_applicants']['Update']

export const JOB_FAIR_APPLICANT_STATUSES = ['Registered', 'Attended'] as const
export type JobFairApplicantStatus = (typeof JOB_FAIR_APPLICANT_STATUSES)[number]

/** Attendee row with its registry record (fetched separately — no cross-schema embeds). */
export type JobFairAttendee = JobFairApplicantRow & {
  applicant: JobFairRegistryApplicant | null
}
