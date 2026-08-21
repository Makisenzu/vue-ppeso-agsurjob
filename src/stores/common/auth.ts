import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { authService, type UserBundleData } from '@/services/common/authService'
import type { User, Session } from '@supabase/supabase-js'

import type {
  ProfileSummary,
  ApplicantRow,
  EmployerRow,
  ApplicantExperienceRow,
  ApplicantSkillRow,
  ApplicantRequirementRow,
  ApplicantRequirementMediaRow,
  ProfileMediaRow
} from '@/services/common/authService'

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

  function clearSessionData() {
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
    session.value = currentSession
    user.value = currentSession?.user ?? null

    if (!currentSession?.user) {
      clearSessionData()
      return
    }

    await hydrateUserData(currentSession.user.id, forceHydrate)
  }

  async function init(forceHydrate = false) {
    if (isInitialized.value && !forceHydrate) {
      return
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    await syncSessionData(currentSession, forceHydrate)

    if (isAuthListenerBound.value) {
      isInitialized.value = true
      return
    }

    // Listen for auth state changes (login/logout/user update)
    // Ignore TOKEN_REFRESHED (fires on tab re-focus) and INITIAL_SESSION
    // to prevent unnecessary re-renders when alt-tabbing.
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Silently update the session token without re-hydrating user data
        session.value = newSession
        user.value = newSession?.user ?? null
        return
      }

      const shouldForceHydrate = event === 'SIGNED_IN'
      await syncSessionData(newSession, shouldForceHydrate)
    })

    isAuthListenerBound.value = true
    isInitialized.value = true
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
    // Computed
    isAuthenticated,
    userEmail,
    userRole,
    username,
    displayName,
    userInitials,
    isVerified,
    // Actions
    init,
    fetchProfile,
    hydrateUserData,
    clearSessionData,
  }

})