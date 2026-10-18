import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useApplicantEntryStore } from '@/stores/peso/provincialPeso/applicantEntryStore'
import {
  exportApplicantsToCsv,
  formatDateDisplay,
  getInitials,
} from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import type { ApplicantEntryRecord, ApplicantStatsSummary } from '@/types/peso/provincialPeso/applicantEntry'

export function useApplicantEntry() {
  const router = useRouter()
  const store = useApplicantEntryStore()
  const toastAlert = useToastAlert()

  const {
    applicants,
    isLoading,
    isSubmitting,
    selectedApplicant,
    isAddApplicantOpen,
    searchQuery,
    selectedGenderFilter,
    selectedEmploymentStatusFilter,
    selectedProgramFilter,
    selectedMunicipalityFilter,
    currentPage,
    pageSize,
  } = storeToRefs(store)

  const {
    fetchApplicants,
    closeDetails,
    closeAddApplicant,
    createApplicant,
    resetFilters,
    deleteApplicant,
    bulkDeleteApplicants,
  } = store

  const openDetails = (applicant: ApplicantEntryRecord) => {
    store.openDetails(applicant)
    router.push({
      name: 'provincial-peso-entry-details',
      params: { id: applicant.id },
    })
  }

  const openAddApplicant = () => {
    store.openAddApplicant()
    router.push({ name: 'provincial-peso-entry-new' })
  }


  // ─── Server-Side Filtering & Pagination ───
  // Filters run in Postgres; `applicants` only ever holds the current page.
  const filteredCount = computed<number>(() => store.filteredCount)
  const availableMunicipalities = computed<string[]>(() => store.municipalities)

  const totalPages = computed<number>(() => {
    const count = Math.ceil(filteredCount.value / pageSize.value)
    return count > 0 ? count : 1
  })

  const paginatedApplicants = computed<ApplicantEntryRecord[]>(() => applicants.value)

  // Up to 5 page buttons centred on the current page
  const visiblePages = computed<number[]>(() => {
    const windowSize = Math.min(5, totalPages.value)
    const start = Math.min(Math.max(1, currentPage.value - 2), totalPages.value - windowSize + 1)
    return Array.from({ length: windowSize }, (_, i) => start + i)
  })

  const refetchFromFirstPage = () => {
    if (currentPage.value !== 1) {
      currentPage.value = 1 // page watcher fetches
    } else {
      fetchApplicants()
    }
  }

  watchDebounced(searchQuery, refetchFromFirstPage, { debounce: 350 })
  watch(
    [selectedGenderFilter, selectedEmploymentStatusFilter, selectedProgramFilter, selectedMunicipalityFilter],
    refetchFromFirstPage
  )
  watch([currentPage, pageSize], () => fetchApplicants())

  // Clamp the page if deletes shrank the result set
  watch(totalPages, (pages) => {
    if (currentPage.value > pages) {
      currentPage.value = pages
    }
  })

  // ─── Stats Summary ───
  const statsSummary = computed<ApplicantStatsSummary>(() => store.stats)

  // ─── Actions ───
  const refreshApplicants = () => {
    fetchApplicants(true)
  }

  const isExporting = ref(false)

  const exportCsv = async () => {
    const filterDesc = selectedProgramFilter.value !== 'ALL' ? selectedProgramFilter.value : selectedEmploymentStatusFilter.value
    isExporting.value = true
    try {
      exportApplicantsToCsv(await store.fetchAllFilteredApplicants(), filterDesc)
    } catch (error: any) {
      console.error('[useApplicantEntry] CSV export failed:', error)
      toastAlert.error('Export Failed', error.message || 'Unable to export applicant records.')
    } finally {
      isExporting.value = false
    }
  }

  const toggleProgramFilter = (prog: string) => {
    selectedProgramFilter.value = selectedProgramFilter.value === prog ? 'ALL' : prog
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  // ─── Single Delete Dialog ───
  const applicantToDelete = ref<ApplicantEntryRecord | null>(null)
  const isDeleteDialogOpen = ref(false)
  const isDeleting = ref(false)

  const promptDeleteApplicant = (applicant: ApplicantEntryRecord) => {
    applicantToDelete.value = applicant
    isDeleteDialogOpen.value = true
  }

  const cancelDeleteApplicant = () => {
    isDeleteDialogOpen.value = false
    applicantToDelete.value = null
  }

  const confirmDeleteApplicant = async () => {
    if (!applicantToDelete.value) return
    isDeleting.value = true
    try {
      const deletedId = applicantToDelete.value.id
      const deleted = await deleteApplicant(deletedId)
      if (deleted) {
        selectedApplicantIds.value = selectedApplicantIds.value.filter((id) => id !== deletedId)
        isDeleteDialogOpen.value = false
        applicantToDelete.value = null
      }
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Multi-Select & Bulk Delete ───
  const selectedApplicantIds = ref<string[]>([])
  const isBulkDeleteDialogOpen = ref(false)
  const isBulkDeleting = ref(false)

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
      selectedApplicantIds.value = Array.from(new Set([...selectedApplicantIds.value, ...pageIds]))
    } else {
      selectedApplicantIds.value = selectedApplicantIds.value.filter((id) => !pageIds.includes(id))
    }
  }

  const toggleSelectApplicant = (id: string, checked?: boolean | 'indeterminate') => {
    const shouldAdd = typeof checked === 'boolean' ? checked : !selectedApplicantIds.value.includes(id)
    if (shouldAdd) {
      if (!selectedApplicantIds.value.includes(id)) {
        selectedApplicantIds.value = [...selectedApplicantIds.value, id]
      }
    } else {
      selectedApplicantIds.value = selectedApplicantIds.value.filter((i) => i !== id)
    }
  }

  const clearSelection = () => {
    selectedApplicantIds.value = []
  }

  const handleBulkDelete = async () => {
    if (selectedApplicantIds.value.length === 0) return
    isBulkDeleting.value = true
    try {
      const result = await bulkDeleteApplicants([...selectedApplicantIds.value])
      // Keep failed rows selected so the user can see which ones were skipped
      const deleted = new Set(result.deletedIds)
      selectedApplicantIds.value = selectedApplicantIds.value.filter((id) => !deleted.has(id))
      if (result.errors.length === 0) {
        isBulkDeleteDialogOpen.value = false
      }
    } finally {
      isBulkDeleting.value = false
    }
  }

  onMounted(() => {
    // Filters and current page live in the store, so returning to the page shows the same view
    store.fetchApplicantsIfStale()
  })

  return {
    applicants,
    filteredCount,
    paginatedApplicants,
    visiblePages,
    availableMunicipalities,
    totalPages,
    statsSummary,
    selectedApplicant,
    isAddApplicantOpen,
    isLoading,
    isSubmitting,
    searchQuery,
    selectedGenderFilter,
    selectedEmploymentStatusFilter,
    selectedProgramFilter,
    selectedMunicipalityFilter,
    currentPage,
    pageSize,
    openDetails,
    closeDetails,
    openAddApplicant,
    closeAddApplicant,
    createApplicant,
    resetFilters,
    refreshApplicants,
    exportCsv,
    isExporting,
    toggleProgramFilter,
    clearSearch,
    setPage,
    prevPage,
    nextPage,
    getInitials,
    formatDateDisplay,

    // Single Delete
    applicantToDelete,
    isDeleteDialogOpen,
    isDeleting,
    promptDeleteApplicant,
    cancelDeleteApplicant,
    confirmDeleteApplicant,

    // Multi-Select & Bulk Delete
    selectedApplicantIds,
    isAllSelected,
    isIndeterminate,
    toggleSelectAll,
    toggleSelectApplicant,
    clearSelection,
    isBulkDeleteDialogOpen,
    isBulkDeleting,
    handleBulkDelete,
  }
}

