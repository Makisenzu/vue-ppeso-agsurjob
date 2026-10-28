import { supabase } from '@/lib/supabaseClient'
import type { SignUpWithPasswordCredentials } from '@supabase/supabase-js'
import type {
  ProfileInsert,
  ProfileRow,
  ApplicantInsert,
  ApplicantRow,
} from '@/types/common/signup'

export const signupService = {
  async signUp(credentials: SignUpWithPasswordCredentials) {
    const { data, error } = await supabase.auth.signUp(credentials)
    if (error) throw error
    return data
  },

  async insertProfile(profileData: ProfileInsert): Promise<ProfileRow> {
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to insert profile data')
    return data
  },

  async insertApplicant(applicantData: ApplicantInsert): Promise<ApplicantRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert(applicantData)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to insert applicant data')
    return data
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_if_email_exists', {
      target_email: email.trim(),
    })
    if (error) throw new Error(error.message)
    return !!data
  },
}
