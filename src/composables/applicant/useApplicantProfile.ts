import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import type { DocumentFile } from '@/types/applicant/applicantProfile'
import { fetchApplicantProfileByUsername } from '@/services/applicant/applicantProfileService'
import {
  getRequirementDisplayLabel,
  isRequirementUploaded,
} from '@/helpers/applicant/applicantRequirementDocuments'
import { isApplicantRecordComplete } from '@/helpers/applicant/applicantCompletionHelper'
import { formatProfileLocation } from '@/helpers/applicant/nsrpDisplayHelper'

/** Stepper name of the NSRP record step — completed by the NSRP form, not by an uploaded file. */
export const NSRP_FORM = 'NSRP Form'

/** Uploaded requirements, in the order the applicant must submit them. */
export const REQUIRED_UPLOAD_ORDER = ['Application Form', 'Resume', 'Birth Certificate'] as const

/**
 * Optional profile documents (migration 065): never block the upload order or verification, and fill in
 * the matching requirement of program / vacancy applications (AGENTS.md rule 16).
 */
export const OPTIONAL_PROFILE_DOCUMENTS = ['TOR/Diploma', 'Certificates'] as const

export function useApplicantProfile() {
  const authStore = useAuthStore()
  const route = useRoute()
  const routeUsername = computed(() => String(route.params.username ?? '').trim())

  const requiredFiles: DocumentFile[] = [
    { name: NSRP_FORM, type: 'form', uploaded: false },
    { name: REQUIRED_UPLOAD_ORDER[0], type: 'application', uploaded: false },
    { name: REQUIRED_UPLOAD_ORDER[1], type: 'resume', uploaded: false },
    { name: REQUIRED_UPLOAD_ORDER[2], type: 'certificate', uploaded: false },
  ]

  const isLoading = ref(true)
  /** No profile has the username in the URL (e.g. an old link after a username change). */
  const isNotFound = ref(false)
  const ownUsername = computed(() => authStore.username)
  const fullProfileData = ref<any>(null)
  const applicantData = ref<any>(null)
  const experiences = ref<any[]>([])
  const skills = ref<any[]>([])
  const socials = ref<any[]>([])
  const notifications = ref<any[]>([])
  const media = ref<any[]>([])
  const requirements = ref<any[]>([])
  const requirementMedia = ref<any[]>([])

  const hasExperiences = computed(() => experiences.value.length > 0)
  const hasSkills = computed(() => skills.value.length > 0)
  const hasSocials = computed(() => socials.value.length > 0)
  const hasNotifications = computed(() => notifications.value.length > 0)
  const hasMedia = computed(() => media.value.length > 0)
  const hasRequirements = computed(() => requirementMedia.value.length > 0 || requirements.value.length > 0)

  /** The NSRP details (and their editor) are private — shown only on the applicant's own profile. */
  const isOwnProfile = computed(() => !routeUsername.value || routeUsername.value === authStore.username)
  /** The NSRP Form step is met once every applicant-fillable section of `applicants.applicants` is answered. */
  const isNsrpComplete = computed(() => isApplicantRecordComplete(applicantData.value))

  function isRequirementMet(fileName: string) {
    if (fileName === NSRP_FORM) return isNsrpComplete.value
    return isRequirementUploaded(fileName, requirementMedia.value, requirements.value)
  }

  const files = computed<DocumentFile[]>(() =>
    requiredFiles.map((file) => ({
      ...file,
      uploaded: isRequirementMet(file.name),
    }))
  )

  const displayExperiences = computed(() => experiences.value)
  const displaySkills = computed(() => skills.value.map((skill) => skill?.skill_name).filter(Boolean))
  const displayEducationLevel = computed(() => applicantData.value?.education_level || '')
  const displayCourse = computed(() => applicantData.value?.course || '')
  const displayRequirements = computed(() =>
    (requirementMedia.value.length > 0 ? requirementMedia.value : requirements.value)
      .map((item) => getRequirementDisplayLabel(item))
      .filter(Boolean)
      .map((value) => String(value))
  )

  /** NSRP contact email first; the sign-in email is only known for the viewer's own account. */
  const displayEmail = computed(
    () => applicantData.value?.email || (isOwnProfile.value ? authStore.userEmail : '') || ''
  )
  const displayName = computed(() => authStore.displayName)
  const userInitials = computed(() => authStore.userInitials)
  const displayUsername = computed(() => fullProfileData.value?.username || routeUsername.value)
  const displayPhone = computed(
    () => applicantData.value?.contact_numbers?.[0] || fullProfileData.value?.contact_number || ''
  )
  const displayLocation = computed(() =>
    formatProfileLocation(applicantData.value?.address, fullProfileData.value?.province)
  )
  
  const displayBio = computed(() =>
    'Passionate and results-driven professional dedicated to delivering high-quality work. Experienced in collaborating with cross-functional teams to build efficient solutions.'
  )
  /** Own profile: the auth account's creation date; other profiles: their `core.profiles` row. */
  const displayJoinedDate = computed(() => {
    const createdAt = fullProfileData.value?.created_at || (isOwnProfile.value ? authStore.user?.created_at : null)
    return createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : ''
  })

  const displayEmploymentStatus = computed(() => applicantData.value?.employment_status || 'Available for Work')

  const profileId = computed<string | null>(() => fullProfileData.value?.id ?? null)

  const is4ps = computed(() => fullProfileData.value?.is_4ps ?? false)
  const isPwd = computed(() => fullProfileData.value?.is_pwd ?? false)

  function hydrateFromAuthStore() {
    fullProfileData.value = authStore.profile
    applicantData.value = authStore.applicantProfile
    experiences.value = authStore.applicantExperiences
    skills.value = authStore.applicantSkills
    socials.value = []
    notifications.value = []
    media.value = authStore.profileMedia
    requirements.value = authStore.applicantRequirements
    requirementMedia.value = authStore.applicantRequirementMedia ?? []
  }

  async function fetchApplicantProfile() {
    try {
      isLoading.value = true
      isNotFound.value = false

      if (isOwnProfile.value && authStore.profile) {
        hydrateFromAuthStore()
        return
      }

      const result = await fetchApplicantProfileByUsername(routeUsername.value)
      isNotFound.value = !result.profile

      fullProfileData.value = result.profile
      applicantData.value = result.applicant
      experiences.value = result.experiences
      skills.value = result.skills
      socials.value = result.socials
      notifications.value = result.notifications
      media.value = result.media
      requirements.value = result.requirements
      requirementMedia.value = result.requirementMedia ?? []
    } catch (error) {
      console.error('Error fetching applicant data:', error)
    } finally {
      isLoading.value = false
    }
  }

  watch(
    () => authStore.applicantRequirementMedia,
    (val) => {
      if (!routeUsername.value || routeUsername.value === authStore.username) {
        requirementMedia.value = val ?? []
      }
    },
    { deep: true }
  )

  watch(
    () => authStore.applicantRequirements,
    (val) => {
      if (!routeUsername.value || routeUsername.value === authStore.username) {
        requirements.value = val ?? []
      }
    },
    { deep: true }
  )

  // Edits saved from the NSRP details section replace the auth store's applicant record
  watch(
    () => authStore.applicantProfile,
    (val) => {
      if (isOwnProfile.value) applicantData.value = val
    }
  )

  // Profile edits (name, username, location…) replace the auth store's profile
  watch(
    () => authStore.profile,
    (val) => {
      if (isOwnProfile.value && val) fullProfileData.value = val
    }
  )

  onMounted(async () => {
    await authStore.init()
    await fetchApplicantProfile()
  })

  // The route component is reused between /profile/:username pages, so reload when the username changes
  watch(routeUsername, (next, prev) => {
    if (next !== prev) fetchApplicantProfile()
  })

  return {
    files,
    isOwnProfile,
    isNsrpComplete,
    isLoading,
    isNotFound,
    ownUsername,
    fullProfileData,
    applicantData,
    profileId,

    displayEmail,
    displayName,
    userInitials,

    displayUsername,
    displayPhone,
    displayLocation,
    displayBio,
    displayJoinedDate,
    displayEmploymentStatus,
    
    is4ps,
    isPwd,
    hasExperiences,
    hasSkills,
    hasSocials,
    hasNotifications,
    hasMedia,
    displayExperiences,
    displaySkills,
    displayEducationLevel,
    displayCourse,
    socials,
    notifications,
    media,
    requirements,
    hasRequirements,
    displayRequirements,
  }
}