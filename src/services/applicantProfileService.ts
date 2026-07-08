import { supabase } from '@/lib/supabaseClient'

export type ApplicantProfileRecord = Record<string, any>
export type ApplicantRecord = Record<string, any>
export type ApplicantExperienceRecord = Record<string, any>
export type ApplicantSkillRecord = Record<string, any>

export interface ApplicantProfileResult {
  profile: ApplicantProfileRecord | null
  applicant: ApplicantRecord | null
  experiences: ApplicantExperienceRecord[]
  skills: ApplicantSkillRecord[]
}

export async function fetchApplicantProfileByUsername(username: string): Promise<ApplicantProfileResult> {
  const routeUsername = username.trim()

  if (!routeUsername) {
    return {
      profile: null,
      applicant: null,
      experiences: [],
      skills: [],
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

  return {
    profile,
    applicant,
    experiences: experiences ?? [],
    skills: skills ?? [],
  }
}