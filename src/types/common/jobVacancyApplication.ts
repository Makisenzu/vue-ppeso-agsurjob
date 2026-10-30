import type { ReusableProfileDocument } from '@/helpers/applicant/applicantRequirementDocuments'

/**
 * Applications to an employer's job vacancy (esmdd.job_vacancy_applications, migration 087), shared by
 * the applicant (applies, follows the stage) and the employer (reviews, moves the stage).
 * Typed by hand until `npm run types:gen` is re-run; then derive the rows from database.types.ts.
 */

/** In order; `rejected` can follow any stage */
export const JOB_APPLICATION_STAGES = ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'] as const
export type JobApplicationStage = (typeof JOB_APPLICATION_STAGES)[number]

export interface JobVacancyApplicationRow {
  id: string
  job_vacancy_id: string
  applicant_id: string
  stage: JobApplicationStage
  /** Why the employer rejected it; only set for `rejected` */
  status_remarks: string | null
  created_at: string
  updated_at: string
}

/** Names must match the CHECK on esmdd.job_vacancy_application_documents (migration 087) */
export const JOB_APPLICATION_DOCUMENT_OPTIONS: readonly string[] = ['NSRP Form', 'Resume', 'Application Letter']

/** Generated from the registry record, never uploaded by hand (BACKEND.md §18) */
export const JOB_APPLICATION_NSRP_DOCUMENT = 'NSRP Form'

/** Every requirement with what it is; the application letter is optional */
export const JOB_APPLICATION_REQUIREMENTS: readonly { name: string; hint: string; isOptional: boolean }[] = [
  { name: 'NSRP Form', hint: 'Generated from your profile when you apply', isOptional: false },
  { name: 'Resume', hint: 'Your latest resume or CV', isOptional: false },
  { name: 'Application Letter', hint: 'Addressed to the employer', isOptional: true },
]

/**
 * Profile document types attached automatically to the requirement that means the same thing
 * (BACKEND.md §18). Application Form is not an Application Letter, so the letter is picked by hand.
 */
export const JOB_APPLICATION_PROFILE_DOCUMENT_MATCHES: Partial<Record<string, readonly string[]>> = {
  Resume: ['Resume'],
}

export const JOB_APPLICATION_ATTACHMENT_MIME_TYPES = ['application/pdf'] as const
export const JOB_APPLICATION_ATTACHMENT_ACCEPT = JOB_APPLICATION_ATTACHMENT_MIME_TYPES.join(',')
export const JOB_APPLICATION_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

/** esmdd.job_vacancy_application_documents (migration 087): the file attached to a requirement */
export interface JobApplicationDocumentRow {
  id: string
  application_id: string
  document_name: string
  file_name: string
  path: string
  mime_type: string | null
  size: number | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

/** Saved document file with a short-lived signed URL for viewing */
export type JobApplicationDocument = JobApplicationDocumentRow & { url: string | null }

/** Saved files per document name */
export type JobApplicationDocumentMap = Partial<Record<string, JobApplicationDocument>>

/** Files picked in the form but not uploaded yet, per document name */
export type JobApplicationPendingDocumentMap = Partial<Record<string, File>>

/** Profile documents chosen for a requirement, copied into the application on submit */
export type JobApplicationReusedDocumentMap = Partial<Record<string, ReusableProfileDocument>>
