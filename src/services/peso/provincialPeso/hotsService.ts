import { supabase } from '@/lib/supabaseClient'
import type {
  HotsInsert,
  HotsUpdate,
  HotsVacancyOption,
  HotsWithDetails,
} from '@/types/peso/provincialPeso/jobFair'

const HOTS_SELECT = '*, job_fair_participants(business_name), job_vacancies(position_title)'
const VACANCY_OPTION_SELECT = 'id, participant_id, position_title, vacancy_count, job_fair_participants(business_name), hots(count)'

/** Turns trigger / constraint errors into messages PESO staff can act on. */
function toHotsError(error: { code?: string; message?: string }, fallback: string): Error {
  // P0001 = RAISE EXCEPTION in the HOTS triggers (vacancy full, registry applicant without a phone)
  if (error.code === 'P0001' && error.message) return new Error(error.message)
  return new Error(error.message || fallback)
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
    return (data ?? []) as HotsWithDetails[]
  },

  async fetchVacancyOptions(jobFairId: string): Promise<HotsVacancyOption[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .select(VACANCY_OPTION_SELECT)
      .eq('job_fair_id', jobFairId)
      .order('position_title', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load vacancies.')
    return (data ?? []) as HotsVacancyOption[]
  },

  async createHots(payload: HotsInsert): Promise<HotsWithDetails> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('hots')
      .insert(payload)
      .select(HOTS_SELECT)
      .single()

    if (error) throw toHotsError(error, 'Failed to record the hire.')
    return data as HotsWithDetails
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
    return data as HotsWithDetails
  },

  async deleteHots(hotsId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('hots')
      .delete()
      .eq('id', hotsId)

    if (error) throw new Error(error.message || 'Failed to delete the hire.')
  },
}
