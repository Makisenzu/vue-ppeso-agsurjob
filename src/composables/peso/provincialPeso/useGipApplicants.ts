import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
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

  onMounted(() => {
    fetchApplicantsData()
  })

  return {
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

    // Filter & Pagination Models
    searchQuery: applicantSearchQuery,
    statusTab,
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
    formatDateDisplay,

    // Actions & Navigation
    goBack,
    navigateToPriority,
    resetFilters: resetApplicantFilters,
    openApplicantDetails,
    closeApplicantDetails,
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
  }
}

