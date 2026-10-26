import type { Database } from '@/types/database.types'

export type GipApplicationRow = Database['esmdd']['Tables']['gip_applicants']['Row']
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

/** A step of "How GIP works" on the applicant page. */
export interface GipStep {
  title: string
  description: string
}

// Same checklist PESO ticks when reviewing a GIP applicant (DOCUMENT_OPTIONS in useApplicantNewEntry.ts)
export const GIP_REQUIRED_DOCUMENTS: readonly string[] = [
  'NSRP',
  'Resume',
  'Application Letter',
  'TOR/Form 137/Form 138/Diploma',
  'Certificates',
]

export const GIP_ELIGIBILITY: readonly string[] = [
  '18 to 30 years old',
  'Finished at least high school or a technical-vocational course',
  'Resident of Agusan del Sur',
  'Registered in the PESO applicant registry (NSRP)',
]

export const GIP_STEPS: readonly GipStep[] = [
  { title: 'Register with PESO', description: 'Complete your profile and NSRP record so PESO can refer you to GIP.' },
  { title: 'Submit your documents', description: 'Bring or upload the requirements below; PESO checks them off as they arrive.' },
  { title: 'Wait for review', description: 'PESO approves or declines your application and notifies you either way.' },
  { title: 'Start your internship', description: 'Approved interns get an appointment to a government office for each term.' },
]
