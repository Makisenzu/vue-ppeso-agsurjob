import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import type { GipProgram } from '@/types/peso/provincialPeso/gip'
import {
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
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
    selectedIntern,
    isDetailsModalOpen,
    searchQuery,
    selectedProgram,
    selectedLpiiFilter,
    selectedYearFilter,
    selectedGenderFilter,
    selectedStatusFilter,
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
  } = storeToRefs(store)

  const {
    fetchDetailsData,
    createGipApplication,
    createGipDeployment,
    setSelectedProgram,
    resetFilters,
    openInternDetails,
    closeInternDetails,
    exportCsv,
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

  onMounted(() => {
    fetchDetailsData()
  })

  return {
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
    selectedIntern,
    isDetailsModalOpen,
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
    currentPage,
    pageSize,

    // Visual Helpers & Configs
    LPII_CONFIG,
    donutTooltipTriggers,
    getInitials,

    // Actions & Navigation
    goBack,
    resetFilters,
    openInternDetails,
    closeInternDetails,
    exportCsv,
    fetchDetailsData,
    createGipApplication,
    createGipDeployment,
  }
}
