import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { mediaService } from '@/services/common/mediaService'
import { JOB_FAIR_ATTACHMENT_BUCKET } from '@/types/peso/provincialPeso/jobFair'
import type {
  JobFairCompanyRow,
  JobFairEvent,
  JobFairEventRow,
  JobFairListScope,
  JobFairPublicVacancyRow,
} from '@/types/common/jobFairEvent'

/**
 * The job fair RPCs (migrations 105–107) are not in database.types.ts until `npm run types:gen`, so the
 * typed client rejects their names. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** The bucket is public (009), so the pictures load from plain URLs */
const withImageUrls = (row: JobFairEventRow): JobFairEvent => ({
  ...row,
  image_urls: (row.image_paths ?? []).map((path) => mediaService.getPublicUrl(path, JOB_FAIR_ATTACHMENT_BUCKET)),
})

/** Job fairs as applicants and employers see them (bounded: one row per fair, at most 200) */
export const jobFairEventService = {
  /** Upcoming / ongoing: newest post first. Past: latest fair first. */
  async fetchEvents(scope: JobFairListScope): Promise<JobFairEvent[]> {
    const { data, error } = await untypedEsmdd().rpc('list_job_fair_events', { p_include_past: scope === 'past' })
    if (error) throw error
    return ((data ?? []) as JobFairEventRow[]).map(withImageUrls)
  },

  async fetchEvent(jobFairId: string): Promise<JobFairEvent> {
    const { data, error } = await untypedEsmdd().rpc('list_job_fair_events', { p_job_fair_id: jobFairId })
    if (error) throw error
    const [row] = (data ?? []) as JobFairEventRow[]
    if (!row) throw new Error('Job fair not found.')
    return withImageUrls(row)
  },

  /** Confirmed / Attended companies of one fair */
  async fetchCompanies(jobFairId: string): Promise<JobFairCompanyRow[]> {
    const { data, error } = await untypedEsmdd().rpc('list_job_fair_companies', { p_job_fair_id: jobFairId })
    if (error) throw error
    return (data ?? []) as JobFairCompanyRow[]
  },

  /** Open offers of those companies */
  async fetchVacancies(jobFairId: string): Promise<JobFairPublicVacancyRow[]> {
    const { data, error } = await untypedEsmdd().rpc('list_job_fair_vacancies', { p_job_fair_id: jobFairId })
    if (error) throw error
    return (data ?? []) as JobFairPublicVacancyRow[]
  },
}
