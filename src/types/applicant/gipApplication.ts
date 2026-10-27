import type { Database } from '@/types/database.types'

// orientation_* (migration 066) are declared here until `npm run types:gen` is re-run
export type GipApplicationRow = Database['esmdd']['Tables']['gip_applicants']['Row'] & {
  orientation_at?: string | null
  orientation_note?: string | null
}
type GipRow = Database['esmdd']['Tables']['gips']['Row']
type GipAppointmentRow = Database['esmdd']['Tables']['gip_appointments']['Row']

/** A term the applicant was appointed to as a GIP intern. */
export type MyGipAppointment = Pick<
  GipAppointmentRow,
  | 'id'
  | 'term_number'
  | 'appointment_code'
  | 'program'
  | 'assigned_office'
  | 'supervisor'
  | 'daily_stipend'
  | 'start_date'
  | 'end_date'
  | 'status'
>

/** The applicant's GIP internship record, with its appointments newest term first. */
export type MyGipInternship = Pick<GipRow, 'id' | 'status'> & { appointments: MyGipAppointment[] }
