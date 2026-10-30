import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchJobPostings } from '@/services/employer/jobPostingService'
import { jobApplicantService } from '@/services/employer/jobApplicantService'
import { jobApplicationDocumentService } from '@/services/common/jobApplicationDocumentService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import {
  APPLICANT_VACANCY_PAGE_SIZE,
  JOB_APPLICANT_PAGE_SIZE,
  toJobApplicantErrorMessage,
} from '@/helpers/employer/jobApplicantHelper'
import { getJobApplicationStageLabel } from '@/helpers/common/jobVacancyApplicationHelper'
import type { JobPostingListRow } from '@/types/employer/jobPosting'
import type { JobApplicationDocumentMap, JobApplicationStage } from '@/types/common/jobVacancyApplication'
import type {
  ApplicantStageCounts,
  ApplicantStageFilter,
  ApplicantVacancySummary,
  VacancyApplicantRow,
  VacancyApplicationDetails,
} from '@/types/employer/jobApplicant'

/**
 * Job Applicants pages: the company's vacancies with their applicant counts, then one vacancy's
 * applicants and the review sheet. One page is held at a time; search, filters and counts run on the
 * server (BACKEND.md §19).
 */
export const useJobApplicantStore = defineStore('employerJobApplicants', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── Vacancies ───
  const vacancies = ref<JobPostingListRow[]>([])
  const vacancyTotal = ref(0)
  const vacancySearch = ref('')
  const vacancyPage = ref(0)
  const vacancyPageSize = ref(APPLICANT_VACANCY_PAGE_SIZE)
  const countsByVacancy = ref<Map<string, ApplicantStageCounts>>(new Map())
  const isLoadingVacancies = ref(false)

  // ─── One vacancy's applicants ───
  const vacancy = ref<ApplicantVacancySummary | null>(null)
  const applicants = ref<VacancyApplicantRow[]>([])
  const total = ref(0)
  const stageCounts = ref<ApplicantStageCounts>(jobApplicantService.emptyCounts())
  const search = ref('')
  const stageFilter = ref<ApplicantStageFilter>('all')
  const page = ref(0)
  const pageSize = ref(JOB_APPLICANT_PAGE_SIZE)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Review sheet ───
  const isDetailOpen = ref(false)
  const selectedApplication = ref<VacancyApplicationDetails | null>(null)
  const documents = ref<JobApplicationDocumentMap>({})
  const isLoadingDetail = ref(false)
  const isSavingStage = ref(false)
  const busyId = ref<string | null>(null)

  /** Ignore a slower, older response that lands after a newer one */
  let vacancyRequestId = 0
  let applicantRequestId = 0

  // ─── Vacancy actions ───

  async function fetchVacancies(): Promise<void> {
    const establishmentId = authStore.employerEstablishment?.id
    if (!establishmentId) {
      vacancies.value = []
      vacancyTotal.value = 0
      return
    }
    const current = ++vacancyRequestId
    isLoadingVacancies.value = true
    try {
      const result = await fetchJobPostings(establishmentId, {
        search: vacancySearch.value,
        status: 'all',
        page: vacancyPage.value,
        pageSize: vacancyPageSize.value,
      })
      const counts = await jobApplicantService.fetchStageCounts(result.rows.map((row) => row.id))
      if (current !== vacancyRequestId) return
      vacancies.value = result.rows
      vacancyTotal.value = result.total
      countsByVacancy.value = counts
    } catch (error: unknown) {
      if (current === vacancyRequestId) {
        toastAlert.error('Error', toJobApplicantErrorMessage(error, 'Failed to load your job postings.'))
      }
    } finally {
      if (current === vacancyRequestId) isLoadingVacancies.value = false
    }
  }

  function setVacancySearch(value: string) {
    vacancySearch.value = value
    vacancyPage.value = 0
    return fetchVacancies()
  }

  function setVacancyPage(value: number) {
    vacancyPage.value = Math.max(0, value)
    return fetchVacancies()
  }

  // ─── Applicant actions ───

  async function fetchApplicants(): Promise<void> {
    const vacancyId = vacancy.value?.id
    if (!vacancyId) return
    const current = ++applicantRequestId
    isLoading.value = true
    try {
      const result = await jobApplicantService.searchApplicants(vacancyId, {
        search: search.value,
        stage: stageFilter.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      if (current !== applicantRequestId) return
      applicants.value = result.rows
      total.value = result.total
    } catch (error: unknown) {
      if (current === applicantRequestId) {
        toastAlert.error('Error', toJobApplicantErrorMessage(error, 'Failed to load the applicants.'))
      }
    } finally {
      if (current === applicantRequestId) isLoading.value = false
    }
  }

  async function fetchStageCounts(): Promise<void> {
    const vacancyId = vacancy.value?.id
    if (!vacancyId) return
    try {
      const counts = await jobApplicantService.fetchStageCounts([vacancyId])
      stageCounts.value = counts.get(vacancyId) ?? jobApplicantService.emptyCounts()
    } catch {
      // The list shows its own error; the counts just stay as they were
    }
  }

  /** Opens a vacancy's applicants: its title, the counts and the first page */
  async function openVacancy(vacancyId: string): Promise<void> {
    if (vacancy.value?.id !== vacancyId) {
      vacancy.value = null
      applicants.value = []
      total.value = 0
      stageCounts.value = jobApplicantService.emptyCounts()
      search.value = ''
      stageFilter.value = 'all'
      page.value = 0
    }
    errorMessage.value = null
    isLoading.value = true
    try {
      const summary = await jobApplicantService.fetchVacancy(vacancyId)
      if (!summary) {
        errorMessage.value = 'This job posting could not be found.'
        isLoading.value = false
        return
      }
      vacancy.value = summary
      await Promise.all([fetchApplicants(), fetchStageCounts()])
    } catch (error: unknown) {
      errorMessage.value = toJobApplicantErrorMessage(error, 'Failed to load the job posting.')
      isLoading.value = false
    }
  }

  function setSearch(value: string) {
    search.value = value
    page.value = 0
    return fetchApplicants()
  }

  function setStageFilter(value: ApplicantStageFilter) {
    stageFilter.value = value
    page.value = 0
    return fetchApplicants()
  }

  function setPage(value: number) {
    page.value = Math.max(0, value)
    return fetchApplicants()
  }

  // ─── Review sheet ───

  /** Loads the applicant's summary (logged as a view) and their files before the sheet opens */
  async function openApplication(applicationId: string): Promise<void> {
    busyId.value = applicationId
    isLoadingDetail.value = true
    try {
      const [details, files] = await Promise.all([
        jobApplicantService.fetchApplication(applicationId),
        jobApplicationDocumentService.fetchDocuments(applicationId),
      ])
      selectedApplication.value = details
      documents.value = files
      isDetailOpen.value = true
    } catch (error: unknown) {
      toastAlert.error('Error', toJobApplicantErrorMessage(error, 'Failed to open the application.'))
    } finally {
      isLoadingDetail.value = false
      busyId.value = null
    }
  }

  function closeApplication() {
    isDetailOpen.value = false
    selectedApplication.value = null
    documents.value = {}
  }

  async function updateStage(stage: JobApplicationStage, remarks: string | null): Promise<boolean> {
    const application = selectedApplication.value
    if (!application) return false
    isSavingStage.value = true
    try {
      await jobApplicantService.updateStage(application.id, stage, remarks)
      toastAlert.success('Stage updated', `The applicant is now in ${getJobApplicationStageLabel(stage).toLowerCase()}.`)
      closeApplication()
      await Promise.all([fetchApplicants(), fetchStageCounts()])
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', toJobApplicantErrorMessage(error, 'Failed to update the stage.'))
      return false
    } finally {
      isSavingStage.value = false
    }
  }

  return {
    // Vacancies
    vacancies,
    vacancyTotal,
    vacancySearch,
    vacancyPage,
    vacancyPageSize,
    countsByVacancy,
    isLoadingVacancies,
    fetchVacancies,
    setVacancySearch,
    setVacancyPage,
    // Applicants
    vacancy,
    applicants,
    total,
    stageCounts,
    search,
    stageFilter,
    page,
    pageSize,
    isLoading,
    errorMessage,
    openVacancy,
    setSearch,
    setStageFilter,
    setPage,
    // Review sheet
    isDetailOpen,
    selectedApplication,
    documents,
    isLoadingDetail,
    isSavingStage,
    busyId,
    openApplication,
    closeApplication,
    updateStage,
  }
})
