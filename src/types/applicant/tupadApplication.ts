import type { Database } from '@/types/database.types'

export type TupadApplicationRow = Database['esmdd']['Tables']['tupad_applicants']['Row']
type TupadBatchRow = Database['esmdd']['Tables']['tupad_batch']['Row']
type TupadRow = Database['esmdd']['Tables']['tupad']['Row']

/** Applicant-editable fields of their TUPAD application. */
export type TupadApplicationPatch = Pick<TupadApplicationRow, 'monthly_income' | 'dependent_name' | 'doc_submitted'>

/** A batch the applicant was added to, as a beneficiary. */
export type MyTupadEngagement = Pick<TupadRow, 'id' | 'days_duration' | 'status' | 'remarks'> & {
  batch: Pick<TupadBatchRow, 'edl_number' | 'start_date' | 'end_date' | 'status'> | null
}
