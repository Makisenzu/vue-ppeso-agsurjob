import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DirectoryProfileRow } from '@/types/admin/systemDirectory'
import { systemDirectoryService } from '@/services/admin/systemDirectoryService'
import { useToastAlert } from '@/composables/common/useToastAlert'

export const useSystemDirectoryStore = defineStore('systemDirectory', () => {
  const toastAlert = useToastAlert()

  const records = ref<DirectoryProfileRow[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const selectedRecord = ref<DirectoryProfileRow | null>(null)
  const isDetailsOpen = ref<boolean>(false)
  const isEditStatusOpen = ref<boolean>(false)

  const fetchRecords = async () => {
    isLoading.value = true
    errorMessage.value = null
    try {
      const fetched = await systemDirectoryService.fetchAllDirectoryRecords()
      records.value = [...fetched]
    } catch (err: any) {
      const msg = err.message || 'Failed to load system directory records.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Directory', msg)
    } finally {
      isLoading.value = false
    }
  }

  const openRecordDetails = (record: DirectoryProfileRow) => {
    selectedRecord.value = record
    isDetailsOpen.value = true
  }

  const closeRecordDetails = () => {
    isDetailsOpen.value = false
  }

  const openEditStatusModal = (record: DirectoryProfileRow) => {
    selectedRecord.value = record
    isEditStatusOpen.value = true
  }

  const closeEditStatusModal = () => {
    isEditStatusOpen.value = false
  }

  const updateAccountStatus = async (profileId: string, newStatus: string) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      const updated = await systemDirectoryService.updateAccountStatus(profileId, newStatus)
      records.value = records.value.map((r) =>
        r.id === profileId ? { ...r, status: updated.status, updated_at: updated.updated_at } : r
      )
      if (selectedRecord.value?.id === profileId) {
        selectedRecord.value = {
          ...selectedRecord.value,
          status: updated.status,
          updated_at: updated.updated_at,
        }
      }
      closeEditStatusModal()
      toastAlert.success('Account Status Updated', `Status changed to ${newStatus}.`)
    } catch (err: any) {
      const msg = err.message || 'Failed to update account status.'
      errorMessage.value = msg
      toastAlert.error('Update Failed', msg)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toastAlert.info('Copied to Clipboard', 'User ID copied to clipboard.')
  }

  return {
    records,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedRecord,
    isDetailsOpen,
    isEditStatusOpen,
    fetchRecords,
    openRecordDetails,
    closeRecordDetails,
    openEditStatusModal,
    closeEditStatusModal,
    updateAccountStatus,
    copyId,
  }
})
