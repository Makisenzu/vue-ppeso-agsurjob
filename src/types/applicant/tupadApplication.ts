import type { Database } from '@/types/database.types'

// applied_online / orientation_at / orientation_note (migration 070) are not in database.types.ts until
// `npm run types:gen` is re-run
export type TupadApplicationRow = Database['esmdd']['Tables']['tupad_applicants']['Row'] & {
  applied_online?: boolean
  orientation_at?: string | null
  orientation_note?: string | null
}
type TupadBatchRow = Database['esmdd']['Tables']['tupad_batch']['Row']
type TupadRow = Database['esmdd']['Tables']['tupad']['Row']

/** Applicant-editable details of their TUPAD application; the checklist follows the uploads (070). */
export type TupadApplicationPatch = Pick<TupadApplicationRow, 'monthly_income' | 'dependent_name'>

/** A batch the applicant was added to, as a beneficiary. */
export type MyTupadEngagement = Pick<TupadRow, 'id' | 'days_duration' | 'status' | 'remarks'> & {
  batch: Pick<TupadBatchRow, 'edl_number' | 'start_date' | 'end_date' | 'status'> | null
}
