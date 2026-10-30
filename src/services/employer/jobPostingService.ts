import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { VACANCY_STATUSES, type JobVacancyRow, type JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import { jobVacancyMatchingService } from '@/services/common/jobVacancyMatchingService'
import {
  JOB_POSTING_LIST_COLUMNS,
  type JobPostingDetails,
  type JobPostingListRow,
  type JobPostingPage,
  type JobPostingPayload,
  type JobPostingQuery,
  type JobPostingStats,
} from '@/types/employer/jobPosting'

const vacancies = () => supabase.schema('esmdd').from('job_vacancies')

/**
 * esmdd.save_job_vacancy (migrations 084 / 085) is not in database.types.ts until `npm run types:gen`
 * is re-run, so the typed client rejects its name. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

/** Strips the characters PostgREST treats as pattern / filter syntax */
const toSearchPattern = (search: string) => `%${search.replace(/[%_,()\\]/g, ' ').trim()}%`

/** One page of the establishment's postings, newest first, filtered and counted on the server */
export async function fetchJobPostings(establishmentId: string, query: JobPostingQuery): Promise<JobPostingPage> {
  const from = query.page * query.pageSize
  let request = vacancies()
    .select(JOB_POSTING_LIST_COLUMNS, { count: 'exact' })
    .eq('establishment_id', establishmentId)

  if (query.status !== 'all') request = request.eq('status', query.status)
  if (query.search.trim()) request = request.ilike('position_title', toSearchPattern(query.search))

  const { data, error, count } = await request
    .order('created_at', { ascending: false })
    .range(from, from + query.pageSize - 1)

  if (error) throw error
  const rows = (data ?? []) as Omit<JobPostingListRow, 'skills'>[]
  const skills = await jobVacancyMatchingService.fetchSkillsByVacancy(rows.map((row) => row.id))
  return { rows: rows.map((row) => ({ ...row, skills: skills.get(row.id) ?? [] })), total: count ?? 0 }
}

/** Posting counts per status: head-only count queries, no rows downloaded */
export async function fetchJobPostingStats(establishmentId: string): Promise<JobPostingStats> {
  const countWhere = async (status?: JobVacancyStatus) => {
    let request = vacancies().select('id', { count: 'exact', head: true }).eq('establishment_id', establishmentId)
    if (status) request = request.eq('status', status)
    const { count, error } = await request
    if (error) throw error
    return count ?? 0
  }

  const [all, ...perStatus] = await Promise.all([countWhere(), ...VACANCY_STATUSES.map((status) => countWhere(status))])
  return VACANCY_STATUSES.reduce(
    (stats, status, index) => ({ ...stats, [status]: perStatus[index] }),
    { all } as JobPostingStats,
  )
}

/** Every field of one posting and its skills, for the edit form */
export async function fetchJobPostingById(id: string): Promise<Omit<JobPostingDetails, 'attachments'>> {
  const [{ data, error }, skills] = await Promise.all([
    vacancies().select('*').eq('id', id).single(),
    jobVacancyMatchingService.fetchSkillsByVacancy([id]),
  ])

  if (error) throw error
  // related_courses (migration 085) is read untyped until types are regenerated
  const row = data as JobVacancyRow & { related_courses?: string[] | null }
  return { ...row, skills: skills.get(id) ?? [], related_courses: row.related_courses ?? [] }
}

/**
 * Creates (id null) or updates a posting and replaces its skills in one transaction.
 * The job_vacancies RLS still decides who may write (the RPC is SECURITY INVOKER).
 */
export async function saveJobPosting(
  id: string | null,
  establishmentId: string,
  payload: JobPostingPayload,
): Promise<string> {
  const { data, error } = await untypedEsmdd().rpc('save_job_vacancy', {
    p_job_vacancy_id: id,
    p_establishment_id: establishmentId,
    p_vacancy: payload.vacancy,
    p_skills: payload.skills,
  })

  if (error) throw error
  return data as string
}

export async function updateJobPostingStatus(id: string, status: JobVacancyStatus): Promise<void> {
  const { error } = await vacancies().update({ status }).eq('id', id)

  if (error) throw error
}

/** One request for any number of postings (DESIGN.md §13.1) */
export async function deleteJobPostings(ids: string[]): Promise<void> {
  const { error } = await vacancies().delete().in('id', ids)

  if (error) throw error
}
