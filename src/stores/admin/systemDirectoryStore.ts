import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DirectoryProfileRow, SubmittedDocument } from '@/types/admin/systemDirectory'
import { systemDirectoryService } from '@/services/admin/systemDirectoryService'
import { getPersistentCacheValue, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import { useToastAlert } from '@/composables/common/useToastAlert'

const SYSTEM_DIRECTORY_CACHE_KEY = 'admin:system-directory:records'

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
    errorMessage.value = null

    const cachedRecords = getPersistentCacheValue<DirectoryProfileRow[]>(SYSTEM_DIRECTORY_CACHE_KEY)
    if (cachedRecords !== null) {
      records.value = cachedRecords
    }

    isLoading.value = cachedRecords === null

    try {
      const fetched = await systemDirectoryService.fetchAllDirectoryRecords(false)
      records.value = [...fetched]
    } catch (err: any) {
      const msg = err.message || 'Failed to load system directory records.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Directory', msg)
    } finally {
      isLoading.value = false
    }
  }

  const refreshRecords = async () => {
    errorMessage.value = null
    isLoading.value = true

    try {
      const fetched = await systemDirectoryService.fetchAllDirectoryRecords(true)
      records.value = [...fetched]
      toastAlert.success('Data Refreshed', 'Directory records have been refreshed.')
    } catch (err: any) {
      const msg = err.message || 'Failed to refresh system directory records.'
      errorMessage.value = msg
      toastAlert.error('Refresh Failed', msg)
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

      // 1. Immutable array update for TanStack Table
      records.value = records.value.map((r) =>
        r.id === profileId ? { ...r, status: updated.status, updated_at: updated.updated_at } : r
      )

      // 2. Keep open details modal synchronized
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

  const updateDocumentStatus = async (
    profileId: string,
    documentId: number,
    newStatus: string,
    isApplicantDoc: boolean
  ) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      await systemDirectoryService.updateDocumentStatus(documentId, newStatus, isApplicantDoc)

      // 1. Deep-update main records array (Triggers main table re-render)
      records.value = records.value.map((record) => {
        if (record.id !== profileId) return record

        const updatedDocs = (record.documents || []).map((doc) => {
          if (doc.id === documentId) {
            return { ...doc, status: newStatus }
          }
          return doc
        })

        return {
          ...record,
          documents: updatedDocs,
        }
      })

      // 2. Synchronize active selectedRecord (Triggers Details Modal re-render)
      if (selectedRecord.value && selectedRecord.value.id === profileId) {
        const updatedSelectedDocs = (selectedRecord.value.documents || []).map((doc) => {
          if (doc.id === documentId) {
            return { ...doc, status: newStatus }
          }
          return doc
        })

        selectedRecord.value = {
          ...selectedRecord.value,
          documents: updatedSelectedDocs,
        }
      }

      // 3. Synchronize active selectedDocument
      if (selectedDocument.value && selectedDocument.value.id === documentId) {
        selectedDocument.value = {
          ...selectedDocument.value,
          status: newStatus,
        }
      }

      // 4. Refetch records in background to ensure all calculated statuses (e.g. account profile status or company verification status) are synced with DB
      fetchRecords()

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

  const viewSubmittedFile = (doc: SubmittedDocument) => {
    return systemDirectoryService.viewSubmittedFile(doc)
  }

  const downloadSubmittedFile = (doc: SubmittedDocument) => {
    return systemDirectoryService.downloadSubmittedFile(doc)
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
    refreshRecords,
    openRecordDetails,
    closeRecordDetails,
    openEditStatusModal,
    closeEditStatusModal,
    updateAccountStatus,
    openEditDocumentStatusModal,
    closeEditDocumentStatusModal,
    updateDocumentStatus,
    copyId,
    viewSubmittedFile,
    downloadSubmittedFile,
  }
})