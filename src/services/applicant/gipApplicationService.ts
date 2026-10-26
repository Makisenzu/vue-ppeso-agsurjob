import { supabase } from '@/lib/supabaseClient'
import type { GipApplicationRow, MyGipInternship } from '@/types/applicant/gipApplication'

/** The signed-in applicant's own GIP records (RLS: applicant_own_select, migration 034); applying goes through an RPC. */
export const gipApplicationService = {
  /** Latest GIP application of a registry applicant, or null when they are not referred to GIP. */
  async fetchMyApplication(applicantId: string): Promise<GipApplicationRow | null> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .select('*')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load your GIP application')
    return data
  },

  async fetchMyInternships(applicationId: string): Promise<MyGipInternship[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gips')
      .select(
        'id, status, gip_appointments(id, term_number, appointment_code, program, assigned_office, supervisor, daily_stipend, start_date, end_date, status)'
      )
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load your GIP internship')
    return (data ?? []).map(({ gip_appointments, ...row }) => ({
      ...row,
      appointments: [...(gip_appointments ?? [])].sort((a, b) => b.term_number - a.term_number),
    }))
  },

  /** Applies the signed-in applicant to GIP, or returns their existing application (migration 060). */
  async applyToGip(): Promise<GipApplicationRow> {
    // apply_to_gip is not in database.types.ts until `npm run types:gen` is re-run
    const { data, error } = await (supabase.schema('esmdd') as any).rpc('apply_to_gip')

    if (error) throw new Error(error.message || 'Failed to submit your GIP application')
    return data as GipApplicationRow
  },
}
