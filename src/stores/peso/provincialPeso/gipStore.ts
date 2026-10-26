import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  ApplicantStatusDataPoint,
  GenderDataPoint,
  GipApplicantInsert,
  GipApplicantRecord,
  GipApplicantRow,
  ApplicantRow,
  GipPriorityApplicantRecord,
  GipInsert,
  GipInternRecord,
  GipProgram,
  LpiiDataPoint,
  GipRenewAppointmentPayload,
  GipConcludeAppointmentPayload,
  GipApplicantReviewPayload,
} from '@/types/peso/provincialPeso/gip'
import type { GipApplicantDocumentMap } from '@/types/common/gipProgram'
import { gipDocumentService } from '@/services/common/gipDocumentService'
import {
  gipService,
  GIP_INTERNS_CACHE_KEY,
  GIP_APPLICANTS_CACHE_KEY,
  GIP_PRIORITY_APPLICANTS_CACHE_KEY,
  GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY,
  GIP_LPII_INTERNS_CACHE_KEY,
  GIP_LPII_APPLICANTS_CACHE_KEY,
} from '@/services/peso/provincialPeso/gipService'
import { getPersistentCacheValue } from '@/helpers/common/persistentCache'
import {
  LPII_CONFIG,
  computeApplicantStatusBreakdown,
  computeApplicantLpiiBreakdown,
  exportGipApplicantsCsv,
  exportGipInternsCsv,
  exportPriorityApplicantsCsv,
  extractApplicantAvailableYears,
  extractAvailableYears,
} from '@/helpers/peso/provincialPeso/gipHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

// In-memory only: cleared on every page load (Ctrl+R / F5), so each dataset revalidates against the database once per load
const revalidatedThisPageLoad = new Set<'dashboard' | 'details' | 'applicants'>()

export const useGipStore = defineStore('gipStore', () => {
  const toastAlert = useToastAlert()

  // ─── Demographic State (Dashboard) ───
  const pgasYearlyData = ref<GenderDataPoint[]>([])
  const doleYearlyData = ref<GenderDataPoint[]>([])
  const applicantsYearlyData = ref<GenderDataPoint[]>([])

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
  const isEditingIntern = ref<boolean>(false)
  const isUpdatingIntern = ref<boolean>(false)
  const isAddInternModalOpen = ref<boolean>(false)

  // ─── Appointment Renewal Dialog State ───
  const selectedInternForRenewal = ref<GipInternRecord | null>(null)
  const isRenewalDialogOpen = ref<boolean>(false)
  const isSubmittingRenewal = ref<boolean>(false)

  // ─── Filter & Pagination State ───
  const searchQuery = ref<string>('')
  const selectedProgram = ref<GipProgram>('ALL')
  const selectedLpiiFilter = ref<string>('ALL')
  const selectedYearFilter = ref<string>('ALL')
  const selectedGenderFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')
  const selectedAppointmentFilter = ref<string>('ALL')
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
      selectedAppointmentFilter,
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

  const totalApplicantsYearly = computed(() => {
    const male = applicantsYearlyData.value.reduce((acc, curr) => acc + curr.male, 0)
    const female = applicantsYearlyData.value.reduce((acc, curr) => acc + curr.female, 0)
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
      // Appointment status filter
      if (selectedAppointmentFilter.value !== 'ALL') {
        if (selectedAppointmentFilter.value === 'EXPIRING' && !intern.currentAppointment?.isExpiringSoon) {
          return false
        }
        if (selectedAppointmentFilter.value === 'EXPIRED' && !intern.currentAppointment?.isExpired) {
          return false
        }
        if (selectedAppointmentFilter.value === 'ACTIVE' && intern.status !== 'Active') {
          return false
        }
        if (selectedAppointmentFilter.value === 'COMPLETED' && intern.status !== 'Completed' && intern.status !== 'Hired') {
          return false
        }
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

  // ─── Computed: Appointment Expiration & Action Metrics ───
  const expiringAppointmentsCount = computed(() => {
    return interns.value.filter(
      (i) => i.currentAppointment?.isExpiringSoon && i.status === 'Active',
    ).length
  })

  const expiredAppointmentsCount = computed(() => {
    return interns.value.filter(
      (i) => i.currentAppointment?.isExpired && i.status === 'Active',
    ).length
  })

  const pendingDecisionCount = computed(() => {
    return expiringAppointmentsCount.value + expiredAppointmentsCount.value
  })

  const totalPages = computed(
    () => Math.ceil(filteredInterns.value.length / pageSize.value) || 1
  )

  const paginatedInterns = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredInterns.value.slice(start, start + pageSize.value)
  })

  // ─── Actions ───
  const fetchDashboardData = async (forceRefresh = false) => {
    errorMessage.value = null

    // 1. Instant Cache Hydration (stale-while-revalidate)
    if (!forceRefresh) {
      const cached = getPersistentCacheValue<{
        pgas: GenderDataPoint[]
        dole: GenderDataPoint[]
        applicants: GenderDataPoint[]
      }>(GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY)

      if (cached !== null) {
        pgasYearlyData.value = cached.pgas
        doleYearlyData.value = cached.dole
        applicantsYearlyData.value = cached.applicants
      }
      isLoading.value = cached === null
    } else {
      isLoading.value = true
    }

    const bypassCache = forceRefresh || !revalidatedThisPageLoad.has('dashboard')

    try {
      const yearly = await gipService.fetchYearlyDemographics(bypassCache)
      pgasYearlyData.value = [...yearly.pgas]
      doleYearlyData.value = [...yearly.dole]
      applicantsYearlyData.value = [...yearly.applicants]
      revalidatedThisPageLoad.add('dashboard')
      if (forceRefresh) {
        toastAlert.success('Data Refreshed', 'GIP demographic data has been refreshed.')
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load GIP dashboard demographic data.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Data', msg)
    } finally {
      isLoading.value = false
    }
  }

  const refreshDashboardData = async () => {
    await fetchDashboardData(true)
  }

  const fetchDetailsData = async (forceRefresh = false) => {
    errorMessage.value = null

    // 1. Instant Cache Hydration (stale-while-revalidate)
    if (!forceRefresh) {
      const cachedInterns = getPersistentCacheValue<GipInternRecord[]>(GIP_INTERNS_CACHE_KEY)
      const cachedLpii = getPersistentCacheValue<{
        pgas: LpiiDataPoint[]
        dole: LpiiDataPoint[]
      }>(GIP_LPII_INTERNS_CACHE_KEY)

      if (cachedInterns !== null) {
        interns.value = cachedInterns
      }
      if (cachedLpii !== null) {
        pgasLpiiData.value = cachedLpii.pgas
        doleLpiiData.value = cachedLpii.dole
      }
      isLoading.value = cachedInterns === null || cachedLpii === null
    } else {
      isLoading.value = true
    }

    const bypassCache = forceRefresh || !revalidatedThisPageLoad.has('details')

    try {
      const [lpii, list] = await Promise.all([
        gipService.fetchLpiiData(bypassCache),
        gipService.fetchInterns(bypassCache),
      ])
      pgasLpiiData.value = [...lpii.pgas]
      doleLpiiData.value = [...lpii.dole]
      interns.value = [...list]
      revalidatedThisPageLoad.add('details')
      if (forceRefresh) {
        toastAlert.success('Data Refreshed', 'GIP details and registry data refreshed.')
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load GIP details and registry data.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Details', msg)
    } finally {
      isLoading.value = false
    }
  }

  const refreshDetailsData = async () => {
    await fetchDetailsData(true)
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
    isEditingIntern.value = false
    isDetailsModalOpen.value = true
  }

  const closeInternDetails = () => {
    isDetailsModalOpen.value = false
    isEditingIntern.value = false
  }

  const toggleEditMode = () => {
    isEditingIntern.value = !isEditingIntern.value
  }

  const cancelEditMode = () => {
    isEditingIntern.value = false
  }

  const updateGipIntern = async (payload: {
    id: string
    program: 'PGAS' | 'DOLE'
    assignedOffice: string
    supervisor?: string
    stipend?: string
    period?: string
    status: string
    applicationId?: string
  }) => {
    isUpdatingIntern.value = true
    try {
      const parts = [`[${payload.program}] ${payload.assignedOffice}`]
      if (payload.supervisor) parts.push(`Supervisor: ${payload.supervisor}`)
      if (payload.period) parts.push(`Period: ${payload.period}`)
      if (payload.stipend) parts.push(`Stipend: ${payload.stipend}`)
      const fullRemarks = parts.join(' | ')

      await gipService.updateGip(payload.id, {
        status: payload.status,
        remarks: fullRemarks,
      })

      if (payload.applicationId) {
        try {
          await gipService.updateGipApplicant(payload.applicationId, {
            status: payload.status === 'Active' ? 'Approved' : payload.status,
          })
        } catch (appErr) {
          console.warn('[gipStore] Could not update applicant status:', appErr)
        }
      }

      toastAlert.success('Intern Updated', 'Intern deployment details updated successfully.')

      // Refresh records so the table and details reflect the change
      await fetchDetailsData()

      // Re-select the updated intern so the modal displays updated data
      const updated = interns.value.find((i) => i.id === payload.id)
      if (updated) {
        selectedIntern.value = updated
      }

      isEditingIntern.value = false
    } catch (err: any) {
      toastAlert.error('Update Failed', err.message || 'Could not update GIP intern.')
      throw err
    } finally {
      isUpdatingIntern.value = false
    }
  }

  const openAddInternModal = () => {
    isAddInternModalOpen.value = true
  }

  const closeAddInternModal = () => {
    isAddInternModalOpen.value = false
  }

  const deployInternFromApplicant = async (payload: {
    applicationId: string
    program: 'PGAS' | 'DOLE'
    assignedOffice: string
    supervisor?: string
    stipend?: string
    period?: string
    status?: string
    remarks?: string
  }) => {
    isSubmitting.value = true
    try {
      await gipService.deployGipIntern(payload)
      toastAlert.success('GIP Intern Deployed', 'Intern has been successfully deployed and registered.')
      isAddInternModalOpen.value = false
      await Promise.all([fetchDetailsData(), fetchApplicantsData()])
    } catch (err: any) {
      toastAlert.error('Deployment Failed', err.message || 'Could not deploy GIP intern.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const bulkDeployInternsFromApplicants = async (
    applicationIds: string[],
    payload: {
      program: 'PGAS' | 'DOLE'
      assignedOffice: string
      supervisor?: string
      stipend?: string
      period?: string
      status?: string
      remarks?: string
    }
  ) => {
    if (applicationIds.length === 0) return { successCount: 0, skippedCount: 0, failedCount: 0, errors: [] }
    isSubmitting.value = true
    try {
      const result = await gipService.bulkDeployGipInterns(applicationIds, payload)
      const extras = [
        result.skippedCount > 0 ? `${result.skippedCount} already deployed` : '',
        result.failedCount > 0 ? `${result.failedCount} failed` : '',
      ].filter(Boolean)
      if (result.successCount > 0) {
        toastAlert.success(
          'Bulk Deployment Completed',
          `Successfully deployed ${result.successCount} intern${result.successCount > 1 ? 's' : ''}.` +
            (extras.length > 0 ? ` (${extras.join(', ')})` : '')
        )
      } else {
        toastAlert.error(
          'Bulk Deployment Failed',
          result.errors[0] || (result.skippedCount > 0 ? 'All selected applicants are already deployed.' : 'Could not deploy selected applicants.')
        )
      }
      await Promise.all([fetchDetailsData(true), fetchApplicantsData(true)])
      return result
    } catch (err: any) {
      toastAlert.error('Bulk Deployment Error', err.message || 'Could not complete bulk deployment.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const exportCsv = () => {
    try {
      exportGipInternsCsv(filteredInterns.value, selectedProgram.value)
      toastAlert.success('Export Successful', 'GIP Interns list exported as CSV.')
    } catch {
      toastAlert.error('Export Failed', 'Failed to export GIP Interns list.')
    }
  }

  // ─── Applicant Records State (Applicants Table & Donut Charts) ───
  const applicants = ref<GipApplicantRecord[]>([])
  const applicantOverallLpiiData = ref<LpiiDataPoint[]>([])
  const applicantMaleLpiiData = ref<LpiiDataPoint[]>([])
  const applicantFemaleLpiiData = ref<LpiiDataPoint[]>([])
  const selectedApplicant = ref<GipApplicantRecord | null>(null)
  const isApplicantDetailsModalOpen = ref<boolean>(false)
  const isAddApplicantModalOpen = ref<boolean>(false)
  const isBatchUploadModalOpen = ref<boolean>(false)

  // ─── Edit Applicant Status & Documents State ───
  const applicantToEdit = ref<GipApplicantRecord | null>(null)
  const isEditApplicantDialogOpen = ref<boolean>(false)
  const isSavingApplicantReview = ref<boolean>(false)
  /** Soft copies the applicant uploaded from the GIP page (migration 060), per document name */
  const applicantToEditDocuments = ref<GipApplicantDocumentMap>({})
  const isLoadingApplicantDocuments = ref<boolean>(false)

  // ─── Priority Applicants Ranking State ───
  const priorityApplicants = ref<GipPriorityApplicantRecord[]>([])
  const isPriorityModalOpen = ref<boolean>(false)
  const isPriorityLoading = ref<boolean>(false)

  // ─── Applicant Filter & Pagination State ───
  const applicantSearchQuery = ref<string>('')
  const applicantStatusTab = ref<string>('ALL')
  const applicantLpiiFilter = ref<string>('ALL')
  const applicantMonthFilter = ref<string>('ALL')
  const applicantYearFilter = ref<string>('ALL')
  const applicantGenderFilter = ref<string>('ALL')
  const applicantStatusFilter = ref<string>('ALL')
  const applicantCurrentPage = ref<number>(1)
  const applicantPageSize = ref<number>(8)

  // Reset applicant pagination when filters change
  watch(
    [
      applicantSearchQuery,
      applicantStatusTab,
      applicantLpiiFilter,
      applicantMonthFilter,
      applicantYearFilter,
      applicantGenderFilter,
      applicantStatusFilter,
    ],
    () => {
      applicantCurrentPage.value = 1
    }
  )

  // ─── Computed: Applicant Totals & LPII ───
  const applicantAvailableYears = computed<number[]>(() =>
    extractApplicantAvailableYears(applicants.value)
  )

  const applicantStatusData = computed<ApplicantStatusDataPoint[]>(() =>
    computeApplicantStatusBreakdown(applicants.value)
  )

  const totalApplicantStatus = computed<number>(() =>
    applicantStatusData.value.reduce((sum, item) => sum + item.count, 0)
  )

  const totalOverallApplicantLpii = computed<number>(() =>
    applicantOverallLpiiData.value.reduce((sum, item) => sum + item.count, 0)
  )

  const totalMaleApplicantLpii = computed<number>(() =>
    applicantMaleLpiiData.value.reduce((sum, item) => sum + item.count, 0)
  )

  const totalFemaleApplicantLpii = computed<number>(() =>
    applicantFemaleLpiiData.value.reduce((sum, item) => sum + item.count, 0)
  )

  const filteredApplicants = computed<GipApplicantRecord[]>(() => {
    return applicants.value.filter((app) => {
      // Status Tab filter
      if (
        applicantStatusTab.value !== 'ALL' &&
        app.status.trim().toUpperCase() !== applicantStatusTab.value.trim().toUpperCase()
      ) {
        return false
      }
      // LPII filter
      if (
        applicantLpiiFilter.value !== 'ALL' &&
        app.lpiiTag.trim().toUpperCase() !== applicantLpiiFilter.value.trim().toUpperCase()
      ) {
        return false
      }
      // Month filter
      if (applicantMonthFilter.value !== 'ALL') {
        const targetDate = app.assessmentDate || app.rawApplicant?.assessment_date || app.createdAt
        if (!targetDate) return false
        const d = new Date(targetDate)
        if (isNaN(d.getTime())) return false
        const month = (d.getMonth() + 1).toString()
        if (month !== applicantMonthFilter.value.trim()) {
          return false
        }
      }
      // Year filter
      if (
        applicantYearFilter.value !== 'ALL' &&
        app.batchYear.toString() !== applicantYearFilter.value.trim()
      ) {
        return false
      }
      // Gender filter
      if (
        applicantGenderFilter.value !== 'ALL' &&
        app.gender.trim().toUpperCase() !== applicantGenderFilter.value.trim().toUpperCase()
      ) {
        return false
      }
      // Status filter dropdown
      if (
        applicantStatusFilter.value !== 'ALL' &&
        app.status.trim().toUpperCase() !== applicantStatusFilter.value.trim().toUpperCase()
      ) {
        return false
      }
      // Search query
      if (applicantSearchQuery.value.trim()) {
        const q = applicantSearchQuery.value.toLowerCase().trim()
        const matchName = app.fullName.toLowerCase().includes(q)
        const matchCode = app.code.toLowerCase().includes(q)
        const matchMuni = app.municipality.toLowerCase().includes(q)
        const matchBrgy = app.barangay.toLowerCase().includes(q)
        const matchCourse = app.course.toLowerCase().includes(q)
        const matchContact = app.contact.toLowerCase().includes(q)
        return (
          matchName ||
          matchCode ||
          matchMuni ||
          matchBrgy ||
          matchCourse ||
          matchContact
        )
      }
      return true
    })
  })

  const totalApplicantPages = computed<number>(
    () => Math.ceil(filteredApplicants.value.length / applicantPageSize.value) || 1
  )

  const paginatedApplicants = computed<GipApplicantRecord[]>(() => {
    const start = (applicantCurrentPage.value - 1) * applicantPageSize.value
    return filteredApplicants.value.slice(start, start + applicantPageSize.value)
  })

  const fetchApplicantsData = async (forceRefresh = false, silent = false) => {
    errorMessage.value = null

    // 1. Instant Cache Hydration (stale-while-revalidate)
    if (!forceRefresh) {
      const cachedApplicants = getPersistentCacheValue<GipApplicantRecord[]>(GIP_APPLICANTS_CACHE_KEY)
      const cachedPriority = getPersistentCacheValue<GipPriorityApplicantRecord[]>(GIP_PRIORITY_APPLICANTS_CACHE_KEY)
      const cachedLpii = getPersistentCacheValue<{
        overall: LpiiDataPoint[]
        male: LpiiDataPoint[]
        female: LpiiDataPoint[]
      }>(GIP_LPII_APPLICANTS_CACHE_KEY)

      if (cachedApplicants !== null && cachedApplicants.length > 0) {
        applicants.value = cachedApplicants.map((a) => ({
          ...a,
          assessmentDate: a.assessmentDate || a.rawApplicant?.assessment_date || a.createdAt,
        }))
      }
      if (cachedPriority !== null) {
        priorityApplicants.value = cachedPriority
      }
      if (cachedLpii !== null) {
        applicantOverallLpiiData.value = cachedLpii.overall
        applicantMaleLpiiData.value = cachedLpii.male
        applicantFemaleLpiiData.value = cachedLpii.female
      }
      if (!silent) isLoading.value = cachedApplicants === null || cachedLpii === null
    } else if (!silent) {
      isLoading.value = true
    }

    const bypassCache = forceRefresh || !revalidatedThisPageLoad.has('applicants')

    try {
      const [lpiiBreakdown, list, priorityList] = await Promise.all([
        gipService.fetchApplicantLpiiData(bypassCache),
        gipService.fetchApplicants(bypassCache),
        gipService.fetchPriorityApplicants(bypassCache),
      ])
      applicantOverallLpiiData.value = [...lpiiBreakdown.overall]
      applicantMaleLpiiData.value = [...lpiiBreakdown.male]
      applicantFemaleLpiiData.value = [...lpiiBreakdown.female]
      applicants.value = [...list]
      priorityApplicants.value = [...priorityList]
      revalidatedThisPageLoad.add('applicants')
      if (forceRefresh && !silent) {
        toastAlert.success('Data Refreshed', 'GIP applicants registry refreshed.')
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load GIP applicants and demographic registry.'
      if (silent) {
        console.error('[gipStore] Background applicant sync failed:', err)
      } else {
        errorMessage.value = msg
        toastAlert.error('Error Loading Applicants', msg)
      }
    } finally {
      if (!silent) isLoading.value = false
    }
  }

  const fetchPriorityApplicants = async (forceRefresh = false) => {
    isPriorityLoading.value = true
    try {
      const list = await gipService.fetchPriorityApplicants(forceRefresh)
      priorityApplicants.value = [...list]
    } catch (err: any) {
      console.error('[gipStore] Failed to load priority applicants:', err)
      toastAlert.error('Error Loading Priority Applicants', err.message || 'Could not load priority applicants.')
    } finally {
      isPriorityLoading.value = false
    }
  }

  const openPriorityModal = async () => {
    isPriorityModalOpen.value = true
    if (priorityApplicants.value.length === 0) {
      await fetchPriorityApplicants()
    }
  }

  const closePriorityModal = () => {
    isPriorityModalOpen.value = false
  }

  const exportPriorityCsv = () => {
    try {
      exportPriorityApplicantsCsv(priorityApplicants.value)
      toastAlert.success('Export Successful', 'GIP Priority Applicants Ranking exported as CSV.')
    } catch {
      toastAlert.error('Export Failed', 'Failed to export GIP Priority Applicants Ranking.')
    }
  }

  const refreshApplicantsData = async () => {
    await fetchApplicantsData(true)
  }

  const openApplicantDetails = (app: GipApplicantRecord) => {
    selectedApplicant.value = app
    isApplicantDetailsModalOpen.value = true
  }

  const closeApplicantDetails = () => {
    isApplicantDetailsModalOpen.value = false
  }

  const resetApplicantFilters = () => {
    applicantSearchQuery.value = ''
    applicantStatusTab.value = 'ALL'
    applicantLpiiFilter.value = 'ALL'
    applicantMonthFilter.value = 'ALL'
    applicantYearFilter.value = 'ALL'
    applicantGenderFilter.value = 'ALL'
    applicantStatusFilter.value = 'ALL'
  }

  const openAddApplicantModal = () => {
    isAddApplicantModalOpen.value = true
  }

  const closeAddApplicantModal = () => {
    isAddApplicantModalOpen.value = false
  }

  const openEditApplicantDialog = (app: GipApplicantRecord) => {
    applicantToEdit.value = app
    isEditApplicantDialogOpen.value = true
    void loadApplicantToEditDocuments(app.id)
  }

  // No toast on failure: the checklist still works without the file links
  const loadApplicantToEditDocuments = async (applicationId: string) => {
    applicantToEditDocuments.value = {}
    isLoadingApplicantDocuments.value = true
    try {
      const documents = await gipDocumentService.fetchDocuments(applicationId)
      if (applicantToEdit.value?.id === applicationId) applicantToEditDocuments.value = documents
    } catch (error) {
      console.error(error)
    } finally {
      isLoadingApplicantDocuments.value = false
    }
  }

  const closeEditApplicantDialog = () => {
    isEditApplicantDialogOpen.value = false
    applicantToEdit.value = null
  }

  // Patch the edited row in place so the table updates without a loading state
  const applyApplicantReviewLocally = (payload: GipApplicantReviewPayload) => {
    const patch = (a: GipApplicantRecord): GipApplicantRecord => {
      const isHired = ['hired', 'deployed'].includes((a.status || '').trim().toLowerCase())
      const status = isHired ? a.status : payload.status
      const docs = [...payload.documentsSubmitted]
      return {
        ...a,
        status,
        documentsSubmitted: docs,
        rawApplication: a.rawApplication
          ? { ...a.rawApplication, status, document_submitted: docs.length > 0 ? docs : null }
          : a.rawApplication,
        rawApplicant: a.rawApplicant
          ? { ...a.rawApplicant, documents_submitted: docs.length > 0 ? docs : null }
          : a.rawApplicant,
      }
    }

    applicants.value = applicants.value.map((a) => (a.id === payload.applicationId ? patch(a) : a))
    if (selectedApplicant.value?.id === payload.applicationId) {
      selectedApplicant.value = patch(selectedApplicant.value)
    }
  }

  const updateApplicantReview = async (payload: GipApplicantReviewPayload): Promise<boolean> => {
    isSavingApplicantReview.value = true
    try {
      await gipService.updateGipApplicantReview(payload)
      applyApplicantReviewLocally(payload)
      toastAlert.success('Applicant Updated', 'GIP status and submitted documents have been saved.')
      closeEditApplicantDialog()

      // Background re-sync (priority ranking, server defaults) without showing a loading state
      fetchApplicantsData(true, true).catch(() => {})
      return true
    } catch (err: any) {
      console.error('[gipStore] Failed to update applicant review:', err)
      toastAlert.error('Update Failed', err.message || 'Could not update GIP applicant.')
      // A partial save (GIP row updated, applicant row not) still changed data — resync the table
      fetchApplicantsData(true, true).catch(() => {})
      return false
    } finally {
      isSavingApplicantReview.value = false
    }
  }

  const openBatchUploadModal = () => {
    isBatchUploadModalOpen.value = true
  }

  const closeBatchUploadModal = () => {
    isBatchUploadModalOpen.value = false
  }

  const createSingleApplicant = async (payload: any) => {
    isSubmitting.value = true
    try {
      await gipService.createSingleApplicantWithGipApplication(payload)
      toastAlert.success('Applicant Registered', `${payload.firstName} ${payload.surname} has been added to GIP registry.`)
      isAddApplicantModalOpen.value = false
      await fetchApplicantsData()
    } catch (err: any) {
      toastAlert.error('Registration Failed', err.message || 'Could not register applicant.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Directly adds a newly referred GIP applicant to the store state and persistent cache.
   * Avoids requiring a manual refresh to see the newly registered applicant.
   */
  const addReferredApplicant = async (
    applicant: ApplicantRow,
    gipApplication: GipApplicantRow,
  ): Promise<GipApplicantRecord> => {
    const newRecord = await gipService.formatAndCacheReferredGipApplicant(gipApplication, applicant)

    // Prepend to reactive state if not already present
    const existingIndex = applicants.value.findIndex(
      (a) => a.id === newRecord.id || (newRecord.applicantId && a.applicantId === newRecord.applicantId),
    )
    if (existingIndex >= 0) {
      applicants.value[existingIndex] = newRecord
    } else {
      applicants.value = [newRecord, ...applicants.value]
    }

    // Immediately recalculate LPII breakdown metrics
    const lpii = computeApplicantLpiiBreakdown(applicants.value)
    applicantOverallLpiiData.value = [...lpii.overall]
    applicantMaleLpiiData.value = [...lpii.male]
    applicantFemaleLpiiData.value = [...lpii.female]

    return newRecord
  }

  const batchImportApplicants = async (applicantsList: any[]) => {
    isSubmitting.value = true
    try {
      const result = await gipService.batchCreateGipApplicants(applicantsList)
      if (result.successCount > 0) {
        toastAlert.success(
          'Batch Import Completed',
          `Successfully registered ${result.successCount} of ${result.total} GIP applicants.`
        )
      }
      if (result.errors.length > 0) {
        toastAlert.info(
          'Some Records Skipped',
          `${result.errors.length} records had errors and were not imported.`
        )
      }
      isBatchUploadModalOpen.value = false
      await fetchApplicantsData()
      return result
    } catch (err: any) {
      toastAlert.error('Batch Import Failed', err.message || 'Failed to import applicants.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const exportApplicantsCsv = () => {
    try {
      exportGipApplicantsCsv(filteredApplicants.value, applicantStatusTab.value)
      toastAlert.success('Export Successful', 'GIP Applicants list exported as CSV.')
    } catch {
      toastAlert.error('Export Failed', 'Failed to export GIP Applicants list.')
    }
  }

  const removeGipApplicant = async (applicationId: string) => {
    isSubmitting.value = true
    try {
      await gipService.deleteGipApplicant(applicationId)
      toastAlert.success('Applicant Removed', 'The applicant has been removed from the GIP registry.')
      await fetchApplicantsData(true)
    } catch (err: any) {
      toastAlert.error('Removal Failed', err.message || 'Could not remove applicant.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const bulkRemoveGipApplicants = async (applicationIds: string[]) => {
    if (applicationIds.length === 0) return { successCount: 0, failedCount: 0 }
    isSubmitting.value = true
    try {
      const result = await gipService.bulkDeleteGipApplicants(applicationIds)
      if (result.successCount > 0) {
        toastAlert.success(
          'Bulk Removal Completed',
          `Successfully removed ${result.successCount} applicant${result.successCount > 1 ? 's' : ''} from GIP registry.` +
            (result.failedCount > 0 ? ` (${result.failedCount} failed)` : '')
        )
      } else {
        toastAlert.error('Bulk Removal Failed', result.errors[0] || 'Could not remove selected applicants.')
      }
      await fetchApplicantsData(true)
      return result
    } catch (err: any) {
      toastAlert.error('Bulk Removal Error', err.message || 'Could not complete bulk removal.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const removeGipIntern = async (internId: string) => {
    isSubmitting.value = true
    try {
      await gipService.deleteGipIntern(internId)
      toastAlert.success('Intern Removed', 'The intern deployment has been removed.')
      if (selectedIntern.value?.id === internId) {
        selectedIntern.value = null
        isDetailsModalOpen.value = false
      }
      await fetchDetailsData(true)
    } catch (err: any) {
      toastAlert.error('Removal Failed', err.message || 'Could not remove intern.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const bulkRemoveGipInterns = async (internIds: string[]) => {
    if (internIds.length === 0) return { successCount: 0, failedCount: 0 }
    isSubmitting.value = true
    try {
      const result = await gipService.bulkDeleteGipInterns(internIds)
      if (result.successCount > 0) {
        toastAlert.success(
          'Bulk Removal Completed',
          `Successfully removed ${result.successCount} intern record${result.successCount > 1 ? 's' : ''}.` +
            (result.failedCount > 0 ? ` (${result.failedCount} failed)` : '')
        )
      } else {
        toastAlert.error('Bulk Removal Failed', result.errors[0] || 'Could not remove selected interns.')
      }
      if (selectedIntern.value && internIds.includes(selectedIntern.value.id)) {
        selectedIntern.value = null
        isDetailsModalOpen.value = false
      }
      await fetchDetailsData(true)
      return result
    } catch (err: any) {
      toastAlert.error('Bulk Removal Error', err.message || 'Could not complete bulk removal.')
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Appointment Renewal Actions ───
  const openRenewalDialog = (intern: GipInternRecord) => {
    selectedInternForRenewal.value = intern
    isRenewalDialogOpen.value = true
  }

  const closeRenewalDialog = () => {
    isRenewalDialogOpen.value = false
    selectedInternForRenewal.value = null
  }

  const renewInternAppointment = async (payload: GipRenewAppointmentPayload) => {
    isSubmittingRenewal.value = true
    try {
      await gipService.renewAppointment(payload)
      toastAlert.success(
        'Appointment Renewed',
        `Intern appointment renewed to Term #${payload.nextTermNumber}.`,
      )
      isRenewalDialogOpen.value = false
      selectedInternForRenewal.value = null
      await fetchDetailsData(true)
    } catch (err: any) {
      toastAlert.error('Renewal Failed', err.message || 'Could not renew appointment.')
      throw err
    } finally {
      isSubmittingRenewal.value = false
    }
  }

  const concludeInternAppointment = async (payload: GipConcludeAppointmentPayload) => {
    isSubmittingRenewal.value = true
    try {
      await gipService.concludeAppointment(payload)
      toastAlert.success(
        'Appointment Concluded',
        `Internship status set to ${payload.action}.`,
      )
      isRenewalDialogOpen.value = false
      selectedInternForRenewal.value = null
      await fetchDetailsData(true)
    } catch (err: any) {
      toastAlert.error('Action Failed', err.message || 'Could not update appointment status.')
      throw err
    } finally {
      isSubmittingRenewal.value = false
    }
  }

  return {
    // State
    pgasYearlyData,
    doleYearlyData,
    applicantsYearlyData,
    pgasLpiiData,
    doleLpiiData,
    interns,
    applicants,
    applicantStatusData,
    applicantOverallLpiiData,
    applicantMaleLpiiData,
    applicantFemaleLpiiData,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedIntern,
    selectedApplicant,
    isDetailsModalOpen,
    isEditingIntern,
    isUpdatingIntern,
    isAddInternModalOpen,
    isApplicantDetailsModalOpen,
    isAddApplicantModalOpen,
    isBatchUploadModalOpen,
    applicantToEdit,
    isEditApplicantDialogOpen,
    isSavingApplicantReview,
    applicantToEditDocuments,
    isLoadingApplicantDocuments,
    selectedInternForRenewal,
    isRenewalDialogOpen,
    isSubmittingRenewal,
    priorityApplicants,
    isPriorityModalOpen,
    isPriorityLoading,
    searchQuery,
    selectedProgram,
    selectedLpiiFilter,
    selectedYearFilter,
    selectedGenderFilter,
    selectedStatusFilter,
    selectedAppointmentFilter,
    currentPage,
    pageSize,

    // Applicant Filter State
    applicantSearchQuery,
    applicantStatusTab,
    applicantLpiiFilter,
    applicantMonthFilter,
    applicantYearFilter,
    applicantGenderFilter,
    applicantStatusFilter,
    applicantCurrentPage,
    applicantPageSize,

    // Computed
    availableYears,
    applicantAvailableYears,
    totalPgasYearly,
    totalDoleYearly,
    totalApplicantsYearly,
    overallMaleInterns,
    overallFemaleInterns,
    overallLpiiData,
    totalOverallLpii,
    totalPgasLpii,
    totalDoleLpii,
    totalApplicantStatus,
    totalOverallApplicantLpii,
    totalMaleApplicantLpii,
    totalFemaleApplicantLpii,
    filteredInterns,
    filteredApplicants,
    totalPages,
    totalApplicantPages,
    paginatedInterns,
    paginatedApplicants,
    expiringAppointmentsCount,
    expiredAppointmentsCount,
    pendingDecisionCount,

    // Actions
    fetchDashboardData,
    refreshDashboardData,
    fetchDetailsData,
    refreshDetailsData,
    fetchApplicantsData,
    refreshApplicantsData,
    createGipApplication,
    createGipDeployment,
    createSingleApplicant,
    batchImportApplicants,
    setSelectedProgram,
    resetFilters,
    resetApplicantFilters,
    openInternDetails,
    closeInternDetails,
    toggleEditMode,
    cancelEditMode,
    updateGipIntern,
    openAddInternModal,
    closeAddInternModal,
    deployInternFromApplicant,
    bulkDeployInternsFromApplicants,
    openApplicantDetails,
    closeApplicantDetails,
    openAddApplicantModal,
    closeAddApplicantModal,
    openBatchUploadModal,
    closeBatchUploadModal,
    removeGipApplicant,
    bulkRemoveGipApplicants,
    removeGipIntern,
    bulkRemoveGipInterns,
    exportCsv,
    exportApplicantsCsv,
    fetchPriorityApplicants,
    openPriorityModal,
    closePriorityModal,
    exportPriorityCsv,
    openRenewalDialog,
    closeRenewalDialog,
    renewInternAppointment,
    concludeInternAppointment,
    addReferredApplicant,
    openEditApplicantDialog,
    closeEditApplicantDialog,
    updateApplicantReview,
  }
})
