import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { usePrivacyStore } from '@/stores/common/privacyStore'
import { useAuth } from '@/composables/common/useAuth'
import { getDashboardRouteForRole } from '@/router'
import { getPrivacyConsentStatement } from '@/helpers/common/privacyHelper'
import type { PrivacyPurpose } from '@/types/common/privacy'

/**
 * The consent screen the router guard sends signed-in accounts to until they accept the current
 * Privacy Notice (new notice version, accounts made before migration 073, staff created by an admin).
 */
export function usePrivacyConsent() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const { privacyStatus, userRole } = storeToRefs(authStore)
  const privacyStore = usePrivacyStore()
  const { isAccepting } = storeToRefs(privacyStore)
  const { handleSignOut } = useAuth()

  /** Every purpose the account's role requires, each ticked separately (consent must be specific) */
  const purposes = computed(() =>
    (privacyStatus.value?.required ?? ['privacy_notice']).map((purpose) => ({
      purpose,
      statement: getPrivacyConsentStatement(purpose),
    }))
  )

  const ticked = reactive<Partial<Record<PrivacyPurpose, boolean>>>({})
  const canAccept = computed(() => purposes.value.every(({ purpose }) => ticked[purpose]))

  const isUpdate = computed(() => (privacyStatus.value?.consents.length ?? 0) > 0)

  function setTicked(purpose: PrivacyPurpose, value: boolean | 'indeterminate') {
    ticked[purpose] = value === true
  }

  async function accept() {
    if (!canAccept.value) return
    const done = await privacyStore.acceptNotice(purposes.value.map(({ purpose }) => purpose))
    if (!done) return
    // Only an in-app path: "//host" would leave the site
    const target = route.query.redirect
    const redirect = typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
    await router.replace(redirect ?? getDashboardRouteForRole(userRole.value))
  }

  return {
    purposes,
    ticked,
    canAccept,
    isUpdate,
    isAccepting,
    noticeVersion: computed(() => privacyStatus.value?.notice_version ?? ''),
    setTicked,
    accept,
    handleSignOut,
  }
}
