import { ref } from 'vue'
import { defineStore } from 'pinia'
import { jobApplicantService } from '@/services/employer/jobApplicantService'
import { jobApplicationDocumentService } from '@/services/common/jobApplicationDocumentService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { JOB_APPLICANT_PAGE_SIZE, toJobApplicantErrorMessage } from '@/helpers/employer/jobApplicantHelper'
import type { JobApplicationDocumentMap } from '@/types/common/jobVacancyApplication'
import type {
  ApplicantStepCounts,
  ApplicantStageFilter,
  ApplicantVacancySummary,
  VacancyApplicantRow,
  VacancyApplicationDetails,
} from '@/types/employer/jobApplicant'

const EMPTY_STEP_COUNTS = (): ApplicantStepCounts => ({ all: 0, applied: 0, rejected: 0, byStep: {} })

/**
 * One job posting's applicants (opened from its "View applicants" action) and the review sheet. One page is held at a time; search, filters and counts run on the
 * server (BACKEND.md §19).
 */
export const useJobApplicantStore = defineStore('employerJobApplicants', () => {
  const toastAlert = useToastAlert()

  // ─── One vacancy's applicants ───
  const vacancy = ref<ApplicantVacancySummary | null>(null)
  const applicants = ref<VacancyApplicantRow[]>([])
  const total = ref(0)
  const stageCounts = ref<ApplicantStepCounts>(EMPTY_STEP_COUNTS())
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
  let applicantRequestId = 0

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
      stageCounts.value = await jobApplicantService.fetchStepCounts(vacancyId)
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
      stageCounts.value = EMPTY_STEP_COUNTS()
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

  /** target: 'applied', 'rejected' or a hiring step id; label: what it's called, for the toast */
  async function updateStage(target: ApplicantStageFilter, label: string, remarks: string | null): Promise<boolean> {
    const application = selectedApplication.value
    if (!application) return false
    isSavingStage.value = true
    try {
      await jobApplicantService.moveApplication(application.id, target, remarks)
      toastAlert.success('Applicant moved', `The applicant is now at ${label}.`)
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
