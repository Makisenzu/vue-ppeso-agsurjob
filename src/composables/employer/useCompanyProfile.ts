import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyProfileStore } from '@/stores/employer/companyProfileStore'
import { mediaService } from '@/services/common/mediaService'
import { fetchCompanyProfileByProfileId } from '@/services/employer/companyProfileService'
import {
  formatVerificationStatus,
  getVerificationBadgeVariant,
  formatEmployeeCount,
  formatCompanyField,
  getCompanyCoverPath,
  getCompanyLogoPath,
} from '@/helpers/employer/companyProfileHelpers'
import { getCompanyStatusBadge } from '@/helpers/common/companyRequirementHelper'
import type { EmployerRecord, ProfileRecord } from '@/types/employer/companyProfile'

export function useCompanyProfile() {
  const authStore = useAuthStore()
  const companyStore = useCompanyProfileStore()
  const { establishment, isLoadingEstablishment } = storeToRefs(companyStore)

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

  /** Website as a link (adds https:// when the owner left it out) */
  const websiteHref = computed(() =>
    displayWebsite.value.startsWith('http') ? displayWebsite.value : `https://${displayWebsite.value}`,
  )

  // ─── Company status set by Provincial PESO (same pill as the Account page) ───

  const companyStatus = computed(() => getCompanyStatusBadge(employer.value?.verification_status))

  /** Company cover photo (migration 076); null shows the plain band */
  const coverUrl = computed(() =>
    getCompanyCoverPath(employer.value) ? mediaService.getPublicUrl(getCompanyCoverPath(employer.value)!) : null,
  )

  /** Company logo (migration 078); null shows the initials */
  const logoUrl = computed(() =>
    getCompanyLogoPath(employer.value) ? mediaService.getPublicUrl(getCompanyLogoPath(employer.value)!) : null,
  )

  /** Rows of the Company Details card: the employer half of Form 2 plus the company-only fields */
  const companyDetails = computed(() => {
    const form2 = establishment.value
    const employerType = form2?.employer_category === 'Public' ? form2?.public_employer_type : form2?.private_employer_type
    return [
      { label: 'Business name', value: form2?.business_name ?? displayCompanyName.value },
      { label: 'Trade name', value: form2?.trade_name ?? '' },
      { label: 'Acronym', value: form2?.acronym ?? '' },
      { label: 'TIN', value: form2?.tin ?? '' },
      { label: 'Employer category', value: [form2?.employer_category, employerType].filter(Boolean).join(' · ') },
      { label: 'Total workforce', value: form2?.total_workforce ?? '' },
      { label: 'Line of industry', value: form2?.industry_line ?? employer.value?.industry ?? '' },
      { label: 'Owner / President', value: form2?.owner_president_name ?? '' },
      { label: 'Business type', value: employer.value?.business_type ?? '' },
      { label: 'Registration number', value: employer.value?.registration_number ?? '' },
    ]
  })

  /** Rows of the Contact & Address card: the contact and address half of Form 2 */
  const contactDetails = computed(() => {
    const form2 = establishment.value
    return [
      { label: 'Contact person', value: form2?.contact_person_name ?? '' },
      { label: 'Position', value: form2?.contact_person_position ?? '' },
      { label: 'Email address', value: form2?.email_address ?? employer.value?.company_email ?? '' },
      { label: 'Mobile number', value: form2?.mobile_number ?? '' },
      { label: 'Telephone number', value: form2?.telephone_number ?? '' },
      { label: 'Fax number', value: form2?.fax_number ?? '' },
      { label: 'Address', value: employer.value?.company_address ?? '' },
      { label: 'Office', value: form2 ? (form2.is_main_office ? 'Main office' : 'Branch') : '' },
      { label: 'Website', value: displayWebsite.value },
    ]
  })

  // ─── Data fetching ───

  function hydrateFromAuthStore() {
    employer.value = authStore.employerProfile
    ownerProfile.value = authStore.profile as ProfileRecord | null
  }

  async function loadCompanyProfile() {
    try {
      isLoading.value = true

      // Form 2 holds most of the profile; it loads alongside the company row
      void companyStore.fetchEstablishment()

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

  // Section edits and cover changes reload the auth store's company row
  watch(
    () => authStore.employerProfile,
    (company) => {
      if (company) employer.value = company
    },
  )

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
    websiteHref,
    companyStatus,
    companyDetails,
    contactDetails,
    /** The detail cards also wait for Form 2 */
    isLoadingDetails: computed(() => isLoading.value || isLoadingEstablishment.value),
    coverUrl,
    logoUrl,

    // Owner display
    ownerDisplayName,
    ownerInitials,
    ownerEmail,
  }
}
