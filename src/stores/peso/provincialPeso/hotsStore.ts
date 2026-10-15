import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { hotsService } from '@/services/peso/provincialPeso/hotsService'
import { jobFairService } from '@/services/peso/provincialPeso/jobFairService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useJobFairAttendeeStore } from '@/stores/peso/provincialPeso/jobFairAttendeeStore'
import type {
  HotsInsert,
  JobFairRegistryApplicant,
  HotsUpdate,
  HotsVacancyOption,
  HotsWithDetails,
} from '@/types/peso/provincialPeso/jobFair'

export const useHotsStore = defineStore('pesoHots', () => {
  const toastAlert = useToastAlert()
  const attendeeStore = useJobFairAttendeeStore()

  // ─── State ───
  const jobFairId = ref<string | null>(null)
  const hires = ref<HotsWithDetails[]>([])
  const vacancyOptions = ref<HotsVacancyOption[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)

  // ─── UI Flags ───
  const isFormDialogOpen = ref(false)
  const editingHire = ref<HotsWithDetails | null>(null)
  /** Rows awaiting delete confirmation: one from a row action, or the bulk selection. */
  const hiresToDelete = shallowRef<HotsWithDetails[]>([])

  // ─── Actions ───
  async function loadHots(fairId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    if (jobFairId.value !== fairId) {
      jobFairId.value = fairId
      hires.value = []
      vacancyOptions.value = []
    }
    try {
      const [rows, vacancies] = await Promise.all([
        hotsService.fetchHots(fairId),
        hotsService.fetchVacancyOptions(fairId),
      ])
      hires.value = rows
      vacancyOptions.value = vacancies
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Vacancy options carry a hire count; refetch them so "slots left" stays accurate. */
  async function refreshVacancyOptions(): Promise<void> {
    if (!jobFairId.value) return
    try {
      vacancyOptions.value = await hotsService.fetchVacancyOptions(jobFairId.value)
    } catch {
      // Non-critical: the trigger still enforces vacancy_count on save
    }
  }

  async function createHire(payload: HotsInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await hotsService.createHots(payload)
      hires.value = [created, ...hires.value]
      isFormDialogOpen.value = false
      toastAlert.success(
        'Hire recorded',
        `${created.applicant_first_name} ${created.applicant_last_name} was hired as ${created.job_vacancies?.position_title ?? 'the vacancy'}.`
      )
      // A registry hire is marked Attended by trg_hots_mark_job_fair_attendance
      if (payload.applicant_id) attendeeStore.reloadAttendees()
      void refreshVacancyOptions()
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateHire(hotsId: string, payload: HotsUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await hotsService.updateHots(hotsId, payload)
      hires.value = hires.value.map((row) => (row.id === updated.id ? updated : row))
      isFormDialogOpen.value = false
      editingHire.value = null
      toastAlert.success('Hire updated', `${updated.applicant_first_name} ${updated.applicant_last_name}'s record has been updated.`)
      // A registry hire is marked Attended by trg_hots_mark_job_fair_attendance
      if (payload.applicant_id) attendeeStore.reloadAttendees()
      void refreshVacancyOptions()
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /** Deletes the pending hires and returns the ids actually deleted. */
  async function deleteHires(): Promise<string[]> {
    const targets = hiresToDelete.value
    if (targets.length === 0) return []

    isDeleting.value = true
    try {
      const deletedIds = new Set(await hotsService.deleteHots(targets.map((row) => row.id)))
      hires.value = hires.value.filter((row) => !deletedIds.has(row.id))
      hiresToDelete.value = []

      if (targets.length === 1 && deletedIds.size === 1) {
        const target = targets[0]!
        toastAlert.success('Hire deleted', `${target.applicant_first_name} ${target.applicant_last_name}'s record has been removed.`)
      } else if (deletedIds.size > 0) {
        toastAlert.success('Hires deleted', `${deletedIds.size} hire record(s) removed.`)
      }
      const skipped = targets.length - deletedIds.size
      if (skipped > 0) toastAlert.error(`${skipped} hire(s) not deleted`, 'Refresh the list and try again.')
      if (deletedIds.size > 0) void refreshVacancyOptions()
      return [...deletedIds]
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return []
    } finally {
      isDeleting.value = false
    }
  }

  /** Registry lookup for the hire form; errors are surfaced as a toast and yield no results. */
  async function searchRegistryApplicants(term: string): Promise<JobFairRegistryApplicant[]> {
    try {
      return await jobFairService.searchRegistryApplicants(term)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return []
    }
  }

  // ─── UI Actions ───
  function openCreateDialog() {
    editingHire.value = null
    isFormDialogOpen.value = true
  }

  function openEditDialog(row: HotsWithDetails) {
    editingHire.value = row
    isFormDialogOpen.value = true
  }

  function closeFormDialog() {
    isFormDialogOpen.value = false
    editingHire.value = null
  }

  function requestDelete(rows: HotsWithDetails[]) {
    hiresToDelete.value = rows
  }

  function cancelDelete() {
    if (isDeleting.value) return
    hiresToDelete.value = []
  }

  return {
    jobFairId,
    hires,
    vacancyOptions,
    isLoading,
    errorMessage,
    isSubmitting,
    isDeleting,
    isFormDialogOpen,
    editingHire,
    hiresToDelete,
    loadHots,
    createHire,
    updateHire,
    deleteHires,
    searchRegistryApplicants,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    requestDelete,
    cancelDelete,
  }
})
