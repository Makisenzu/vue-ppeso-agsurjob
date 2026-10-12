import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicantEntryStore } from '@/stores/peso/provincialPeso/applicantEntryStore'
import {
  computeApplicantStats,
  exportApplicantsToCsv,
  formatDateDisplay,
  getInitials,
} from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import type { ApplicantEntryRecord, ApplicantStatsSummary } from '@/types/peso/provincialPeso/applicantEntry'

export function useApplicantEntry() {
  const router = useRouter()
  const store = useApplicantEntryStore()

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


  // ─── Available Municipalities for Filter ───
  const availableMunicipalities = computed<string[]>(() => {
    const set = new Set<string>()
    for (const record of applicants.value) {
      if (record.address.municipality && record.address.municipality !== 'N/A') {
        set.add(record.address.municipality)
      }
    }
    return Array.from(set).sort()
  })

  // ─── Filtered Applicants ───
  const filteredApplicants = computed<ApplicantEntryRecord[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const gender = selectedGenderFilter.value
    const empStatus = selectedEmploymentStatusFilter.value
    const program = selectedProgramFilter.value
    const muni = selectedMunicipalityFilter.value

    return applicants.value.filter((a) => {
      // Search query filter
      if (q) {
        const nameMatch = a.fullName.toLowerCase().includes(q)
        const emailMatch = a.email ? a.email.toLowerCase().includes(q) : false
        const contactMatch = a.contactNumber ? a.contactNumber.toLowerCase().includes(q) : false
        const muniMatch = a.address.municipality.toLowerCase().includes(q)
        const brgyMatch = a.address.barangay.toLowerCase().includes(q)
        const courseMatch = a.highestEducationalAttainment.toLowerCase().includes(q)
        const occMatch = a.preferredOccupations.some((occ) => occ.toLowerCase().includes(q))
        const skillsMatch = a.otherSkills.some((s) => s.toLowerCase().includes(q))
        const progMatch = a.referredPrograms.some((p) => p.toLowerCase().includes(q))

        if (
          !nameMatch &&
          !emailMatch &&
          !contactMatch &&
          !muniMatch &&
          !brgyMatch &&
          !courseMatch &&
          !occMatch &&
          !skillsMatch &&
          !progMatch
        ) {
          return false
        }
      }

      // Gender filter
      if (gender !== 'ALL') {
        const rawSex = a.sex.toLowerCase()
        if (gender === 'Male' && !rawSex.startsWith('m')) return false
        if (gender === 'Female' && (!rawSex.startsWith('f') && rawSex !== 'woman')) return false
      }

      // Employment Status filter
      if (empStatus !== 'ALL') {
        const rawEmp = a.employmentStatus.toLowerCase()
        const rawType = (a.employmentType || '').toLowerCase()
        const isSelf = rawEmp.includes('self') || rawType.includes('self')

        if (empStatus === 'Employed' && (isSelf || !rawEmp.includes('employed') || rawEmp.includes('unemployed'))) {
          return false
        }
        if (empStatus === 'Unemployed' && !rawEmp.includes('unemployed')) {
          return false
        }
        if (empStatus === 'Self-Employed' && !isSelf) {
          return false
        }
      }

      // Program Filter (SPES, GIP, TUPAD, JobStart, DILEEP, TESDA)
      if (program !== 'ALL') {
        const progs = a.referredPrograms.map((p) => (p || '').toUpperCase())
        const progText = progs.join(' ')
        if (program === 'SPES' && !progText.includes('SPES')) return false
        if (program === 'GIP' && !progText.includes('GIP')) return false
        if (program === 'TUPAD' && !progText.includes('TUPAD')) return false
        if (program === 'JobStart' && !progText.includes('JOBSTART')) return false
        if (program === 'DILEEP' && !progText.includes('DILEEP')) return false
        if (program === 'TESDA' && !progText.includes('TESDA')) return false
        if (program === 'NONE' && progs.length > 0) {
          return false
        }
      }

      // Municipality Filter
      if (muni !== 'ALL') {
        if (a.address.municipality.toLowerCase() !== muni.toLowerCase()) return false
      }

      return true
    })
  })

  // ─── Pagination ───
  const totalPages = computed<number>(() => {
    const count = Math.ceil(filteredApplicants.value.length / pageSize.value)
    return count > 0 ? count : 1
  })

  const paginatedApplicants = computed<ApplicantEntryRecord[]>(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredApplicants.value.slice(start, start + pageSize.value)
  })

  // Automatically adjust current page if total pages shrink
  watch([filteredApplicants, totalPages], () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1
    }
  })

  // ─── Stats Summary ───
  const statsSummary = computed<ApplicantStatsSummary>(() => {
    return computeApplicantStats(applicants.value)
  })

  // ─── Actions ───
  const refreshApplicants = () => {
    fetchApplicants(true)
  }

  const exportCsv = () => {
    const filterDesc = selectedProgramFilter.value !== 'ALL' ? selectedProgramFilter.value : selectedEmploymentStatusFilter.value
    exportApplicantsToCsv(filteredApplicants.value, filterDesc)
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
      const deleted = await deleteApplicant(applicantToDelete.value.id)
      if (deleted) {
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

  // Drop selections for rows that no longer exist (deleted or refreshed away)
  watch(applicants, (list) => {
    const validIds = new Set(list.map((a) => a.id))
    selectedApplicantIds.value = selectedApplicantIds.value.filter((id) => validIds.has(id))
  })

  onMounted(() => {
    fetchApplicants()
  })

  return {
    applicants,
    filteredApplicants,
    paginatedApplicants,
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

