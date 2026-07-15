import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { DocumentFile } from '@/components/applicant/Profile/ProfileFiles.vue'
import { fetchApplicantProfileByUsername } from '@/services/applicantProfileService'

export function useApplicantProfile() {
  const authStore = useAuthStore()
  const route = useRoute()
  const routeUsername = computed(() => String(route.params.username ?? '').trim())

  const requiredFiles: DocumentFile[] = [
    { name: 'NSRP Form', type: 'form', uploaded: false },
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

  function normalizeRequirement(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  function isRequirementMet(fileName: string) {
    const normalizedFileName = normalizeRequirement(fileName)

    if (!normalizedFileName) return false

    const uploadedRequirementNames = requirementMedia.value
      .map((item) => String(item?.filename ?? '').trim())
      .filter(Boolean)

    if (uploadedRequirementNames.some((name) => normalizeRequirement(name) === normalizedFileName)) {
      return true
    }

    return requirements.value.some((item) => {
      const requirementLabel = String(item?.filename ?? item?.remarks ?? item?.requirement_id ?? item?.id ?? '')
      const normalizedRequirementLabel = normalizeRequirement(requirementLabel)

      if (!normalizedRequirementLabel) return false

      return (
        normalizedRequirementLabel === normalizedFileName ||
        normalizedRequirementLabel.includes(normalizedFileName) ||
        normalizedFileName.includes(normalizedRequirementLabel)
      )
    })
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
      .map((item) => item?.filename || item?.remarks || item?.requirement_id || item?.id)
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

  // Keep local requirement media in sync when viewing own profile
  watch(
    () => authStore.applicantRequirementMedia,
    (val) => {
      if (routeUsername.value && routeUsername.value === authStore.username) {
        requirementMedia.value = val ?? []
      }
    }
  )

  onMounted(async () => {
    await authStore.init()
    await fetchApplicantProfile()
  })

  return {
    files,
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