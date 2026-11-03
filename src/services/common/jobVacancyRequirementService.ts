import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { JobVacancyRequirement } from '@/types/common/jobVacancyApplication'

/**
 * esmdd.job_vacancy_requirements (migration 088) is not in database.types.ts until `npm run types:gen`
 * is re-run, so the typed client rejects its name. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** Keeps `.in()` URLs well under PostgREST's length limit */
const IN_FILTER_CHUNK_SIZE = 150

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

  /** Requirements of several vacancies (one job fair's offers), grouped by vacancy in the employer's order */
  async fetchRequirementsByVacancy(vacancyIds: string[]): Promise<Map<string, JobVacancyRequirement[]>> {
    const byVacancy = new Map<string, JobVacancyRequirement[]>()
    for (let i = 0; i < vacancyIds.length; i += IN_FILTER_CHUNK_SIZE) {
      const { data, error } = await untypedEsmdd()
        .from('job_vacancy_requirements')
        .select('job_vacancy_id, requirement_name, is_required')
        .in('job_vacancy_id', vacancyIds.slice(i, i + IN_FILTER_CHUNK_SIZE))
        .order('sort_order', { ascending: true })

      if (error) throw error
      for (const { job_vacancy_id, ...requirement } of (data ?? []) as (JobVacancyRequirement & { job_vacancy_id: string })[]) {
        const list = byVacancy.get(job_vacancy_id) ?? []
        list.push(requirement)
        byVacancy.set(job_vacancy_id, list)
      }
    }
    return byVacancy
  },
}
