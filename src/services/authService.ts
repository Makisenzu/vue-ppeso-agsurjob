import { supabase } from "@/lib/supabaseClient"
import type { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ApplicantRow = Database['public']['Tables']['applicants']['Row']
type EmployerRow = Database['public']['Tables']['employers']['Row']
type ApplicantExperienceRow = Database['public']['Tables']['applicant_experiences']['Row']
type ApplicantSkillRow = Database['public']['Tables']['applicant_skills']['Row']
type ApplicantRequirementRow = Database['public']['Tables']['applicant_requirements']['Row']
type ApplicantRequirementMediaRow = Database['public']['Tables']['applicant_requirement_media']['Row']
type ProfileMediaRow = Database['public']['Tables']['profile_media']['Row']
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

export interface UserBundleData {
  profile: ProfileSummary | null
  applicant: ApplicantRow | null
  employer: EmployerRow | null
  experiences: ApplicantExperienceRow[]
  skills: ApplicantSkillRow[]
  requirements: ApplicantRequirementRow[]
  requirementMedia: ApplicantRequirementMediaRow[]
  profileMedia: ProfileMediaRow[]
}

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

  async fetchUserBundle(userId: string): Promise<UserBundleData> {
    const profile = await this.fetchProfile(userId)

    const [applicantResult, employerResult, experiencesResult, skillsResult, requirementsResult, requirementMediaResult, profileMediaResult] =
      await Promise.all([
        profile.role === 'applicant' ? this.fetchApplicantByProfileId(userId) : Promise.resolve(null),
        profile.role === 'employer' ? this.fetchEmployerByProfileId(userId) : Promise.resolve(null),
        supabase.from('applicant_experiences').select('*').eq('profile_id', userId),
        supabase.from('applicant_skills').select('*').eq('profile_id', userId),
        supabase.from('applicant_requirements').select('*').eq('profile_id', userId),
        supabase.from('applicant_requirement_media').select('*').eq('profiles_id', userId),
        supabase.from('profile_media').select('*').eq('profile_id', userId).order('created_at', { ascending: false }),
      ])

    if (experiencesResult.error) {
      throw new Error(experiencesResult.error.message || 'Failed to fetch applicant experiences')
    }

    if (skillsResult.error) {
      throw new Error(skillsResult.error.message || 'Failed to fetch applicant skills')
    }

    if (requirementsResult.error) {
      throw new Error(requirementsResult.error.message || 'Failed to fetch applicant requirements')
    }

    if (requirementMediaResult.error) {
      throw new Error(requirementMediaResult.error.message || 'Failed to fetch applicant requirement media')
    }

    if (profileMediaResult.error) {
      throw new Error(profileMediaResult.error.message || 'Failed to fetch profile media')
    }

    return {
      profile,
      applicant: applicantResult,
      employer: employerResult,
      experiences: experiencesResult.data ?? [],
      skills: skillsResult.data ?? [],
      requirements: requirementsResult.data ?? [],
      requirementMedia: requirementMediaResult.data ?? [],
      profileMedia: profileMediaResult.data ?? [],
    }
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
  },
  async fetchSubmittedRequirements(profileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('applicant_requirements')
      .select('*')
      .eq('profile_id', profileId)
    if (error) {
      throw new Error(error.message || 'Failed to fetch submitted requirements')
    }
    return data || []
  },
  async loadVerificationTemplates(): Promise<any[]> {
    const { data, error } = await supabase
      .from('requirement_templates')
      .select('*')
      .eq('requirement_type', 'applicant_verification')
    if (error) {
      throw new Error(error.message || 'Failed to fetch verification templates')
    }
    return data || []
  },
}