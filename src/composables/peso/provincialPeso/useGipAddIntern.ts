import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { UserCheck, X } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import type { DirectoryRow } from '@/types/common/directory'
import { LPII_CONFIG, getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { formatDeploymentPeriod } from '@/composables/peso/provincialPeso/useGipBulkDeploy'
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

  /** "09/01/2026 - 02/28/2027" (MM/DD/YYYY); saved as the intern's period text */
  const formattedPeriod = computed<string>(() => formatDeploymentPeriod(deploymentStartDate.value, deploymentEndDate.value))

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

  // Selected applicants: one is a single deploy, several deploy together with the same parameters (batch)
  const selectedApplicants = ref<GipApplicantRecord[]>([])
  /** The first pick; the summary card shows it in full when only one is selected */
  const selectedApplicant = computed<GipApplicantRecord | null>(() => selectedApplicants.value[0] ?? null)
  const selectedCount = computed(() => selectedApplicants.value.length)

  // Deployment form fields (PGAS ₱479.35/day, DOLE ₱475.00/day)
  const program = ref<'PGAS' | 'DOLE'>('PGAS')
  const assignedOffice = ref<string>('')
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

  // ─── Selection (checkbox per candidate; deployed applicants can't be picked) ───
  // Picker table (DESIGN.md 13.1 exemption): the selection feeds "Continue to deployment", not bulk delete;
  // applicants are removed on the Applicants page.
  function isSelected(applicant: GipApplicantRecord): boolean {
    return selectedApplicants.value.some((a) => a.id === applicant.id)
  }

  function toggleApplicant(applicant: GipApplicantRecord, value?: boolean) {
    const shouldSelect = value ?? !isSelected(applicant)
    validationError.value = null
    if (shouldSelect) {
      if (!isSelected(applicant) && !isApplicantDeployed(applicant)) selectedApplicants.value.push(applicant)
    } else {
      selectedApplicants.value = selectedApplicants.value.filter((a) => a.id !== applicant.id)
    }
  }

  const selectableOnPage = computed(() => paginatedApplicants.value.filter((a) => !isApplicantDeployed(a)))
  const allOnPageSelected = computed<boolean | 'indeterminate'>(() => {
    const page = selectableOnPage.value
    if (page.length === 0) return false
    const picked = page.filter(isSelected).length
    if (picked === page.length) return true
    return picked > 0 ? 'indeterminate' : false
  })

  function toggleAllOnPage(value: boolean | 'indeterminate') {
    for (const applicant of selectableOnPage.value) toggleApplicant(applicant, value === true)
  }

  function clearSelection() {
    selectedApplicants.value = []
  }

  /** Step 2 with the picked applicants; PGAS unless every one of them was referred for DOLE */
  function continueToDeployment() {
    if (selectedApplicants.value.length === 0) {
      validationError.value = 'Select at least one applicant to deploy.'
      return
    }
    validationError.value = null
    selectedOffice.value = null
    assignedOffice.value = ''
    supervisor.value = ''

    const allDole = selectedApplicants.value.every((a) => (a.remarks || []).join(' ').toUpperCase().includes('DOLE'))
    program.value = allDole ? 'DOLE' : 'PGAS'
    stipend.value = allDole ? '₱475.00 / day' : '₱479.35 / day'

    activeStep.value = 'configure-deployment'
  }

  /** Removing the last one goes back to the candidate list */
  function removeSelected(applicant: GipApplicantRecord) {
    toggleApplicant(applicant, false)
    if (selectedApplicants.value.length === 0) activeStep.value = 'select-applicant'
  }

  /** Filters only; the picked applicants stay picked */
  function clearFilters() {
    searchQuery.value = ''
    selectedLpiiFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
    onlyAvailable.value = true
    isPriorityFilter.value = false
    currentPage.value = 1
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

  // Program stipend sync (program affiliation only affects payroll stipend, not office assignment)
  watch(program, (newProg) => {
    if (newProg === 'DOLE') {
      if (stipend.value === '₱479.35 / day' || !stipend.value) {
        stipend.value = '₱475.00 / day'
      }
    } else {
      if (stipend.value === '₱475.00 / day' || !stipend.value) {
        stipend.value = '₱479.35 / day'
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
    selectedApplicants.value = []
    program.value = 'PGAS'
    selectedOffice.value = null
    officeSearchQuery.value = ''
    assignedOffice.value = ''
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

  /** Deploy just this applicant (deep link ?applicantId=…) */
  function selectApplicant(applicant: GipApplicantRecord) {
    selectedApplicants.value = [applicant]
    continueToDeployment()
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

    if (selectedApplicants.value.length === 0) {
      validationError.value = 'Please select an applicant to deploy.'
      activeStep.value = 'select-applicant'
      return
    }

    if (!assignedOffice.value.trim()) {
      validationError.value = 'Please specify an assigned station or office.'
      return
    }

    const params = {
      program: program.value,
      assignedOffice: assignedOffice.value.trim(),
      supervisor: supervisor.value.trim() || undefined,
      stipend: stipend.value.trim() || undefined,
      period: period.value.trim() || undefined,
      status: status.value,
      remarks: deploymentNotes.value.trim() || undefined,
    }

    try {
      if (selectedApplicants.value.length === 1) {
        await gipStore.deployInternFromApplicant({ ...params, applicationId: selectedApplicants.value[0]!.id })
      } else {
        // Batch: everyone gets the same parameters; already-deployed applicants are skipped
        const result = await gipStore.bulkDeployInternsFromApplicants(
          selectedApplicants.value.map((a) => a.id),
          params,
        )
        if (result.successCount === 0) {
          validationError.value = result.errors[0] || 'None of the selected applicants could be deployed.'
          return
        }
      }
      // The interns page opens the Appointment Record for everyone just deployed
      router.push({ name: 'provincial-peso-gip-details' })
    } catch (err: any) {
      validationError.value = err.message || 'Failed to deploy intern.'
    }
  }

  // ─── Mobile Card View (DESIGN.md 13.2) ───
  function getCandidateCard(applicant: GipApplicantRecord): SwipeCard {
    const state = isSelected(applicant)
      ? 'Selected'
      : isApplicantDeployed(applicant) ? 'Deployed' : applicant.status || 'Pending'
    return {
      title: applicant.fullName,
      subtitle: [applicant.municipality, LPII_CONFIG[applicant.lpiiTag]?.label, `${applicant.totalPriorityScore ?? 0} pts`, state]
        .filter(Boolean)
        .join(' · '),
    }
  }

  /** Select / Unselect toggles the candidate into the batch, so the card stays; deployed ones have no action */
  function getCandidateSwipeActions(applicant: GipApplicantRecord): SwipeAction[] {
    if (isApplicantDeployed(applicant)) return []
    return isSelected(applicant)
      ? [{ id: 'unselect', label: 'Unselect', icon: X, dismiss: false, onSelect: () => toggleApplicant(applicant, false) }]
      : [{ id: 'select', label: 'Select', icon: UserCheck, dismiss: false, onSelect: () => toggleApplicant(applicant, true) }]
  }

  return {
    getCandidateCard,
    getCandidateSwipeActions,
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
    selectedApplicants,
    selectedCount,
    allOnPageSelected,
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
    isSelected,
    toggleApplicant,
    toggleAllOnPage,
    clearSelection,
    continueToDeployment,
    removeSelected,
    clearFilters,
    togglePriorityFilter,
    resetForm,
    goBack,
    handleClose,
    handleDeployIntern,
  }
}
