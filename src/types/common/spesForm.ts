import { Constants, type Database } from '@/types/database.types'

type ApplicantsTables = Database['applicants']['Tables']
type ApplicantsEnums = Database['applicants']['Enums']

/**
 * `municipality` comes from migration 016 and is not in database.types.ts until `npm run types:gen`
 * is re-run against the migrated database; drop the intersections then.
 */
type SpesFormMunicipality = { municipality?: string | null }

export type SpesFormRow = ApplicantsTables['spes_form']['Row'] & SpesFormMunicipality
export type SpesFormInsert = ApplicantsTables['spes_form']['Insert'] & SpesFormMunicipality
export type SpesFormUpdate = ApplicantsTables['spes_form']['Update'] & SpesFormMunicipality

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

export const SPES_DOCUMENT_REQUIREMENTS = [
  { key: 'has_birth_certificate', label: 'Birth certificate', hint: 'PSA / NSO copy' },
  { key: 'has_income_proof', label: 'Proof of family income', hint: 'ITR, certificate of tax exemption, or indigency from the barangay' },
  { key: 'has_passing_grade_proof', label: 'Proof of passing grades', hint: 'Report card or transcript for the last school term' },
  { key: 'has_registrar_certification', label: 'Registrar certification', hint: 'Certificate of enrollment / attendance from the school registrar' },
  { key: 'has_osy_certification', label: 'Out-of-school youth certification', hint: 'From the barangay or DSWD — out-of-school youth only' },
] as const

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
  'id' | 'spes_year' | 'appointment_code' | 'assigned_office' | 'supervisor' | 'days_duration' | 'start_date' | 'end_date' | 'status' | 'decision_notes'
>
