import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEmployerJobFairStore } from '@/stores/employer/jobFairStore'
import { toJobFairEventCard } from '@/helpers/common/jobFairEventHelper'
import { JOB_FAIR_ABOUT, JOB_FAIR_FACTS, EMPLOYER_JOB_FAIR_PAGE } from '@/types/common/jobFairProgram'
import { useLandingPageHero } from '@/composables/landing/useLandingPageHero'
import { toPageHero } from '@/helpers/common/siteContentHelper'
import type { JobFairListScope } from '@/types/common/jobFairEvent'

/** Job Fairs page (company owner): upcoming / ongoing fairs, or past ones, with the company's participation */
export function useEmployerJobFairs() {
  const store = useEmployerJobFairStore()
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
        ...toJobFairEventCard(row, row.my_participant_status),
        actionLabel: row.my_participant_status ? 'Manage' : 'View details',
        to: { name: 'employer-job-fair-details', params: { jobFairId: row.id } },
      }))
  })

  // Hero, "What is a Job Fair?" and "How it works", like the GIP / SPES / TUPAD pages
  // Hero text and photo are PESO's, from Site Contents → Job Fairs page (108–109); built-in text
  // and the plain band until PESO sets them
  const { hero: pageHero } = useLandingPageHero('job_fairs_employer')
  const hero = computed(() => {
    const { eyebrow, title, description, backgroundImage } = pageHero.value ?? toPageHero('job_fairs_employer', null, null)
    return { eyebrow, title, description, backgroundImage }
  })
  const about = JOB_FAIR_ABOUT
  const facts = JOB_FAIR_FACTS
  const steps = EMPLOYER_JOB_FAIR_PAGE.steps

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
