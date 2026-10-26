import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { gipApplicationService } from '@/services/applicant/gipApplicationService'
import { gipDocumentService } from '@/services/common/gipDocumentService'
import { applicantCompletionService } from '@/services/applicant/applicantCompletionService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { GipApplicationRow, MyGipInternship } from '@/types/applicant/gipApplication'
import type {
  GipApplicantDocumentMap,
  GipPendingDocumentMap,
  GipReusedDocumentMap,
} from '@/types/common/gipProgram'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

export const useGipApplicationStore = defineStore('applicantGipApplication', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  /** The applicant's GIP application — null until they apply (or PESO refers them). */
  const myApplication = ref<GipApplicationRow | null>(null)
  /** Uploaded soft copies per document name */
  const documents = ref<GipApplicantDocumentMap>({})
  const internships = ref<MyGipInternship[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isSubmitting = ref(false)
  const isGeneratingNsrp = ref(false)
  /** Document whose saved file is being removed */
  const deletingDocument = ref<string | null>(null)

  // ─── Getters ───
  /** Uploads are allowed while Pending and not yet an intern — the rule RLS enforces (migration 060). */
  const isLocked = computed(() => {
    const application = myApplication.value
    if (!application) return false
    return (application.status ?? 'Pending') !== 'Pending' || internships.value.length > 0
  })

  // ─── Actions ───
  async function fetchMyApplication(applicantId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const application = await gipApplicationService.fetchMyApplication(applicantId)
      myApplication.value = application
      if (application) {
        const [docs, terms] = await Promise.all([
          gipDocumentService.fetchDocuments(application.id),
          gipApplicationService.fetchMyInternships(application.id),
        ])
        documents.value = docs
        internships.value = terms
      } else {
        documents.value = {}
        internships.value = []
      }
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load your GIP application')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Applies to GIP when the applicant hasn't yet, then uploads the picked soft copies and copies the
   * chosen profile documents. Returns true on success.
   */
  async function submitDocuments(
    uploaderId: string,
    pending: GipPendingDocumentMap,
    reused: GipReusedDocumentMap = {}
  ): Promise<boolean> {
    if (isLocked.value) {
      toastAlert.error('Application locked', 'Your GIP application has already been reviewed by PESO.')
      return false
    }

    const isNewApplication = !myApplication.value
    isSubmitting.value = true
    try {
      const application = myApplication.value ?? (await gipApplicationService.applyToGip())
      myApplication.value = application
      try {
        await gipDocumentService.uploadDocuments({ gipApplicantId: application.id, uploaderId, pending, reused })
      } finally {
        // Uploaded files tick the checklist (trigger in 060), so re-read both even after a failure
        const [docs, refreshed] = await Promise.all([
          gipDocumentService.fetchDocuments(application.id),
          gipApplicationService.fetchMyApplication(application.applicant_id ?? ''),
        ])
        documents.value = docs
        if (refreshed) myApplication.value = refreshed
      }

      toastAlert.success(
        isNewApplication ? 'Application submitted' : 'Documents updated',
        'PESO will review your GIP requirements and notify you of your status.'
      )
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to submit your GIP requirements'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Builds the applicant's NSRP Form 1 PDF from a fresh copy of their registry record — the same form
   * PESO generates. The PDF libraries load only when asked. Returns null on failure.
   */
  async function generateNsrpPdf(profileId: string): Promise<File | null> {
    isGeneratingNsrp.value = true
    try {
      const [record, { mapToApplicantEntryRecord }, pdf] = await Promise.all([
        applicantCompletionService.fetchMyRecord(profileId),
        import('@/helpers/peso/provincialPeso/applicantEntryHelper'),
        import('@/helpers/peso/provincialPeso/nsrpTemplateHelper'),
      ])
      if (!record) throw new Error('Your NSRP record could not be loaded.')
      return await pdf.generateNsrpFormPdfFile(mapToApplicantEntryRecord(record))
    } catch (error: unknown) {
      console.error('Failed to generate NSRP PDF:', error)
      toastAlert.error('NSRP form not generated', errorMessageOf(error, 'Please try again.'))
      return null
    } finally {
      isGeneratingNsrp.value = false
    }
  }

  /** Removes a saved file while the application is still editable; returns true on success. */
  async function deleteDocument(documentName: string): Promise<boolean> {
    const application = myApplication.value
    const document = documents.value[documentName]
    if (!application || !document || isLocked.value) return false
    deletingDocument.value = documentName
    try {
      await gipDocumentService.deleteDocument(document)
      const [docs, refreshed] = await Promise.all([
        gipDocumentService.fetchDocuments(application.id),
        gipApplicationService.fetchMyApplication(application.applicant_id ?? ''),
      ])
      documents.value = docs
      if (refreshed) myApplication.value = refreshed
      toastAlert.success('File removed', `Your ${documentName} file was removed.`)
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, `Failed to remove the ${documentName}`))
      return false
    } finally {
      deletingDocument.value = null
    }
  }

  return {
    myApplication,
    documents,
    internships,
    isLoading,
    errorMessage,
    isSubmitting,
    isLocked,
    isGeneratingNsrp,
    deletingDocument,
    fetchMyApplication,
    submitDocuments,
    generateNsrpPdf,
    deleteDocument,
  }
})
