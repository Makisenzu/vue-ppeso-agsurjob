import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import type { GipInternRecord, GipProgram } from '@/types/peso/provincialPeso/gip'
import {
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
} from '@/helpers/peso/provincialPeso/gipHelper'
import { GIP_OFFICE_PRESETS } from '@/composables/peso/provincialPeso/useGipAddIntern'

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
    }
  }

  function openInternEdit(intern: GipInternRecord) {
    openInternDetails(intern)
    startEdit()
  }

  function cancelEdit() {
    cancelEditMode()
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
    fetchApplicantsData,
    createGipApplication,
    createGipDeployment,
  }
}
