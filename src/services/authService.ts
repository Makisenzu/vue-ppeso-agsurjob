import { supabase } from "@/lib/supabaseClient"
import type { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ApplicantRow = Database['public']['Tables']['applicants']['Row']
type EmployerRow = Database['public']['Tables']['employers']['Row']
type ProfileSummary = Pick<
  ProfileRow,
  | 'id'
  | 'firstname'
  | 'middlename'
  | 'lastname'
  | 'birthdate'
  | 'contact_number'
  | 'gender'
  | 'status'
  | 'is_pwd'
  | 'is_4ps'
  | 'role'
  | 'username'
  | 'region'
  | 'province'
  | 'geographic'
  | 'barangay'
>

export const authService = {
  async login(credentials: SignInWithPasswordCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async fetchProfile(userId: string) {
    const {data, error } = await supabase
    .from('profiles')
    .select('id, firstname, middlename, lastname, birthdate, contact_number, gender, status, is_pwd, is_4ps, role, username, region, province, geographic, barangay')
    .eq('id', userId)
    .single()
    if (data) {
      return data
    } else {
      throw new Error(error?.message || 'Failed to fetch profile')
    }
  },

  async fetchApplicantByProfileId(profileId: string): Promise<ApplicantRow | null> {
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message || 'Failed to fetch applicant data')
    }

    return data
  },

  async fetchEmployerByProfileId(profileId: string): Promise<EmployerRow | null> {
    const { data, error } = await supabase
      .from('employers')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message || 'Failed to fetch employer data')
    }

    return data
  },

  async fetchUserBundle(userId: string): Promise<{
    profile: ProfileSummary
    applicant: ApplicantRow | null
    employer: EmployerRow | null
  }> {
    const profile = await this.fetchProfile(userId)

    let applicant: ApplicantRow | null = null
    let employer: EmployerRow | null = null

    if (profile.role === 'applicant') {
      applicant = await this.fetchApplicantByProfileId(userId)
    } else if (profile.role === 'employer') {
      employer = await this.fetchEmployerByProfileId(userId)
    }

    return { profile, applicant, employer }
  },

  async insertProfileData(profileData: any) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
    if (error) {
      throw new Error(error.message || 'Failed to insert profile data')
    }
    return data
  },

  async insertApplicantData(applicantData: any) {
    const { data, error } = await supabase
      .from('applicants')
      .insert(applicantData)
      .select()
    if (data) {
      return data
    } else {
      throw new Error(error?.message || 'Failed to insert applicant data')
    }
  },
  
  async insertEmployerData(employerData: any) {
    const { data, error } = await supabase
      .from('employers')
      .insert(employerData)
      .select()
    if (data) {
      return data
    } else {
      throw new Error(error?.message || 'Failed to insert employer data')
    }
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_if_email_exists', {
      target_email: email.trim()
    })
    if (error) {
      throw new Error(error.message)
    }
    return !!data
  },  

  async signUp(credentials: SignUpWithPasswordCredentials) {
    const { data, error } = await supabase.auth.signUp(credentials)
    if (error) throw error
    return data
  }
}