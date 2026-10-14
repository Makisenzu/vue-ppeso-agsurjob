/**
 * Required documents ticked in `esmdd.tupad_applicants.doc_submitted`. All of them, plus the monthly
 * income, are needed before the applicant can be added to a batch (trg_tupad_guard_batch_requirements,
 * migration 022) — keep the names in sync with migrations 022 / 023.
 */
export const TUPAD_DOCUMENT_OPTIONS: readonly string[] = ['NSRP Form', 'Valid ID', 'TUPAD Form']

/** The registry entry is the NSRP form itself, so it is always ticked and cannot be unticked. */
export const TUPAD_LOCKED_DOCUMENT = 'NSRP Form'

export const TUPAD_ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const TUPAD_ATTACHMENT_ACCEPT = TUPAD_ATTACHMENT_MIME_TYPES.join(',')
export const TUPAD_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

/**
 * `esmdd.tupad_applicant_documents` (migration 023) — the file attached to a required document.
 * Declared here until `npm run types:gen` is re-run against the migrated database;
 * then derive it from `Database['esmdd']['Tables']['tupad_applicant_documents']` instead.
 */
export interface TupadApplicantDocumentRow {
  id: string
  tupad_applicant_id: string
  document_name: string
  file_name: string
  path: string
  mime_type: string | null
  size: number | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

/** Saved document file with a short-lived signed URL for viewing. */
export type TupadApplicantDocument = TupadApplicantDocumentRow & {
  url: string | null
}

/** Saved files per document name. */
export type TupadApplicantDocumentMap = Partial<Record<string, TupadApplicantDocument>>

/** Files picked in the form but not uploaded yet, per document name. */
export type TupadPendingDocumentMap = Partial<Record<string, File>>
