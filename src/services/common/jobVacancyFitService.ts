import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { JobVacancyFit } from '@/types/common/jobVacancyFit'

/**
 * The RPCs of migration 098 are not in database.types.ts until `npm run types:gen` is re-run, so the
 * typed client rejects their names. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** Vacancy fit (migration 098). The database decides who may see which fit */
export const jobVacancyFitService = {
  /** The signed-in applicant's own fit to a vacancy; null without an NSRP record */
  async fetchMyFit(vacancyId: string): Promise<JobVacancyFit | null> {
    const { data, error } = await untypedEsmdd().rpc('my_job_vacancy_fit', { p_job_vacancy_id: vacancyId })
    if (error) throw error
    return (data as JobVacancyFit | null) ?? null
  },

  /** One application's breakdown, for the vacancy's reviewers; the database logs this view (PRIVACY.md §5.2) */
  async fetchApplicationFit(applicationId: string): Promise<JobVacancyFit | null> {
    const { data, error } = await untypedEsmdd().rpc('get_job_vacancy_application_fit', {
      p_application_id: applicationId,
    })
    if (error) throw error
    return (data as JobVacancyFit | null) ?? null
  },
}
