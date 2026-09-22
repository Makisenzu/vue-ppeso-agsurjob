import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import { LPII_CONFIG, getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
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
  const gipStore = useGipStore()
  const { isAddInternModalOpen, applicants, interns, isSubmitting } = storeToRefs(gipStore)

  const currentYear = new Date().getFullYear()

  const periodPresets = [
    `Jan ${currentYear} - Jun ${currentYear}`,
    `Jul ${currentYear} - Dec ${currentYear}`,
    `Batch ${currentYear} (3 Months)`,
    `Batch ${currentYear} (6 Months)`,
  ]

  // Step management: 'select-applicant' | 'configure-deployment'
  const activeStep = ref<'select-applicant' | 'configure-deployment'>('select-applicant')

  // Search & filtering inside dialog
  const searchQuery = ref<string>('')
  const selectedLpiiFilter = ref<string>('ALL')
  const selectedStatusFilter = ref<string>('ALL')
  const onlyAvailable = ref<boolean>(true)

  // Selected applicant
  const selectedApplicant = ref<GipApplicantRecord | null>(null)

  // Deployment form fields (PGAS ₱479.35/day, DOLE ₱475.00/day)
  const program = ref<'PGAS' | 'DOLE'>('PGAS')
  const assignedOffice = ref<string>('Provincial PESO / PGAS Office')
  const supervisor = ref<string>('')
  const stipend = ref<string>('₱479.35 / day')
  const period = ref<string>(`Jan ${currentYear} - Jun ${currentYear}`)
  const status = ref<string>('Active')
  const deploymentNotes = ref<string>('')
  const validationError = ref<string | null>(null)

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

  // Filtered applicants list
  const filteredApplicants = computed(() => {
    return applicants.value.filter((app) => {
      // Only available toggle
      if (onlyAvailable.value && isApplicantDeployed(app)) {
        return false
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
  })

  // Program stipend sync
  watch(program, (newProg) => {
    if (newProg === 'DOLE') {
      if (stipend.value === '₱479.35 / day' || !stipend.value) {
        stipend.value = '₱475.00 / day'
      }
      if (assignedOffice.value === 'Provincial PESO / PGAS Office') {
        assignedOffice.value = 'DOLE AgSur Provincial Field Office'
      }
    } else {
      if (stipend.value === '₱475.00 / day' || !stipend.value) {
        stipend.value = '₱479.35 / day'
      }
      if (assignedOffice.value === 'DOLE AgSur Provincial Field Office') {
        assignedOffice.value = 'Provincial PESO / PGAS Office'
      }
    }
  })

  function resetForm() {
    activeStep.value = 'select-applicant'
    searchQuery.value = ''
    selectedLpiiFilter.value = 'ALL'
    selectedStatusFilter.value = 'ALL'
    onlyAvailable.value = true
    selectedApplicant.value = null
    program.value = 'PGAS'
    assignedOffice.value = 'Provincial PESO / PGAS Office'
    supervisor.value = ''
    stipend.value = '₱479.35 / day'
    period.value = `Jan ${currentYear} - Jun ${currentYear}`
    status.value = 'Active'
    deploymentNotes.value = ''
    validationError.value = null
  }

  // Watch modal opening to load applicants data
  watch(isAddInternModalOpen, (isOpen) => {
    if (isOpen) {
      gipStore.fetchApplicantsData()
      resetForm()
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
      assignedOffice.value = 'DOLE AgSur Provincial Field Office'
    } else {
      program.value = 'PGAS'
      stipend.value = '₱479.35 / day'
      assignedOffice.value = 'Provincial PESO / PGAS Office'
    }

    activeStep.value = 'configure-deployment'
  }

  function handleClose() {
    gipStore.closeAddInternModal()
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
    resetForm,
    handleClose,
    handleDeployIntern,
  }
}
