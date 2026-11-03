import { ref } from 'vue'
import { defineStore } from 'pinia'
import { jobFairEventService } from '@/services/common/jobFairEventService'
import { jobFairRegistrationService } from '@/services/applicant/jobFairRegistrationService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { toJobFairErrorMessage } from '@/helpers/common/jobFairEventHelper'
import type {
  JobFairCompanyWithVacancies,
  JobFairEventRow,
  JobFairListScope,
} from '@/types/common/jobFairEvent'

/** Applicant side of job fairs: the list, one fair's companies and vacancies, and pre-registration */
export const useApplicantJobFairStore = defineStore('applicantJobFairs', () => {
  const toastAlert = useToastAlert()

  // ─── List ───
  const events = ref<JobFairEventRow[]>([])
  const scope = ref<JobFairListScope>('active')
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Details ───
  const event = ref<JobFairEventRow | null>(null)
  const companies = ref<JobFairCompanyWithVacancies[]>([])
  const isLoadingDetails = ref(false)
  const detailsError = ref<string | null>(null)
  const isSubmitting = ref(false)

  // ─── UI flags ───
  const isCancelOpen = ref(false)

  let listRequestId = 0
  let detailsRequestId = 0

  async function fetchEvents(): Promise<void> {
    const current = ++listRequestId
    isLoading.value = true
    errorMessage.value = null
    try {
      const rows = await jobFairEventService.fetchEvents(scope.value)
      if (current === listRequestId) events.value = rows
    } catch (error: unknown) {
      if (current === listRequestId) errorMessage.value = toJobFairErrorMessage(error, 'Failed to load job fairs.')
    } finally {
      if (current === listRequestId) isLoading.value = false
    }
  }

  function setScope(value: JobFairListScope) {
    if (scope.value === value) return
    scope.value = value
    events.value = []
    void fetchEvents()
  }

  async function fetchDetails(jobFairId: string): Promise<void> {
    const current = ++detailsRequestId
    isLoadingDetails.value = true
    detailsError.value = null
    if (event.value?.id !== jobFairId) {
      event.value = null
      companies.value = []
    }
    try {
      const [fair, companyRows, vacancyRows] = await Promise.all([
        jobFairEventService.fetchEvent(jobFairId),
        jobFairEventService.fetchCompanies(jobFairId),
        jobFairEventService.fetchVacancies(jobFairId),
      ])
      if (current !== detailsRequestId) return
      event.value = fair
      companies.value = companyRows.map((company) => ({
        ...company,
        vacancies: vacancyRows.filter((vacancy) => vacancy.participant_id === company.participant_id),
      }))
    } catch (error: unknown) {
      if (current === detailsRequestId) detailsError.value = toJobFairErrorMessage(error, 'Failed to load the job fair.')
    } finally {
      if (current === detailsRequestId) isLoadingDetails.value = false
    }
  }

  async function refreshEvent(jobFairId: string) {
    const fair = await jobFairEventService.fetchEvent(jobFairId)
    if (event.value?.id === jobFairId) event.value = fair
    events.value = events.value.map((row) => (row.id === jobFairId ? fair : row))
  }

  async function register(jobFairId: string): Promise<void> {
    isSubmitting.value = true
    try {
      await jobFairRegistrationService.register(jobFairId)
      toastAlert.success('Registered', 'See you at the job fair.')
      await refreshEvent(jobFairId)
    } catch (error: unknown) {
      toastAlert.error('Registration failed', toJobFairErrorMessage(error, 'Failed to register for the job fair.'))
    } finally {
      isSubmitting.value = false
    }
  }

  async function cancelRegistration(jobFairId: string): Promise<void> {
    isSubmitting.value = true
    try {
      await jobFairRegistrationService.cancel(jobFairId)
      toastAlert.success('Registration cancelled', 'You are no longer registered for this job fair.')
      isCancelOpen.value = false
      await refreshEvent(jobFairId)
    } catch (error: unknown) {
      toastAlert.error('Error', toJobFairErrorMessage(error, 'Failed to cancel your registration.'))
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    events,
    scope,
    isLoading,
    errorMessage,
    event,
    companies,
    isLoadingDetails,
    detailsError,
    isSubmitting,
    isCancelOpen,
    fetchEvents,
    setScope,
    fetchDetails,
    register,
    cancelRegistration,
  }
})
