import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { Pencil, Trash2 } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useRecruitmentActivityDetailsStore } from '@/stores/peso/provincialPeso/recruitmentActivityDetailsStore'
import { useStatusRemarks } from '@/composables/common/useStatusRemarks'
import { formatJobFairSchedule, formatParticipantAddress, formatOptionalDate } from '@/helpers/peso/provincialPeso/jobFairHelper'
import {
  formatDateTime,
  formatFileSize,
  getNextStatuses,
  getRecruitmentActivityStatusBadgeClass,
  getTerminalReportDueLabel,
  isChecklistStageComplete,
  isLockedRequirement,
} from '@/helpers/peso/provincialPeso/recruitmentActivityHelper'
import {
  RECRUITMENT_ACTIVITY_DOCUMENT_ACCEPT,
  RECRUITMENT_ACTIVITY_DOCUMENT_MAX_SIZE_MB,
  RECRUITMENT_ACTIVITY_TYPE_LABELS,
  type RecruitmentActivityRequirement,
  type RecruitmentActivityStatus,
  type RecruitmentActivityType,
} from '@/types/peso/provincialPeso/recruitmentActivity'

/** Status moves that undo work or end the activity ask for confirmation first. */
const CONFIRMED_STATUSES: RecruitmentActivityStatus[] = ['Pending', 'Cancelled']

export function useRecruitmentActivityDetails() {
  const route = useRoute()
  const store = useRecruitmentActivityDetailsStore()
  const {
    activity,
    requirements,
    vacancies,
    isLoading,
    errorMessage,
    isUpdatingActivity,
    busyRequirementIds,
    isDeletingVacancy,
    vacancyToDelete,
  } = storeToRefs(store)
  const {
    loadActivity,
    updateActivity,
    changeStatus,
    setRequirementSubmitted,
    uploadDocuments,
    deleteDocument,
    openDocument,
    openCreateVacancyDialog,
    openEditVacancyDialog,
    requestVacancyDelete,
    cancelVacancyDelete,
    deleteVacancy,
  } = store

  const activityId = computed(() => String(route.params.activityId ?? ''))
  const refreshActivity = () => {
    if (activityId.value) void loadActivity(activityId.value)
  }
  watch(activityId, refreshActivity, { immediate: true })

  // ─── Summary ───
  const isSra = computed(() => activity.value?.type === 'SRA')
  const typeLabel = computed(() =>
    activity.value ? RECRUITMENT_ACTIVITY_TYPE_LABELS[activity.value.type as RecruitmentActivityType] : ''
  )
  const schedule = computed(() =>
    activity.value ? formatJobFairSchedule(activity.value.start_date, activity.value.end_date) : ''
  )
  const statusClass = computed(() => getRecruitmentActivityStatusBadgeClass(activity.value?.status))
  const terminalReportDueLabel = computed(() => (activity.value ? getTerminalReportDueLabel(activity.value) : null))
  const agencyAddress = computed(() => (activity.value ? formatParticipantAddress(activity.value.establishment) : '—'))
  const assessedAt = computed(() => formatDateTime(activity.value?.assessed_at))
  const conoIssuedAt = computed(() => formatDateTime(activity.value?.cono_issued_at))
  const terminalReportDueDate = computed(() => formatOptionalDate(activity.value?.terminal_report_due_date))

  // ─── Checklist ───
  const beforeRequirements = computed(() => requirements.value.filter((item) => item.stage === 'before'))
  const afterRequirements = computed(() => requirements.value.filter((item) => item.stage === 'after'))
  const beforeDoneCount = computed(() => beforeRequirements.value.filter((item) => item.is_submitted).length)
  const isBeforeComplete = computed(() => isChecklistStageComplete(requirements.value, 'before'))

  const isRequirementBusy = (requirement: RecruitmentActivityRequirement) => busyRequirementIds.value.has(requirement.id)

  const onRequirementCheckedChange = (requirement: RecruitmentActivityRequirement, checked: boolean | 'indeterminate') => {
    if (isLockedRequirement(requirement)) return
    void setRequirementSubmitted(requirement, checked === true)
  }

  const onDocumentInputChange = (requirement: RecruitmentActivityRequirement, event: Event) => {
    const input = event.target as HTMLInputElement
    void uploadDocuments(requirement, Array.from(input.files ?? []))
    // Clear the input so picking the same file again still fires `change`
    input.value = ''
  }

  // ─── Status ───
  /** The status select lists the current status and the ones it can move to next. */
  const statusOptions = computed<RecruitmentActivityStatus[]>(() => {
    const current = activity.value?.status as RecruitmentActivityStatus | undefined
    return current ? [current, ...getNextStatuses(current)] : []
  })

  const pendingStatus = ref<RecruitmentActivityStatus | null>(null)
  const isStatusDialogOpen = computed({
    get: () => pendingStatus.value !== null,
    set: (open: boolean) => {
      if (!open && !isUpdatingActivity.value) pendingStatus.value = null
    },
  })

  // Cancelling asks for remarks in the confirmation dialog
  const {
    remarks: statusRemarks,
    remarksError: statusRemarksError,
    isRemarksRequired: isStatusRemarksRequired,
    remarksToSave: statusRemarksToSave,
    validateRemarks: validateStatusRemarks,
    resetRemarks: resetStatusRemarks,
  } = useStatusRemarks(pendingStatus)

  const requestStatusChange = (status: RecruitmentActivityStatus) => {
    if (status === activity.value?.status) return
    if (CONFIRMED_STATUSES.includes(status)) {
      resetStatusRemarks()
      pendingStatus.value = status
    } else void changeStatus(status)
  }

  const confirmStatusChange = async () => {
    if (!pendingStatus.value || !validateStatusRemarks()) return
    const saved = await changeStatus(pendingStatus.value, statusRemarksToSave.value)
    if (saved) pendingStatus.value = null
  }

  // ─── SRA: CONO and recruitment fee ───
  const conoNumber = ref('')
  const recruitmentFee = ref('')
  const feeOrNumber = ref('')

  watch(
    activity,
    (value) => {
      conoNumber.value = value?.cono_number ?? ''
      recruitmentFee.value = value?.recruitment_fee != null ? String(value.recruitment_fee) : ''
      feeOrNumber.value = value?.fee_or_number ?? ''
    },
    { immediate: true }
  )

  const sraFeeError = computed(() => {
    if (!recruitmentFee.value.trim()) return null
    const fee = Number(recruitmentFee.value)
    return Number.isFinite(fee) && fee >= 0 ? null : 'Enter a valid amount.'
  })

  const isSraDirty = computed(
    () =>
      !!activity.value &&
      (conoNumber.value.trim() !== (activity.value.cono_number ?? '') ||
        recruitmentFee.value.trim() !== (activity.value.recruitment_fee != null ? String(activity.value.recruitment_fee) : '') ||
        feeOrNumber.value.trim() !== (activity.value.fee_or_number ?? ''))
  )

  const saveSraDetails = () => {
    if (sraFeeError.value) return
    void updateActivity(
      {
        cono_number: conoNumber.value.trim() || null,
        recruitment_fee: recruitmentFee.value.trim() ? Number(recruitmentFee.value) : null,
        fee_or_number: feeOrNumber.value.trim() || null,
      },
      'SRA details saved'
    )
  }

  // ─── Job Orders ───
  const totalOpenings = computed(() => vacancies.value.reduce((sum, row) => sum + (row.vacancy_count ?? 0), 0))

  const isVacancyDeleteDialogOpen = computed({
    get: () => vacancyToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelVacancyDelete()
    },
  })

  // ─── Vacancies: mobile card view (DESIGN.md 13.2) ───
  type VacancyRow = (typeof vacancies.value)[number]
  const getVacancyCard = (row: VacancyRow): SwipeCard => ({
    title: row.position_title,
    subtitle: [row.nature_of_work, `${row.vacancy_count ?? 0} opening${row.vacancy_count === 1 ? '' : 's'}`, row.status].filter(Boolean).join(' · '),
  })
  /** Remove first (outer edge); neither collapses the card, since removal is confirmed */
  const getVacancySwipeActions = (row: VacancyRow): SwipeAction[] => [
    { id: 'remove', label: 'Remove', icon: Trash2, dismiss: false, onSelect: () => requestVacancyDelete(row) },
    { id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: () => openEditVacancyDialog(row) },
  ]

  return {
    getVacancyCard,
    getVacancySwipeActions,
    activity,
    requirements,
    vacancies,
    isLoading,
    errorMessage,
    isUpdatingActivity,
    refreshActivity,
    isSra,
    typeLabel,
    schedule,
    statusClass,
    terminalReportDueLabel,
    terminalReportDueDate,
    agencyAddress,
    assessedAt,
    conoIssuedAt,
    beforeRequirements,
    afterRequirements,
    beforeDoneCount,
    isBeforeComplete,
    isRequirementBusy,
    isLockedRequirement,
    onRequirementCheckedChange,
    onDocumentInputChange,
    deleteDocument,
    openDocument,
    formatDateTime,
    formatFileSize,
    documentAccept: RECRUITMENT_ACTIVITY_DOCUMENT_ACCEPT,
    documentMaxSizeMB: RECRUITMENT_ACTIVITY_DOCUMENT_MAX_SIZE_MB,
    statusOptions,
    pendingStatus,
    statusRemarks,
    statusRemarksError,
    isStatusRemarksRequired,
    isStatusDialogOpen,
    requestStatusChange,
    confirmStatusChange,
    conoNumber,
    recruitmentFee,
    feeOrNumber,
    sraFeeError,
    isSraDirty,
    saveSraDetails,
    totalOpenings,
    vacancyToDelete,
    isDeletingVacancy,
    isVacancyDeleteDialogOpen,
    openCreateVacancyDialog,
    openEditVacancyDialog,
    requestVacancyDelete,
    confirmVacancyDelete: deleteVacancy,
  }
}
