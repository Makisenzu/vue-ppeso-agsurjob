import { supabase } from '@/lib/supabaseClient'
import type {
  JobFairInsert,
  JobFairParticipantInsert,
  JobFairParticipantRow,
  JobFairParticipantUpdate,
  JobFairParticipantWithCount,
  JobFairRow,
  JobFairUpdate,
  JobFairWithCounts,
  JobVacancyInsert,
  JobVacancyRow,
  JobVacancyUpdate,
} from '@/types/peso/provincialPeso/jobFair'

const JOB_FAIR_WITH_COUNTS_SELECT = '*, job_fair_participants(count), job_vacancies(vacancy_count)'

export const jobFairService = {
  async fetchJobFairs(): Promise<JobFairWithCounts[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .select(JOB_FAIR_WITH_COUNTS_SELECT)
      .order('start_date', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load job fairs.')
    return (data ?? []) as JobFairWithCounts[]
  },

  async fetchJobFairById(jobFairId: string): Promise<JobFairRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .select('*')
      .eq('id', jobFairId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load job fair.')
    if (!data) throw new Error('Job fair not found.')
    return data
  },

  async createJobFair(payload: JobFairInsert): Promise<JobFairWithCounts> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .insert(payload)
      .select(JOB_FAIR_WITH_COUNTS_SELECT)
      .single()

    if (error) throw new Error(error.message || 'Failed to create job fair.')
    return data as JobFairWithCounts
  },

  async updateJobFair(jobFairId: string, payload: JobFairUpdate): Promise<JobFairWithCounts> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', jobFairId)
      .select(JOB_FAIR_WITH_COUNTS_SELECT)
      .single()

    if (error) throw new Error(error.message || 'Failed to update job fair.')
    return data as JobFairWithCounts
  },

  async deleteJobFair(jobFairId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .delete()
      .eq('id', jobFairId)

    // 23503 = foreign_key_violation (e.g. hired-on-the-spot records still reference it)
    if (error?.code === '23503') {
      throw new Error('This job fair still has linked records (such as hired-on-the-spot entries) and cannot be deleted.')
    }
    if (error) throw new Error(error.message || 'Failed to delete job fair.')
  },

  // ─── Participants ───

  async fetchParticipants(jobFairId: string): Promise<JobFairParticipantWithCount[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .select('*, job_vacancies(count)')
      .eq('job_fair_id', jobFairId)
      .order('business_name', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load job fair participants.')
    return (data ?? []) as JobFairParticipantWithCount[]
  },

  async fetchParticipantById(jobFairId: string, participantId: string): Promise<JobFairParticipantRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .select('*')
      .eq('id', participantId)
      .eq('job_fair_id', jobFairId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load participant.')
    if (!data) throw new Error('Participant not found for this job fair.')
    return data
  },

  async createParticipant(payload: JobFairParticipantInsert): Promise<JobFairParticipantWithCount> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .insert(payload)
      .select('*, job_vacancies(count)')
      .single()

    if (error) throw new Error(error.message || 'Failed to add participant.')
    return data as JobFairParticipantWithCount
  },

  async updateParticipant(participantId: string, payload: JobFairParticipantUpdate): Promise<JobFairParticipantWithCount> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', participantId)
      .select('*, job_vacancies(count)')
      .single()

    if (error) throw new Error(error.message || 'Failed to update participant.')
    return data as JobFairParticipantWithCount
  },

  async deleteParticipant(participantId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .delete()
      .eq('id', participantId)

    if (error) throw new Error(error.message || 'Failed to delete participant.')
  },

  // ─── Vacancies ───

  async fetchParticipantVacancies(jobFairId: string, participantId: string): Promise<JobVacancyRow[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .select('*')
      .eq('job_fair_id', jobFairId)
      .eq('participant_id', participantId)
      .order('position_title', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load vacancies.')
    return data ?? []
  },

  async createVacancy(payload: JobVacancyInsert): Promise<JobVacancyRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to add vacancy.')
    return data
  },

  async updateVacancy(vacancyId: string, payload: JobVacancyUpdate): Promise<JobVacancyRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', vacancyId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update vacancy.')
    return data
  },

  async deleteVacancy(vacancyId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .delete()
      .eq('id', vacancyId)

    if (error) throw new Error(error.message || 'Failed to delete vacancy.')
  },
}
