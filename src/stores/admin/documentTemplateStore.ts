import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  DocumentTemplateRow,
  DocumentTemplateInsert,
  DocumentTemplateUpdate,
} from '@/types/admin/documentTemplate'
import {
  fetchDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplateFileUrl,
  DOCUMENT_TEMPLATE_CACHE_KEY,
} from '@/services/admin/documentTemplateService'
import { getPersistentCacheValue } from '@/helpers/common/persistentCache'
import { useToastAlert } from '@/composables/common/useToastAlert'

export const useDocumentTemplateStore = defineStore('documentTemplate', () => {
  const toastAlert = useToastAlert()

  const templates = ref<DocumentTemplateRow[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  const loadTemplates = async () => {
    errorMessage.value = null

    const cachedTemplates = getPersistentCacheValue<DocumentTemplateRow[]>(DOCUMENT_TEMPLATE_CACHE_KEY)
    if (cachedTemplates !== null) {
      templates.value = cachedTemplates
    }

    isLoading.value = cachedTemplates === null

    try {
      templates.value = await fetchDocumentTemplates()
    } catch (err: any) {
      const msg = err.message || 'Failed to load document templates.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Templates', msg)
    } finally {
      isLoading.value = false
    }
  }

  const saveTemplate = async (
    payload: Omit<DocumentTemplateInsert, 'file_path' | 'file_name' | 'file_size' | 'mime_type'>,
    file?: File | null,
    editingId?: number | null,
    oldFilePath?: string | null
  ) => {
    isSubmitting.value = true
    errorMessage.value = null
    successMessage.value = null

    try {
      if (editingId) {
        // Update document template
        const updatePayload: DocumentTemplateUpdate = {
          title: payload.title,
          description: payload.description,
          category: payload.category,
          target_role: payload.target_role,
          is_active: payload.is_active,
        }
        await updateDocumentTemplate(editingId, updatePayload, file, oldFilePath)
        const msg = 'Document template updated successfully.'
        successMessage.value = msg
        toastAlert.success('Template Updated', msg)
      } else {
        // Create new document template with file upload to 'templates' bucket
        await createDocumentTemplate(payload, file)
        const msg = 'Document template created and uploaded successfully.'
        successMessage.value = msg
        toastAlert.success('Template Uploaded', msg)
      }

      await loadTemplates()
      return true
    } catch (err: any) {
      const msg = err.message || 'Failed to save document template.'
      errorMessage.value = msg
      toastAlert.error('Save Failed', msg)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const removeTemplate = async (id: number, filePath?: string | null) => {
    isSubmitting.value = true
    errorMessage.value = null
    successMessage.value = null
    try {
      await deleteDocumentTemplate(id, filePath)
      const msg = 'Document template deleted successfully.'
      successMessage.value = msg
      toastAlert.success('Template Deleted', msg)
      await loadTemplates()
      return true
    } catch (err: any) {
      const msg = err.message || 'Failed to delete document template.'
      errorMessage.value = msg
      toastAlert.error('Delete Failed', msg)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const toggleStatus = async (tmpl: DocumentTemplateRow) => {
    try {
      await updateDocumentTemplate(tmpl.id, { is_active: !tmpl.is_active })
      toastAlert.success(
        'Status Updated',
        `Template "${tmpl.title}" is now ${!tmpl.is_active ? 'Active' : 'Inactive'}.`
      )
      await loadTemplates()
    } catch (err: any) {
      const msg = err.message || 'Failed to update status.'
      errorMessage.value = msg
      toastAlert.error('Update Failed', msg)
    }
  }

  const downloadTemplate = async (tmpl: DocumentTemplateRow) => {
    if (!tmpl.file_path) {
      toastAlert.error('No File', 'No file attached to this template.')
      return
    }

    try {
      const url = await getDocumentTemplateFileUrl(tmpl.file_path)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.download = tmpl.file_name || 'document_template'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toastAlert.success('Downloading File', `Starting download for ${tmpl.file_name || tmpl.title}`)
    } catch (err: any) {
      const msg = err.message || 'Failed to download document template.'
      errorMessage.value = msg
      toastAlert.error('Download Failed', msg)
    }
  }

  return {
    templates,
    isLoading,
    isSubmitting,
    errorMessage,
    successMessage,
    loadTemplates,
    saveTemplate,
    removeTemplate,
    toggleStatus,
    downloadTemplate,
  }
})
