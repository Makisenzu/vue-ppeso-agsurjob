import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Eye, Pencil, Trash2 } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import {
  GIP_MONTH_OPTIONS,
  LPII_CONFIG,
  donutTooltipTriggers,
  formatDateDisplay,
  getInitials,
  statusDonutTooltipTriggers,
} from '@/helpers/peso/provincialPeso/gipHelper'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import { useProfileAvatars } from '@/composables/common/useProfileAvatar'

export function useGipApplicants() {
  const route = useRoute()
  const router = useRouter()
  const store = useGipStore()

  const {
    applicants,
    applicantStatusData,
    applicantOverallLpiiData,
    applicantMaleLpiiData,
    applicantFemaleLpiiData,
    totalApplicantStatus,
    totalOverallApplicantLpii,
    totalMaleApplicantLpii,
    totalFemaleApplicantLpii,
    filteredApplicants,
    paginatedApplicants,
    totalApplicantPages,
    applicantAvailableYears,
    selectedApplicant,
    isApplicantDetailsModalOpen,
    isAddApplicantModalOpen,
    isBatchUploadModalOpen,
    priorityApplicants,
    isPriorityModalOpen,
    isPriorityLoading,
    isLoading,
    isSubmitting,
    errorMessage,
    applicantSearchQuery,
    applicantStatusTab,
    applicantLpiiFilter,
    applicantMonthFilter,
    applicantYearFilter,
    applicantGenderFilter,
    applicantStatusFilter,
    applicantCurrentPage,
    applicantPageSize,
  } = storeToRefs(store)

  const {
    fetchApplicantsData,
    refreshApplicantsData,
    openAddApplicantModal,
    closeAddApplicantModal,
    openBatchUploadModal,
    closeBatchUploadModal,
    resetApplicantFilters,
    exportApplicantsCsv,
    fetchPriorityApplicants,
    openPriorityModal,
    closePriorityModal,
    exportPriorityCsv,
    removeGipApplicant,
    bulkRemoveGipApplicants,
    openEditApplicantDialog,
  } = store

  // ─── Selected Applicant for Details (Component & Route Sync) ───
  const selectedApplicantForDetails = computed<GipApplicantRecord | null>(() => {
    if (selectedApplicant.value) return selectedApplicant.value

    const paramId = route.params.id as string | undefined
    if (paramId) {
      return applicants.value.find((a) => a.id === paramId || a.applicantId === paramId) ?? null
    }

    const queryId = route.query.applicantId as string | undefined
    if (queryId) {
      return applicants.value.find((a) => a.id === queryId || a.applicantId === queryId) ?? null
    }

    return null
  })

  const openApplicantDetails = (app: GipApplicantRecord) => {
    selectedApplicant.value = app
    isApplicantDetailsModalOpen.value = false
    router.push({
      query: { ...route.query, applicantId: app.id },
    })
  }

  const closeApplicantDetails = () => {
    selectedApplicant.value = null
    const query = { ...route.query }
    delete query.applicantId
    if (route.params.id) {
      router.push({ name: 'provincial-peso-gip-applicants', query })
    } else {
      router.push({ query })
    }
  }

  // Synchronize route query/params on load or URL navigation
  watch(
    [() => route.query.applicantId, () => route.params.id, applicants],
    ([queryId, paramId, list]) => {
      const targetId = (paramId as string) || (queryId as string)
      if (targetId && list.length > 0) {
        const found = list.find((a) => a.id === targetId || a.applicantId === targetId)
        if (found) {
          selectedApplicant.value = found
        }
      } else if (!targetId) {
        selectedApplicant.value = null
      }
    },
    { immediate: true }
  )

  // ─── Route Query Synchronization for Status Tab ───
  const statusTab = computed({
    get(): string {
      const s = (route.query.status as string | undefined)?.toUpperCase()
      if (s === 'PENDING') return 'Pending'
      if (s === 'APPROVED') return 'Approved'
      if (s === 'HIRED' || s === 'DEPLOYED') return 'Hired'
      if (s === 'REJECTED') return 'Rejected'
      return 'ALL'
    },
    set(val: string) {
      applicantStatusTab.value = val
      if (val === 'ALL') {
        router.push({ query: {} })
      } else {
        router.push({ query: { status: val.toLowerCase() } })
      }
    },
  })

  // Watch route query changes to keep store in sync
  watch(
    () => route.query.status,
    (newStatus) => {
      const s = (newStatus as string | undefined)?.toUpperCase()
      if (s === 'PENDING') applicantStatusTab.value = 'Pending'
      else if (s === 'APPROVED') applicantStatusTab.value = 'Approved'
      else if (s === 'HIRED' || s === 'DEPLOYED') applicantStatusTab.value = 'Hired'
      else if (s === 'REJECTED') applicantStatusTab.value = 'Rejected'
      else applicantStatusTab.value = 'ALL'
    },
    { immediate: true }
  )

  function goBack() {
    router.push({ name: 'provincial-peso-gip' })
  }

  function navigateToPriority() {
    router.push({ name: 'provincial-peso-gip-priority' })
  }

  // ─── Status Tab Toggle Helper ───
  const toggleStatusTab = (status: string) => {
    if (statusTab.value.toLowerCase() === status.toLowerCase()) {
      statusTab.value = 'ALL'
    } else {
      statusTab.value = status
    }
  }

  // ─── File Input & Batch Upload Triggers ───
  const fileInputRef = ref<HTMLInputElement | null>(null)

  const setFileInputRef = (el: any) => {
    fileInputRef.value = el
  }

  const triggerFileInput = () => {
    fileInputRef.value?.click()
  }

  const handleUploadBatchClick = () => {
    if (applicants.value.length > 0) {
      openBatchUploadModal()
    } else {
      triggerFileInput()
    }
  }

  // ─── Remove Applicant State & Handlers ───
  const applicantToRemove = ref<GipApplicantRecord | null>(null)
  const isRemoveDialogOpen = ref(false)
  const isRemoving = ref(false)

  const promptRemoveApplicant = (applicant: GipApplicantRecord) => {
    applicantToRemove.value = applicant
    isRemoveDialogOpen.value = true
  }

  const cancelRemoveApplicant = () => {
    isRemoveDialogOpen.value = false
    applicantToRemove.value = null
  }

  const confirmRemoveApplicant = async () => {
    if (!applicantToRemove.value) return
    isRemoving.value = true
    try {
      await removeGipApplicant(applicantToRemove.value.id)
      isRemoveDialogOpen.value = false
      applicantToRemove.value = null
    } finally {
      isRemoving.value = false
    }
  }

  // ─── Bulk Remove State & Handlers ───
  const isBulkDeleteDialogOpen = ref(false)
  const isBulkDeleting = ref(false)

  const handleBulkDelete = async () => {
    isBulkDeleting.value = true
    try {
      await bulkDeleteSelectedApplicants()
      isBulkDeleteDialogOpen.value = false
    } finally {
      isBulkDeleting.value = false
    }
  }

  // ─── Helper for Applicant Submitted Documents ───
  const getApplicantDocuments = (applicant: GipApplicantRecord): string[] => {
    if (applicant.documentsSubmitted && applicant.documentsSubmitted.length > 0) {
      return applicant.documentsSubmitted
    }
    if (applicant.rawApplicant?.documents_submitted && applicant.rawApplicant.documents_submitted.length > 0) {
      return applicant.rawApplicant.documents_submitted
    }
    return []
  }

  // ─── Profile pictures of the rows on this page (one query; walk-ins without an account keep initials) ───
  const profileIdOf = (applicant: GipApplicantRecord): string | null => applicant.rawApplicant?.profile_id ?? null
  const { avatarUrlFor } = useProfileAvatars(() => paginatedApplicants.value.map(profileIdOf))
  const getApplicantAvatar = (applicant: GipApplicantRecord) => avatarUrlFor(profileIdOf(applicant))

  // ─── Multi-Select State ───
  const selectedApplicantIds = ref<string[]>([])

  const isAllSelected = computed(() => {
    if (paginatedApplicants.value.length === 0) return false
    return paginatedApplicants.value.every((a) => selectedApplicantIds.value.includes(a.id))
  })

  const isIndeterminate = computed(() => {
    if (isAllSelected.value) return false
    return paginatedApplicants.value.some((a) => selectedApplicantIds.value.includes(a.id))
  })

  const toggleSelectAll = (checked?: boolean | 'indeterminate') => {
    const pageIds = paginatedApplicants.value.map((a) => a.id)
    if (pageIds.length === 0) return

    const shouldSelect = typeof checked === 'boolean' ? checked : !isAllSelected.value
    if (shouldSelect) {
      const set = new Set([...selectedApplicantIds.value, ...pageIds])
      selectedApplicantIds.value = Array.from(set)
    } else {
      selectedApplicantIds.value = selectedApplicantIds.value.filter((id) => !pageIds.includes(id))
    }
  }

  const toggleSelectApplicant = (id: string, checked?: boolean | 'indeterminate') => {
    const shouldAdd = typeof checked === 'boolean' ? checked : !selectedApplicantIds.value.includes(id)
    if (shouldAdd) {
      if (!selectedApplicantIds.value.includes(id)) {
        selectedApplicantIds.value.push(id)
      }
    } else {
      selectedApplicantIds.value = selectedApplicantIds.value.filter((i) => i !== id)
    }
  }

  const clearSelection = () => {
    selectedApplicantIds.value = []
  }

  const bulkDeleteSelectedApplicants = async () => {
    if (selectedApplicantIds.value.length === 0) return
    const ids = [...selectedApplicantIds.value]
    const result = await bulkRemoveGipApplicants(ids)
    if (result && result.successCount > 0) {
      clearSelection()
    }
    return result
  }

  // ─── Bulk Deploy State ───
  const isBulkDeployDialogOpen = ref(false)

  const selectedApplicants = computed<GipApplicantRecord[]>(() => {
    const ids = new Set(selectedApplicantIds.value)
    return applicants.value.filter((a) => ids.has(a.id))
  })

  // ─── Mobile Card View (DESIGN.md 13.2) ───
  const getApplicantCard = (applicant: GipApplicantRecord): SwipeCard => ({
    title: applicant.fullName,
    subtitle: [applicant.municipality, LPII_CONFIG[applicant.lpiiTag].label, applicant.status].filter(Boolean).join(' · '),
  })

  // Cards replace the table below md once the registry has applicants. Before that, the table body holds
  // the import flow (drop zone, OCR progress, parsed review), which stays a table on every screen.
  const showApplicantCards = computed(() => isLoading.value || applicants.value.length > 0)

  /** Delete first (primary edge). None collapses the card: delete is confirmed by the AlertDialog, the rest are not destructive. */
  const getApplicantSwipeActions = (applicant: GipApplicantRecord): SwipeAction[] => [
    { id: 'delete', label: 'Delete', icon: Trash2, dismiss: false, onSelect: () => promptRemoveApplicant(applicant) },
    { id: 'view', label: 'View', icon: Eye, dismiss: false, onSelect: () => openApplicantDetails(applicant) },
    { id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: () => openEditApplicantDialog(applicant) },
  ]

  watch(applicants, (newList) => {
    const validIds = new Set(newList.map((a) => a.id))
    selectedApplicantIds.value = selectedApplicantIds.value.filter((id) => validIds.has(id))
  })

  onMounted(() => {
    fetchApplicantsData()
  })

  return {
    getApplicantCard,
    // Data & Computed
    applicants,
    applicantStatusData,
    applicantOverallLpiiData,
    applicantMaleLpiiData,
    applicantFemaleLpiiData,
    totalApplicantStatus,
    totalOverallApplicantLpii,
    totalMaleApplicantLpii,
    totalFemaleApplicantLpii,
    filteredApplicants,
    paginatedApplicants,
    totalApplicantPages,
    availableYears: applicantAvailableYears,
    selectedApplicant,
    selectedApplicantForDetails,
    isDetailsModalOpen: isApplicantDetailsModalOpen,
    isAddApplicantModalOpen,
    isBatchUploadModalOpen,
    isLoading,
    isSubmitting,
    errorMessage,

    // Selection State
    selectedApplicantIds,
    isAllSelected,
    isIndeterminate,
    toggleSelectAll,
    toggleSelectApplicant,
    clearSelection,
    bulkDeleteSelectedApplicants,

    // Filter & Pagination Models
    searchQuery: applicantSearchQuery,
    statusTab,
    toggleStatusTab,
    selectedLpiiFilter: applicantLpiiFilter,
    selectedMonthFilter: applicantMonthFilter,
    selectedYearFilter: applicantYearFilter,
    selectedGenderFilter: applicantGenderFilter,
    selectedStatusFilter: applicantStatusFilter,
    availableMonths: GIP_MONTH_OPTIONS,
    currentPage: applicantCurrentPage,
    pageSize: applicantPageSize,

    // Visual Helpers & Configs
    LPII_CONFIG,
    donutTooltipTriggers,
    statusDonutTooltipTriggers,
    getInitials,
    getApplicantAvatar,
    formatDateDisplay,
    getApplicantDocuments,

    // File Input & Batch Trigger
    fileInputRef,
    setFileInputRef,
    triggerFileInput,
    handleUploadBatchClick,

    // Remove Dialog State & Actions
    applicantToRemove,
    isRemoveDialogOpen,
    isRemoving,
    promptRemoveApplicant,
    showApplicantCards,
    getApplicantSwipeActions,
    cancelRemoveApplicant,
    confirmRemoveApplicant,

    // Bulk Delete Dialog State & Actions
    isBulkDeleteDialogOpen,
    isBulkDeleting,
    handleBulkDelete,

    // Bulk Deploy Dialog State
    isBulkDeployDialogOpen,
    selectedApplicants,

    // Actions & Navigation
    goBack,
    navigateToPriority,
    resetFilters: resetApplicantFilters,
    openApplicantDetails,
    closeApplicantDetails,
    openEditApplicantDialog,
    openAddApplicantModal,
    closeAddApplicantModal,
    openBatchUploadModal,
    closeBatchUploadModal,
    exportCsv: exportApplicantsCsv,
    fetchApplicantsData,
    refreshApplicantsData,
    priorityApplicants,
    isPriorityModalOpen,
    isPriorityLoading,
    openPriorityModal,
    closePriorityModal,
    fetchPriorityApplicants,
    exportPriorityCsv,
    removeGipApplicant,
    bulkRemoveGipApplicants,
  }
}

