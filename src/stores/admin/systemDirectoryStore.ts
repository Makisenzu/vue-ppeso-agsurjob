import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DirectoryProfileRow } from '@/types/admin/systemDirectory'
import type { SubmittedDocument } from '@/types/admin/systemDirectory'
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
  const isEditDocStatusOpen = ref<boolean>(false)
  const selectedDocument = ref<SubmittedDocument | null>(null)

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

  const openEditDocumentStatusModal = (record: DirectoryProfileRow, document: SubmittedDocument) => {
    selectedRecord.value = record
    selectedDocument.value = document
    isEditDocStatusOpen.value = true
  }

  const closeEditDocumentStatusModal = () => {
    isEditDocStatusOpen.value = false
    selectedDocument.value = null
  }

  const updateDocumentStatus = async (profileId: string, documentId: number, newStatus: string, isApplicantDoc: boolean) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      await systemDirectoryService.updateDocumentStatus(documentId, newStatus, isApplicantDoc)

      // Update local state
      const recordIndex = records.value.findIndex((r) => r.id === profileId)
      if (recordIndex !== -1) {
        const record = records.value[recordIndex]
        if (record.documents) {
          const docIndex = record.documents.findIndex((d) => d.id === documentId)
          if (docIndex !== -1) {
            record.documents[docIndex].status = newStatus
            records.value[recordIndex] = { ...record }
          }
        }
      }

      if (selectedRecord.value?.id === profileId && selectedDocument.value?.id === documentId) {
        selectedDocument.value.status = newStatus
      }

      closeEditDocumentStatusModal()
      toastAlert.success('Document Status Updated', `File status changed to ${newStatus}.`)
    } catch (err: any) {
      const msg = err.message || 'Failed to update document status.'
      errorMessage.value = msg
      toastAlert.error('Update Failed', msg)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    records,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedRecord,
    isDetailsOpen,
    isEditStatusOpen,
    isEditDocStatusOpen,
    selectedDocument,
    fetchRecords,
    openRecordDetails,
    closeRecordDetails,
    openEditStatusModal,
    closeEditStatusModal,
    updateAccountStatus,
    openEditDocumentStatusModal,
    closeEditDocumentStatusModal,
    updateDocumentStatus,
    copyId,
  }
})
