import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useSpesFormStore } from '@/stores/applicant/spesFormStore'
import { SPES_DOCUMENT_REQUIREMENTS } from '@/types/common/spesForm'
import {
  SPES_ABOUT,
  SPES_APPLICATION_LETTER,
  SPES_APPLICATION_LETTER_KEY,
  SPES_FACTS,
  SPES_HERO,
} from '@/types/common/spesProgram'
import { useApplicationLetterGuide } from '@/composables/landing/useApplicationLetterGuide'

/**
 * SPES program page, shared by the public /spes page and the applicant's SPES page (like useLandingGip):
 * a hero, what SPES is and its requirements, read-only. Visitors get "Log in to apply"; applicants go to
 * the application form (ApplicantSpesApplicationForm.vue).
 */
export function useLandingSpes() {
  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const siteContentStore = useSiteContentStore()
  const { programImages } = storeToRefs(siteContentStore)
  const store = useSpesFormStore()
  const { myForm, isLoading } = storeToRefs(store)

  const isSignedIn = computed(() => authStore.isAuthenticated)
  // Other roles (PESO staff, employers) only read the program details
  const isApplicant = computed(() => authStore.isAuthenticated && authStore.userRole === 'applicant')
  const profileId = computed(() => (isApplicant.value ? (user.value?.id ?? null) : null))

  // The hero uses the SPES photo of the landing PESO Programs gallery (Site Contents, migration 049)
  const hero = computed(() => ({ ...SPES_HERO, backgroundImage: programImages.value.spes ?? null }))

  const requirements = SPES_DOCUMENT_REQUIREMENTS.map((doc) => ({
    name: doc.label,
    note: doc.hint,
    isLetter: doc.key === SPES_APPLICATION_LETTER_KEY,
  }))

  /** Who the Application Letter goes to, as on the GIP page */
  const { letterGuide } = useApplicationLetterGuide(SPES_APPLICATION_LETTER)

  /** Which call to action the page shows under the requirements */
  const cta = computed<'login' | 'apply' | 'applied' | 'none'>(() => {
    if (!isSignedIn.value) return 'login'
    if (!isApplicant.value) return 'none'
    return myForm.value ? 'applied' : 'apply'
  })

  // Only applicants have an application to look up; it picks "Apply now" or "View my application"
  watch(
    profileId,
    (id) => {
      if (id) void store.fetchMyForm(id)
    },
    { immediate: true }
  )

  onMounted(() => {
    void siteContentStore.loadProgramCards()
  })

  return {
    hero,
    about: SPES_ABOUT,
    facts: SPES_FACTS,
    requirements,
    letterGuide,
    cta,
    isLoading,
  }
}
