import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import { useApplicationLetterGuide } from '@/composables/landing/useApplicationLetterGuide'
import {
  GIP_ABOUT,
  GIP_APPLICATION_LETTER,
  GIP_APPLICATION_LETTER_DOCUMENT,
  GIP_FACTS,
  GIP_HERO,
  GIP_NSRP_DOCUMENT,
  GIP_OPTIONAL_DOCUMENTS,
  GIP_REQUIRED_DOCUMENTS,
} from '@/types/common/gipProgram'

/**
 * GIP program page, shared by the public /gip page and the applicant's GIP page: a hero, what GIP is
 * and its requirements, read-only. Visitors get "Log in to apply"; applicants go to the application
 * form (ApplicantGipApplicationForm.vue) to upload their soft copies.
 */
export function useLandingGip() {
  const authStore = useAuthStore()
  const { applicantProfile } = storeToRefs(authStore)
  const siteContentStore = useSiteContentStore()
  const { programImages } = storeToRefs(siteContentStore)
  const store = useGipApplicationStore()
  const { myApplication, isLoading } = storeToRefs(store)

  const isSignedIn = computed(() => authStore.isAuthenticated)
  // Other roles (PESO staff, employers) only read the program details
  const isApplicant = computed(() => authStore.isAuthenticated && authStore.userRole === 'applicant')
  const applicantId = computed(() => (isApplicant.value ? (applicantProfile.value?.id ?? null) : null))

  // The hero uses the GIP photo of the landing PESO Programs gallery (Site Contents, migration 049)
  const hero = computed(() => ({ ...GIP_HERO, backgroundImage: programImages.value.gip ?? null }))

  const requirements = GIP_REQUIRED_DOCUMENTS.map((name) => ({
    name,
    note: name === GIP_NSRP_DOCUMENT ? 'Generated from your profile when you apply' : null,
    isOptional: GIP_OPTIONAL_DOCUMENTS.includes(name),
    isLetter: name === GIP_APPLICATION_LETTER_DOCUMENT,
  }))

  /** Who the Application Letter goes to, named from the org chart when it has them */
  const { letterGuide } = useApplicationLetterGuide(GIP_APPLICATION_LETTER)

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
    about: GIP_ABOUT,
    facts: GIP_FACTS,
    requirements,
    letterGuide,
    cta,
    isLoading,
  }
}
