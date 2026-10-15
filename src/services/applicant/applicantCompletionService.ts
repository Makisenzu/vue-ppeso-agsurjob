import { supabase } from '@/lib/supabaseClient'
import type {
  ApplicantRecordInsert,
  ApplicantRecordRow,
  ApplicantRecordUpdate,
} from '@/types/applicant/applicantCompletion'

/** The signed-in applicant's own `applicants.applicants` record (RLS: migration 027). */
export const applicantCompletionService = {
  async fetchMyRecord(profileId: string): Promise<ApplicantRecordRow | null> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load your applicant record')
    return data
  },

  async updateMyRecord(id: string, patch: ApplicantRecordUpdate): Promise<ApplicantRecordRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to save your applicant record')
    return data
  },

  /** For accounts whose signup could not create the registry record (e.g. email confirmation pending). */
  async insertMyRecord(record: ApplicantRecordInsert): Promise<ApplicantRecordRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert(record)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create your applicant record')
    return data
  },

  /** Keeps the 4Ps / PWD flags on `core.profiles` in step with the registry record. */
  async syncProfileFlags(profileId: string, flags: { is_4ps: boolean; is_pwd: boolean }): Promise<void> {
    const { error } = await supabase
      .schema('core')
      .from('profiles')
      .update(flags)
      .eq('id', profileId)

    if (error) throw new Error(error.message || 'Failed to update your profile')
  },
}
