import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/common/auth'
import { fetchCompanyProfileByProfileId } from '@/services/employer/companyProfileService'
import {
  formatVerificationStatus,
  getVerificationBadgeVariant,
  formatEmployeeCount,
  formatCompanyField,
} from '@/helpers/employer/companyProfileHelpers'
import type { EmployerRecord, ProfileRecord } from '@/types/employer/companyProfile'

export function useCompanyProfile() {
  const authStore = useAuthStore()

  const isLoading = ref(true)
  const employer = ref<EmployerRecord | null>(null)
  const ownerProfile = ref<ProfileRecord | null>(null)

  // ─── Display values ───

  const displayCompanyName = computed(() =>
    formatCompanyField(employer.value?.company_name, 'Unnamed Company'),
  )

  const displayIndustry = computed(() =>
    formatCompanyField(employer.value?.industry),
  )

  const displayBusinessType = computed(() =>
    formatCompanyField(employer.value?.business_type),
  )

  const displayAddress = computed(() =>
    formatCompanyField(employer.value?.company_address),
  )

  const displayDescription = computed(() =>
    employer.value?.company_description?.trim() || '',
  )

  const hasDescription = computed(() => displayDescription.value.length > 0)

  const displayWebsite = computed(() =>
    employer.value?.website?.trim() || '',
  )

  const hasWebsite = computed(() => displayWebsite.value.length > 0)

  const displayContact = computed(() =>
    formatCompanyField(employer.value?.company_contact),
  )

  const displayEmail = computed(() =>
    formatCompanyField(employer.value?.company_email),
  )

  const displayRegistrationNumber = computed(() =>
    formatCompanyField(employer.value?.registration_number),
  )

  const displayEmployeeCount = computed(() =>
    formatEmployeeCount(employer.value?.employee_count),
  )

  const displayVerificationStatus = computed(() =>
    formatVerificationStatus(employer.value?.verification_status),
  )

  const verificationBadgeVariant = computed(() =>
    getVerificationBadgeVariant(employer.value?.verification_status),
  )

  // ─── Owner info ───

  const ownerDisplayName = computed(() => {
    if (!ownerProfile.value) return authStore.displayName
    const first = ownerProfile.value.firstname || ''
    const middle = ownerProfile.value.middlename
      ? `${ownerProfile.value.middlename.charAt(0)}.`
      : ''
    const last = ownerProfile.value.lastname || ''
    return [first, middle, last].filter(Boolean).join(' ') || 'Owner'
  })

  const ownerInitials = computed(() => {
    if (!ownerProfile.value) return authStore.userInitials
    const first = ownerProfile.value.firstname?.charAt(0)?.toUpperCase() || ''
    const last = ownerProfile.value.lastname?.charAt(0)?.toUpperCase() || ''
    return `${first}${last}` || 'O'
  })

  const ownerEmail = computed(() => authStore.userEmail || '')

  // ─── Company initials (for avatar fallback) ───

  const companyInitials = computed(() => {
    const name = employer.value?.company_name?.trim()
    if (!name) return 'CO'
    const words = name.split(/\s+/).filter(Boolean)
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
  })

  // ─── Date display ───

  const displayCreatedDate = computed(() => {
    const raw = employer.value?.created_at
    if (!raw) return ''
    return new Date(raw).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  })

  // ─── Data fetching ───

  function hydrateFromAuthStore() {
    employer.value = authStore.employerProfile
    ownerProfile.value = authStore.profile as ProfileRecord | null
  }

  async function loadCompanyProfile() {
    try {
      isLoading.value = true

      // Try hydrating from the already-loaded auth store first
      if (authStore.employerProfile && authStore.profile) {
        hydrateFromAuthStore()
        return
      }

      // Fallback: fetch from the service
      const userId = authStore.user?.id
      if (!userId) return

      const result = await fetchCompanyProfileByProfileId(userId)
      employer.value = result.employer
      ownerProfile.value = result.ownerProfile
    } catch (error) {
      console.error('Error loading company profile:', error)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(async () => {
    await authStore.init()
    await loadCompanyProfile()
  })

  return {
    isLoading,
    employer,

    // Company display
    displayCompanyName,
    displayIndustry,
    displayBusinessType,
    displayAddress,
    displayDescription,
    hasDescription,
    displayWebsite,
    hasWebsite,
    displayContact,
    displayEmail,
    displayRegistrationNumber,
    displayEmployeeCount,
    displayVerificationStatus,
    verificationBadgeVariant,
    displayCreatedDate,
    companyInitials,

    // Owner display
    ownerDisplayName,
    ownerInitials,
    ownerEmail,
  }
}
