import type { Database } from '@/types/database.types'

// applied_online / orientation_* (migration 070) are not in database.types.ts until `npm run types:gen`
export type TupadApplicantRow = Database['esmdd']['Tables']['tupad_applicants']['Row'] & {
  applied_online?: boolean
  orientation_at?: string | null
  orientation_note?: string | null
}
export type TupadApplicantInsert = Database['esmdd']['Tables']['tupad_applicants']['Insert']
export type TupadApplicantUpdate = Database['esmdd']['Tables']['tupad_applicants']['Update']

// status_remarks (migration 055: why it was cancelled) is not in database.types.ts until `npm run types:gen`
export type TupadBatchRow = Database['esmdd']['Tables']['tupad_batch']['Row'] & { status_remarks?: string | null }
export type TupadBatchInsert = Database['esmdd']['Tables']['tupad_batch']['Insert']
export type TupadBatchUpdate = Database['esmdd']['Tables']['tupad_batch']['Update']

export type TupadRow = Database['esmdd']['Tables']['tupad']['Row']
export type TupadInsert = Database['esmdd']['Tables']['tupad']['Insert']
export type TupadUpdate = Database['esmdd']['Tables']['tupad']['Update']

/** Status values allowed by the CHECK constraints in migration 020_tupad.sql. */
export const TUPAD_APPLICANT_STATUSES = ['Pending', 'Approved', 'Rejected'] as const
export const TUPAD_BATCH_STATUSES = ['Pending', 'Ongoing', 'Completed', 'Cancelled'] as const
export const TUPAD_STATUSES = ['Active', 'Completed', 'Terminated'] as const

export type TupadApplicantStatus = (typeof TUPAD_APPLICANT_STATUSES)[number]
export type TupadBatchStatus = (typeof TUPAD_BATCH_STATUSES)[number]
export type TupadStatus = (typeof TUPAD_STATUSES)[number]

// Required documents are shared with the applicant's own TUPAD application page
export { TUPAD_DOCUMENT_OPTIONS, TUPAD_LOCKED_DOCUMENT } from '@/types/common/tupad'
export type { TupadApplicantDocumentMap } from '@/types/common/tupad'

/** Registry fields shown next to a TUPAD applicant (`applicants.applicants`). */
export type TupadRegistryApplicant = Pick<
  Database['applicants']['Tables']['applicants']['Row'],
  'id' | 'profile_id' | 'first_name' | 'middle_name' | 'surname' | 'suffix' | 'sex' | 'date_of_birth' | 'age' | 'contact_numbers' | 'address'
>

/** TUPAD applicant merged with its registry record (PostgREST cannot embed across schemas). */
export type TupadApplicantWithRegistry = TupadApplicantRow & {
  applicant: TupadRegistryApplicant | null
}

/** Batch with the number of applicants engaged in it. */
export type TupadBatchWithCount = TupadBatchRow & {
  member_count: number
}

/** An applicant's engagement in a batch, with the TUPAD applicant and registry record. */
export type TupadMember = TupadRow & {
  tupad_applicant: TupadApplicantWithRegistry | null
}

/** Batch form values (create / edit). */
export type TupadBatchFormValues = Pick<TupadBatchRow, 'edl_number' | 'start_date' | 'end_date'> & {
  status: TupadBatchStatus
  /** Required when Cancelled */
  status_remarks: string | null
}

/** PESO review of a TUPAD applicant. */
export type TupadApplicantReview = Pick<TupadApplicantRow, 'monthly_income' | 'dependent_name' | 'doc_submitted'> & {
  status: TupadApplicantStatus
  /** Required when Rejected */
  status_remarks: string | null
  /** When the applicant comes to the office for orientation (ISO); required when Approved */
  orientation_at: string | null
  orientation_note: string | null
}

/** Editable fields of an engagement. */
export type TupadMemberFormValues = Pick<TupadRow, 'days_duration' | 'remarks'> & {
  status: TupadStatus
}

export type TupadAttachmentRow = Database['esmdd']['Tables']['tupad_attachments']['Row']

/** Attachment with a short-lived signed URL for viewing (documents bucket). */
export type TupadAttachmentWithUrl = TupadAttachmentRow & {
  url: string | null
}

/**
 * Status of one work day in a beneficiary's daily log. Work days are not tied to the calendar
 * (beneficiaries may work on weekends): Day N is the Nth date they uploaded something.
 * submitted — the day has an upload; next — the next day to be submitted; pending — later days.
 */
export type TupadDayStatus = 'submitted' | 'next' | 'pending'

export interface TupadDailyLogDay {
  day: number
  /** Date the beneficiary uploaded for this day (YYYY-MM-DD, Asia/Manila); null until they do. */
  date: string | null
  status: TupadDayStatus
  attachments: TupadAttachmentWithUrl[]
}

export interface TupadDailyLog {
  days: TupadDailyLogDay[]
  /** Uploads on dates after the last work day, so nothing the beneficiary sent is hidden. */
  extraAttachments: TupadAttachmentWithUrl[]
  submitted: number
  /** Date of the most recent upload (YYYY-MM-DD), or null when nothing was uploaded yet. */
  lastUploadDate: string | null
}
