import { supabase } from '@/lib/supabaseClient'
import type {
  SpesFormInsert,
  SpesFormRow,
  SpesFormTableInsert,
  SpesFormTableUpdate,
  SpesFormUpdate,
  SpesOwnAppointment,
} from '@/types/common/spesForm'

export const spesFormService = {
  /** The applicant's most recent SPES form, if they have submitted one. */
  async fetchMyForm(profileId: string): Promise<SpesFormRow | null> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load your SPES application.')
    return data
  },

  /** SPES appointments of the applicant's form, newest SPES year first (RLS: own rows only). */
  async fetchMyAppointments(formId: string): Promise<SpesOwnAppointment[]> {
    const { data: spes, error: spesErr } = await supabase
      .schema('esmdd')
      .from('spes')
      .select('id')
      .eq('application_id', formId)
      .maybeSingle()

    if (spesErr) throw new Error(spesErr.message || 'Failed to load your SPES appointment.')
    if (!spes) return []

    const { data, error } = await supabase
      .schema('esmdd')
      .from('spes_appointments')
      .select('id, spes_year, appointment_code, assigned_province, assigned_municipality, assigned_barangay, days_duration, start_date, end_date, status, decision_notes')
      .eq('spes_id', spes.id)
      .order('spes_year', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load your SPES appointment.')
    return data ?? []
  },

  async createForm(payload: SpesFormInsert): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .insert(payload as SpesFormTableInsert)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to submit your SPES application.')
    return data
  },

  async updateForm(formId: string, payload: SpesFormUpdate): Promise<SpesFormRow> {
    // updated_at is set by the spes_form_set_updated_at trigger
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .update(payload as SpesFormTableUpdate)
      .eq('id', formId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update your SPES application.')
    return data
  },
}
