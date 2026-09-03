import { supabase } from '@/lib/supabaseClient'
import type { ApplicantRow } from '@/types/peso/provincialPeso/applicantEntry'

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
}
