import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type {
  Paged,
  ParticipantStatusFormValues,
  SkillsDemandFilters,
  SkillsDemandRow,
  SkillsDemandSummary,
  SkillsDemandSupplier,
  SkillsDemandSupply,
  SkillsDemandVacancy,
  SkillsTraining,
  SkillsTrainingCandidate,
  SkillsTrainingFilterOptions,
  SkillsTrainingFilters,
  SkillsTrainingFormValues,
  SkillsTrainingParticipant,
  SkillsTrainingParticipantFilters,
} from '@/types/peso/provincialPeso/skillsTraining'

/**
 * The tables and RPCs of migration 118 are not in database.types.ts until `npm run types:gen` is re-run, so
 * the typed client rejects their names. Use `supabase.schema('esmdd')` directly after regenerating.
 */
const esmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

const allToNull = (value: string) => (value === 'ALL' || value === '' ? null : value)
const blankToNull = (value: string) => value.trim() || null

/** Splits the window-function count off the rows of a paged RPC */
function toPage<T>(data: unknown): Paged<T> {
  const rows = (data ?? []) as Array<T & { total_count?: number | string }>
  const total = Number(rows[0]?.total_count ?? 0)
  return {
    rows: rows.map((row) => {
      const copy = { ...row }
      delete copy.total_count
      return copy as T
    }),
    total,
  }
}

/** A training always carries its skill lists, even when it has none */
function toTrainingPage(data: unknown): Paged<SkillsTraining> {
  const page = toPage<SkillsTraining>(data)
  return { ...page, rows: page.rows.map((row) => ({ ...row, skill_ids: row.skill_ids ?? [], skill_names: row.skill_names ?? [] })) }
}

/** p_training of esmdd.save_skills_training; the skills go in p_skill_ids */
const toTrainingRow = (values: SkillsTrainingFormValues) => ({
  title: values.title.trim(),
  agency: values.agency.trim(),
  start_date: values.startDate,
  end_date: values.endDate,
  venue: blankToNull(values.venue),
  municipality: blankToNull(values.municipality),
  remarks: blankToNull(values.remarks),
})

/** Skills Training (migration 118): Provincial PESO writes, the RPCs page and count in SQL */
export const skillsTrainingService = {
  // ─── Trainings Conducted ───

  async searchTrainings(filters: SkillsTrainingFilters, page: number, pageSize: number): Promise<Paged<SkillsTraining>> {
    const { data, error } = await esmdd().rpc('skills_trainings_search', {
      p_search: blankToNull(filters.search),
      p_agency: allToNull(filters.agency),
      p_skill_id: filters.skill === 'ALL' ? null : Number(filters.skill),
      p_year: filters.year === 'ALL' ? null : Number(filters.year),
      p_limit: pageSize,
      p_offset: page * pageSize,
    })
    if (error) throw new Error(error.message || 'Could not load the trainings.')
    return toTrainingPage(data)
  },

  async fetchTraining(id: string): Promise<SkillsTraining | null> {
    const { data, error } = await esmdd().rpc('skills_trainings_search', { p_training_id: id, p_limit: 1, p_offset: 0 })
    if (error) throw new Error(error.message || 'Could not load the training.')
    return toTrainingPage(data).rows[0] ?? null
  },

  async fetchFilterOptions(): Promise<SkillsTrainingFilterOptions> {
    const { data, error } = await esmdd().rpc('skills_training_filters')
    if (error) throw new Error(error.message || 'Could not load the filters.')
    const options = (data ?? {}) as Partial<SkillsTrainingFilterOptions>
    return { agencies: options.agencies ?? [], years: options.years ?? [] }
  },

  /** Creates (id null) or updates a training and replaces its skills in one transaction; returns its id */
  async saveTraining(id: string | null, values: SkillsTrainingFormValues): Promise<string> {
    const { data, error } = await esmdd().rpc('save_skills_training', {
      p_training_id: id,
      p_training: toTrainingRow(values),
      p_skill_ids: values.skillIds,
    })
    if (error) throw new Error(error.message || 'Could not save the training.')
    return data as string
  },

  /** One request; returns the ids actually removed (RLS hides a blocked delete as 0 rows) */
  async removeTrainings(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const { data, error } = await esmdd().from('skills_trainings').delete().in('id', ids).select('id')
    if (error) throw new Error(error.message || 'Could not delete the trainings.')
    return ((data ?? []) as { id: string }[]).map((row) => row.id)
  },

  // ─── Participants ───

  async searchParticipants(
    trainingId: string,
    filters: SkillsTrainingParticipantFilters,
    page: number,
    pageSize: number,
  ): Promise<Paged<SkillsTrainingParticipant>> {
    const { data, error } = await esmdd().rpc('skills_training_participants_search', {
      p_training_id: trainingId,
      p_search: blankToNull(filters.search),
      p_completion: allToNull(filters.completion),
      p_employment: allToNull(filters.employment),
      p_limit: pageSize,
      p_offset: page * pageSize,
    })
    if (error) throw new Error(error.message || 'Could not load the participants.')
    return toPage<SkillsTrainingParticipant>(data)
  },

  /** Registry applicants not in the training yet */
  async searchCandidates(
    trainingId: string,
    search: string,
    municipality: string,
    page: number,
    pageSize: number,
  ): Promise<Paged<SkillsTrainingCandidate>> {
    const { data, error } = await esmdd().rpc('skills_training_candidates', {
      p_training_id: trainingId,
      p_search: blankToNull(search),
      p_municipality: allToNull(municipality),
      p_limit: pageSize,
      p_offset: page * pageSize,
    })
    if (error) throw new Error(error.message || 'Could not load the applicants.')
    return toPage<SkillsTrainingCandidate>(data)
  },

  /** One bulk insert; applicants already in the training are skipped. Returns how many were added. */
  async addParticipants(trainingId: string, applicantIds: string[]): Promise<number> {
    if (applicantIds.length === 0) return 0
    const { data, error } = await esmdd()
      .from('skills_training_participants')
      .upsert(
        applicantIds.map((applicantId) => ({ training_id: trainingId, applicant_id: applicantId })),
        { onConflict: 'training_id,applicant_id', ignoreDuplicates: true },
      )
      .select('id')
    if (error) throw new Error(error.message || 'Could not add the participants.')
    return data?.length ?? 0
  },

  async updateParticipantStatus(id: string, values: ParticipantStatusFormValues): Promise<void> {
    const hired = values.employmentStatus === 'Hired'
    const { data, error } = await esmdd()
      .from('skills_training_participants')
      .update({
        completion_status: values.completionStatus,
        employment_status: values.employmentStatus,
        employer_name: hired ? blankToNull(values.employerName) : null,
        date_hired: hired ? values.dateHired || null : null,
        status_remarks: blankToNull(values.remarks),
      })
      .eq('id', id)
      .select('id')
    if (error) throw new Error(error.message || 'Could not update the status.')
    if (!data?.length) throw new Error('The status could not be updated.')
  },

  /** One request; returns the ids actually removed */
  async removeParticipants(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const { data, error } = await esmdd().from('skills_training_participants').delete().in('id', ids).select('id')
    if (error) throw new Error(error.message || 'Could not remove the participants.')
    return ((data ?? []) as { id: string }[]).map((row) => row.id)
  },

  // ─── Skills Demand ───

  async searchDemand(filters: SkillsDemandFilters, page: number, pageSize: number): Promise<Paged<SkillsDemandRow>> {
    const { data, error } = await esmdd().rpc('skills_demand_search', {
      p_municipality: allToNull(filters.municipality),
      p_supply: filters.supply,
      p_search: blankToNull(filters.search),
      p_category: allToNull(filters.category),
      p_only_gaps: filters.onlyGaps,
      p_limit: pageSize,
      p_offset: page * pageSize,
    })
    if (error) throw new Error(error.message || 'Could not load the skills demand.')
    const result = toPage<SkillsDemandRow>(data)
    return { ...result, rows: result.rows.map((row) => ({ ...row, top_places: row.top_places ?? [] })) }
  },

  /** One skill's demand / supply / gap, counted the same way as the table; null when nothing requires it */
  async fetchDemandSkill(skillId: number, municipality: string, supply: SkillsDemandSupply): Promise<SkillsDemandRow | null> {
    const { data, error } = await esmdd().rpc('skills_demand_search', {
      p_municipality: allToNull(municipality),
      p_supply: supply,
      p_skill_id: skillId,
      p_limit: 1,
      p_offset: 0,
    })
    if (error) throw new Error(error.message || 'Could not load the skill.')
    const row = toPage<SkillsDemandRow>(data).rows[0]
    return row ? { ...row, top_places: row.top_places ?? [] } : null
  },

  async fetchDemandSummary(municipality: string, supply: SkillsDemandSupply): Promise<SkillsDemandSummary> {
    const { data, error } = await esmdd().rpc('skills_demand_summary', { p_municipality: allToNull(municipality), p_supply: supply })
    if (error) throw new Error(error.message || 'Could not load the skills demand totals.')
    const summary = (data ?? {}) as Partial<SkillsDemandSummary>
    return {
      skills_in_demand: Number(summary.skills_in_demand ?? 0),
      skills_with_gap: Number(summary.skills_with_gap ?? 0),
      total_demand: Number(summary.total_demand ?? 0),
      total_gap: Number(summary.total_gap ?? 0),
      categories: [...(summary.categories ?? [])].sort((a, b) => a.localeCompare(b)),
      unlinked_wordings: Number(summary.unlinked_wordings ?? 0),
    }
  },

  /** The open vacancies that require the skill (up to 100, most slots first) */
  async fetchDemandVacancies(skillId: number, municipality: string): Promise<SkillsDemandVacancy[]> {
    const { data, error } = await esmdd().rpc('skills_demand_vacancies', { p_skill_id: skillId, p_municipality: allToNull(municipality) })
    if (error) throw new Error(error.message || 'Could not load the vacancies.')
    return (data ?? []) as SkillsDemandVacancy[]
  },

  /** The jobseekers counted as the skill's supply, A to Z, one page */
  async searchDemandSupply(
    skillId: number,
    municipality: string,
    supply: SkillsDemandSupply,
    page: number,
    pageSize: number,
  ): Promise<Paged<SkillsDemandSupplier>> {
    const { data, error } = await esmdd().rpc('skills_demand_supply', {
      p_skill_id: skillId,
      p_municipality: allToNull(municipality),
      p_supply: supply,
      p_limit: pageSize,
      p_offset: page * pageSize,
    })
    if (error) throw new Error(error.message || 'Could not load the jobseekers.')
    return toPage<SkillsDemandSupplier>(data)
  },

  /** Trainings already conducted for a skill (newest first) */
  async fetchTrainingsForSkill(skillId: number): Promise<SkillsTraining[]> {
    const { data, error } = await esmdd().rpc('skills_trainings_search', { p_skill_id: skillId, p_limit: 20, p_offset: 0 })
    if (error) throw new Error(error.message || 'Could not load the trainings.')
    return toTrainingPage(data).rows
  },
}
