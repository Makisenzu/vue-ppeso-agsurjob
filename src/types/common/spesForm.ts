import { Constants, type Database } from '@/types/database.types'
import type { ReusableProfileDocument } from '@/helpers/applicant/applicantRequirementDocuments'

type ApplicantsTables = Database['applicants']['Tables']
type ApplicantsEnums = Database['applicants']['Enums']

/**
 * `municipality` comes from migration 016 and is not in database.types.ts until `npm run types:gen`
 * is re-run against the migrated database; drop the intersections then.
 */
type SpesFormMunicipality = { municipality?: string | null }

/** applied_at / orientation_* (migration 067), declared until `npm run types:gen` is re-run. */
type SpesFormApplication = {
  applied_at?: string | null
  orientation_at?: string | null
  orientation_note?: string | null
}

/** has_spes_form (071) and has_application_letter / has_resume / has_passport_photo (072), declared until `npm run types:gen` is re-run. */
type SpesFormDocument = {
  has_spes_form?: boolean
  has_application_letter?: boolean
  has_resume?: boolean
  has_passport_photo?: boolean
}

export type SpesFormRow = ApplicantsTables['spes_form']['Row'] & SpesFormMunicipality & SpesFormApplication & SpesFormDocument
export type SpesFormInsert = ApplicantsTables['spes_form']['Insert'] & SpesFormMunicipality & SpesFormDocument
export type SpesFormUpdate = ApplicantsTables['spes_form']['Update'] & SpesFormMunicipality & SpesFormDocument

/**
 * The generated table payloads. The typed client rejects keys it does not know yet, so services cast
 * to these when writing; `municipality` is still sent. Remove once types are regenerated.
 */
export type SpesFormTableInsert = ApplicantsTables['spes_form']['Insert']
export type SpesFormTableUpdate = ApplicantsTables['spes_form']['Update']

/** PESO's review of the applicant's form (status / remarks are staff-only, see migration 012). */
export type SpesApplicationRecord = Pick<SpesFormRow, 'id' | 'status' | 'remarks' | 'created_at' | 'updated_at'>

export type SpesCivilStatus = ApplicantsEnums['spes_civil_status_type']
export type SpesSex = ApplicantsEnums['spes_sex_type']
export type SpesStudentCategory = ApplicantsEnums['spes_student_category_type']
export type SpesParentsStatus = ApplicantsEnums['spes_parents_status_type']

export const SPES_CIVIL_STATUS_OPTIONS = Constants.applicants.Enums.spes_civil_status_type
export const SPES_SEX_OPTIONS = Constants.applicants.Enums.spes_sex_type
export const SPES_STUDENT_CATEGORY_OPTIONS = Constants.applicants.Enums.spes_student_category_type
export const SPES_PARENTS_STATUS_OPTIONS = Constants.applicants.Enums.spes_parents_status_type

export const SPES_EDUCATION_LEVELS = [
  { key: 'elementary', label: 'Elementary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'tertiary', label: 'Tertiary' },
  { key: 'techvoc', label: 'Tech-Voc' },
] as const

export const SPES_AVAILMENT_SLOTS = [1, 2, 3, 4] as const

/**
 * The SPES requirements, in the order of PESO's SPES form checklist (spesProfilingFormHelper.ts). Labels
 * match the requirement templates (migrations 014 / 071 / 072). The registrar and out-of-school youth
 * certifications (has_registrar_certification / has_osy_certification) are no longer asked for.
 */
export const SPES_DOCUMENT_REQUIREMENTS = [
  { key: 'has_application_letter', label: 'Application letter', hint: 'Addressed to the Provincial Governor' },
  { key: 'has_resume', label: 'Resume', hint: 'Your latest resume' },
  // Generated from the saved SPES details once the others are attached, like the NSRP / TUPAD forms
  { key: 'has_spes_form', label: 'SPES form', hint: 'Generated from your SPES details' },
  { key: 'has_passport_photo', label: 'Passport size ID picture', hint: 'Upload one, or use your profile picture' },
  { key: 'has_birth_certificate', label: 'Clear copy of birth certificate', hint: 'PSA / NSO copy' },
  {
    key: 'has_income_proof',
    label: 'Proof of family income',
    hint: "Wage earners: last year's income tax return. Non-wage earners: certificate of low income or indigence with the barangay seal",
  },
  {
    key: 'has_passing_grade_proof',
    label: 'First semester grades',
    hint: 'Certificate of passing grades, report card or Form 138 with the general average',
  },
] as const

/** The requirement applicants generate instead of uploading */
export const SPES_FORM_DOCUMENT_KEY = 'has_spes_form' satisfies SpesDocumentKey

/** The requirement the applicant's profile picture can fill */
export const SPES_PASSPORT_PHOTO_KEY = 'has_passport_photo' satisfies SpesDocumentKey

export type SpesDocumentKey = (typeof SPES_DOCUMENT_REQUIREMENTS)[number]['key']

/** `public.requirement_templates.requirement_type` of the SPES requirements (migration 014). */
export const SPES_REQUIREMENT_TYPE = 'spes'

export const SPES_ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const SPES_ATTACHMENT_ACCEPT = SPES_ATTACHMENT_MIME_TYPES.join(',')
export const SPES_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

/** File attached to a checked requirement (`applicant_requirement_media` row in the `documents` bucket). */
export interface SpesDocumentAttachment {
  key: SpesDocumentKey
  applicantRequirementId: number
  mediaId: number
  filename: string
  mimeType: string | null
  path: string
  /** Short-lived signed URL for viewing; null when it could not be created. */
  url: string | null
}

export type SpesDocumentAttachmentMap = Partial<Record<SpesDocumentKey, SpesDocumentAttachment>>
export type SpesPendingAttachmentMap = Partial<Record<SpesDocumentKey, File>>
/** Profile documents chosen for a requirement, copied into the form's attachments on save. */
export type SpesReusedAttachmentMap = Partial<Record<SpesDocumentKey, ReusableProfileDocument>>

// ─── Completion reports (esmdd.spes_completion_reports, migration 016) ───

/** PDFs a beneficiary submits before PESO can mark their SPES appointment Completed. */
export const SPES_COMPLETION_REPORTS = [
  { key: 'dtr', label: 'Daily Time Record (DTR)', hint: 'Signed by your supervisor for the whole appointment period' },
  { key: 'accomplishment_report', label: 'Accomplishment Report', hint: 'Summary of the work you did during SPES' },
] as const

export type SpesCompletionReportType = (typeof SPES_COMPLETION_REPORTS)[number]['key']

export const SPES_COMPLETION_REPORT_MIME_TYPE = 'application/pdf'
export const SPES_COMPLETION_REPORT_MAX_BYTES = 10 * 1024 * 1024

/**
 * `esmdd.spes_completion_reports` row. Declared here until `npm run types:gen` is re-run against
 * the migrated database; then derive it from `Database['esmdd']['Tables']['spes_completion_reports']`.
 */
export interface SpesCompletionReportRow {
  id: string
  appointment_id: string
  report_type: SpesCompletionReportType
  filename: string
  path: string
  mime_type: string
  size: number | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

/** A report with a short-lived signed URL for viewing (null when it could not be created). */
export type SpesCompletionReport = SpesCompletionReportRow & { url: string | null }

export type SpesCompletionReportMap = Partial<Record<SpesCompletionReportType, SpesCompletionReport>>

/** The applicant's own SPES appointment, as shown on their SPES page. */
export type SpesOwnAppointment = Pick<
  Database['esmdd']['Tables']['spes_appointments']['Row'],
  | 'id'
  | 'spes_year'
  | 'appointment_code'
  | 'assigned_province'
  | 'assigned_municipality'
  | 'assigned_barangay'
  | 'days_duration'
  | 'start_date'
  | 'end_date'
  | 'status'
  | 'decision_notes'
>
