import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { gipApplicationService } from '@/services/applicant/gipApplicationService'
import { gipDocumentService } from '@/services/common/gipDocumentService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { GipApplicationRow, MyGipInternship } from '@/types/applicant/gipApplication'
import type { GipApplicantDocumentMap, GipPendingDocumentMap } from '@/types/common/gipProgram'

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
   * Applies to GIP when the applicant hasn't yet, then uploads the picked soft copies.
   * Returns true on success.
   */
  async function submitDocuments(uploaderId: string, pending: GipPendingDocumentMap): Promise<boolean> {
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
        await gipDocumentService.uploadDocuments({ gipApplicantId: application.id, uploaderId, pending })
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

  return {
    myApplication,
    documents,
    internships,
    isLoading,
    errorMessage,
    isSubmitting,
    isLocked,
    fetchMyApplication,
    submitDocuments,
  }
})
