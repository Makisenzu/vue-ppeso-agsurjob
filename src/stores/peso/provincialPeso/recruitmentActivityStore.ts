import { ref } from 'vue'
import { defineStore } from 'pinia'
import { recruitmentActivityService } from '@/services/peso/provincialPeso/recruitmentActivityService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  RecruitmentActivityFormPayload,
  RecruitmentActivityListItem,
  RecruitmentActivityUpdate,
} from '@/types/peso/provincialPeso/recruitmentActivity'

export const useRecruitmentActivityStore = defineStore('pesoRecruitmentActivity', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const activities = ref<RecruitmentActivityListItem[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── UI Flags ───
  const isFormDialogOpen = ref(false)
  const editingActivity = ref<RecruitmentActivityListItem | null>(null)
  const activityToDelete = ref<RecruitmentActivityListItem | null>(null)

  // ─── Actions ───
  async function fetchActivities(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      activities.value = await recruitmentActivityService.fetchActivities()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Returns the new activity's id so the page can open it. */
  async function createActivity(payload: RecruitmentActivityFormPayload): Promise<string | null> {
    isSubmitting.value = true
    try {
      const created = await recruitmentActivityService.createActivity(payload)
      activities.value = [created, ...activities.value]
      isFormDialogOpen.value = false
      toastAlert.success('Activity created', `${created.type} for ${created.agency_name} has been created.`)
      return created.id
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateActivity(activityId: string, payload: RecruitmentActivityUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      await recruitmentActivityService.updateActivity(activityId, payload)
      const updated = await recruitmentActivityService.fetchListItem(activityId)
      activities.value = activities.value.map((row) => (row.id === updated.id ? updated : row))
      isFormDialogOpen.value = false
      editingActivity.value = null
      toastAlert.success('Activity updated', `${updated.type} for ${updated.agency_name} has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteActivity(): Promise<boolean> {
    const target = activityToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await recruitmentActivityService.deleteActivity(target.id)
      activities.value = activities.value.filter((row) => row.id !== target.id)
      activityToDelete.value = null
      toastAlert.success('Activity deleted', `${target.type} for ${target.agency_name} has been deleted.`)
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
    editingActivity.value = null
    isFormDialogOpen.value = true
  }

  function openEditDialog(row: RecruitmentActivityListItem) {
    editingActivity.value = row
    isFormDialogOpen.value = true
  }

  function closeFormDialog() {
    isFormDialogOpen.value = false
    editingActivity.value = null
  }

  function requestDelete(row: RecruitmentActivityListItem) {
    activityToDelete.value = row
  }

  function cancelDelete() {
    if (isDeleting.value) return
    activityToDelete.value = null
  }

  return {
    activities,
    isLoading,
    isSubmitting,
    isDeleting,
    errorMessage,
    isFormDialogOpen,
    editingActivity,
    activityToDelete,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    openAddDialog,
    openEditDialog,
    closeFormDialog,
    requestDelete,
    cancelDelete,
  }
})
