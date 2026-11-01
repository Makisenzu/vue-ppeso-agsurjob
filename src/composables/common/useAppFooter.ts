import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { CONTACTS } from '@/composables/landing/useLandingFooter'

export interface AppFooterLink {
  label: string
  to: RouteLocationRaw
}

/**
 * Compact footer of the signed-in layouts (applicant, employer): copyright, the privacy links
 * (RA 10173, PRIVACY.md) and the office's contacts. The public pages keep LandingFooter.vue.
 */
export function useAppFooter() {
  const authStore = useAuthStore()

  // Each role has its own Privacy & My Data page (inside its layout)
  const privacyCenterRoute = computed<RouteLocationRaw>(() =>
    authStore.userRole === 'company_owner' || authStore.userRole === 'company_member'
      ? { name: 'employer-privacy-center' }
      : { name: 'privacy-center' },
  )

  const links = computed<AppFooterLink[]>(() => [
    { label: 'Privacy Notice', to: { name: 'privacy-notice' } },
    { label: 'My Data', to: privacyCenterRoute.value },
  ])

  return {
    office: 'Provincial PESO Agusan del Sur',
    year: new Date().getFullYear(),
    links,
    contacts: CONTACTS,
  }
}
