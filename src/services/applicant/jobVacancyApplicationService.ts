import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { jobVacancyMatchingService } from '@/services/common/jobVacancyMatchingService'
import { jobVacancyAttachmentService } from '@/services/common/jobVacancyAttachmentService'
import { jobVacancyRequirementService } from '@/services/common/jobVacancyRequirementService'
import { jobVacancyStageService } from '@/services/common/jobVacancyStageService'
import type { JobVacancyApplicationRow } from '@/types/common/jobVacancyApplication'
import type {
  OpenVacancyPage,
  OpenVacancyQuery,
  OpenVacancyRow,
  VacancyDetails,
} from '@/types/applicant/jobVacancyApplication'

/**
 * The RPCs and tables of migration 087 are not in database.types.ts until `npm run types:gen` is
 * re-run, so the typed client rejects their names. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

const APPLICATION_COLUMNS = 'id, job_vacancy_id, applicant_id, stage, stage_id, status_remarks, created_at, updated_at'

/** Requirements shown before applying; long text is fine here, it's one vacancy */
const VACANCY_DETAIL_COLUMNS =
  'job_description, educational_level, course_shs_strand, work_experience_months, eligibility, license, certification, language_dialect_spoken, other_qualifications, accepts_pwd'

/** Open vacancies and the signed-in applicant's own applications to them (RLS limits rows to their own) */
export const jobVacancyApplicationService = {
  /** One page of open vacancies of verified companies, searched and counted in SQL (BACKEND.md §19) */
  async searchOpenVacancies(query: OpenVacancyQuery): Promise<OpenVacancyPage> {
    const { data, error } = await untypedEsmdd().rpc('search_open_job_vacancies', {
      p_search: query.search.trim() || null,
      p_limit: query.pageSize,
      p_offset: query.page * query.pageSize,
    })

    if (error) throw new Error(error.message || 'Failed to load the job vacancies')
    const rows = (data ?? []) as OpenVacancyRow[]
    return { rows, total: Number(rows[0]?.total_count ?? 0) }
  },

  /** A vacancy with its qualifications, skills, attachments and the documents to submit; null once it closed (unless applied to) */
  async fetchVacancy(vacancyId: string): Promise<VacancyDetails | null> {
    const { data, error } = await untypedEsmdd().rpc('search_open_job_vacancies', { p_job_vacancy_id: vacancyId })
    if (error) throw new Error(error.message || 'Failed to load the job vacancy')
    const summary = ((data ?? []) as OpenVacancyRow[])[0]
    if (!summary) return null

    const [{ data: details, error: detailsErr }, skills, attachments, requirements, stages] = await Promise.all([
      supabase.schema('esmdd').from('job_vacancies').select(VACANCY_DETAIL_COLUMNS).eq('id', vacancyId).single(),
      jobVacancyMatchingService.fetchSkillsByVacancy([vacancyId]),
      jobVacancyAttachmentService.fetchAttachments(vacancyId),
      jobVacancyRequirementService.fetchRequirements(vacancyId),
      jobVacancyStageService.fetchStages(vacancyId),
    ])
    if (detailsErr) throw new Error(detailsErr.message || 'Failed to load the job vacancy')

    return { ...summary, ...details, skills: skills.get(vacancyId) ?? [], attachments, requirements, stages }
  },

  /** The applicant's application to this vacancy, or null when they haven't applied */
  async fetchMyApplication(vacancyId: string, applicantId: string): Promise<JobVacancyApplicationRow | null> {
    const { data, error } = await untypedEsmdd()
      .from('job_vacancy_applications')
      .select(APPLICATION_COLUMNS)
      .eq('job_vacancy_id', vacancyId)
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load your application')
    return data as JobVacancyApplicationRow | null
  },

  /** Creates the application (or returns the existing one) and notifies the employer (migration 087) */
  async apply(vacancyId: string): Promise<JobVacancyApplicationRow> {
    const { data, error } = await untypedEsmdd().rpc('apply_to_job_vacancy', { p_job_vacancy_id: vacancyId })

    if (error) throw new Error(error.message || 'Failed to submit your application')
    return data as JobVacancyApplicationRow
  },
}
