import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { authService, type UserBundleData } from '@/services/authService'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type ProfileSummary = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'id'
  | 'firstname'
  | 'middlename'
  | 'lastname'
  | 'birthdate'
  | 'region'
  | 'province'
  | 'geographic'
  | 'barangay'
  | 'contact_number'
  | 'gender'
  | 'status'
  | 'is_pwd'
  | 'is_4ps'
  | 'role'
  | 'username'
>

type ApplicantRow = Database['public']['Tables']['applicants']['Row']
type EmployerRow = Database['public']['Tables']['employers']['Row']
type ApplicantExperienceRow = Database['public']['Tables']['applicant_experiences']['Row']
type ApplicantSkillRow = Database['public']['Tables']['applicant_skills']['Row']
type ApplicantRequirementRow = Database['public']['Tables']['applicant_requirements']['Row']
type ApplicantRequirementMediaRow = Database['public']['Tables']['applicant_requirement_media']['Row']
type ProfileMediaRow = Database['public']['Tables']['profile_media']['Row']

type CachedUserBundle = UserBundleData & {
  userId: string
  cachedAt: string
}

const USER_BUNDLE_CACHE_PREFIX = 'vue-agsurjobs:user-bundle'

function getBundleCacheKey(userId: string) {
  return `${USER_BUNDLE_CACHE_PREFIX}:${userId}`
}

function readBundleCache(userId: string): CachedUserBundle | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getBundleCacheKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as CachedUserBundle
    if (!parsed?.profile || parsed.userId !== userId) return null

    return parsed
  } catch {
    return null
  }
}

function writeBundleCache(userId: string, bundle: UserBundleData) {
  if (typeof window === 'undefined') return

  const cachedBundle: CachedUserBundle = {
    ...bundle,
    userId,
    cachedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(getBundleCacheKey(userId), JSON.stringify(cachedBundle))
}

function clearBundleCache(userId?: string | null) {
  if (typeof window === 'undefined') return

  if (userId) {
    window.localStorage.removeItem(getBundleCacheKey(userId))
    return
  }

  const keysToRemove: string[] = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(USER_BUNDLE_CACHE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key))
}

export const useAuthStore = defineStore('auth', () => {

  // ─── Session State ───
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<ProfileSummary | null>(null)
  const applicantProfile = ref<ApplicantRow | null>(null)
  const employerProfile = ref<EmployerRow | null>(null)
  const applicantExperiences = ref<ApplicantExperienceRow[]>([])
  const applicantSkills = ref<ApplicantSkillRow[]>([])
  const applicantRequirements = ref<ApplicantRequirementRow[]>([])
  const applicantRequirementMedia = ref<ApplicantRequirementMediaRow[]>([])
  const profileMedia = ref<ProfileMediaRow[]>([])
  const userBundle = ref<UserBundleData | null>(null)
  const isHydrating = ref(false)
  const isInitialized = ref(false)
  const isAuthListenerBound = ref(false)
  const selectedRole = ref<Database["public"]["Enums"]["user_role"] | null>(null)

  // ─── Signup State ───
  const signupData = ref({
    role: '' as Database["public"]["Enums"]["user_role"],
    firstName: '',
    middlename: '',
    lastName: '',
    birthdate: '',
    gender: '',
    region: '',
    province: '',
    geographic: '',
    barangay: '',
    contact_number: '',
    is_4ps: false,
    is_pwd: false,
    email: '',
    password: '',
    username: ''
  })

  const applicantData = ref({
    profile_id: '',
    education_level: '',
    course: '',
    years_experience: '',
    preferred_job: '',
    preferred_location: '',
    expected_salary: '',
    employment_status: '',
  })

  const employerData = ref({
    profile_id: '',
    company_name: '',
    company_email: '',
    company_contact: '',
    business_type: '',
    industry: '',
    company_address: '',
    company_description: '',
    website: '',
    registration_number: '',
    verification_status: '' as Database["public"]["Enums"]["status_type"],
  })

  // ─── Computed ───
  const isAuthenticated = computed(() => !!session.value)

  const userEmail = computed(() => user.value?.email || '')
  
  const userRole = computed(() => profile.value?.role || null)
  const username = computed(() => profile.value?.username || '')

  const displayName = computed(() => {
    if (!profile.value) return 'User'
    const first = profile.value.firstname || ''
    const middle = profile.value.middlename ? `${profile.value.middlename.charAt(0)}.` : ''
    const last = profile.value.lastname || ''
    return [first, middle, last].filter(Boolean).join(' ') || 'User'
  })

  const userInitials = computed(() => {
    const first = profile.value?.firstname?.charAt(0)?.toUpperCase() || ''
    const last = profile.value?.lastname?.charAt(0)?.toUpperCase() || ''
    return `${first}${last}` || 'U'
  })

  const isVerified = computed(() => profile.value?.status === 'approved')

  const isPersonalDetailsComplete = computed(() => {
    return signupData.value.firstName && signupData.value.lastName
  })

  async function fetchProfile(userId: string) {
    try {
      const data = await authService.fetchProfile(userId)
      profile.value = data
    } catch (error) {
      console.error('fetchProfile error:', error)
      profile.value = null
    }
  }

  async function hydrateUserData(userId: string, force = false) {
    const isAlreadyHydratedForUser = profile.value?.id === userId && userBundle.value?.profile?.id === userId
    if (!force && isAlreadyHydratedForUser) return

    if (!force) {
      const cachedBundle = readBundleCache(userId)
      if (cachedBundle) {
        userBundle.value = {
          profile: cachedBundle.profile,
          applicant: cachedBundle.applicant,
          employer: cachedBundle.employer,
          experiences: cachedBundle.experiences ?? [],
          skills: cachedBundle.skills ?? [],
          requirements: cachedBundle.requirements ?? [],
          requirementMedia: cachedBundle.requirementMedia ?? [],
          profileMedia: cachedBundle.profileMedia ?? [],
        }
        profile.value = cachedBundle.profile
        applicantProfile.value = cachedBundle.applicant
        employerProfile.value = cachedBundle.employer
        applicantExperiences.value = cachedBundle.experiences ?? []
        applicantSkills.value = cachedBundle.skills ?? []
        applicantRequirements.value = cachedBundle.requirements ?? []
        applicantRequirementMedia.value = cachedBundle.requirementMedia ?? []
        profileMedia.value = cachedBundle.profileMedia ?? []
        return
      }
    }

    isHydrating.value = true

    try {
      const data = await authService.fetchUserBundle(userId)
      userBundle.value = data
      profile.value = data.profile
      applicantProfile.value = data.applicant
      employerProfile.value = data.employer
      applicantExperiences.value = data.experiences
      applicantSkills.value = data.skills
      applicantRequirements.value = data.requirements
      applicantRequirementMedia.value = data.requirementMedia
      profileMedia.value = data.profileMedia
      writeBundleCache(userId, data)
    } catch (error) {
      console.error('hydrateUserData error:', error)
      profile.value = null
      applicantProfile.value = null
      employerProfile.value = null
      applicantExperiences.value = []
      applicantSkills.value = []
      applicantRequirements.value = []
      applicantRequirementMedia.value = []
      profileMedia.value = []
      userBundle.value = null
    } finally {
      isHydrating.value = false
    }
  }

  function clearSessionData(userId?: string | null) {
    clearBundleCache(userId ?? undefined)
    profile.value = null
    applicantProfile.value = null
    employerProfile.value = null
    applicantExperiences.value = []
    applicantSkills.value = []
    applicantRequirements.value = []
    applicantRequirementMedia.value = []
    profileMedia.value = []
    userBundle.value = null
  }

  async function syncSessionData(currentSession: Session | null, forceHydrate = false) {
    const previousUserId = session.value?.user?.id ?? null
    session.value = currentSession
    user.value = currentSession?.user ?? null

    if (!currentSession?.user) {
      clearSessionData(previousUserId)
      return
    }

    await hydrateUserData(currentSession.user.id, forceHydrate)
  }

  async function init(forceHydrate = false) {

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    await syncSessionData(currentSession, forceHydrate)

    if (isAuthListenerBound.value) {
      isInitialized.value = true
      return
    }

    // Listen for auth state changes (login/logout/token refresh)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      const shouldForceHydrate = event === 'SIGNED_IN'
      await syncSessionData(newSession, shouldForceHydrate)
    })

    isAuthListenerBound.value = true
    isInitialized.value = true
  }

  // Persist updated user bundle to cache whenever relevant pieces change
  watch(
    [
      profile,
      applicantProfile,
      employerProfile,
      applicantExperiences,
      applicantSkills,
      applicantRequirements,
      applicantRequirementMedia,
      profileMedia,
    ],
    () => {
      const userId = profile.value?.id ?? user.value?.id ?? null
      if (!userId) return

      try {
        const bundle: UserBundleData = {
          profile: profile.value ?? null,
          applicant: applicantProfile.value ?? null,
          employer: employerProfile.value ?? null,
          experiences: applicantExperiences.value ?? [],
          skills: applicantSkills.value ?? [],
          requirements: applicantRequirements.value ?? [],
          requirementMedia: applicantRequirementMedia.value ?? [],
          profileMedia: profileMedia.value ?? [],
        }

        writeBundleCache(userId, bundle)
      } catch (err) {
        // non-fatal
        // eslint-disable-next-line no-console
        console.warn('Failed to write bundle cache', err)
      }
    },
    { deep: true }
  )

  function updateSignupFields(fields: Partial<typeof signupData.value>) {
    signupData.value = { ...signupData.value, ...fields }
  }

  function updateStepOne(details: { firstName: string; middlename: string; lastName: string; birthdate: string; gender: string; contact_number: string; is_4ps: boolean; is_pwd: boolean; region: string; province: string; geographic: string; barangay: string }) {
    signupData.value.firstName = details.firstName
    signupData.value.middlename = details.middlename
    signupData.value.lastName = details.lastName
    signupData.value.birthdate = details.birthdate
    signupData.value.gender = details.gender
    signupData.value.contact_number = details.contact_number
    signupData.value.is_4ps = details.is_4ps
    signupData.value.is_pwd = details.is_pwd
    signupData.value.region = details.region
    signupData.value.province = details.province
    signupData.value.geographic = details.geographic
    signupData.value.barangay = details.barangay
  }

  function clearSignupData() {
    signupData.value = {
        role: '' as Database["public"]["Enums"]["user_role"],
        firstName: '',
        middlename: '',
        lastName: '',
        birthdate: '',
        gender: '',
        contact_number: '',
        region: '',
        province: '',
        geographic: '',
        barangay: '',
        is_4ps: false,
        is_pwd: false,
        email: '',
        password: '',
        username: '',
    }
  }

  async function submitSignup() {
    try {
      const result = await authService.signUp({
        email: signupData.value.email,
        password: signupData.value.password,
        options: {
          data: {
            role: signupData.value.role || selectedRole.value,
            firstname: signupData.value.firstName,
            middlename: signupData.value.middlename,
            lastname: signupData.value.lastName,
            birthdate: signupData.value.birthdate,
            gender: signupData.value.gender,
            contact_number: signupData.value.contact_number,
            region: signupData.value.region,
            province: signupData.value.province,
            geographic: signupData.value.geographic,
            barangay: signupData.value.barangay,
            is_4ps: signupData.value.is_4ps,
            is_pwd: signupData.value.is_pwd,
            username: signupData.value.username
          }
        }
      })

      const roleToInsert = signupData.value.role || selectedRole.value
      const userId = result.user?.id

      if (!userId) {
        throw new Error("No user ID returned from signup.")
      }

      // 1. Manually insert the user's profile data first
      await authService.insertProfileData({
        id: userId,
        role: roleToInsert,
        firstname: signupData.value.firstName,
        middlename: signupData.value.middlename,
        lastname: signupData.value.lastName,
        birthdate: signupData.value.birthdate,
        gender: signupData.value.gender as Database['public']['Enums']['gender_type'] | null,
        contact_number: signupData.value.contact_number,
        region: signupData.value.region,
        province: signupData.value.province,
        geographic: signupData.value.geographic,
        barangay: signupData.value.barangay,
        is_4ps: signupData.value.is_4ps,
        is_pwd: signupData.value.is_pwd,
        username: signupData.value.username
      })

      // Update the local profile state immediately so fetchProfile isn't strictly required
      profile.value = {
        id: userId,
        role: roleToInsert,
        firstname: signupData.value.firstName,
        middlename: signupData.value.middlename,
        lastname: signupData.value.lastName,
        birthdate: signupData.value.birthdate,
        gender: signupData.value.gender as Database['public']['Enums']['gender_type'] | null,
        contact_number: signupData.value.contact_number,
        region: signupData.value.region,
        province: signupData.value.province,
        geographic: signupData.value.geographic,
        barangay: signupData.value.barangay,
        is_4ps: signupData.value.is_4ps,
        is_pwd: signupData.value.is_pwd,
        username: signupData.value.username,
        status: null
      }

      let insertApplicantResult = null
      let insertEmployerResult = null

      if (roleToInsert === 'applicant') {
        insertApplicantResult = await authService.insertApplicantData({
          profile_id: userId,
          education_level: applicantData.value.education_level || null,
          course: applicantData.value.course || null,
          years_experience: applicantData.value.years_experience ? Number(applicantData.value.years_experience) : null,
          preferred_job: applicantData.value.preferred_job || null,
          preferred_location: applicantData.value.preferred_location || null,
          expected_salary: applicantData.value.expected_salary ? Number(applicantData.value.expected_salary) : null,
          employment_status: applicantData.value.employment_status || null,
        })
        applicantProfile.value = Array.isArray(insertApplicantResult) ? (insertApplicantResult[0] ?? null) : null
        employerProfile.value = null
      } else if (roleToInsert === 'employer') {
        insertEmployerResult = await authService.insertEmployerData({
          profile_id: userId,
          company_name: employerData.value.company_name || null,
          company_email: employerData.value.company_email || null,
          company_contact: employerData.value.company_contact || null,
          business_type: employerData.value.business_type || null,
          industry: employerData.value.industry || null,
          company_address: employerData.value.company_address || null,
          company_description: employerData.value.company_description || null,
          website: employerData.value.website || null,
          registration_number: employerData.value.registration_number || null,
        })
        employerProfile.value = Array.isArray(insertEmployerResult) ? (insertEmployerResult[0] ?? null) : null
        applicantProfile.value = null
      }

      return { result, insertApplicantResult, insertEmployerResult }
    } catch (error) {
      console.error("Signup failed:", error)
      throw error
    }
  }

  return { 
    // State
    user,
    session,
    profile,
    applicantProfile,
    employerProfile,
    applicantExperiences,
    applicantSkills,
    applicantRequirements,
    applicantRequirementMedia,
    profileMedia,
    userBundle,
    isHydrating,
    isInitialized,
    signupData,
    applicantData,
    employerData,
    selectedRole,
    // Computed
    isAuthenticated,
    userEmail,
    userRole,
    username,
    displayName,
    userInitials,
    isVerified,
    isPersonalDetailsComplete,
    // Actions
    init,
    fetchProfile,
    hydrateUserData,
    clearSessionData,
    updateStepOne, 
    clearSignupData,
    updateSignupFields,
    submitSignup
  }

})