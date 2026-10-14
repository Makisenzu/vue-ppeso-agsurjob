import { supabase } from '@/lib/supabaseClient'
import type {
  MyTupadEngagement,
  TupadApplicationPatch,
  TupadApplicationRow,
} from '@/types/applicant/tupadApplication'

/** The signed-in applicant's own TUPAD application (RLS limits every query to their rows). */
export const tupadApplicationService = {
  /** TUPAD application of a registry applicant, or null when they are not referred to TUPAD. */
  async fetchMyApplication(applicantId: string): Promise<TupadApplicationRow | null> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .select('*')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load your TUPAD application')
    return data
  },

  async updateMyApplication(id: string, patch: TupadApplicationPatch): Promise<TupadApplicationRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to save your TUPAD application')
    // RLS hides the row once PESO reviews it or adds the applicant to a batch
    if (!data) throw new Error('Your TUPAD application can no longer be edited. Please reload the page.')
    return data
  },

  async fetchMyEngagements(tupadApplicantId: string): Promise<MyTupadEngagement[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad')
      .select('id, days_duration, status, remarks, tupad_batch(edl_number, start_date, end_date, status)')
      .eq('tupad_applicant_id', tupadApplicantId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load your TUPAD batches')
    return (data ?? []).map(({ tupad_batch, ...row }) => ({ ...row, batch: tupad_batch }))
  },
}
