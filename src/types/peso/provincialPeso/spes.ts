import type { Database } from '@/types/database.types'

export type SpesRow = Database['esmdd']['Tables']['spes']['Row']
export type SpesInsert = Database['esmdd']['Tables']['spes']['Insert']
export type SpesUpdate = Database['esmdd']['Tables']['spes']['Update']

export type { SpesFormRow, SpesFormInsert, SpesFormUpdate } from '@/types/common/spesForm'
import type { SpesFormRow } from '@/types/common/spesForm'

/** Registered jobseeker (Entry of Applicants) that a staff-encoded SPES form is linked to. */
export type SpesLinkableJobseeker = Pick<
  Database['applicants']['Tables']['applicants']['Row'],
  'id' | 'profile_id' | 'first_name' | 'middle_name' | 'surname' | 'date_of_birth' | 'sex' | 'civil_status' | 'contact_numbers' | 'email'
> & { profile_id: string }

/** PESO review of a submitted SPES form (`applicants.spes_form.status` / `remarks`). */
export type SpesFormReview = Pick<SpesFormRow, 'status' | 'remarks'>

/** SPES beneficiary row joined with the SPES form it was enrolled from (`application_id`). */
export type SpesWithApplicant = SpesRow & {
  spes_form: SpesFormRow | null
}

/**
 * `esmdd.spes_appointments` (migration 015) — one row per beneficiary per SPES year.
 * Declared here until `npm run types:gen` is re-run against the migrated database;
 * then derive it from `Database['esmdd']['Tables']['spes_appointments']` instead.
 */
export interface SpesAppointmentRow {
  id: string
  spes_id: string
  spes_year: number
  appointment_code: string
  assigned_office: string
  supervisor: string | null
  daily_wage: number | null
  days_duration: number
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  status: SpesStatus
  decision_notes: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

export type SpesAppointmentInsert = Pick<
  SpesAppointmentRow,
  'spes_id' | 'spes_year' | 'appointment_code' | 'assigned_office' | 'days_duration' | 'start_date' | 'end_date'
> &
  Partial<Pick<SpesAppointmentRow, 'supervisor' | 'daily_wage' | 'status' | 'decision_notes' | 'decided_by' | 'decided_at'>>

export type SpesAppointmentUpdate = Partial<Omit<SpesAppointmentRow, 'id' | 'spes_id' | 'created_at' | 'updated_at'>>

/** Appointment details PESO encodes when appointing (or re-appointing) a beneficiary for a SPES year. */
export type SpesAppointmentDetails = Pick<
  SpesAppointmentRow,
  'spes_year' | 'assigned_office' | 'supervisor' | 'daily_wage' | 'days_duration' | 'start_date' | 'end_date' | 'decision_notes'
>

/** SPES beneficiary with every yearly appointment, newest SPES year first. */
export type SpesBeneficiary = SpesWithApplicant & {
  appointments: SpesAppointmentRow[]
}

/** Status shown in the UI: the stored status, or the date-derived state of an Active appointment. */
export type SpesAppointmentDisplayStatus = SpesStatus | 'Expiring Soon' | 'Expired'

export interface SpesAppointmentTiming {
  displayStatus: SpesAppointmentDisplayStatus
  daysRemaining: number | null
  isExpiringSoon: boolean
  isExpired: boolean
}

/** One appointment in the yearly SPES list, with its beneficiary and how many times they have availed SPES. */
export type SpesAppointmentEntry = SpesAppointmentRow &
  SpesAppointmentTiming & {
    beneficiary: SpesBeneficiary
    /** 1 for a first-time beneficiary, 2+ for each earlier SPES year they were appointed. */
    availmentNumber: number
  }

/** Who an appointment is for: a newly approved applicant (enrolled on save) or an existing beneficiary. */
export type SpesAppointee = { kind: 'applicant'; formId: string } | { kind: 'beneficiary'; spesId: string }

export const SPES_CONCLUDE_STATUSES = ['Completed', 'Terminated'] as const
export type SpesConcludeStatus = (typeof SPES_CONCLUDE_STATUSES)[number]

export const SPES_APPLICANT_STATUSES = ['Pending', 'Approved', 'Rejected'] as const
export type SpesApplicantStatus = (typeof SPES_APPLICANT_STATUSES)[number]

export const SPES_STATUSES = ['Active', 'Completed', 'Terminated'] as const
export type SpesStatus = (typeof SPES_STATUSES)[number]

export const SPES_BENEFICIARY_TYPES = ['New', 'Returning'] as const
export type SpesBeneficiaryType = (typeof SPES_BENEFICIARY_TYPES)[number]

/** A SPES appointment lasts 10 or 20 working days (`spes_appointments_days_duration_options`, migration 016). */
export const SPES_DURATION_OPTIONS = [10, 20] as const
export type SpesDurationOption = (typeof SPES_DURATION_OPTIONS)[number]

/** Pending applicant who submitted all 5 documentary requirements and can be drawn by the randomizer. */
export type SpesDrawCandidate = {
  form: SpesFormRow
  name: string
}

/** Draw pool of one municipality. */
export interface SpesDrawMunicipality {
  municipality: string
  candidates: SpesDrawCandidate[]
}
