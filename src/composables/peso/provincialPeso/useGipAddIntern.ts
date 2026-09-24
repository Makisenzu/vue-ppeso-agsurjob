import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import type { DirectoryRow } from '@/types/common/directory'
import { LPII_CONFIG, getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'

export const GIP_OFFICE_PRESETS = [
  'Provincial PESO / PGAS Office',
  'Provincial Capitol - HRMO',
  'Provincial Agriculture Office (PAGRO)',
  'Provincial Engineering Office (PEO)',
  'Provincial Health Office (PHO)',
  'Provincial Social Welfare & Dev Office (PSWDO)',
  'DOLE AgSur Provincial Field Office',
  'Municipal PESO Station',
]

export function useGipAddIntern() {
  const router = useRouter()
  const route = useRoute()
  const gipStore = useGipStore()
  const { isAddInternModalOpen, applicants, interns, isSubmitting } = storeToRefs(gipStore)

  const currentYear = new Date().getFullYear()
  const periodPresets = [
    `Jan ${currentYear} - Jun ${currentYear}`,
    `Jul ${currentYear} - Dec ${currentYear}`,
    `Batch ${currentYear} (3 Months)`,
    `Batch ${currentYear} (6 Months)`,
  ]

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

  // ─── Date Range State ───
  const todayDate = today(getLocalTimeZone())
  const deploymentStartDate = ref<any>(
    new CalendarDate(todayDate.year, todayDate.month, 1),
  )
  const deploymentEndDate = ref<any>(
    (todayDate.month === 12
      ? new CalendarDate(todayDate.year + 1, 1, 1)
      : new CalendarDate(todayDate.year, todayDate.month + 1, 1)
    ).subtract({ days: 1 }),
  )

  // Initialize deploymentEndDate to last day of current month
  const initEndDate = () => {
    const start = deploymentStartDate.value
    if (!start) return
    const nextMonth = start.month === 12
      ? new CalendarDate(start.year + 1, 1, 1)
      : new CalendarDate(start.year, start.month + 1, 1)
    deploymentEndDate.value = nextMonth.subtract({ days: 1 })
  }
  initEndDate()

  /**
   * Format a date value as "MMM D" (e.g., "Sep 1")
   */
  function formatShortDate(d: any): string {
    if (!d || typeof d.month !== 'number' || typeof d.day !== 'number') return ''
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.month - 1]} ${d.day}`
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

  // Step management: 'select-applicant' | 'configure-deployment'
  const activeStep = ref<'select-applicant' | 'configure-deployment'>('select-applicant')

  // Search & filtering inside page/dialog
  const searchQuery = ref<string>('')
  const selectedLpiiFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')
  const onlyAvailable = ref<boolean>(true)
  const isPriorityFilter = ref<boolean>(false)

  // Pagination
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  // Selected applicant
  const selectedApplicant = ref<GipApplicantRecord | null>(null)

  // Deployment form fields (PGAS ₱479.35/day, DOLE ₱475.00/day)
  const program = ref<'PGAS' | 'DOLE'>('PGAS')
  const assignedOffice = ref<string>('Provincial PESO / PGAS Office')
  const supervisor = ref<string>('')
  const stipend = ref<string>('₱479.35 / day')
  const period = ref<string>('')
  const status = ref<string>('Active')
  const deploymentNotes = ref<string>('')
  const validationError = ref<string | null>(null)

  // Sync period from formatted date range
  watch(formattedPeriod, (fp) => {
    period.value = fp
  }, { immediate: true })

  // ─── Auto-fill supervisor when office is selected ───
  watch(selectedOffice, (office) => {
    if (office) {
      assignedOffice.value = office.office_name
      supervisor.value = office.office_head || ''
    }
  })

  // Check if an applicant is already deployed to GIP
  function isApplicantDeployed(applicant: GipApplicantRecord): boolean {
    return interns.value.some((intern) => {
      if (intern.rawGip?.application_id && intern.rawGip.application_id === applicant.id) {
        return true
      }
      return (
        intern.fullName.trim().toLowerCase() === applicant.fullName.trim().toLowerCase() &&
        intern.municipality.trim().toLowerCase() === applicant.municipality.trim().toLowerCase() &&
        intern.status === 'Active'
      )
    })
  }

  // Count available high-priority applicants
  const priorityApplicantsCount = computed(() => {
    return applicants.value.filter(
      (app) => (app.totalPriorityScore ?? 0) >= 70 && (!onlyAvailable.value || !isApplicantDeployed(app)),
    ).length
  })

  // Filtered applicants list
  const filteredApplicants = computed(() => {
    const list = applicants.value.filter((app) => {
      // Only available toggle
      if (onlyAvailable.value && isApplicantDeployed(app)) {
        return false
      }

      // Priority filter toggle (Score >= 70 or has priority score)
      if (isPriorityFilter.value) {
        const score = app.totalPriorityScore ?? 0
        if (score < 70) {
          return false
        }
      }

      // LPII Filter
      if (selectedLpiiFilter.value !== 'ALL' && app.lpiiTag !== selectedLpiiFilter.value) {
        return false
      }

      // Status Filter
      if (selectedStatusFilter.value !== 'ALL' && app.status !== selectedStatusFilter.value) {
        return false
      }

      // Search query
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim()
        const matchName = app.fullName.toLowerCase().includes(q)
        const matchCode = app.code.toLowerCase().includes(q)
        const matchMuni = app.municipality.toLowerCase().includes(q)
        const matchBrgy = app.barangay.toLowerCase().includes(q)
        const matchCourse = app.course.toLowerCase().includes(q)
        return matchName || matchCode || matchMuni || matchBrgy || matchCourse
      }

      return true
    })

    // When priority filter is active, sort by priority score descending
    if (isPriorityFilter.value) {
      return [...list].sort(
        (a, b) => (b.totalPriorityScore ?? 0) - (a.totalPriorityScore ?? 0),
      )
    }

    return list
  })

  // Total pages
  const totalPages = computed(() => {
    return Math.ceil(filteredApplicants.value.length / pageSize.value) || 1
  })

  // Paginated records
  const paginatedApplicants = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredApplicants.value.slice(start, start + pageSize.value)
  })

  // Reset page when any filter changes
  watch(
    [searchQuery, selectedLpiiFilter, selectedStatusFilter, onlyAvailable, isPriorityFilter],
    () => {
      currentPage.value = 1
    },
  )

  function togglePriorityFilter() {
    isPriorityFilter.value = !isPriorityFilter.value
  }

  // ─── Fetch offices from directory ───
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

  // Program stipend sync
  watch(program, (newProg) => {
    if (newProg === 'DOLE') {
      if (stipend.value === '₱479.35 / day' || !stipend.value) {
        stipend.value = '₱475.00 / day'
      }
      // Try to auto-select the DOLE office from directories
      if (
        assignedOffice.value === 'Provincial PESO / PGAS Office' ||
        selectedOffice.value?.office_name === 'Provincial PESO / PGAS Office'
      ) {
        const doleOffice = offices.value.find((o) =>
          o.office_name.toUpperCase().includes('DOLE'),
        )
        if (doleOffice) {
          selectedOffice.value = doleOffice
        } else {
          assignedOffice.value = 'DOLE AgSur Provincial Field Office'
          supervisor.value = ''
        }
      }
    } else {
      if (stipend.value === '₱475.00 / day' || !stipend.value) {
        stipend.value = '₱479.35 / day'
      }
      // Try to auto-select the PESO/PGAS office from directories
      if (
        assignedOffice.value === 'DOLE AgSur Provincial Field Office' ||
        selectedOffice.value?.office_name?.toUpperCase().includes('DOLE')
      ) {
        const pgasOffice = offices.value.find(
          (o) =>
            o.office_name.toUpperCase().includes('PESO') ||
            o.office_name.toUpperCase().includes('PGAS'),
        )
        if (pgasOffice) {
          selectedOffice.value = pgasOffice
        } else {
          assignedOffice.value = 'Provincial PESO / PGAS Office'
          supervisor.value = ''
        }
      }
    }
  })

  function resetForm() {
    activeStep.value = 'select-applicant'
    searchQuery.value = ''
    selectedLpiiFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
    onlyAvailable.value = true
    isPriorityFilter.value = false
    currentPage.value = 1
    selectedApplicant.value = null
    program.value = 'PGAS'
    selectedOffice.value = null
    officeSearchQuery.value = ''
    assignedOffice.value = 'Provincial PESO / PGAS Office'
    supervisor.value = ''
    stipend.value = '₱479.35 / day'
    status.value = 'Active'
    deploymentNotes.value = ''
    validationError.value = null

    // Reset date range to current month
    const td = today(getLocalTimeZone())
    deploymentStartDate.value = new CalendarDate(td.year, td.month, 1)
    initEndDate()
  }

  // Watch modal opening to load applicants data and offices (legacy modal support)
  watch(isAddInternModalOpen, (isOpen) => {
    if (isOpen) {
      gipStore.fetchApplicantsData()
      fetchOffices()
      resetForm()
    }
  })

  // Page lifecycle initialization
  onMounted(async () => {
    if (applicants.value.length === 0) {
      await gipStore.fetchApplicantsData()
    }
    await fetchOffices()

    // Support deep-linking with ?applicantId=...
    const targetApplicantId = route.query.applicantId as string | undefined
    if (targetApplicantId) {
      const found = applicants.value.find(
        (a) => a.id === targetApplicantId || a.applicantId === targetApplicantId,
      )
      if (found) {
        selectApplicant(found)
      }
    }
  })

  function selectApplicant(applicant: GipApplicantRecord) {
    selectedApplicant.value = applicant
    validationError.value = null

    // If applicant has DOLE in remarks, auto-suggest DOLE
    const appRemarks = (applicant.remarks || []).join(' ').toUpperCase()
    if (appRemarks.includes('DOLE')) {
      program.value = 'DOLE'
      stipend.value = '₱475.00 / day'
      // Try to auto-select the DOLE office from directories
      const doleOffice = offices.value.find((o) =>
        o.office_name.toUpperCase().includes('DOLE'),
      )
      if (doleOffice) {
        selectedOffice.value = doleOffice
      } else {
        assignedOffice.value = 'DOLE AgSur Provincial Field Office'
      }
    } else {
      program.value = 'PGAS'
      stipend.value = '₱479.35 / day'
      // Try to auto-select the PESO/PGAS office from directories
      const pgasOffice = offices.value.find(
        (o) =>
          o.office_name.toUpperCase().includes('PESO') ||
          o.office_name.toUpperCase().includes('PGAS'),
      )
      if (pgasOffice) {
        selectedOffice.value = pgasOffice
      } else {
        assignedOffice.value = 'Provincial PESO / PGAS Office'
      }
    }

    activeStep.value = 'configure-deployment'
  }

  function goBack() {
    router.push({ name: 'provincial-peso-gip-details' })
  }

  function handleClose() {
    gipStore.closeAddInternModal()
    goBack()
  }

  async function handleDeployIntern() {
    validationError.value = null

    if (!selectedApplicant.value) {
      validationError.value = 'Please select an applicant to deploy.'
      activeStep.value = 'select-applicant'
      return
    }

    if (!assignedOffice.value.trim()) {
      validationError.value = 'Please specify an assigned station or office.'
      return
    }

    try {
      await gipStore.deployInternFromApplicant({
        applicationId: selectedApplicant.value.id,
        program: program.value,
        assignedOffice: assignedOffice.value.trim(),
        supervisor: supervisor.value.trim() || undefined,
        stipend: stipend.value.trim() || undefined,
        period: period.value.trim() || undefined,
        status: status.value,
        remarks: deploymentNotes.value.trim() || undefined,
      })
      // Navigate to details page upon successful deployment
      router.push({ name: 'provincial-peso-gip-details' })
    } catch (err: any) {
      validationError.value = err.message || 'Failed to deploy intern.'
    }
  }

  return {
    // State & Flags
    isOpen: computed({
      get: () => isAddInternModalOpen.value,
      set: (val: boolean) => {
        if (!val) gipStore.closeAddInternModal()
        else gipStore.openAddInternModal()
      },
    }),
    isSubmitting,
    activeStep,
    searchQuery,
    selectedLpiiFilter,
    selectedStatusFilter,
    onlyAvailable,
    isPriorityFilter,
    priorityApplicantsCount,
    currentPage,
    pageSize,
    totalPages,
    paginatedApplicants,
    selectedApplicant,
    validationError,

    // Form fields
    program,
    assignedOffice,
    supervisor,
    stipend,
    period,
    status,
    deploymentNotes,

    // Office directory
    offices,
    officeSearchQuery,
    filteredOffices,
    selectedOffice,
    isLoadingOffices,

    // Date range
    deploymentStartDate,
    deploymentEndDate,
    formattedPeriod,

    // Configs & Presets
    officePresets: GIP_OFFICE_PRESETS,
    periodPresets,
    pgasLogo,
    doleLogo,
    LPII_CONFIG,

    // Computed & Helpers
    filteredApplicants,
    isApplicantDeployed,
    getInitials,

    // Handlers
    selectApplicant,
    togglePriorityFilter,
    resetForm,
    goBack,
    handleClose,
    handleDeployIntern,
  }
}
