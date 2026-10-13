import { ref } from 'vue'
import { defineStore } from 'pinia'
import { jobFairService } from '@/services/peso/provincialPeso/jobFairService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { JobFairInsert, JobFairUpdate, JobFairWithCounts } from '@/types/peso/provincialPeso/jobFair'

export const useJobFairStore = defineStore('pesoJobFair', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const jobFairs = ref<JobFairWithCounts[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── UI Flags ───
  const isFormDialogOpen = ref(false)
  const editingJobFair = ref<JobFairWithCounts | null>(null)
  const jobFairToDelete = ref<JobFairWithCounts | null>(null)

  // ─── Actions ───
  async function fetchJobFairs(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      jobFairs.value = await jobFairService.fetchJobFairs()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  async function createJobFair(payload: JobFairInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await jobFairService.createJobFair(payload)
      jobFairs.value = [created, ...jobFairs.value]
      isFormDialogOpen.value = false
      toastAlert.success('Job fair added', `${created.title} has been created.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateJobFair(jobFairId: string, payload: JobFairUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await jobFairService.updateJobFair(jobFairId, payload)
      jobFairs.value = jobFairs.value.map((fair) => (fair.id === updated.id ? updated : fair))
      isFormDialogOpen.value = false
      editingJobFair.value = null
      toastAlert.success('Job fair updated', `${updated.title} has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteJobFair(): Promise<boolean> {
    const target = jobFairToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await jobFairService.deleteJobFair(target.id)
      jobFairs.value = jobFairs.value.filter((fair) => fair.id !== target.id)
      jobFairToDelete.value = null
      toastAlert.success('Job fair deleted', `${target.title} has been deleted.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions ───
  function openAddDialog() {
    editingJobFair.value = null
    isFormDialogOpen.value = true
  }

  function openEditDialog(row: JobFairWithCounts) {
    editingJobFair.value = row
    isFormDialogOpen.value = true
  }

  function closeFormDialog() {
    isFormDialogOpen.value = false
    editingJobFair.value = null
  }

  function requestDelete(row: JobFairWithCounts) {
    jobFairToDelete.value = row
  }

  function cancelDelete() {
    if (isDeleting.value) return
    jobFairToDelete.value = null
  }

  return {
    jobFairs,
    isLoading,
    isSubmitting,
    isDeleting,
    errorMessage,
    isFormDialogOpen,
    editingJobFair,
    jobFairToDelete,
    fetchJobFairs,
    createJobFair,
    updateJobFair,
    deleteJobFair,
    openAddDialog,
    openEditDialog,
    closeFormDialog,
    requestDelete,
    cancelDelete,
  }
})
