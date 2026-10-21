import { supabase } from '@/lib/supabaseClient'
import type {
  HotsInsert,
  HotsUpdate,
  HotsVacancyOption,
  HotsWithDetails,
} from '@/types/peso/provincialPeso/jobFair'
import { establishmentService } from '@/services/common/establishmentService'

// The employer name lives on the participant's establishment (another schema), see withEmployerNames;
// the position title on the job behind the job fair vacancy (migration 039), see withPositionTitles
const HOTS_SELECT = '*, job_fair_participants(establishment_id), job_fair_vacancies(job_vacancies(position_title))'
/** Keeps .in() filters well under PostgREST's URL length limit. */
const IN_FILTER_CHUNK_SIZE = 150
const VACANCY_OPTION_SELECT =
  'id, participant_id, vacancy_count, job_vacancies(position_title), job_fair_participants(establishment_id), hots(count)'

/** Turns trigger / constraint errors into messages PESO staff can act on. */
function toHotsError(error: { code?: string; message?: string }, fallback: string): Error {
  // P0001 = RAISE EXCEPTION in the HOTS triggers (vacancy full, registry applicant without a phone)
  if (error.code === 'P0001' && error.message) return new Error(error.message)
  return new Error(error.message || fallback)
}

type WithParticipantLink = { job_fair_participants: { establishment_id: string } | null }

/** Swaps each row's `job_fair_participants.establishment_id` for the establishment's business name. */
async function withEmployerNames<T extends WithParticipantLink>(
  rows: T[]
): Promise<(Omit<T, 'job_fair_participants'> & { job_fair_participants: { business_name: string } | null })[]> {
  const ids = rows.flatMap((row) => (row.job_fair_participants ? [row.job_fair_participants.establishment_id] : []))
  const establishments = await establishmentService.fetchEstablishmentsByIds(ids)
  return rows.map((row) => {
    const establishment = row.job_fair_participants
      ? establishments.get(row.job_fair_participants.establishment_id)
      : undefined
    return { ...row, job_fair_participants: establishment ? { business_name: establishment.business_name } : null }
  })
}

type WithJobFairVacancy = { job_fair_vacancies: { job_vacancies: { position_title: string } | null } | null }

/** Lifts `job_fair_vacancies.job_vacancies.position_title` to `job_vacancies.position_title`. */
function withPositionTitles<T extends WithJobFairVacancy>(
  rows: T[]
): (Omit<T, 'job_fair_vacancies'> & { job_vacancies: { position_title: string } | null })[] {
  return rows.map(({ job_fair_vacancies, ...row }) => ({ ...row, job_vacancies: job_fair_vacancies?.job_vacancies ?? null }))
}

export const hotsService = {
  async fetchHots(jobFairId: string): Promise<HotsWithDetails[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('hots')
      .select(HOTS_SELECT)
      .eq('job_fair_id', jobFairId)
      .order('hired_date', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load hired-on-the-spot records.')
    return (await withEmployerNames(withPositionTitles(data ?? []))) as HotsWithDetails[]
  },

  async fetchVacancyOptions(jobFairId: string): Promise<HotsVacancyOption[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_vacancies')
      .select(VACANCY_OPTION_SELECT)
      .eq('job_fair_id', jobFairId)

    if (error) throw new Error(error.message || 'Failed to load vacancies.')
    const options = (await withEmployerNames(data ?? [])).map(({ job_vacancies, ...option }) => ({
      ...option,
      position_title: job_vacancies?.position_title ?? 'Untitled position',
    }))
    return (options as HotsVacancyOption[]).sort((a, b) => a.position_title.localeCompare(b.position_title))
  },

  async createHots(payload: HotsInsert): Promise<HotsWithDetails> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('hots')
      .insert(payload)
      .select(HOTS_SELECT)
      .single()

    if (error) throw toHotsError(error, 'Failed to record the hire.')
    const [row] = await withEmployerNames(withPositionTitles([data]))
    return row as HotsWithDetails
  },

  async updateHots(hotsId: string, payload: HotsUpdate): Promise<HotsWithDetails> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('hots')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', hotsId)
      .select(HOTS_SELECT)
      .single()

    if (error) throw toHotsError(error, 'Failed to update the hire.')
    const [row] = await withEmployerNames(withPositionTitles([data]))
    return row as HotsWithDetails
  },

  /** Deletes the hire records and returns the ids actually deleted. */
  async deleteHots(hotsIds: string[]): Promise<string[]> {
    const deleted: string[] = []
    for (let i = 0; i < hotsIds.length; i += IN_FILTER_CHUNK_SIZE) {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('hots')
        .delete()
        .in('id', hotsIds.slice(i, i + IN_FILTER_CHUNK_SIZE))
        .select('id')

      if (error) throw new Error(error.message || 'Failed to delete the hires.')
      deleted.push(...(data ?? []).map((row) => row.id))
    }
    return deleted
  },
}
