import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  GenderDataPoint,
  GipApplicantInsert,
  GipInsert,
  GipInternRecord,
  GipProgram,
  LpiiDataPoint,
} from '@/types/peso/provincialPeso/gip'
import { gipService } from '@/services/peso/provincialPeso/gipService'
import {
  LPII_CONFIG,
  exportGipInternsCsv,
  extractAvailableYears,
} from '@/helpers/peso/provincialPeso/gipHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

export const useGipStore = defineStore('gipStore', () => {
  const toastAlert = useToastAlert()

  // ─── Demographic State (Dashboard) ───
  const pgasYearlyData = ref<GenderDataPoint[]>([])
  const doleYearlyData = ref<GenderDataPoint[]>([])

  // ─── LPII State (Details) ───
  const pgasLpiiData = ref<LpiiDataPoint[]>([])
  const doleLpiiData = ref<LpiiDataPoint[]>([])

  // ─── Intern Records State (Details Table) ───
  const interns = ref<GipInternRecord[]>([])

  // ─── UI & Async Flags ───
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const selectedIntern = ref<GipInternRecord | null>(null)
  const isDetailsModalOpen = ref<boolean>(false)

  // ─── Filter & Pagination State ───
  const searchQuery = ref<string>('')
  const selectedProgram = ref<GipProgram>('ALL')
  const selectedLpiiFilter = ref<string>('ALL')
  const selectedYearFilter = ref<string>('ALL')
  const selectedGenderFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(8)

  // Reset pagination when filters change
  watch(
    [
      searchQuery,
      selectedProgram,
      selectedLpiiFilter,
      selectedYearFilter,
      selectedGenderFilter,
      selectedStatusFilter,
    ],
    () => {
      currentPage.value = 1
    }
  )

  // ─── Computed: Available Batch Years ───
  const availableYears = computed<number[]>(() => extractAvailableYears(interns.value))

  // ─── Computed: Dashboard Totals ───
  const totalPgasYearly = computed(() => {
    const male = pgasYearlyData.value.reduce((acc, curr) => acc + curr.male, 0)
    const female = pgasYearlyData.value.reduce((acc, curr) => acc + curr.female, 0)
    return { male, female, total: male + female }
  })

  const totalDoleYearly = computed(() => {
    const male = doleYearlyData.value.reduce((acc, curr) => acc + curr.male, 0)
    const female = doleYearlyData.value.reduce((acc, curr) => acc + curr.female, 0)
    return { male, female, total: male + female }
  })

  const overallMaleInterns = computed(
    () => totalPgasYearly.value.male + totalDoleYearly.value.male
  )

  const overallFemaleInterns = computed(
    () => totalPgasYearly.value.female + totalDoleYearly.value.female
  )

  // ─── Computed: LPII Breakdown ───
  const overallLpiiData = computed<LpiiDataPoint[]>(() => {
    const pgasLowland = pgasLpiiData.value.find((i) => i.category === 'LOWLAND')?.count ?? 0
    const doleLowland = doleLpiiData.value.find((i) => i.category === 'LOWLAND')?.count ?? 0
    const pgasUpland = pgasLpiiData.value.find((i) => i.category === 'UPLAND')?.count ?? 0
    const doleUpland = doleLpiiData.value.find((i) => i.category === 'UPLAND')?.count ?? 0
    const pgasWetland = pgasLpiiData.value.find((i) => i.category === 'WETLAND')?.count ?? 0
    const doleWetland = doleLpiiData.value.find((i) => i.category === 'WETLAND')?.count ?? 0

    return [
      {
        category: 'LOWLAND',
        label: 'Lowland',
        count: pgasLowland + doleLowland,
        color: LPII_CONFIG.LOWLAND.color,
        description: 'Plains, valleys, and municipal center barangays',
      },
      {
        category: 'UPLAND',
        label: 'Upland',
        count: pgasUpland + doleUpland,
        color: LPII_CONFIG.UPLAND.color,
        description: 'Highland ridges and interior forest barangays',
      },
      {
        category: 'WETLAND',
        label: 'Wetland',
        count: pgasWetland + doleWetland,
        color: LPII_CONFIG.WETLAND.color,
        description: 'Agusan Marsh wildlife buffer & river basin communities',
      },
    ]
  })

  const totalOverallLpii = computed(() =>
    overallLpiiData.value.reduce((sum, item) => sum + item.count, 0)
  )

  const totalPgasLpii = computed(() =>
    pgasLpiiData.value.reduce((sum, item) => sum + item.count, 0)
  )

  const totalDoleLpii = computed(() =>
    doleLpiiData.value.reduce((sum, item) => sum + item.count, 0)
  )

  // ─── Computed: Table Filtering & Pagination ───
  const filteredInterns = computed(() => {
    return interns.value.filter((intern) => {
      // Program filter
      if (
        selectedProgram.value !== 'ALL' &&
        intern.program.trim().toUpperCase() !== selectedProgram.value.trim().toUpperCase()
      ) {
        return false
      }
      // LPII filter
      if (
        selectedLpiiFilter.value !== 'ALL' &&
        intern.lpiiTag.trim().toUpperCase() !== selectedLpiiFilter.value.trim().toUpperCase()
      ) {
        return false
      }
      // Year filter
      if (
        selectedYearFilter.value !== 'ALL' &&
        intern.batchYear.toString() !== selectedYearFilter.value.trim()
      ) {
        return false
      }
      // Gender filter
      if (
        selectedGenderFilter.value !== 'ALL' &&
        intern.gender.trim().toUpperCase() !== selectedGenderFilter.value.trim().toUpperCase()
      ) {
        return false
      }
      // Status filter
      if (
        selectedStatusFilter.value !== 'ALL' &&
        intern.status.trim().toUpperCase() !== selectedStatusFilter.value.trim().toUpperCase()
      ) {
        return false
      }
      // Search query
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim()
        const matchName = intern.fullName.toLowerCase().includes(q)
        const matchCode = intern.code.toLowerCase().includes(q)
        const matchMuni = intern.municipality.toLowerCase().includes(q)
        const matchBrgy = intern.barangay.toLowerCase().includes(q)
        const matchOffice = intern.assignedOffice.toLowerCase().includes(q)
        const matchCourse = intern.course.toLowerCase().includes(q)
        return (
          matchName ||
          matchCode ||
          matchMuni ||
          matchBrgy ||
          matchOffice ||
          matchCourse
        )
      }
      return true
    })
  })

  const totalPages = computed(
    () => Math.ceil(filteredInterns.value.length / pageSize.value) || 1
  )

  const paginatedInterns = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredInterns.value.slice(start, start + pageSize.value)
  })

  // ─── Actions ───
  const fetchDashboardData = async () => {
    errorMessage.value = null
    isLoading.value = true
    try {
      const yearly = await gipService.fetchYearlyDemographics()
      pgasYearlyData.value = yearly.pgas
      doleYearlyData.value = yearly.dole
    } catch (err: any) {
      const msg = err.message || 'Failed to load GIP dashboard demographic data.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Data', msg)
    } finally {
      isLoading.value = false
    }
  }

  const fetchDetailsData = async () => {
    errorMessage.value = null
    isLoading.value = true
    try {
      const [lpii, list] = await Promise.all([
        gipService.fetchLpiiData(),
        gipService.fetchInterns(),
      ])
      pgasLpiiData.value = lpii.pgas
      doleLpiiData.value = lpii.dole
      interns.value = list
    } catch (err: any) {
      const msg = err.message || 'Failed to load GIP details and registry data.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Details', msg)
    } finally {
      isLoading.value = false
    }
  }

  const createGipApplication = async (payload: GipApplicantInsert) => {
    isSubmitting.value = true
    try {
      await gipService.createGipApplicant(payload)
      toastAlert.success('Application Submitted', 'GIP Application created successfully.')
      await fetchDetailsData()
    } catch (err: any) {
      toastAlert.error('Submission Failed', err.message || 'Could not submit GIP application.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const createGipDeployment = async (payload: GipInsert) => {
    isSubmitting.value = true
    try {
      await gipService.createGip(payload)
      toastAlert.success('GIP Deployed', 'Intern record deployed successfully.')
      await fetchDetailsData()
    } catch (err: any) {
      toastAlert.error('Deployment Failed', err.message || 'Could not deploy intern.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const setSelectedProgram = (prog: GipProgram) => {
    selectedProgram.value = prog
  }

  const resetFilters = () => {
    searchQuery.value = ''
    selectedLpiiFilter.value = 'ALL'
    selectedYearFilter.value = 'ALL'
    selectedGenderFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
  }

  const openInternDetails = (intern: GipInternRecord) => {
    selectedIntern.value = intern
    isDetailsModalOpen.value = true
  }

  const closeInternDetails = () => {
    isDetailsModalOpen.value = false
  }

  const exportCsv = () => {
    try {
      exportGipInternsCsv(filteredInterns.value, selectedProgram.value)
      toastAlert.success('Export Successful', 'GIP Interns list exported as CSV.')
    } catch {
      toastAlert.error('Export Failed', 'Failed to export GIP Interns list.')
    }
  }

  return {
    // State
    pgasYearlyData,
    doleYearlyData,
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

    // Computed
    availableYears,
    totalPgasYearly,
    totalDoleYearly,
    overallMaleInterns,
    overallFemaleInterns,
    overallLpiiData,
    totalOverallLpii,
    totalPgasLpii,
    totalDoleLpii,
    filteredInterns,
    totalPages,
    paginatedInterns,

    // Actions
    fetchDashboardData,
    fetchDetailsData,
    createGipApplication,
    createGipDeployment,
    setSelectedProgram,
    resetFilters,
    openInternDetails,
    closeInternDetails,
    exportCsv,
  }
})
