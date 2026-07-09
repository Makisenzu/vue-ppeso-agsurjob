import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type ApplicantProfileRecord = Record<string, any>
export type ApplicantRecord = Record<string, any>
export type ApplicantExperienceRecord = Record<string, any>
export type ApplicantSkillRecord = Record<string, any>
export type ProfileSocialRecord = Record<string, any>
export type ProfileNotificationRecord = Record<string, any>
export type ProfileMediaRecord = Record<string, any>

export interface ApplicantProfileResult {
  profile: ApplicantProfileRecord | null
  applicant: ApplicantRecord | null
  experiences: ApplicantExperienceRecord[]
  skills: ApplicantSkillRecord[]
  socials: ProfileSocialRecord[]
  notifications: ProfileNotificationRecord[]
  media: ProfileMediaRecord[]
}

export async function fetchApplicantProfileByUsername(username: string): Promise<ApplicantProfileResult> {
  const routeUsername = username.trim()

  if (!routeUsername) {
    return {
      profile: null,
      applicant: null,
      experiences: [],
      skills: [],
      socials: [],
      notifications: [],
      media: [],
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', routeUsername)
    .maybeSingle()

  if (!profile) {
    return {
      profile: null,
      applicant: null,
      experiences: [],
      skills: [],
      socials: [],
      notifications: [],
      media: [],
    }
  }

  const { data: applicant } = await supabase
    .from('applicants')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!applicant) {
    return {
      profile,
      applicant: null,
      experiences: [],
      skills: [],
      socials: [],
      notifications: [],
      media: [],
    }
  }

  const { data: experiences } = await supabase
    .from('applicant_experiences')
    .select('*')
    .eq('applicant_id', applicant.id)

  const { data: skills } = await supabase
    .from('applicant_skills')
    .select('*')
    .eq('applicant_id', applicant.id)

  const { data: socials } = await supabase
    .from('profile_socials')
    .select('*')
    .eq('profile_id', profile.id)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', profile.id)
  
  const { data: media } = await supabase
    .from('profile_media')
    .select('*')
    .eq('profile_id', profile.id)

  return {
    profile,
    applicant,
    experiences: experiences ?? [],
    skills: skills ?? [],
    socials: socials ?? [],
    notifications: notifications ?? [],
    media: media?? [], 
  }
}

export interface UpdateProfileInput {
  firstname?: string
  middlename?: string
  lastname?: string
  username?: string
  birthdate?: string | null
  contact_number?: string | null
  gender?: 'male' | 'female' | 'non-binary' | 'prefer_not_to_say' | null
  is_pwd?: boolean | null
  is_4ps?: boolean | null,
  region?: string | null,
  province?: string | null,
  geographic?: string | null,
  barangay?: string | null,
}

export async function updateApplicantProfile(userId: string, updates: UpdateProfileInput): Promise<void> {
  const payload: Partial<Database['public']['Tables']['profiles']['Update']> = {}

  if (updates.firstname !== undefined) payload.firstname = updates.firstname
  if (updates.middlename !== undefined) payload.middlename = updates.middlename
  if (updates.lastname !== undefined) payload.lastname = updates.lastname
  if (updates.username !== undefined) payload.username = updates.username
  if (updates.birthdate !== undefined) payload.birthdate = updates.birthdate
  if (updates.contact_number !== undefined) payload.contact_number = updates.contact_number
  if (updates.gender !== undefined) payload.gender = updates.gender
  if (updates.is_pwd !== undefined) payload.is_pwd = updates.is_pwd
  if (updates.is_4ps !== undefined) payload.is_4ps = updates.is_4ps
  if (updates.region !== undefined) payload.region = updates.region
  if (updates.province !== undefined) payload.province = updates.province
  if (updates.geographic !== undefined) payload.geographic = updates.geographic
  if (updates.barangay !== undefined) payload.barangay = updates.barangay

  const { data, error, status, statusText } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()

  if (error) {
    throw error
  }
}