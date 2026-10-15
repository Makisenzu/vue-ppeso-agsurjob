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

/** Stepper name of the NSRP record step — completed by the NSRP form, not by an uploaded file. */
export const NSRP_FORM = 'NSRP Form'

export function useApplicantProfile() {
  const authStore = useAuthStore()
  const route = useRoute()
  const routeUsername = computed(() => String(route.params.username ?? '').trim())

  const requiredFiles: DocumentFile[] = [
    { name: NSRP_FORM, type: 'form', uploaded: false },
    { name: 'Application Form', type: 'application', uploaded: false },
    { name: 'Resume', type: 'resume', uploaded: false },
    { name: 'Birth Certificate', type: 'certificate', uploaded: false },
  ]

  const isLoading = ref(true)
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

  const displayEmail = computed(() => authStore.userEmail || 'candidate@example.com')
  const displayName = computed(() => authStore.displayName)
  const userInitials = computed(() => authStore.userInitials)
  const displayUsername = computed(() => fullProfileData.value?.username || 'candidate')
  const displayPhone = computed(() => fullProfileData.value?.contact_number || '0912 345 6789')
  const displayLocation = computed(() => fullProfileData.value?.province || 'Agusan del Sur, Philippines')
  
  const displayBio = computed(() =>
    'Passionate and results-driven professional dedicated to delivering high-quality work. Experienced in collaborating with cross-functional teams to build efficient solutions.'
  )
  const displayJoinedDate = computed(() =>
    new Date(authStore.user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  )
  const displayEmploymentStatus = computed(() => applicantData.value?.employment_status || 'Available for Work')

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

      if (routeUsername.value && routeUsername.value === authStore.username && authStore.profile) {
        hydrateFromAuthStore()
        return
      }

      const result = await fetchApplicantProfileByUsername(routeUsername.value)

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

  onMounted(async () => {
    await authStore.init()
    await fetchApplicantProfile()
  })

  return {
    files,
    isOwnProfile,
    isNsrpComplete,
    isLoading,
    fullProfileData,
    applicantData,

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