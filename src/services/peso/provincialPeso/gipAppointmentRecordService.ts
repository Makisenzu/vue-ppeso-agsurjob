import { supabase } from '@/lib/supabaseClient'
import type {
  GipAppointmentRecordSavePayload,
  SavedGipAppointmentRecord,
} from '@/types/peso/provincialPeso/gipAppointmentRecord'

const COLUMNS =
  'id, program, source_of_funds, designation, statement, signatories, entries, intern_count, gip_ids, created_by, created_at, updated_at'

// Table added by migration 117; not in the generated Database types yet
const table = () => (supabase.schema('esmdd') as any).from('gip_appointment_records')

const toRow = (payload: GipAppointmentRecordSavePayload) => ({
  program: payload.program,
  source_of_funds: payload.sourceOfFunds.trim(),
  designation: payload.designation.trim(),
  statement: payload.statement,
  signatories: payload.signatories,
  entries: payload.entries,
  gip_ids: payload.gipIds,
})

/** Saved GIP Appointment Records (esmdd.gip_appointment_records): Provincial PESO writes, oversight roles read */
export const gipAppointmentRecordService = {
  /** Newest first */
  async list(): Promise<SavedGipAppointmentRecord[]> {
    const { data, error } = await table().select(COLUMNS).order('created_at', { ascending: false })
    if (error) throw new Error(error.message || 'Could not load the appointment records.')
    return (data ?? []) as SavedGipAppointmentRecord[]
  },

  async create(payload: GipAppointmentRecordSavePayload): Promise<SavedGipAppointmentRecord> {
    const { data, error } = await table().insert(toRow(payload)).select(COLUMNS).single()
    if (error) throw new Error(error.message || 'Could not save the appointment record.')
    return data as SavedGipAppointmentRecord
  },

  /** Re-saving from the same dialog replaces the record instead of adding a duplicate */
  async update(id: string, payload: GipAppointmentRecordSavePayload): Promise<SavedGipAppointmentRecord> {
    const { data, error } = await table().update(toRow(payload)).eq('id', id).select(COLUMNS).single()
    if (error) throw new Error(error.message || 'Could not update the appointment record.')
    return data as SavedGipAppointmentRecord
  },

  /** Deletes the records; returns the ids actually removed (RLS hides a blocked delete as 0 rows) */
  async removeMany(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const { data, error } = await table().delete().in('id', ids).select('id')
    if (error) throw new Error(error.message || 'Could not delete the appointment records.')
    return ((data ?? []) as { id: string }[]).map((r) => r.id)
  },
}
