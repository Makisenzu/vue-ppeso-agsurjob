import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { tupadApplicationService } from '@/services/applicant/tupadApplicationService'
import { tupadDocumentService } from '@/services/common/tupadDocumentService'
import { applicantCompletionService } from '@/services/applicant/applicantCompletionService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  MyTupadEngagement,
  TupadApplicationPatch,
  TupadApplicationRow,
} from '@/types/applicant/tupadApplication'
import type { TupadApplicantDocumentMap, TupadPendingDocumentMap } from '@/types/common/tupad'
import type { TupadReusedDocumentMap } from '@/types/common/tupadProgram'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

export const useTupadApplicationStore = defineStore('applicantTupadApplication', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  /** The applicant's TUPAD application — null until they apply (or PESO refers them). */
  const myApplication = ref<TupadApplicationRow | null>(null)
  const documents = ref<TupadApplicantDocumentMap>({})
  /** Batches the applicant was added to as a beneficiary, newest first. */
  const engagements = ref<MyTupadEngagement[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isGeneratingNsrp = ref(false)
  /** Document whose saved file is being removed */
  const deletingDocument = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)

  // ─── Getters ───
  /** Editable while Pending and not yet in a batch — the same rule RLS enforces (migration 023). */
  const isLocked = computed(
    () => !!myApplication.value && (myApplication.value.status !== 'Pending' || engagements.value.length > 0)
  )

  // ─── Actions ───
  async function refreshApplication(applicantId: string): Promise<void> {
    const application = await tupadApplicationService.fetchMyApplication(applicantId)
    myApplication.value = application
    if (application) {
      const [docs, batches] = await Promise.all([
        tupadDocumentService.fetchDocuments(application.id),
        tupadApplicationService.fetchMyEngagements(application.id),
      ])
      documents.value = docs
      engagements.value = batches
    } else {
      documents.value = {}
      engagements.value = []
    }
  }

  async function fetchMyApplication(applicantId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      await refreshApplication(applicantId)
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load your TUPAD application')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Applies to TUPAD when the applicant hasn't yet, saves their household details, then uploads the
   * picked files and copies the chosen profile documents. Returns true on success.
   */
  async function submitApplication(options: {
    applicantId: string
    uploaderId: string
    details: TupadApplicationPatch
    pending: TupadPendingDocumentMap
    reused?: TupadReusedDocumentMap
  }): Promise<boolean> {
    const { applicantId, uploaderId, details, pending, reused = {} } = options
    if (isLocked.value) {
      toastAlert.error('Application locked', 'Your TUPAD application has already been reviewed by PESO.')
      return false
    }

    const isNewApplication = !myApplication.value
    isSubmitting.value = true
    try {
      const application = myApplication.value ?? (await tupadApplicationService.applyToTupad())
      myApplication.value = application
      try {
        await tupadApplicationService.updateMyApplication(application.id, details)
        await tupadDocumentService.uploadDocuments({ tupadApplicantId: application.id, uploaderId, pending, reused })
      } finally {
        // Uploaded files tick the checklist (trigger in 070), so re-read everything even after a failure
        await refreshApplication(applicantId)
      }

      toastAlert.success(
        isNewApplication ? 'Application submitted' : 'Application updated',
        'PESO will review your TUPAD requirements and notify you of your status.'
      )
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to submit your TUPAD application'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Builds the applicant's NSRP Form 1 PDF from a fresh copy of their registry record — the same form
   * PESO generates (like the GIP store). The PDF libraries load only when asked. Returns null on failure.
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
  async function deleteDocument(applicantId: string, documentName: string): Promise<boolean> {
    const document = documents.value[documentName]
    if (!myApplication.value || !document || isLocked.value) return false
    deletingDocument.value = documentName
    try {
      await tupadDocumentService.deleteDocument(document)
      await refreshApplication(applicantId)
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
    engagements,
    isLoading,
    isSubmitting,
    isGeneratingNsrp,
    deletingDocument,
    errorMessage,
    isLocked,
    fetchMyApplication,
    submitApplication,
    generateNsrpPdf,
    deleteDocument,
  }
})
