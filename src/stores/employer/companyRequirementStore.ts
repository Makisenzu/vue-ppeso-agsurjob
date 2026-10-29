import { ref } from 'vue'
import { defineStore } from 'pinia'
import { companyRequirementService } from '@/services/common/companyRequirementService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { validateCompanyRequirementFile } from '@/helpers/common/companyRequirementHelper'
import type {
  CompanyRequirementItem,
  EmployerRequirementWithFiles,
  RequirementTemplate,
} from '@/types/employer/companyRequirement'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** The company owner's requirement documents (Company Profile: stepper, list and upload dialog) */
export const useCompanyRequirementStore = defineStore('employerCompanyRequirement', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const templates = ref<RequirementTemplate[]>([])
  const submissions = ref<EmployerRequirementWithFiles[]>([])
  const isLoading = ref(false)
  const isDeleting = ref(false)

  // ─── Actions ───

  async function fetchRequirements(): Promise<void> {
    const companyId = authStore.employerProfile?.id
    if (!companyId) return
    isLoading.value = true
    try {
      const [templateRows, submissionRows] = await Promise.all([
        companyRequirementService.fetchTemplates(),
        companyRequirementService.fetchCompanyRequirements(companyId),
      ])
      templates.value = templateRows
      submissions.value = submissionRows
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to load your documents.'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Files one document (the upload dialog's executor, so errors are thrown to its queue). The
   * guard trigger (079) puts the requirement back to pending for PESO review.
   */
  async function uploadDocument(item: CompanyRequirementItem, file: File): Promise<void> {
    const companyId = authStore.employerProfile?.id
    const profileId = authStore.user?.id
    if (!companyId || !profileId) throw new Error('You are signed out. Please sign in again.')

    validateCompanyRequirementFile(file)
    const requirementId = await companyRequirementService.submitRequirement(
      companyId,
      item.templateId,
      item.submission?.id ?? null,
    )
    const path = fileHelpers.generateUniquePath(`${profileId}/employer-requirements`, file.name)
    await companyRequirementService.addFile(requirementId, profileId, file, path)
  }

  /** Reloads the submissions after the dialog's uploads finish */
  async function refreshSubmissions(): Promise<void> {
    const companyId = authStore.employerProfile?.id
    if (!companyId) return
    submissions.value = await companyRequirementService.fetchCompanyRequirements(companyId)
  }

  /** Removes a document and its files, so it can be uploaded again */
  async function deleteDocument(item: CompanyRequirementItem): Promise<boolean> {
    if (!item.submission) return false
    isDeleting.value = true
    try {
      for (const file of item.files) await companyRequirementService.deleteFile(file)
      await companyRequirementService.deleteRequirement(item.submission.id)
      await refreshSubmissions()
      toastAlert.success('Document deleted successfully')
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to delete the document.'))
      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    // State
    templates,
    submissions,
    isLoading,
    isDeleting,
    // Actions
    fetchRequirements,
    uploadDocument,
    refreshSubmissions,
    deleteDocument,
  }
})
