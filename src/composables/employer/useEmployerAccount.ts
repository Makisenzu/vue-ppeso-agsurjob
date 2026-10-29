import { computed } from 'vue'
import { useAuthStore } from '@/stores/common/auth'
import {
  formatAccountAddress,
  formatBirthdate,
  formatGender,
} from '@/helpers/employer/employerAccountHelper'
import { getCompanyStatusBadge } from '@/helpers/common/companyRequirementHelper'

/**
 * Employer "Account" page: the owner's own account details (core.profiles), laid out like the
 * applicant profile but without the documents stepper. Edits go through ProfileEdit.
 */
export function useEmployerAccount() {
  const authStore = useAuthStore()

  const profile = computed(() => authStore.profile)

  const displayName = computed(() => authStore.displayName)
  const userInitials = computed(() => authStore.userInitials)
  const username = computed(() => authStore.username)
  const email = computed(() => authStore.userEmail)
  const phone = computed(() => profile.value?.contact_number ?? '')
  const location = computed(() => formatAccountAddress(profile.value))
  const joinedDate = computed(() => {
    const createdAt = authStore.user?.created_at
    return createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''
  })

  /** Rows of the Account Details card; empty values show as "—" */
  const accountDetails = computed(() => [
    { label: 'Full name', value: displayName.value },
    { label: 'Username', value: username.value ? `@${username.value}` : '' },
    { label: 'Sign-in email', value: email.value },
    { label: 'Contact number', value: phone.value },
    { label: 'Birthdate', value: formatBirthdate(profile.value?.birthdate) },
    { label: 'Gender', value: formatGender(profile.value?.gender) },
    { label: 'Address', value: formatAccountAddress(profile.value) },
    { label: 'Role', value: 'Company Owner' },
  ])

  const companyName = computed(() => authStore.employerProfile?.company_name ?? '')
  /** Company status set by Provincial PESO (Form 2 is always complete once signup is done) */
  const companyStatus = computed(() => getCompanyStatusBadge(authStore.employerProfile?.verification_status))

  return {
    displayName,
    userInitials,
    username,
    email,
    phone,
    location,
    joinedDate,
    media: computed(() => authStore.profileMedia),
    profileId: computed(() => profile.value?.id ?? null),
    accountDetails,
    companyName,
    companyStatus,
  }
}
