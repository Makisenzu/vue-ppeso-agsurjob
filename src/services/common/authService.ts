import { supabase } from "@/lib/supabaseClient"
import type { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'
import type { Database } from '@/types/common/database.types'

export type ProfileRow = Database['core']['Tables']['profiles']['Row']
export type ProfileInsert = Database['core']['Tables']['profiles']['Insert']
export type ApplicantRow = Database['applicants']['Tables']['applicants']['Row']
export type ApplicantInsert = Database['applicants']['Tables']['applicants']['Insert']
export type EmployerRow = Database['employers']['Tables']['companies']['Row']
export type EmployerInsert = Database['employers']['Tables']['companies']['Insert']
export type ApplicantExperienceRow = Database['applicants']['Tables']['applicant_experiences']['Row']
export type ApplicantSkillRow = Database['applicants']['Tables']['applicant_skills']['Row']
export type ApplicantRequirementRow = Database['applicants']['Tables']['applicant_requirements']['Row']
export type ApplicantRequirementMediaRow = Database['applicants']['Tables']['applicant_requirement_media']['Row']
export type ProfileMediaRow = Database['core']['Tables']['profile_media']['Row']
export type RequirementTemplateRow = Database['public']['Tables']['requirement_templates']['Row']

export type ProfileSummary = Pick<
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

  async fetchProfile(userId: string): Promise<ProfileSummary> {
    const { data, error } = await supabase
      .schema('core')
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
      .schema('applicants')
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
      .schema('employers')
      .from('companies')
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
        profile.role === 'company_owner' || profile.role === 'company_member' ? this.fetchEmployerByProfileId(userId) : Promise.resolve(null),
        supabase.schema('applicants').from('applicant_experiences').select('*').eq('profile_id', userId),
        supabase.schema('applicants').from('applicant_skills').select('*').eq('profile_id', userId),
        supabase.schema('applicants').from('applicant_requirements').select('*').eq('profile_id', userId),
        supabase.schema('applicants').from('applicant_requirement_media').select('*').eq('profiles_id', userId),
        supabase.schema('core').from('profile_media').select('*').eq('profile_id', userId).order('created_at', { ascending: false }),
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

  async insertProfileData(profileData: ProfileInsert) {
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
    if (error) {
      throw new Error(error.message || 'Failed to insert profile data')
    }
    return data
  },

  async insertApplicantData(applicantData: ApplicantInsert) {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert(applicantData)
      .select()
    if (data) {
      return data
    } else {
      throw new Error(error?.message || 'Failed to insert applicant data')
    }
  },
  
  async insertEmployerData(employerData: EmployerInsert) {
    const { data, error } = await supabase
      .schema('employers')
      .from('companies')
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

  async fetchSubmittedRequirements(profileId: string): Promise<ApplicantRequirementRow[]> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicant_requirements')
      .select('*')
      .eq('profile_id', profileId)
    if (error) {
      throw new Error(error.message || 'Failed to fetch submitted requirements')
    }
    return data || []
  },

  async loadVerificationTemplates(): Promise<RequirementTemplateRow[]> {
    const { data, error } = await supabase
      .schema('public')
      .from('requirement_templates')
      .select('*')
      .eq('requirement_type', 'applicant_verification')
    if (error) {
      throw new Error(error.message || 'Failed to fetch verification templates')
    }
    return data || []
  },
}