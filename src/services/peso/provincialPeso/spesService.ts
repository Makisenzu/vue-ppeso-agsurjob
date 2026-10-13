import { supabase } from '@/lib/supabaseClient'
import type {
  SpesFormInsert,
  SpesFormReview,
  SpesFormRow,
  SpesFormUpdate,
  SpesInsert,
  SpesLinkableJobseeker,
  SpesRow,
  SpesUpdate,
  SpesWithApplicant,
} from '@/types/peso/provincialPeso/spes'

// PostgREST cannot embed across schemas, so the `applicants.spes_form` rows a
// beneficiary was enrolled from are fetched separately and merged by `application_id`.
async function fetchFormsByIds(formIds: string[]): Promise<Map<string, SpesFormRow>> {
  const uniqueIds = [...new Set(formIds)]
  if (!uniqueIds.length) return new Map()

  const { data, error } = await supabase
    .schema('applicants')
    .from('spes_form')
    .select('*')
    .in('id', uniqueIds)

  if (error) throw new Error(error.message || 'Failed to load SPES forms.')
  return new Map((data ?? []).map((form) => [form.id, form]))
}

async function attachForms(rows: SpesRow[]): Promise<SpesWithApplicant[]> {
  const forms = await fetchFormsByIds(rows.flatMap((row) => (row.application_id ? [row.application_id] : [])))
  return rows.map((row) => ({ ...row, spes_form: row.application_id ? forms.get(row.application_id) ?? null : null }))
}

export const spesService = {
  // ─── SPES Forms (applicants.spes_form) ───

  async fetchSpesForms(): Promise<SpesFormRow[]> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load SPES forms.')
    return data ?? []
  },

  async fetchSpesFormById(formId: string): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .select('*')
      .eq('id', formId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load the SPES form.')
    if (!data) throw new Error('SPES form not found.')
    return data
  },

  async createSpesForm(payload: SpesFormInsert): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to save the SPES form.')
    return data
  },

  async updateSpesForm(formId: string, payload: SpesFormUpdate): Promise<SpesFormRow> {
    // updated_at is set by the spes_form_set_updated_at trigger
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .update(payload)
      .eq('id', formId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the SPES form.')
    return data
  },

  /** PESO review decision (status / remarks) on a submitted form. */
  async reviewSpesForm(formId: string, review: SpesFormReview): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .update(review)
      .eq('id', formId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the SPES application status.')
    return data
  },

  /** Also removes its SPES beneficiary record (ON DELETE CASCADE). */
  async deleteSpesForm(formId: string): Promise<void> {
    const { error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .delete()
      .eq('id', formId)

    if (error) throw new Error(error.message || 'Failed to delete the SPES form.')
  },

  /** Jobseekers from Entry of Applicants that have an account a SPES form can belong to. */
  async fetchLinkableJobseekers(): Promise<SpesLinkableJobseeker[]> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('id, profile_id, first_name, middle_name, surname, date_of_birth, sex, civil_status, contact_numbers, email')
      .not('profile_id', 'is', null)
      .order('surname', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load jobseeker accounts.')
    return (data ?? []) as SpesLinkableJobseeker[]
  },

  // ─── SPES Beneficiaries (esmdd.spes) ───

  async fetchSpes(): Promise<SpesWithApplicant[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('spes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load SPES beneficiaries.')
    return attachForms(data ?? [])
  },

  async createSpes(payload: SpesInsert): Promise<SpesWithApplicant> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('spes')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error('This SPES applicant is already enrolled as a beneficiary.')
      throw new Error(error.message || 'Failed to add SPES beneficiary.')
    }
    const [created] = await attachForms([data])
    return created!
  },

  async updateSpes(spesId: string, payload: SpesUpdate): Promise<SpesWithApplicant> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('spes')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', spesId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update SPES beneficiary.')
    const [updated] = await attachForms([data])
    return updated!
  },

  async deleteSpes(spesId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('spes')
      .delete()
      .eq('id', spesId)

    if (error) throw new Error(error.message || 'Failed to delete SPES beneficiary.')
  },
}
