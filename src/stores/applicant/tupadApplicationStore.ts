import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { tupadApplicationService } from '@/services/applicant/tupadApplicationService'
import { tupadDocumentService } from '@/services/common/tupadDocumentService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  MyTupadEngagement,
  TupadApplicationPatch,
  TupadApplicationRow,
} from '@/types/applicant/tupadApplication'
import type { TupadApplicantDocumentMap, TupadPendingDocumentMap } from '@/types/common/tupad'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

export const useTupadApplicationStore = defineStore('applicantTupadApplication', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  /** The applicant's TUPAD application — null when they have not been referred to TUPAD. */
  const myApplication = ref<TupadApplicationRow | null>(null)
  const documents = ref<TupadApplicantDocumentMap>({})
  /** Batches the applicant was added to as a beneficiary, newest first. */
  const engagements = ref<MyTupadEngagement[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Getters ───
  /** Editable while Pending and not yet in a batch — the same rule RLS enforces (migration 023). */
  const isLocked = computed(
    () => !!myApplication.value && (myApplication.value.status !== 'Pending' || engagements.value.length > 0)
  )

  // ─── Actions ───
  async function fetchMyApplication(applicantId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
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
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load your TUPAD application')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  /** Uploads the picked files, then saves the checklist and details; returns true on success. */
  async function saveApplication(
    uploaderId: string,
    patch: TupadApplicationPatch,
    pending: TupadPendingDocumentMap
  ): Promise<boolean> {
    const application = myApplication.value
    if (!application) return false
    if (isLocked.value) {
      toastAlert.error('Application locked', 'Your TUPAD application has already been reviewed by PESO.')
      return false
    }

    isSubmitting.value = true
    try {
      // Files first: the documents RLS only allows writes while the application is still editable
      try {
        await tupadDocumentService.syncDocuments({
          tupadApplicantId: application.id,
          uploaderId,
          checked: patch.doc_submitted,
          pending,
        })
      } finally {
        documents.value = await tupadDocumentService.fetchDocuments(application.id)
      }

      myApplication.value = await tupadApplicationService.updateMyApplication(application.id, patch)
      toastAlert.success('Application saved', 'PESO will review your TUPAD documents.')
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to save your TUPAD application'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    myApplication,
    documents,
    engagements,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    fetchMyApplication,
    saveApplication,
  }
})
