import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { jobFairEventService } from '@/services/common/jobFairEventService'
import { jobFairParticipationService } from '@/services/employer/jobFairParticipationService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { toJobFairErrorMessage } from '@/helpers/common/jobFairEventHelper'
import type {
  EmployerJobFairOffer,
  EmployerOfferablePosting,
  JobFairEventRow,
  JobFairListScope,
} from '@/types/common/jobFairEvent'

/** Employer side of job fairs: joining, withdrawing and offering the company's postings */
export const useEmployerJobFairStore = defineStore('employerJobFairs', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── List ───
  const events = ref<JobFairEventRow[]>([])
  const scope = ref<JobFairListScope>('active')
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const busyEventId = ref<string | null>(null)

  // ─── Details ───
  const event = ref<JobFairEventRow | null>(null)
  const offers = ref<EmployerJobFairOffer[]>([])
  const openPostings = ref<EmployerOfferablePosting[]>([])
  const isLoadingDetails = ref(false)
  const detailsError = ref<string | null>(null)
  const isSubmitting = ref(false)
  const busyOfferId = ref<string | null>(null)

  /** Open postings not yet offered at the open fair */
  const availablePostings = computed(() => {
    const offered = new Set(offers.value.map((offer) => offer.job_vacancy_id))
    return openPostings.value.filter((posting) => !offered.has(posting.id))
  })

  // ─── UI flags ───
  const isAddOfferOpen = ref(false)
  const isWithdrawOpen = ref(false)
  const offerToRemove = ref<EmployerJobFairOffer | null>(null)
  const offerToEdit = ref<EmployerJobFairOffer | null>(null)

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

  async function loadOffers(participantId: string | null) {
    const establishmentId = authStore.employerEstablishment?.id
    const [offerRows, postingRows] = await Promise.all([
      participantId ? jobFairParticipationService.fetchOffers(participantId) : Promise.resolve([]),
      participantId && establishmentId ? jobFairParticipationService.fetchOpenPostings(establishmentId) : Promise.resolve([]),
    ])
    offers.value = offerRows
    openPostings.value = postingRows
  }

  async function fetchDetails(jobFairId: string): Promise<void> {
    const current = ++detailsRequestId
    isLoadingDetails.value = true
    detailsError.value = null
    if (event.value?.id !== jobFairId) {
      event.value = null
      offers.value = []
      openPostings.value = []
    }
    try {
      const fair = await jobFairEventService.fetchEvent(jobFairId)
      if (current !== detailsRequestId) return
      event.value = fair
      await loadOffers(fair.my_participant_id)
    } catch (error: unknown) {
      if (current === detailsRequestId) detailsError.value = toJobFairErrorMessage(error, 'Failed to load the job fair.')
    } finally {
      if (current === detailsRequestId) isLoadingDetails.value = false
    }
  }

  async function refreshEvent(jobFairId: string) {
    const fair = await jobFairEventService.fetchEvent(jobFairId)
    events.value = events.value.map((row) => (row.id === jobFairId ? fair : row))
    if (event.value?.id === jobFairId) {
      event.value = fair
      await loadOffers(fair.my_participant_id)
    }
  }

  async function join(jobFairId: string): Promise<boolean> {
    busyEventId.value = jobFairId
    try {
      await jobFairParticipationService.join(jobFairId)
      toastAlert.success('Registration sent', 'PESO will confirm your participation.')
      await refreshEvent(jobFairId)
      return true
    } catch (error: unknown) {
      toastAlert.error('Could not join', toJobFairErrorMessage(error, 'Failed to join the job fair.'))
      return false
    } finally {
      busyEventId.value = null
    }
  }

  async function withdraw(jobFairId: string): Promise<void> {
    isSubmitting.value = true
    try {
      await jobFairParticipationService.withdraw(jobFairId)
      toastAlert.success('Withdrawn', 'Your company left the job fair.')
      isWithdrawOpen.value = false
      await refreshEvent(jobFairId)
    } catch (error: unknown) {
      toastAlert.error('Error', toJobFairErrorMessage(error, 'Failed to withdraw from the job fair.'))
    } finally {
      isSubmitting.value = false
    }
  }

  /** Offers a posting at the fair; `participantId` defaults to the open fair's */
  async function offerPosting(jobVacancyId: string, vacancyCount: number | null, participantId?: string): Promise<boolean> {
    const target = participantId ?? event.value?.my_participant_id
    if (!target) return false
    isSubmitting.value = true
    try {
      await jobFairParticipationService.offerPosting(target, jobVacancyId, vacancyCount)
      toastAlert.success('Vacancy added', 'It is now offered at the job fair.')
      isAddOfferOpen.value = false
      if (event.value) await refreshEvent(event.value.id)
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', toJobFairErrorMessage(error, 'Failed to add the vacancy.'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /** Offers a just-saved posting at a fair the company joined (from "Post a new job") */
  async function offerNewPosting(jobFairId: string, jobVacancyId: string, vacancyCount: number | null): Promise<boolean> {
    try {
      const fair = await jobFairEventService.fetchEvent(jobFairId)
      if (!fair.my_participant_id) throw new Error('Your company is not registered for this job fair.')
      return await offerPosting(jobVacancyId, vacancyCount, fair.my_participant_id)
    } catch (error: unknown) {
      toastAlert.error('Not added to the job fair', toJobFairErrorMessage(error, 'The posting was saved, but it could not be added to the job fair.'))
      return false
    }
  }

  async function updateOpenings(offer: EmployerJobFairOffer, vacancyCount: number): Promise<void> {
    busyOfferId.value = offer.id
    try {
      await jobFairParticipationService.updateOpenings(offer.id, vacancyCount)
      offers.value = offers.value.map((row) => (row.id === offer.id ? { ...row, vacancy_count: vacancyCount } : row))
      offerToEdit.value = null
      toastAlert.success('Openings updated', `"${offer.position_title}" now has ${vacancyCount} at this job fair.`)
    } catch (error: unknown) {
      toastAlert.error('Error', toJobFairErrorMessage(error, 'Failed to update the openings.'))
    } finally {
      busyOfferId.value = null
    }
  }

  async function removeOffer(offer: EmployerJobFairOffer): Promise<void> {
    busyOfferId.value = offer.id
    try {
      await jobFairParticipationService.removeOffer(offer.id)
      offerToRemove.value = null
      toastAlert.success('Vacancy removed', `"${offer.position_title}" is no longer offered at this job fair.`)
      if (event.value) await refreshEvent(event.value.id)
    } catch (error: unknown) {
      toastAlert.error('Error', toJobFairErrorMessage(error, 'Failed to remove the vacancy.'))
    } finally {
      busyOfferId.value = null
    }
  }

  return {
    events,
    scope,
    isLoading,
    errorMessage,
    busyEventId,
    event,
    offers,
    openPostings,
    availablePostings,
    isLoadingDetails,
    detailsError,
    isSubmitting,
    busyOfferId,
    isAddOfferOpen,
    isWithdrawOpen,
    offerToRemove,
    offerToEdit,
    fetchEvents,
    setScope,
    fetchDetails,
    join,
    withdraw,
    offerPosting,
    offerNewPosting,
    updateOpenings,
    removeOffer,
  }
})
