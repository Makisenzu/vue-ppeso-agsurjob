import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import {
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
} from '@/helpers/peso/provincialPeso/gipHelper'

export function useGipApplicants() {
  const route = useRoute()
  const router = useRouter()
  const store = useGipStore()

  const {
    applicants,
    applicantOverallLpiiData,
    applicantMaleLpiiData,
    applicantFemaleLpiiData,
    totalOverallApplicantLpii,
    totalMaleApplicantLpii,
    totalFemaleApplicantLpii,
    filteredApplicants,
    paginatedApplicants,
    totalApplicantPages,
    applicantAvailableYears,
    selectedApplicant,
    isApplicantDetailsModalOpen,
    isLoading,
    isSubmitting,
    errorMessage,
    applicantSearchQuery,
    applicantStatusTab,
    applicantLpiiFilter,
    applicantYearFilter,
    applicantGenderFilter,
    applicantStatusFilter,
    applicantCurrentPage,
    applicantPageSize,
  } = storeToRefs(store)

  const {
    fetchApplicantsData,
    openApplicantDetails,
    closeApplicantDetails,
    resetApplicantFilters,
    exportApplicantsCsv,
  } = store

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

  onMounted(() => {
    fetchApplicantsData()
  })

  return {
    // Data & Computed
    applicants,
    applicantOverallLpiiData,
    applicantMaleLpiiData,
    applicantFemaleLpiiData,
    totalOverallApplicantLpii,
    totalMaleApplicantLpii,
    totalFemaleApplicantLpii,
    filteredApplicants,
    paginatedApplicants,
    totalApplicantPages,
    availableYears: applicantAvailableYears,
    selectedApplicant,
    isDetailsModalOpen: isApplicantDetailsModalOpen,
    isLoading,
    isSubmitting,
    errorMessage,

    // Filter & Pagination Models
    searchQuery: applicantSearchQuery,
    statusTab,
    selectedLpiiFilter: applicantLpiiFilter,
    selectedYearFilter: applicantYearFilter,
    selectedGenderFilter: applicantGenderFilter,
    selectedStatusFilter: applicantStatusFilter,
    currentPage: applicantCurrentPage,
    pageSize: applicantPageSize,

    // Visual Helpers & Configs
    LPII_CONFIG,
    donutTooltipTriggers,
    getInitials,

    // Actions & Navigation
    goBack,
    resetFilters: resetApplicantFilters,
    openApplicantDetails,
    closeApplicantDetails,
    exportCsv: exportApplicantsCsv,
    fetchApplicantsData,
  }
}
