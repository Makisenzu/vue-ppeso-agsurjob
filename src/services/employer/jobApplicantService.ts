import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { assertStatusRemarks, normalizeStatusRemarks } from '@/helpers/common/statusRemarksHelper'
import { jobVacancyRequirementService } from '@/services/common/jobVacancyRequirementService'
import { jobVacancyStageService } from '@/services/common/jobVacancyStageService'
import type { JobApplicationStage } from '@/types/common/jobVacancyApplication'
import type {
  ApplicantStageCounts,
  ApplicantStageFilter,
  ApplicantStepCounts,
  ApplicantVacancySummary,
  VacancyApplicantPage,
  VacancyApplicantQuery,
  VacancyApplicantRow,
  VacancyApplicationDetails,
} from '@/types/employer/jobApplicant'

/**
 * The RPCs and tables of migration 087 are not in database.types.ts until `npm run types:gen` is
 * re-run, so the typed client rejects their names. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

const EMPTY_COUNTS = (): ApplicantStageCounts => ({
  all: 0,
  applied: 0,
  in_progress: 0,
  hired: 0,
  rejected: 0,
})

/** The search RPC's status / step filter for a chip value */
const toStageParams = (filter: ApplicantStageFilter) => ({
  p_stage: filter === 'applied' || filter === 'rejected' ? filter : null,
  p_stage_id: filter === 'all' || filter === 'applied' || filter === 'rejected' ? null : filter,
})

/** Applicants of the company's vacancies. RLS / the RPCs only return vacancies the caller may review. */
export const jobApplicantService = {
  /** Applicants per stage of each vacancy (up to one page of vacancies), counted in SQL */
  async fetchStageCounts(vacancyIds: string[]): Promise<Map<string, ApplicantStageCounts>> {
    const byVacancy = new Map<string, ApplicantStageCounts>()
    if (vacancyIds.length === 0) return byVacancy

    const { data, error } = await untypedEsmdd().rpc('job_vacancy_application_stats', { p_job_vacancy_ids: vacancyIds })
    if (error) throw error

    for (const row of (data ?? []) as { job_vacancy_id: string; stage: JobApplicationStage; total: number }[]) {
      const counts = byVacancy.get(row.job_vacancy_id) ?? EMPTY_COUNTS()
      const total = Number(row.total)
      counts[row.stage] = total
      counts.all += total
      byVacancy.set(row.job_vacancy_id, counts)
    }
    return byVacancy
  },

  emptyCounts: EMPTY_COUNTS,

  /** The vacancy shown above its applicants, with the documents it asks for (migration 088) */
  async fetchVacancy(vacancyId: string): Promise<ApplicantVacancySummary | null> {
    const [{ data, error }, requirements, stages] = await Promise.all([
      supabase
        .schema('esmdd')
        .from('job_vacancies')
        .select('id, position_title, status, vacancy_count, place_of_work, valid_until')
        .eq('id', vacancyId)
        .maybeSingle(),
      jobVacancyRequirementService.fetchRequirements(vacancyId),
      jobVacancyStageService.fetchStages(vacancyId),
    ])

    if (error) throw error
    return data ? { ...data, requirements, stages } : null
  },

  /** One page of a vacancy's applicants, searched by name and filtered by stage in SQL (BACKEND.md §19) */
  async searchApplicants(vacancyId: string, query: VacancyApplicantQuery): Promise<VacancyApplicantPage> {
    const { data, error } = await untypedEsmdd().rpc('search_job_vacancy_applications', {
      p_job_vacancy_id: vacancyId,
      p_search: query.search.trim() || null,
      ...toStageParams(query.stage),
      p_limit: query.pageSize,
      p_offset: query.page * query.pageSize,
    })

    if (error) throw error
    const rows = (data ?? []) as VacancyApplicantRow[]
    return { rows, total: Number(rows[0]?.total_count ?? 0) }
  },

  /** One application with the applicant's summary; the database logs this view (PRIVACY.md §5.2) */
  async fetchApplication(applicationId: string): Promise<VacancyApplicationDetails> {
    const { data, error } = await untypedEsmdd().rpc('get_job_vacancy_application', { p_application_id: applicationId })

    if (error) throw error
    return data as VacancyApplicationDetails
  },

  /** One vacancy's applicants per status and hiring step, for its filter chips */
  async fetchStepCounts(vacancyId: string): Promise<ApplicantStepCounts> {
    const { data, error } = await untypedEsmdd().rpc('job_vacancy_application_stage_counts', { p_job_vacancy_id: vacancyId })
    if (error) throw error

    const counts: ApplicantStepCounts = { all: 0, applied: 0, rejected: 0, byStep: {} }
    for (const row of (data ?? []) as { stage: JobApplicationStage; stage_id: string | null; total: number }[]) {
      const total = Number(row.total)
      counts.all += total
      if (row.stage === 'applied') counts.applied += total
      else if (row.stage === 'rejected') counts.rejected += total
      else if (row.stage_id) counts.byStep[row.stage_id] = (counts.byStep[row.stage_id] ?? 0) + total
    }
    return counts
  },

  /**
   * Moves an application: 'applied' (back to New), 'rejected' (Not selected; needs remarks, BACKEND.md §17.8)
   * or a hiring step id. The database derives in progress / hired from the step and notifies the applicant (089).
   */
  async moveApplication(applicationId: string, target: ApplicantStageFilter, remarks: string | null): Promise<void> {
    assertStatusRemarks(target, remarks)
    const update =
      target === 'rejected'
        ? { stage: 'rejected', status_remarks: normalizeStatusRemarks(remarks) }
        : target === 'applied'
          ? { stage: 'applied', stage_id: null, status_remarks: null }
          : { stage: 'in_progress', stage_id: target, status_remarks: null }
    const { data, error } = await untypedEsmdd()
      .from('job_vacancy_applications')
      .update(update)
      .eq('id', applicationId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('You can only review the applicants of your own job postings.')
  },
}
