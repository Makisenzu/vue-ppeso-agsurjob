import type { ReusableProfileDocument } from '@/helpers/applicant/applicantRequirementDocuments'

/**
 * Applications to an employer's job vacancy (esmdd.job_vacancy_applications, migration 087), shared by
 * the applicant (applies, follows the stage) and the employer (reviews, moves the stage).
 * Typed by hand until `npm run types:gen` is re-run; then derive the rows from database.types.ts.
 */

/**
 * Status of an application (migration 089): applied (not reviewed yet), in_progress (at one of the
 * vacancy's hiring steps), hired (at its last step) or rejected. The step itself is `stage_id`.
 */
export const JOB_APPLICATION_STAGES = ['applied', 'in_progress', 'hired', 'rejected'] as const
export type JobApplicationStage = (typeof JOB_APPLICATION_STAGES)[number]

export interface JobVacancyApplicationRow {
  id: string
  job_vacancy_id: string
  applicant_id: string
  stage: JobApplicationStage
  /** The hiring step the applicant is at; null until reviewed. A rejected application keeps the step it stopped at. */
  stage_id: string | null
  /** Why the employer rejected it; only set for `rejected` */
  status_remarks: string | null
  created_at: string
  updated_at: string
}

/**
 * esmdd.job_vacancy_stages (migration 089): one hiring step of a vacancy, in order; the last one means
 * hired. Typed by hand until `npm run types:gen` is re-run.
 */
export interface JobVacancyStage {
  id: string
  stage_name: string
  sort_order: number
}

/** A step as the posting form edits it: id null for a step added in this edit */
export type JobVacancyStageInput = { id: string | null; stage_name: string }

/** Mandatory first step of every vacancy; applications start there (migration 091) */
export const PAPER_SCREENING_STAGE = 'Paper Screening'

/** What a new posting starts with (migration 089) */
export const DEFAULT_HIRING_STAGES: readonly string[] = [
  'Paper Screening',
  'Qualified',
  'Initial Exam',
  'Technical Exam',
  'Interview',
  'Result',
  'Appointed',
  'Hired',
]

/** Same limits as esmdd.assert_job_vacancy_stages (migration 089) */
export const MIN_HIRING_STAGES = 2
export const MAX_HIRING_STAGES = 12
export const HIRING_STAGE_NAME_MAX_LENGTH = 60

/** PESO's form for its programs, job fairs and analytics; job applications don't use it, so employers can't ask for it */
export const JOB_APPLICATION_NSRP_DOCUMENT = 'NSRP Form'

/**
 * esmdd.job_vacancy_requirements (migration 088): a document the employer asks applicants to submit,
 * required or optional. Typed by hand until `npm run types:gen` is re-run.
 */
export interface JobVacancyRequirementRow {
  id: string
  job_vacancy_id: string
  requirement_name: string
  requirement_key: string
  is_required: boolean
  sort_order: number
  created_at: string
}

/** A vacancy's requirement as the posting form saves it and the application forms read it */
export type JobVacancyRequirement = Pick<JobVacancyRequirementRow, 'requirement_name' | 'is_required'>

/** One requirement of the application form: the vacancy's own, in the employer's order */
export interface JobApplicationRequirement {
  name: string
  hint: string
  isOptional: boolean
}

/** Same limits as the CHECKs and esmdd.assert_job_vacancy_requirements (migration 088) */
export const MAX_VACANCY_REQUIREMENTS = 15
export const REQUIREMENT_NAME_MAX_LENGTH = 80

/** What a new posting asks for until the employer changes it (the list of migration 087) */
export const DEFAULT_VACANCY_REQUIREMENTS: readonly JobVacancyRequirement[] = [
  { requirement_name: 'Resume', is_required: true },
  { requirement_name: 'Application Letter', is_required: false },
]

/** Common documents the employer adds with one tap; any other name can be typed */
export const VACANCY_REQUIREMENT_SUGGESTIONS: readonly string[] = [
  'Resume',
  'Application Letter',
  'Transcript of Records',
  'Diploma',
  'Birth Certificate',
  'Training Certificates',
  'Certificate of Employment',
  'NBI Clearance',
  'Police Clearance',
  'Barangay Clearance',
  'Medical Certificate',
]

/** Shown under a requirement the applicant may not know; others get a generic hint */
export const JOB_APPLICATION_REQUIREMENT_HINTS: Partial<Record<string, string>> = {
  Resume: 'Your latest resume or CV',
  'Application Letter': 'Addressed to the employer',
}

/**
 * Profile document types attached automatically to the requirement that means the same thing
 * (BACKEND.md §18), keyed by the requirement's name as normalizeRequirementLabel() writes it. Application Form is not an
 * Application Letter, so the letter is picked by hand.
 */
export const JOB_APPLICATION_PROFILE_DOCUMENT_MATCHES: Partial<Record<string, readonly string[]>> = {
  resume: ['Resume'],
  'birth certificate': ['Birth Certificate'],
  'transcript of records': ['TOR/Diploma'],
  diploma: ['TOR/Diploma'],
  'tor diploma': ['TOR/Diploma'],
  certificates: ['Certificates'],
  'training certificates': ['Certificates'],
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
