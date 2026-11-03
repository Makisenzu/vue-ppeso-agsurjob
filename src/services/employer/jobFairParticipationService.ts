import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { EmployerJobFairOffer, EmployerOfferablePosting } from '@/types/common/jobFairEvent'

/** Migration 105 RPCs; untyped until `npm run types:gen` */
const untypedEsmdd = () => (supabase as unknown as SupabaseClient).schema('esmdd')

const OFFER_COLUMNS = 'id, job_vacancy_id, vacancy_count, status, job_vacancies(position_title, nature_of_work, salary)'
/** One company's open postings: a bounded list */
const OFFERABLE_POSTING_LIMIT = 200

type OfferRow = Omit<EmployerJobFairOffer, 'position_title' | 'nature_of_work' | 'salary'> & {
  job_vacancies: { position_title: string; nature_of_work: string | null; salary: string | null } | null
}

const toOffer = ({ job_vacancies: job, ...offer }: OfferRow): EmployerJobFairOffer => ({
  ...offer,
  position_title: job?.position_title ?? 'Untitled position',
  nature_of_work: job?.nature_of_work ?? null,
  salary: job?.salary ?? null,
})

/** The company owner's part in a job fair: joining, withdrawing and the postings offered there */
export const jobFairParticipationService = {
  async join(jobFairId: string): Promise<void> {
    const { error } = await untypedEsmdd().rpc('join_job_fair', { p_job_fair_id: jobFairId })
    if (error) throw error
  },

  async withdraw(jobFairId: string): Promise<void> {
    const { error } = await untypedEsmdd().rpc('withdraw_from_job_fair', { p_job_fair_id: jobFairId })
    if (error) throw error
  },

  async fetchOffers(participantId: string): Promise<EmployerJobFairOffer[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_vacancies')
      .select(OFFER_COLUMNS)
      .eq('participant_id', participantId)

    if (error) throw error
    return ((data ?? []) as unknown as OfferRow[])
      .map(toOffer)
      .sort((a, b) => a.position_title.localeCompare(b.position_title))
  },

  /** Open postings of the establishment, for the "Add vacancy" picker */
  async fetchOpenPostings(establishmentId: string): Promise<EmployerOfferablePosting[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .select('id, position_title, vacancy_count')
      .eq('establishment_id', establishmentId)
      .eq('status', 'open')
      .order('position_title')
      .limit(OFFERABLE_POSTING_LIMIT)

    if (error) throw error
    return data ?? []
  },

  /** Offers an existing posting at the fair (esmdd.add_job_fair_vacancy, migration 039) */
  async offerPosting(participantId: string, jobVacancyId: string, vacancyCount: number | null): Promise<void> {
    const { error } = await supabase.schema('esmdd').rpc('add_job_fair_vacancy', {
      p_participant_id: participantId,
      p_job_vacancy_id: jobVacancyId,
      p_vacancy_count: vacancyCount ?? undefined,
      p_status: 'open',
    })
    if (error) throw error
  },

  async updateOpenings(offerId: string, vacancyCount: number): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fair_vacancies')
      .update({ vacancy_count: vacancyCount })
      .eq('id', offerId)
    if (error) throw error
  },

  async removeOffer(offerId: string): Promise<void> {
    const { error } = await supabase.schema('esmdd').from('job_fair_vacancies').delete().eq('id', offerId)
    if (error) throw error
  },
}
