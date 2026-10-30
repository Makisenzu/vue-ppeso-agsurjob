import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { JobVacancyMatching, JobVacancySkillRow } from '@/types/common/jobVacancy'

/**
 * Skills (esmdd.job_vacancy_skills, migration 084) and related courses (job_vacancies.related_courses,
 * migration 085) of a vacancy. Neither is in database.types.ts until `npm run types:gen` is re-run,
 * so the typed client rejects them. Use `supabase` directly after regenerating.
 */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

type SkillLookupRow = Pick<JobVacancySkillRow, 'job_vacancy_id' | 'skill_name' | 'is_required'>

export const jobVacancyMatchingService = {
  /** Skills of the given vacancies (one page at most), must-haves first, in the order they were saved */
  async fetchSkillsByVacancy(vacancyIds: string[]): Promise<Map<string, JobVacancyMatching['skills']>> {
    const byVacancy = new Map<string, JobVacancyMatching['skills']>()
    if (vacancyIds.length === 0) return byVacancy

    const { data, error } = await untypedEsmdd()
      .from('job_vacancy_skills')
      .select('job_vacancy_id, skill_name, is_required')
      .in('job_vacancy_id', vacancyIds)
      .order('is_required', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    for (const row of (data ?? []) as SkillLookupRow[]) {
      const list = byVacancy.get(row.job_vacancy_id) ?? []
      list.push({ skill_name: row.skill_name, is_required: row.is_required })
      byVacancy.set(row.job_vacancy_id, list)
    }
    return byVacancy
  },

  /** One vacancy's skills and related courses, for its edit form */
  async fetchMatching(vacancyId: string): Promise<JobVacancyMatching> {
    const [skills, { data, error }] = await Promise.all([
      this.fetchSkillsByVacancy([vacancyId]),
      untypedEsmdd().from('job_vacancies').select('related_courses').eq('id', vacancyId).single(),
    ])

    if (error) throw error
    return {
      skills: skills.get(vacancyId) ?? [],
      related_courses: ((data as { related_courses: string[] | null } | null)?.related_courses ?? []),
    }
  },

  /** Replaces a saved vacancy's skills and related courses (esmdd.set_job_vacancy_matching, 085) */
  async saveMatching(vacancyId: string, matching: JobVacancyMatching): Promise<void> {
    const { error } = await untypedEsmdd().rpc('set_job_vacancy_matching', {
      p_job_vacancy_id: vacancyId,
      p_skills: matching.skills,
      p_related_courses: matching.related_courses,
    })

    if (error) throw error
  },
}
