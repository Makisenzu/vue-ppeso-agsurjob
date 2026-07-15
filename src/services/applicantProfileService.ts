import { supabase } from '@/lib/supabaseClient'
import type { Tables, TablesUpdate } from '@/types/database.types'

export type ApplicantProfileRecord = Tables<'profiles'>
export type ApplicantRecord = Tables<'applicants'>
export type ApplicantExperienceRecord = Tables<'applicant_experiences'>
export type ApplicantSkillRecord = Tables<'applicant_skills'>
export type ApplicantRequirementRecord = Tables<'applicant_requirements'>
export type ApplicantRequirementMediaRecord = Tables<'applicant_requirement_media'>
export type ProfileSocialRecord = Tables<'profile_socials'>
export type ProfileNotificationRecord = Tables<'notifications'>
export type ProfileMediaRecord = Tables<'profile_media'>

export interface ApplicantProfileResult {
  profile: ApplicantProfileRecord | null
  applicant: ApplicantRecord | null
  experiences: ApplicantExperienceRecord[]
  skills: ApplicantSkillRecord[]
  requirements: ApplicantRequirementRecord[]
  requirementMedia: ApplicantRequirementMediaRecord[]
  socials: ProfileSocialRecord[]
  notifications: ProfileNotificationRecord[]
  media: ProfileMediaRecord[]
  hasExperiences: boolean
  hasSkills: boolean
  hasSocials: boolean
  hasNotifications: boolean
  hasMedia: boolean
  hasRequirements: boolean
}

function createEmptyApplicantProfileResult(profile: ApplicantProfileRecord | null = null, applicant: ApplicantRecord | null = null): ApplicantProfileResult {
  return {
    profile,
    applicant,
    experiences: [],
    skills: [],
    requirements: [],
    requirementMedia: [],
    socials: [],
    notifications: [],
    media: [],
    hasExperiences: false,
    hasSkills: false,
    hasSocials: false,
    hasNotifications: false,
    hasMedia: false,
    hasRequirements: false,
  }
}

export async function hasApplicantExperienceEntries(profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('applicant_experiences')
    .select('id', { head: true, count: 'exact' })
    .eq('profile_id', profileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function hasApplicantSkillEntries(profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('applicant_skills')
    .select('id', { head: true, count: 'exact' })
    .eq('profile_id', profileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function hasProfileSocialEntries(profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profile_socials')
    .select('id', { head: true, count: 'exact' })
    .eq('profile_id', profileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function hasProfileNotificationEntries(profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('recipient_id', profileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function hasProfileMediaEntries(profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profile_media')
    .select('id', { head: true, count: 'exact' })
    .eq('profile_id', profileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function hasRequirementEntries(profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('applicant_requirements')
    .select('id', { head: true, count: 'exact' })
    .eq('profile_id', profileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function fetchApplicantProfileByUsername(username: string): Promise<ApplicantProfileResult> {
  const routeUsername = username.trim()

  if (!routeUsername) {
    return createEmptyApplicantProfileResult()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', routeUsername)
    .maybeSingle()

  if (!profile) {
    return createEmptyApplicantProfileResult()
  }

  const { data: applicant } = await supabase
    .from('applicants')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!applicant) {
    return createEmptyApplicantProfileResult(profile)
  }

  const { data: experiences } = await supabase
    .from('applicant_experiences')
    .select('*')
    .eq('profile_id', profile.id)

  const { data: skills } = await supabase
    .from('applicant_skills')
    .select('*')
    .eq('profile_id', profile.id)

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
  
  const { data: requirements } = await supabase
    .from('applicant_requirements')
    .select('*')
    .eq('profile_id', profile.id)

  const { data: requirementMedia } = await supabase
    .from('applicant_requirement_media')
    .select('*')
    .eq('profiles_id', profile.id)
    .order('created_at', { ascending: false })

  return {
    profile,
    applicant,
    experiences: experiences ?? [],
    skills: skills ?? [],
    requirements: requirements ?? [],
    requirementMedia: requirementMedia ?? [],
    socials: socials ?? [],
    notifications: notifications ?? [],
    media: media ?? [],
    hasExperiences: (experiences?.length ?? 0) > 0,
    hasSkills: (skills?.length ?? 0) > 0,
    hasSocials: (socials?.length ?? 0) > 0,
    hasNotifications: (notifications?.length ?? 0) > 0,
    hasMedia: (media?.length ?? 0) > 0,
    hasRequirements: (requirements?.length ?? 0) > 0,
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
  const payload: Partial<TablesUpdate<'profiles'>> = {}

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

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()

  if (error) {
    throw error
  }
}