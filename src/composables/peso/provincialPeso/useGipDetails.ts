import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import type { DirectoryRow } from '@/types/common/directory'
import type { GipInternRecord, GipProgram } from '@/types/peso/provincialPeso/gip'
import {
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
} from '@/helpers/peso/provincialPeso/gipHelper'
import { GIP_OFFICE_PRESETS } from '@/composables/peso/provincialPeso/useGipAddIntern'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'

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
    isEditingIntern,
    isUpdatingIntern,
    isAddInternModalOpen,
    applicants,
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
    refreshDetailsData,
    fetchApplicantsData,
    createGipApplication,
    createGipDeployment,
    deployInternFromApplicant,
    setSelectedProgram,
    resetFilters,
    openInternDetails,
    closeInternDetails,
    toggleEditMode,
    cancelEditMode,
    updateGipIntern,
    openAddInternModal,
    closeAddInternModal,
    openBatchUploadModal,
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

  function navigateToAddIntern() {
    router.push({ name: 'provincial-peso-gip-add' })
  }

  // ─── Office Directory State ───
  const offices = ref<DirectoryRow[]>([])
  const officeSearchQuery = ref<string>('')
  const selectedOffice = ref<DirectoryRow | null>(null)
  const isLoadingOffices = ref<boolean>(false)

  const filteredOffices = computed(() => {
    if (!officeSearchQuery.value.trim()) return offices.value
    const q = officeSearchQuery.value.toLowerCase().trim()
    return offices.value.filter(
      (o) =>
        o.office_name.toLowerCase().includes(q) ||
        o.office_code.toLowerCase().includes(q) ||
        (o.office_head && o.office_head.toLowerCase().includes(q)),
    )
  })

  async function fetchOffices() {
    if (offices.value.length > 0) return // Already loaded
    isLoadingOffices.value = true
    try {
      offices.value = await directoryService.fetchActiveOffices()
    } catch (err: any) {
      console.error('Failed to fetch offices:', err.message)
    } finally {
      isLoadingOffices.value = false
    }
  }

  // ─── Date Range State ───
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

  const deploymentStartDate = ref<any>(null)
  const deploymentEndDate = ref<any>(null)

  /**
   * Format a CalendarDate-like value as "MMM D" (e.g., "Sep 1")
   */
  function formatShortDate(d: any): string {
    if (!d || typeof d.month !== 'number' || typeof d.day !== 'number') return ''
    return `${MONTH_NAMES[d.month - 1]} ${d.day}`
  }

  const formattedPeriod = computed<string>(() => {
    const start = deploymentStartDate.value
    const end = deploymentEndDate.value
    if (!start || !end) return ''

    const startStr = formatShortDate(start)
    const endStr = formatShortDate(end)

    // If same year, show year once at the end
    if (start.year === end.year) {
      return `${startStr} - ${endStr}, ${end.year}`
    }
    // Different years
    return `${startStr}, ${start.year} - ${endStr}, ${end.year}`
  })

  /**
   * Parse a human-readable period string into CalendarDate start/end values.
   * Supports patterns like:
   *   - "Jan 1 - Jun 30, 2026"
   *   - "Jan 1, 2026 - Jun 30, 2027"
   *   - "Jan 2026 - Jun 2026" (day defaults to 1 and last-day-of-month)
   */
  function parsePeriodToDates(period: string): { start: any; end: any } | null {
    if (!period || !period.trim()) return null

    const monthMap: Record<string, number> = {}
    MONTH_NAMES.forEach((m, i) => { monthMap[m.toLowerCase()] = i + 1 })

    // Pattern: "MMM D - MMM D, YYYY" or "MMM D, YYYY - MMM D, YYYY"
    const rangeMatch = period.match(
      /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/
    )
    if (rangeMatch) {
      const [, sm, sd, sy, em, ed, ey] = rangeMatch
      const startMonth = monthMap[sm.toLowerCase().slice(0, 3)]
      const endMonth = monthMap[em.toLowerCase().slice(0, 3)]
      if (startMonth && endMonth) {
        const startYear = sy ? parseInt(sy) : parseInt(ey)
        return {
          start: new CalendarDate(startYear, startMonth, parseInt(sd)),
          end: new CalendarDate(parseInt(ey), endMonth, parseInt(ed)),
        }
      }
    }

    // Pattern: "MMM YYYY - MMM YYYY" (no day, month-only)
    const monthYearMatch = period.match(
      /^([A-Za-z]+)\s+(\d{4})\s*[-–]\s*([A-Za-z]+)\s+(\d{4})$/
    )
    if (monthYearMatch) {
      const [, sm, sy, em, ey] = monthYearMatch
      const startMonth = monthMap[sm.toLowerCase().slice(0, 3)]
      const endMonth = monthMap[em.toLowerCase().slice(0, 3)]
      if (startMonth && endMonth) {
        const endYear = parseInt(ey)
        // End date = last day of endMonth
        const nextMonth = endMonth === 12
          ? new CalendarDate(endYear + 1, 1, 1)
          : new CalendarDate(endYear, endMonth + 1, 1)
        const endDate = nextMonth.subtract({ days: 1 })
        return {
          start: new CalendarDate(parseInt(sy), startMonth, 1),
          end: endDate,
        }
      }
    }

    return null
  }

  // ─── Auto-fill supervisor when office is selected ───
  watch(selectedOffice, (office) => {
    if (office) {
      editForm.value.assignedOffice = office.office_name
      editForm.value.supervisor = office.office_head || ''
    }
  })

  // ─── Sync period from formatted date range ───
  watch(formattedPeriod, (fp) => {
    if (fp) {
      editForm.value.period = fp
    }
  })

  // ─── Inline Edit State & Presets ───
  const currentYear = new Date().getFullYear()
  const officePresets = GIP_OFFICE_PRESETS
  const periodPresets = [
    `Jan ${currentYear} - Jun ${currentYear}`,
    `Jul ${currentYear} - Dec ${currentYear}`,
    `Batch ${currentYear} (3 Months)`,
    `Batch ${currentYear} (6 Months)`,
  ]

  const editForm = ref<{
    program: 'PGAS' | 'DOLE'
    assignedOffice: string
    supervisor: string
    stipend: string
    period: string
    status: string
  }>({
    program: 'PGAS',
    assignedOffice: '',
    supervisor: '',
    stipend: '₱479.35 / day',
    period: `Jan ${currentYear} - Jun ${currentYear}`,
    status: 'Active',
  })

  function startEdit() {
    if (selectedIntern.value) {
      editForm.value = {
        program: selectedIntern.value.program,
        assignedOffice: selectedIntern.value.assignedOffice,
        supervisor: selectedIntern.value.supervisor,
        stipend: selectedIntern.value.stipend,
        period: selectedIntern.value.period,
        status: selectedIntern.value.status,
      }
      isEditingIntern.value = true

      // Fetch offices if not already loaded
      fetchOffices()

      // Match the intern's assigned office with directory entries
      if (offices.value.length > 0) {
        const match = offices.value.find(
          (o) => o.office_name.toLowerCase() === selectedIntern.value!.assignedOffice.toLowerCase(),
        )
        selectedOffice.value = match || null
      } else {
        // Wait for offices to load, then match
        const stopWatch = watch(offices, (loaded) => {
          if (loaded.length > 0) {
            const match = loaded.find(
              (o) => o.office_name.toLowerCase() === selectedIntern.value!.assignedOffice.toLowerCase(),
            )
            selectedOffice.value = match || null
            stopWatch()
          }
        })
      }

      // Parse existing period into calendar dates
      const parsed = parsePeriodToDates(selectedIntern.value.period)
      if (parsed) {
        deploymentStartDate.value = parsed.start
        deploymentEndDate.value = parsed.end
      } else {
        // Fallback: set to current month range
        const td = today(getLocalTimeZone())
        deploymentStartDate.value = new CalendarDate(td.year, td.month, 1)
        const nextMonth = td.month === 12
          ? new CalendarDate(td.year + 1, 1, 1)
          : new CalendarDate(td.year, td.month + 1, 1)
        deploymentEndDate.value = nextMonth.subtract({ days: 1 })
      }
    }
  }

  function openInternEdit(intern: GipInternRecord) {
    openInternDetails(intern)
    startEdit()
  }

  function cancelEdit() {
    cancelEditMode()
    selectedOffice.value = null
    officeSearchQuery.value = ''
    deploymentStartDate.value = null
    deploymentEndDate.value = null
  }

  function setEditProgram(prog: 'PGAS' | 'DOLE') {
    editForm.value.program = prog
    if (prog === 'PGAS' && (editForm.value.stipend === '₱475.00 / day' || editForm.value.stipend === '₱475 / day')) {
      editForm.value.stipend = '₱479.35 / day'
    } else if (prog === 'DOLE' && editForm.value.stipend === '₱479.35 / day') {
      editForm.value.stipend = '₱475.00 / day'
    }
  }

  async function saveEdit() {
    if (!selectedIntern.value) return
    const office = editForm.value.assignedOffice.trim() || (editForm.value.program === 'PGAS' ? 'Provincial PESO / PGAS Office' : 'DOLE AgSur Field Office')
    await updateGipIntern({
      id: selectedIntern.value.id,
      program: editForm.value.program,
      assignedOffice: office,
      supervisor: editForm.value.supervisor.trim(),
      stipend: editForm.value.stipend.trim(),
      period: editForm.value.period.trim(),
      status: editForm.value.status,
      applicationId: selectedIntern.value.rawGip?.application_id || undefined,
    })
  }

  watch(isDetailsModalOpen, (open) => {
    if (!open) {
      cancelEditMode()
      selectedOffice.value = null
      officeSearchQuery.value = ''
      deploymentStartDate.value = null
      deploymentEndDate.value = null
    }
  })

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
    isAddInternModalOpen,
    isEditingIntern,
    isUpdatingIntern,
    isLoading,
    isSubmitting,
    errorMessage,

    // Edit State & Actions
    editForm,
    officePresets,
    periodPresets,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditProgram,
    toggleEditMode,
    cancelEditMode,

    // Office Directory (Edit Mode)
    officeSearchQuery,
    filteredOffices,
    selectedOffice,
    isLoadingOffices,

    // Date Range (Edit Mode)
    deploymentStartDate,
    deploymentEndDate,
    formattedPeriod,

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

    // Applicants pool
    applicants,

    // Visual Helpers & Configs
    LPII_CONFIG,
    donutTooltipTriggers,
    getInitials,

    // Actions & Navigation
    goBack,
    navigateToAddIntern,
    resetFilters,
    openInternDetails,
    openInternEdit,
    closeInternDetails,
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
  }
}
