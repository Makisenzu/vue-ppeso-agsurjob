import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Eye, Pencil, RefreshCw, Trash2 } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import type { GipInternRecord, GipProgram } from '@/types/peso/provincialPeso/gip'
import {
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
  formatOrdinal,
  formatAppointmentPeriodLabel,
} from '@/helpers/peso/provincialPeso/gipHelper'

export function useGipDetails() {
  const route = useRoute()
  const router = useRouter()
  const store = useGipStore()

  const {
    pgasLpiiData,
    doleLpiiData,
    interns,
    isLoading,
    isSubmitting,
    errorMessage,
    isAddInternModalOpen,
    applicants,
    searchQuery,
    selectedProgram,
    selectedLpiiFilter,
    selectedYearFilter,
    selectedGenderFilter,
    selectedStatusFilter,
    selectedAppointmentFilter,
    selectedTermFilter,
    selectedPeriodFilter,
    availableTerms,
    availablePeriods,
    currentPage,
    pageSize,
    availableYears,
    overallLpiiData,
    totalOverallLpii,
    totalPgasLpii,
    totalDoleLpii,
    filteredInterns,
    totalPages,
    paginatedInterns,
    isSubmittingRenewal,
    expiringAppointmentsCount,
    expiredAppointmentsCount,
    pendingDecisionCount,
  } = storeToRefs(store)

  const {
    fetchDetailsData,
    refreshDetailsData,
    fetchApplicantsData,
    createGipApplication,
    createGipDeployment,
    deployInternFromApplicant,
    setSelectedProgram,
    resetFilters,
    openAddInternModal,
    closeAddInternModal,
    openBatchUploadModal,
    exportCsv,
    renewInternAppointment,
    concludeInternAppointment,
    removeGipIntern,
    bulkRemoveGipInterns,
  } = store

  // ─── Query Sync ───
  const programTab = computed({
    get(): GipProgram {
      const p = (route.query.program as string | undefined)?.toLowerCase()
      if (p === 'pgas') return 'PGAS'
      if (p === 'dole') return 'DOLE'
      return 'ALL'
    },
    set(val: GipProgram) {
      setSelectedProgram(val)
      if (val === 'ALL') {
        router.push({ query: {} })
      } else {
        router.push({ query: { program: val.toLowerCase() } })
      }
    },
  })

  // Watch route query changes to keep store in sync
  watch(
    () => route.query.program,
    (newProg) => {
      const p = (newProg as string | undefined)?.toLowerCase()
      if (p === 'pgas') setSelectedProgram('PGAS')
      else if (p === 'dole') setSelectedProgram('DOLE')
      else setSelectedProgram('ALL')
    },
    { immediate: true }
  )

  function goBack() {
    router.push({ name: 'provincial-peso-gip' })
  }

  function navigateToAddIntern() {
    router.push({ name: 'provincial-peso-gip-add' })
  }

  // Viewing (and editing) an intern is its own page, not a dialog; `edit` opens it straight in edit mode
  function openInternPage(intern: GipInternRecord, edit = false) {
    router.push({
      name: 'provincial-peso-gip-intern',
      params: { id: intern.id },
      query: edit ? { ...route.query, edit: '1' } : route.query,
    })
  }

  // Renewing or concluding an appointment is a long form, so it has its own page (not a sheet)
  function openRenewalPage(intern: GipInternRecord) {
    router.push({ name: 'provincial-peso-gip-renew', params: { id: intern.id }, query: route.query })
  }

  // ─── Multi-Select State ───
  const selectedInternIds = ref<string[]>([])

  const isAllSelected = computed(() => {
    if (paginatedInterns.value.length === 0) return false
    return paginatedInterns.value.every((i) => selectedInternIds.value.includes(i.id))
  })

  const isIndeterminate = computed(() => {
    if (isAllSelected.value) return false
    return paginatedInterns.value.some((i) => selectedInternIds.value.includes(i.id))
  })

  const toggleSelectAll = (checked?: boolean | 'indeterminate') => {
    const pageIds = paginatedInterns.value.map((i) => i.id)
    if (pageIds.length === 0) return

    const shouldSelect = typeof checked === 'boolean' ? checked : !isAllSelected.value
    if (shouldSelect) {
      const set = new Set([...selectedInternIds.value, ...pageIds])
      selectedInternIds.value = Array.from(set)
    } else {
      selectedInternIds.value = selectedInternIds.value.filter((id) => !pageIds.includes(id))
    }
  }

  const toggleSelectIntern = (id: string, checked?: boolean | 'indeterminate') => {
    const shouldAdd = typeof checked === 'boolean' ? checked : !selectedInternIds.value.includes(id)
    if (shouldAdd) {
      if (!selectedInternIds.value.includes(id)) {
        selectedInternIds.value.push(id)
      }
    } else {
      selectedInternIds.value = selectedInternIds.value.filter((i) => i !== id)
    }
  }

  const clearSelection = () => {
    selectedInternIds.value = []
  }

  const deleteSingleIntern = async (internId: string) => {
    await removeGipIntern(internId)
    selectedInternIds.value = selectedInternIds.value.filter((id) => id !== internId)
  }

  const bulkDeleteSelectedInterns = async () => {
    if (selectedInternIds.value.length === 0) return
    const ids = [...selectedInternIds.value]
    const result = await bulkRemoveGipInterns(ids)
    if (result && result.successCount > 0) {
      clearSelection()
    }
    return result
  }

  // ─── Delete Intern Modal State & Handlers ───
  const internToDelete = ref<GipInternRecord | null>(null)
  const isSingleDeleteDialogOpen = ref(false)
  const isBulkDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)

  const promptDeleteIntern = (intern: GipInternRecord) => {
    internToDelete.value = intern
    isSingleDeleteDialogOpen.value = true
  }

  const handleSingleDelete = async () => {
    if (!internToDelete.value) return
    isDeleting.value = true
    try {
      await deleteSingleIntern(internToDelete.value.id)
      isSingleDeleteDialogOpen.value = false
      internToDelete.value = null
    } finally {
      isDeleting.value = false
    }
  }

  const handleBulkDelete = async () => {
    isDeleting.value = true
    try {
      await bulkDeleteSelectedInterns()
      isBulkDeleteDialogOpen.value = false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Mobile Card Swipe Actions (DESIGN.md 13.2) ───
  const getInternCard = (intern: GipInternRecord): SwipeCard => ({
    title: intern.fullName,
    subtitle: [intern.program, intern.municipality, intern.status].filter(Boolean).join(' · '),
  })

  /**
   * Delete first (primary edge). None collapses the card: delete is confirmed by the AlertDialog,
   * the rest are not destructive. Renew only applies to active interns, as on desktop.
   */
  function getInternSwipeActions(intern: GipInternRecord): SwipeAction[] {
    const actions: SwipeAction[] = [
      { id: 'delete', label: 'Delete', icon: Trash2, dismiss: false, onSelect: () => promptDeleteIntern(intern) },
      { id: 'view', label: 'View', icon: Eye, dismiss: false, onSelect: () => openInternPage(intern) },
      { id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: () => openInternPage(intern, true) },
    ]
    if (intern.status === 'Active') {
      actions.push({ id: 'renew', label: 'Renew', icon: RefreshCw, dismiss: false, onSelect: () => openRenewalPage(intern) })
    }
    return actions
  }

  watch(interns, (newList) => {
    const validIds = new Set(newList.map((i) => i.id))
    selectedInternIds.value = selectedInternIds.value.filter((id) => validIds.has(id))
  })

  // Batch year filter dropdown (SearchSelect)
  const yearFilterOptions = computed(() => [
    { value: 'ALL', label: 'All Batch Years' },
    ...availableYears.value.map((year) => ({ value: year.toString(), label: `Batch ${year}` })),
  ])

  // Appointment term & period filters (SearchSelect), built from the loaded interns
  const termFilterOptions = computed(() => [
    { value: 'ALL', label: 'All Terms' },
    ...availableTerms.value.map((term) => ({ value: String(term), label: `${formatOrdinal(term)} Appointment` })),
  ])
  /** Table's Appointment Period: the current appointment in month names ("Jan 5 – Jun 30, 2026") */
  function formatInternPeriod(intern: GipInternRecord): string {
    const appointment = intern.currentAppointment
    if (!appointment?.startDate || !appointment.endDate) return intern.period
    return formatAppointmentPeriodLabel(appointment.startDate, appointment.endDate, true)
  }

  // Month names ("January – June 2026"); periods that would read the same also show their days
  const periodFilterOptions = computed(() => {
    const labels = availablePeriods.value.map((period) => formatAppointmentPeriodLabel(period.startDate, period.endDate))
    return [
      { value: 'ALL', label: 'All Periods' },
      ...availablePeriods.value.map((period, index) => ({
        value: period.key,
        label:
          labels.indexOf(labels[index]!) === labels.lastIndexOf(labels[index]!)
            ? labels[index]!
            : formatAppointmentPeriodLabel(period.startDate, period.endDate, true),
      })),
    ]
  })

  onMounted(() => {
    fetchDetailsData()
  })

  return {
    getInternCard,
    // Data & Computed
    pgasLpiiData,
    doleLpiiData,
    overallLpiiData,
    totalOverallLpii,
    totalPgasLpii,
    totalDoleLpii,
    interns,
    filteredInterns,
    paginatedInterns,
    totalPages,
    availableYears,
    yearFilterOptions,
    termFilterOptions,
    periodFilterOptions,
    formatInternPeriod,
    selectedTermFilter,
    selectedPeriodFilter,
    isAddInternModalOpen,
    isLoading,
    isSubmitting,
    errorMessage,

    // Filter & Pagination Models
    searchQuery,
    selectedProgram,
    programTab,
    selectedLpiiFilter,
    selectedYearFilter,
    selectedGenderFilter,
    selectedStatusFilter,
    selectedAppointmentFilter,
    currentPage,
    pageSize,

    // Appointment renewal & metrics
    isSubmittingRenewal,
    expiringAppointmentsCount,
    expiredAppointmentsCount,
    pendingDecisionCount,

    // Applicants pool
    applicants,

    // Visual Helpers & Configs
    LPII_CONFIG,
    donutTooltipTriggers,
    getInitials,

    // Actions & Navigation
    goBack,
    navigateToAddIntern,
    openInternPage,
    openRenewalPage,
    resetFilters,
    getInternSwipeActions,
    renewInternAppointment,
    concludeInternAppointment,
    openAddInternModal,
    closeAddInternModal,
    deployInternFromApplicant,
    openBatchUploadModal,
    exportCsv,
    fetchDetailsData,
    refreshDetailsData,
    fetchApplicantsData,
    createGipApplication,
    createGipDeployment,

    // Multi-Select & Delete Actions
    selectedInternIds,
    isAllSelected,
    isIndeterminate,
    toggleSelectAll,
    toggleSelectIntern,
    clearSelection,
    deleteSingleIntern,
    bulkDeleteSelectedInterns,

    // Delete Modal State & Actions
    internToDelete,
    isSingleDeleteDialogOpen,
    isBulkDeleteDialogOpen,
    isDeleting,
    promptDeleteIntern,
    handleSingleDelete,
    handleBulkDelete,
  }
}
