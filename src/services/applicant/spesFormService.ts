import { supabase } from '@/lib/supabaseClient'
import type {
  SpesFormInsert,
  SpesFormRow,
  SpesFormUpdate,
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

  async createForm(payload: SpesFormInsert): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .insert(payload)
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
      .update(payload)
      .eq('id', formId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update your SPES application.')
    return data
  },
}
