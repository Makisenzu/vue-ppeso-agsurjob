import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { JobVacancyStage } from '@/types/common/jobVacancyApplication'

/**
 * esmdd.job_vacancy_stages (migration 089) is not in database.types.ts until `npm run types:gen`
 * is re-run, so the typed client rejects its name. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** The hiring steps of a vacancy (every signed-in user may read them) */
export const jobVacancyStageService = {
  /** One vacancy's steps in order (at most 12 rows); the last one means hired */
  async fetchStages(vacancyId: string): Promise<JobVacancyStage[]> {
    const { data, error } = await untypedEsmdd()
      .from('job_vacancy_stages')
      .select('id, stage_name, sort_order')
      .eq('job_vacancy_id', vacancyId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as JobVacancyStage[]
  },
}
