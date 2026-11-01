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
 * One job posting's applicants (opened from its "View applicants" action) and the review page of one
 * application. One page is held at a time; search, filters and counts run on the server (BACKEND.md §19).
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
  const shortlistedOnly = ref(false)
  const shortlistCount = ref(0)
  const page = ref(0)
  const pageSize = ref(JOB_APPLICANT_PAGE_SIZE)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Review page ───
  const selectedApplication = ref<VacancyApplicationDetails | null>(null)
  const documents = ref<JobApplicationDocumentMap>({})
  const isLoadingDetail = ref(false)
  const detailError = ref<string | null>(null)
  const isSavingStage = ref(false)
  const isSelectedShortlisted = ref(false)
  /** Applications whose shortlist change is on its way */
  const shortlistBusyIds = ref<Set<string>>(new Set())

  /** Ignore a slower, older response that lands after a newer one */
  let applicantRequestId = 0
  let detailRequestId = 0

  /** Another vacancy: start its list over (search, step filter, page) */
  function resetVacancy() {
    vacancy.value = null
    applicants.value = []
    total.value = 0
    stageCounts.value = EMPTY_STEP_COUNTS()
    search.value = ''
    stageFilter.value = 'all'
    shortlistedOnly.value = false
    shortlistCount.value = 0
    page.value = 0
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
        shortlistedOnly: shortlistedOnly.value,
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
      const [counts, shortlisted] = await Promise.all([
        jobApplicantService.fetchStepCounts(vacancyId),
        jobApplicantService.fetchShortlistCount(vacancyId),
      ])
      stageCounts.value = counts
      shortlistCount.value = shortlisted
    } catch {
      // The list shows its own error; the counts just stay as they were
    }
  }

  /** Opens a vacancy's applicants: its title, the counts and the current page */
  async function openVacancy(vacancyId: string): Promise<void> {
    if (vacancy.value?.id !== vacancyId) resetVacancy()
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

  function setShortlistedOnly(value: boolean) {
    shortlistedOnly.value = value
    page.value = 0
    return fetchApplicants()
  }

  function setPage(value: number) {
    page.value = Math.max(0, value)
    return fetchApplicants()
  }

  // ─── Shortlist ───

  /** Applies a shortlist change to what's on screen (list row, count, review page) */
  function applyShortlisted(applicationId: string, value: boolean) {
    const row = applicants.value.find((item) => item.id === applicationId)
    if (row && row.is_shortlisted !== value) {
      row.is_shortlisted = value
      shortlistCount.value = Math.max(0, shortlistCount.value + (value ? 1 : -1))
    }
    if (selectedApplication.value?.id === applicationId) isSelectedShortlisted.value = value
  }

  /** Adds or removes an applicant from the shortlist, shown at once and put back if it fails */
  async function setShortlisted(applicationId: string, value: boolean): Promise<void> {
    if (shortlistBusyIds.value.has(applicationId)) return
    shortlistBusyIds.value = new Set(shortlistBusyIds.value).add(applicationId)
    applyShortlisted(applicationId, value)
    try {
      await jobApplicantService.setShortlisted(applicationId, value)
      toastAlert.success(value ? 'Added to shortlist' : 'Removed from shortlist')
      // Counts of a page opened without the list, and the shortlisted-only list, come from the server
      if (vacancy.value && !applicants.value.some((item) => item.id === applicationId)) void fetchStageCounts()
      if (shortlistedOnly.value && !value) void fetchApplicants()
    } catch (error: unknown) {
      applyShortlisted(applicationId, !value)
      toastAlert.error('Error', toJobApplicantErrorMessage(error, 'Failed to update the shortlist.'))
    } finally {
      const next = new Set(shortlistBusyIds.value)
      next.delete(applicationId)
      shortlistBusyIds.value = next
    }
  }

  // ─── Review page ───

  /**
   * Loads one application for its page: the vacancy (its documents and hiring steps) when not loaded yet,
   * the applicant's summary (logged as a view) and their files.
   */
  async function openApplication(vacancyId: string, applicationId: string): Promise<void> {
    const current = ++detailRequestId
    if (selectedApplication.value?.id !== applicationId) closeApplication()
    detailError.value = null
    isLoadingDetail.value = true
    try {
      if (vacancy.value?.id !== vacancyId) {
        const summary = await jobApplicantService.fetchVacancy(vacancyId)
        if (current !== detailRequestId) return
        if (!summary) {
          detailError.value = 'This job posting could not be found.'
          return
        }
        resetVacancy()
        vacancy.value = summary
      }
      const [details, files, shortlisted] = await Promise.all([
        jobApplicantService.fetchApplication(applicationId),
        jobApplicationDocumentService.fetchDocuments(applicationId),
        jobApplicantService.isShortlisted(applicationId),
      ])
      if (current !== detailRequestId) return
      if (details.job_vacancy_id !== vacancyId) {
        detailError.value = 'This application is not for this job posting.'
        return
      }
      selectedApplication.value = details
      documents.value = files
      isSelectedShortlisted.value = shortlisted
    } catch (error: unknown) {
      if (current === detailRequestId) {
        detailError.value = toJobApplicantErrorMessage(error, 'Failed to open the application.')
      }
    } finally {
      if (current === detailRequestId) isLoadingDetail.value = false
    }
  }

  /** Drops the applicant's details and files once their page is left */
  function closeApplication() {
    selectedApplication.value = null
    documents.value = {}
    isSelectedShortlisted.value = false
  }

  /** target: 'applied', 'rejected' or a hiring step id; label: what it's called, for the toast */
  async function updateStage(target: ApplicantStageFilter, label: string, remarks: string | null): Promise<boolean> {
    const application = selectedApplication.value
    if (!application) return false
    isSavingStage.value = true
    try {
      await jobApplicantService.moveApplication(application.id, target, remarks)
      toastAlert.success('Applicant moved', `The applicant is now at ${label}.`)
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
    shortlistedOnly,
    shortlistCount,
    page,
    pageSize,
    isLoading,
    errorMessage,
    openVacancy,
    setSearch,
    setStageFilter,
    setShortlistedOnly,
    setPage,
    // Shortlist
    shortlistBusyIds,
    setShortlisted,
    // Review page
    selectedApplication,
    documents,
    isLoadingDetail,
    detailError,
    isSavingStage,
    isSelectedShortlisted,
    openApplication,
    closeApplication,
    updateStage,
  }
})
