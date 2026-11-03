import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEmployerJobFairStore } from '@/stores/employer/jobFairStore'
import { toJobFairEventCard } from '@/helpers/common/jobFairEventHelper'
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
        to: { name: 'employer-job-fair-details', params: { jobFairId: row.id } },
      }))
  })

  const scopeModel = computed({
    get: () => scope.value,
    set: (value: JobFairListScope) => store.setScope(value),
  })

  onMounted(() => {
    void store.fetchEvents()
  })

  return {
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
