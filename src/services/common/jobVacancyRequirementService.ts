import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { JobVacancyRequirement } from '@/types/common/jobVacancyApplication'

/**
 * esmdd.job_vacancy_requirements (migration 088) is not in database.types.ts until `npm run types:gen`
 * is re-run, so the typed client rejects its name. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** The documents a vacancy asks applicants to submit (every signed-in user may read them) */
export const jobVacancyRequirementService = {
  /** One vacancy's requirements, in the employer's order (at most 15 rows) */
  async fetchRequirements(vacancyId: string): Promise<JobVacancyRequirement[]> {
    const { data, error } = await untypedEsmdd()
      .from('job_vacancy_requirements')
      .select('requirement_name, is_required')
      .eq('job_vacancy_id', vacancyId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as JobVacancyRequirement[]
  },
}
