import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

/** Migration 105 RPCs; untyped until `npm run types:gen` */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** The applicant's own job fair pre-registration (esmdd.job_fair_applicants) */
export const jobFairRegistrationService = {
  async register(jobFairId: string): Promise<void> {
    const { error } = await untypedEsmdd().rpc('register_for_job_fair', { p_job_fair_id: jobFairId })
    if (error) throw error
  },

  async cancel(jobFairId: string): Promise<void> {
    const { error } = await untypedEsmdd().rpc('cancel_job_fair_registration', { p_job_fair_id: jobFairId })
    if (error) throw error
  },
}
