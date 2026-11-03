import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { useEmployerJobFairStore } from '@/stores/employer/jobFairStore'
import { toReviewStatus } from '@/helpers/common/companyRequirementHelper'
import {
  JOB_FAIR_PARTICIPANT_BADGE_CLASS,
  JOB_FAIR_STATUS_BADGE_CLASS,
  formatJobFairDateRange,
  formatOpenings,
  isJobFairOpen,
} from '@/helpers/common/jobFairEventHelper'
import { getJobPostingStatusLabel } from '@/helpers/employer/jobPostingHelper'
import type { EmployerJobFairOffer } from '@/types/common/jobFairEvent'

/** What each participation status means for the owner */
const PARTICIPATION_NOTES: Record<string, string> = {
  Registered: 'PESO will confirm your participation. Applicants see your vacancies once it is confirmed.',
  Confirmed: 'Applicants can see your company and the vacancies below.',
  Attended: 'PESO recorded your attendance.',
  Cancelled: 'PESO cancelled your participation.',
}

/** One job fair (company owner): join / withdraw and the postings offered there */
export function useEmployerJobFairDetails() {
  const route = useRoute()
  const authStore = useAuthStore()
  const store = useEmployerJobFairStore()
  const {
    event,
    offers,
    availablePostings,
    isLoadingDetails,
    detailsError,
    isSubmitting,
    busyEventId,
    busyOfferId,
    isAddOfferOpen,
    isWithdrawOpen,
    offerToRemove,
    offerToEdit,
  } = storeToRefs(store)

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))

  const fair = computed(() => {
    const row = event.value
    if (!row) return null
    return {
      ...row,
      dateRange: formatJobFairDateRange(row.start_date, row.end_date),
      statusClass: JOB_FAIR_STATUS_BADGE_CLASS[row.status] ?? '',
      companies: `${row.company_count} compan${row.company_count === 1 ? 'y' : 'ies'}`,
      openings: formatOpenings(row.opening_count),
    }
  })

  // ─── Participation ───
  const isCompanyVerified = computed(
    () => toReviewStatus(authStore.employerProfile?.verification_status) === 'approved',
  )
  const participantId = computed(() => event.value?.my_participant_id ?? null)
  const participation = computed(() => event.value?.my_participant_status ?? null)
  const participationClass = computed(() =>
    participation.value ? JOB_FAIR_PARTICIPANT_BADGE_CLASS[participation.value] ?? '' : '',
  )
  const participationNote = computed(() => (participation.value ? PARTICIPATION_NOTES[participation.value] ?? null : null))
  const isOpen = computed(() => !!event.value && isJobFairOpen(event.value.status))
  const hasJoined = computed(() => !!participantId.value)
  const canJoin = computed(() => isOpen.value && !hasJoined.value && isCompanyVerified.value)
  const showVerifyAlert = computed(() => isOpen.value && !hasJoined.value && !isCompanyVerified.value)
  const isJoining = computed(() => busyEventId.value === jobFairId.value)
  const canWithdraw = computed(() => isOpen.value && hasJoined.value && participation.value !== 'Attended')
  /** Offers can change while the company takes part and the fair hasn't ended */
  const canManageOffers = computed(() => isOpen.value && hasJoined.value && participation.value !== 'Cancelled')

  const join = () => {
    if (canJoin.value) void store.join(jobFairId.value)
  }
  const openWithdraw = () => {
    isWithdrawOpen.value = true
  }
  const confirmWithdraw = () => store.withdraw(jobFairId.value)

  // ─── Offers ───
  const offerRows = computed(() =>
    offers.value.map((offer) => ({
      offer,
      id: offer.id,
      title: offer.position_title,
      natureOfWork: offer.nature_of_work,
      salary: offer.salary?.trim() || 'Not stated',
      openings: offer.vacancy_count == null ? 'No set limit' : formatOpenings(offer.vacancy_count),
      status: getJobPostingStatusLabel(offer.status),
      isOpen: offer.status === 'open',
    })),
  )

  /** "Post a new job" opens the posting form; it offers the new posting here after saving */
  const newPostingLink = computed(() => ({
    name: 'job-posting-new',
    query: { jobFair: jobFairId.value },
  }))

  const openAddOffer = () => {
    isAddOfferOpen.value = true
  }
  const openEditOffer = (offer: EmployerJobFairOffer) => {
    offerToEdit.value = offer
  }
  const openRemoveOffer = (offer: EmployerJobFairOffer) => {
    offerToRemove.value = offer
  }
  const isRemoveOpen = computed({
    get: () => !!offerToRemove.value,
    set: (open: boolean) => {
      if (!open) offerToRemove.value = null
    },
  })
  const confirmRemoveOffer = () => {
    if (offerToRemove.value) void store.removeOffer(offerToRemove.value)
  }

  const reload = () => store.fetchDetails(jobFairId.value)

  watch(jobFairId, (id) => {
    if (id) void store.fetchDetails(id)
  }, { immediate: true })

  return {
    fair,
    isLoadingDetails,
    detailsError,
    reload,
    isSubmitting,
    isCompanyVerified,
    participation,
    participationClass,
    participationNote,
    isOpen,
    hasJoined,
    canJoin,
    showVerifyAlert,
    isJoining,
    join,
    canWithdraw,
    isWithdrawOpen,
    openWithdraw,
    confirmWithdraw,
    canManageOffers,
    offerRows,
    availablePostings,
    newPostingLink,
    busyOfferId,
    openAddOffer,
    openEditOffer,
    offerToRemove,
    isRemoveOpen,
    openRemoveOffer,
    confirmRemoveOffer,
  }
}
