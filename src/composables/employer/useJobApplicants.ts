import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { useAuthStore } from '@/stores/common/auth'
import { useJobApplicantStore } from '@/stores/employer/jobApplicantStore'
import {
  formatJobPostingDate,
  getJobPostingStatusLabel,
  getJobPostingStatusVariant,
} from '@/helpers/employer/jobPostingHelper'

/** Job Applicants page: each of the company's postings with how many applied, newest first */
export function useJobApplicants() {
  const authStore = useAuthStore()
  const store = useJobApplicantStore()
  const { vacancies, vacancyTotal, vacancyPage, vacancyPageSize, countsByVacancy, isLoadingVacancies } =
    storeToRefs(store)

  const searchInput = ref('')
  watchDebounced(searchInput, (value) => store.setVacancySearch(value), { debounce: 300 })

  const cards = computed(() =>
    vacancies.value.map((row) => {
      const counts = countsByVacancy.value.get(row.id)
      const openings = row.vacancy_count ?? 1
      return {
        id: row.id,
        title: row.position_title,
        summary: [row.place_of_work, `${openings} opening${openings === 1 ? '' : 's'}`].filter(Boolean).join(' · '),
        period: `${formatJobPostingDate(row.posting_date)} – ${formatJobPostingDate(row.valid_until)}`,
        statusLabel: getJobPostingStatusLabel(row.status),
        statusVariant: getJobPostingStatusVariant(row.status),
        applicantCount: counts?.all ?? 0,
        /** Not reviewed yet */
        newCount: counts?.applied ?? 0,
        to: { name: 'vacancy-applicants', params: { vacancyId: row.id } },
      }
    })
  )

  const hasSearch = computed(() => searchInput.value.trim() !== '')
  const clearSearch = () => {
    searchInput.value = ''
  }

  const pageCount = computed(() => Math.max(1, Math.ceil(vacancyTotal.value / vacancyPageSize.value)))
  const rangeLabel = computed(() => {
    if (vacancyTotal.value === 0) return '0 postings'
    const from = vacancyPage.value * vacancyPageSize.value + 1
    const to = Math.min(vacancyTotal.value, from + vacancies.value.length - 1)
    return `${from}–${to} of ${vacancyTotal.value} posting${vacancyTotal.value === 1 ? '' : 's'}`
  })
  const canPreviousPage = computed(() => vacancyPage.value > 0)
  const canNextPage = computed(() => vacancyPage.value + 1 < pageCount.value)
  const previousPage = () => store.setVacancyPage(vacancyPage.value - 1)
  const nextPage = () => store.setVacancyPage(vacancyPage.value + 1)

  onMounted(async () => {
    await authStore.init()
    searchInput.value = store.vacancySearch
    await store.fetchVacancies()
  })

  return {
    searchInput,
    hasSearch,
    clearSearch,
    cards,
    isLoading: isLoadingVacancies,
    rangeLabel,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
  }
}
