import { supabase } from '@/lib/supabaseClient'
import type { ApplicantInsert, ApplicantRow } from '@/types/peso/provincialPeso/applicantEntry'

export const applicantEntryService = {
  /**
   * Fetch all applicant records from applicants.applicants schema
   */
  async fetchAllApplicants(): Promise<ApplicantRow[]> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Failed to fetch applicants registry data')
    }

    return (data ?? []) as ApplicantRow[]
  },

  /**
   * Fetch a single applicant record by ID
   */
  async fetchApplicantById(id: string): Promise<ApplicantRow | null> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(error.message || `Failed to fetch applicant with ID ${id}`)
    }

    return data as ApplicantRow | null
  },

  /**
   * Create a new applicant record in applicants.applicants schema
   */
  async createApplicant(payload: ApplicantInsert): Promise<ApplicantRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to register new applicant')
    }

    return data as ApplicantRow
  },
}

