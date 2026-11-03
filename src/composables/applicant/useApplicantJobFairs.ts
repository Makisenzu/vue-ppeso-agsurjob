import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useApplicantJobFairStore } from '@/stores/applicant/jobFairStore'
import { toJobFairEventCard } from '@/helpers/common/jobFairEventHelper'
import { JOB_FAIR_ABOUT, JOB_FAIR_FACTS, APPLICANT_JOB_FAIR_PAGE } from '@/types/common/jobFairProgram'
import { useLandingPageHero } from '@/composables/landing/useLandingPageHero'
import { toPageHero } from '@/helpers/common/siteContentHelper'
import type { JobFairListScope } from '@/types/common/jobFairEvent'

/** Job Fairs page (applicant): upcoming / ongoing fairs, or past ones, with the applicant's registration */
export function useApplicantJobFairs() {
  const store = useApplicantJobFairStore()
  const { events, scope, isLoading, errorMessage } = storeToRefs(store)

  // The list is bounded (one row per fair), so search runs in the browser
  const searchInput = ref('')
  const hasSearch = computed(() => searchInput.value.trim() !== '')
  const clearSearch = () => {
    searchInput.value = ''
  }

  const cards = computed(() => {
    const term = searchInput.value.trim().toLowerCase()
    return events.value
      .filter((row) => !term || `${row.title} ${row.location}`.toLowerCase().includes(term))
      .map((row) => ({
        ...toJobFairEventCard(row, row.my_registration_status),
        actionLabel: 'View details',
        to: { name: 'applicant-job-fair-details', params: { jobFairId: row.id } },
      }))
  })

  // Hero, "What is a Job Fair?" and "How it works", like the GIP / SPES / TUPAD pages
  // Hero text and photo are PESO's, from Site Contents → Job Fairs page (108–109); built-in text
  // and the plain band until PESO sets them
  const { hero: pageHero } = useLandingPageHero('job_fairs_applicant')
  const hero = computed(() => {
    const { eyebrow, title, description, backgroundImage } = pageHero.value ?? toPageHero('job_fairs_applicant', null, null)
    return { eyebrow, title, description, backgroundImage }
  })
  const about = JOB_FAIR_ABOUT
  const facts = JOB_FAIR_FACTS
  const steps = APPLICANT_JOB_FAIR_PAGE.steps

  const scopeModel = computed({
    get: () => scope.value,
    set: (value: JobFairListScope) => store.setScope(value),
  })

  onMounted(() => {
    void store.fetchEvents()
  })

  return {
    hero,
    about,
    facts,
    steps,
    scopeModel,
    searchInput,
    hasSearch,
    clearSearch,
    cards,
    isLoading,
    errorMessage,
    reload: store.fetchEvents,
  }
}
