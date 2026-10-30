import { ref } from 'vue'
import { defineStore } from 'pinia'
import { jobVacancyApplicationService } from '@/services/applicant/jobVacancyApplicationService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { OpenVacancyRow } from '@/types/applicant/jobVacancyApplication'

export const VACANCY_PAGE_SIZE = 12

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** Open job vacancies on the applicant's Vacancies page; one page at a time, searched on the server */
export const useApplicantVacancyStore = defineStore('applicantVacancies', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const rows = ref<OpenVacancyRow[]>([])
  const total = ref(0)
  const search = ref('')
  const page = ref(0)
  const pageSize = ref(VACANCY_PAGE_SIZE)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  /** Ignores a slower, older response that lands after a newer one */
  let requestId = 0

  // ─── Actions ───
  async function fetchVacancies(): Promise<void> {
    const current = ++requestId
    isLoading.value = true
    errorMessage.value = null
    try {
      const result = await jobVacancyApplicationService.searchOpenVacancies({
        search: search.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      if (current !== requestId) return
      rows.value = result.rows
      total.value = result.total
    } catch (error: unknown) {
      if (current !== requestId) return
      errorMessage.value = errorMessageOf(error, 'Failed to load the job vacancies')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      if (current === requestId) isLoading.value = false
    }
  }

  function setSearch(value: string) {
    search.value = value
    page.value = 0
    return fetchVacancies()
  }

  function setPage(value: number) {
    page.value = Math.max(0, value)
    return fetchVacancies()
  }

  return { rows, total, search, page, pageSize, isLoading, errorMessage, fetchVacancies, setSearch, setPage }
})
