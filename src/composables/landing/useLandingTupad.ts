import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useTupadApplicationStore } from '@/stores/applicant/tupadApplicationStore'
import { TUPAD_ABOUT, TUPAD_FACTS, TUPAD_HERO, TUPAD_REQUIREMENTS } from '@/types/common/tupadProgram'

/**
 * TUPAD program page, shared by the public /tupad page and the applicant's TUPAD page (like useLandingGip):
 * a hero, what TUPAD is and its requirements, read-only. Visitors get "Log in to apply"; applicants go to
 * the application form (ApplicantTupadApplicationForm.vue).
 */
export function useLandingTupad() {
  const authStore = useAuthStore()
  const { applicantProfile } = storeToRefs(authStore)
  const siteContentStore = useSiteContentStore()
  const { programImages } = storeToRefs(siteContentStore)
  const store = useTupadApplicationStore()
  const { myApplication, isLoading } = storeToRefs(store)

  const isSignedIn = computed(() => authStore.isAuthenticated)
  // Other roles (PESO staff, employers) only read the program details
  const isApplicant = computed(() => authStore.isAuthenticated && authStore.userRole === 'applicant')
  const applicantId = computed(() => (isApplicant.value ? (applicantProfile.value?.id ?? null) : null))

  // The hero uses the TUPAD photo of the landing PESO Programs gallery (Site Contents, migration 049)
  const hero = computed(() => ({ ...TUPAD_HERO, backgroundImage: programImages.value.tupad ?? null }))

  const requirements = TUPAD_REQUIREMENTS.map((doc) => ({ name: doc.name, note: doc.hint }))

  /** Which call to action the page shows under the requirements */
  const cta = computed<'login' | 'apply' | 'applied' | 'none'>(() => {
    if (!isSignedIn.value) return 'login'
    if (!isApplicant.value) return 'none'
    return myApplication.value ? 'applied' : 'apply'
  })

  // Only applicants have an application to look up; it picks "Apply now" or "View my application"
  watch(
    applicantId,
    (id) => {
      if (id) void store.fetchMyApplication(id)
    },
    { immediate: true }
  )

  onMounted(() => {
    void siteContentStore.loadProgramCards()
  })

  return {
    hero,
    about: TUPAD_ABOUT,
    facts: TUPAD_FACTS,
    requirements,
    cta,
    isLoading,
  }
}
