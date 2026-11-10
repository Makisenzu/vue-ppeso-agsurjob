// GIP accomplishment reports (esmdd.gip_accomplishments, migrations 112 / 114): one report per date range the
// intern picks inside their appointment term (reports don't overlap), on the intern's funding's form:
//   DOLE — GIP Work Accomplishment Report: the date and what the intern did that day (every weekday)
//   PGAS — Accomplishment Report: Activities / Output / Remarks, plus the Acknowledgement Receipt of Payment
// Written by the intern in the GIP portal (and generated / printed there), reviewed by Provincial PESO.

export const GIP_ACCOMPLISHMENT_STATUSES = ['Draft', 'Submitted', 'Reviewed', 'Returned'] as const
export type GipAccomplishmentStatus = (typeof GIP_ACCOMPLISHMENT_STATUSES)[number]

export const GIP_ACCOMPLISHMENT_DAY_STATUSES = ['Worked', 'Holiday', 'Leave'] as const
export type GipAccomplishmentDayStatus = (typeof GIP_ACCOMPLISHMENT_DAY_STATUSES)[number]

export type GipAccomplishmentProgram = 'PGAS' | 'DOLE'

/** Same limits as migration 112 */
export const GIP_ACCOMPLISHMENT_ENTRY_MAX = 1000
export const GIP_ACCOMPLISHMENT_ACTIVITY_MAX = 1000
export const GIP_ACCOMPLISHMENT_OUTPUT_MAX = 500
export const GIP_ACCOMPLISHMENT_REMARKS_MAX = 150
export const GIP_ACCOMPLISHMENT_ACTIVITIES_MAX = 50
export const GIP_ACCOMPLISHMENT_NAME_MAX = 150
export const GIP_ACCOMPLISHMENT_WORDS_MAX = 300
export const GIP_ACCOMPLISHMENT_FILE_MAX_BYTES = 10 * 1024 * 1024
export const GIP_ACCOMPLISHMENT_FILE_ACCEPT = 'application/pdf,.pdf'

/** What a PGAS activity row's Remarks says by default */
export const GIP_ACCOMPLISHMENT_DEFAULT_REMARKS = 'Accomplished'

/** One weekday of a report (an element of `daily_entries`) */
export interface GipAccomplishmentDay {
  date: string // YYYY-MM-DD
  status: GipAccomplishmentDayStatus
  /** What was done, one accomplishment per line (printed as bullets); required when Worked */
  entry: string | null
}

/** One row of a PGAS report (an element of `activities`) */
export interface GipAccomplishmentActivity {
  activity: string
  output: string | null
  remarks: string | null
}

/**
 * `esmdd.gip_accomplishments` (migration 112).
 * Declared here until `npm run types:gen` is re-run against the migrated database.
 */
export interface GipAccomplishmentRow {
  id: string
  appointment_id: string
  applicant_id: string
  program: GipAccomplishmentProgram
  period_start: string // YYYY-MM-DD
  period_end: string // YYYY-MM-DD
  daily_entries: GipAccomplishmentDay[]
  activities: GipAccomplishmentActivity[]
  designation: string | null
  supervisor_name: string | null
  approver_name: string | null
  approver_position: string | null
  /** PGAS: the pay the intern computed for the report's dates */
  amount: number | null
  amount_in_words: string | null
  file_name: string | null
  file_path: string | null
  file_size: number | null
  status: GipAccomplishmentStatus
  review_remarks: string | null
  reviewed_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

/** Printed on the form; PGAS also carries the payment receipt */
export interface GipAccomplishmentDetails {
  designation: string
  supervisor_name: string
  approver_name: string
  approver_position: string
  /** As typed, e.g. "5300.00"; PGAS only */
  amount: string
  amount_in_words: string
}

export interface GipAccomplishmentSavePayload {
  /** The report being edited; null creates one */
  id: string | null
  appointmentId: string
  /** The dates the report covers (YYYY-MM-DD), inside the term */
  periodStart: string
  periodEnd: string
  dailyEntries: GipAccomplishmentDay[]
  activities: GipAccomplishmentActivity[]
  details: GipAccomplishmentDetails
  /** Save as Draft (false) or submit for review (true) */
  submit: boolean
  /** A newly picked PDF; uploaded before the report is saved */
  file?: File | null
  /** Keep the report's current file; ignored when `file` is set */
  keepFile?: { path: string; name: string; size: number | null } | null
}

/** Everything the printed form shows besides the report itself */
export interface GipAccomplishmentPrintContext {
  internName: string
  office: string
  /** The days the report covers */
  from: string
  to: string
}

/** Badge colors per status (DESIGN.md tokens) */
export const GIP_ACCOMPLISHMENT_BADGE_CLASS: Record<GipAccomplishmentStatus, string> = {
  Draft: 'border-border bg-muted text-muted-foreground',
  Submitted: 'border-info/30 bg-info/10 text-info',
  Reviewed: 'border-success/30 bg-success/10 text-success',
  Returned: 'border-warning/30 bg-warning/10 text-warning',
}

export const GIP_ACCOMPLISHMENT_DAY_BADGE_CLASS: Record<GipAccomplishmentDayStatus, string> = {
  Worked: 'border-border text-foreground',
  Holiday: 'border-info/30 bg-info/10 text-info',
  Leave: 'border-warning/30 bg-warning/10 text-warning',
}
