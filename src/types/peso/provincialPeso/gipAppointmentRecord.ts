import type {
  GipAppointmentRecordRow,
  GipAppointmentSignatory,
} from '@/helpers/peso/provincialPeso/gipAppointmentRecordHelper'

export type GipAppointmentRecordProgram = 'PGAS' | 'DOLE' | 'Mixed'

/** A saved Appointment Record (esmdd.gip_appointment_records, migration 117): the rows exactly as printed */
export interface SavedGipAppointmentRecord {
  id: string
  program: GipAppointmentRecordProgram
  source_of_funds: string
  designation: string
  statement: string
  signatories: GipAppointmentSignatory[]
  entries: GipAppointmentRecordRow[]
  intern_count: number
  gip_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface GipAppointmentRecordSavePayload {
  program: GipAppointmentRecordProgram
  sourceOfFunds: string
  designation: string
  statement: string
  signatories: GipAppointmentSignatory[]
  entries: GipAppointmentRecordRow[]
  gipIds: string[]
}
