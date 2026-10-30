import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { jobVacancyApplicationService } from '@/services/applicant/jobVacancyApplicationService'
import { jobApplicationDocumentService } from '@/services/common/jobApplicationDocumentService'
import { applicantCompletionService } from '@/services/applicant/applicantCompletionService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { VacancyDetails } from '@/types/applicant/jobVacancyApplication'
import type {
  JobApplicationDocumentMap,
  JobApplicationPendingDocumentMap,
  JobApplicationReusedDocumentMap,
  JobVacancyApplicationRow,
} from '@/types/common/jobVacancyApplication'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** The applicant's application to one job vacancy (like the TUPAD application store) */
export const useJobVacancyApplicationStore = defineStore('applicantJobVacancyApplication', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const vacancy = ref<VacancyDetails | null>(null)
  /** Null until the applicant applies */
  const myApplication = ref<JobVacancyApplicationRow | null>(null)
  const documents = ref<JobApplicationDocumentMap>({})
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isGeneratingNsrp = ref(false)
  /** Document whose saved file is being removed */
  const deletingDocument = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)

  // ─── Getters ───
  /** Editable until the employer moves it past `applied` — the same rule RLS enforces (migration 087) */
  const isLocked = computed(() => !!myApplication.value && myApplication.value.stage !== 'applied')

  // ─── Actions ───
  async function refreshApplication(vacancyId: string, applicantId: string): Promise<void> {
    const application = await jobVacancyApplicationService.fetchMyApplication(vacancyId, applicantId)
    myApplication.value = application
    documents.value = application ? await jobApplicationDocumentService.fetchDocuments(application.id) : {}
  }

  async function load(vacancyId: string, applicantId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const [details] = await Promise.all([
        jobVacancyApplicationService.fetchVacancy(vacancyId),
        refreshApplication(vacancyId, applicantId),
      ])
      vacancy.value = details
      if (!details) errorMessage.value = 'This vacancy is no longer accepting applications.'
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load the job vacancy')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  /** Applies when the applicant hasn't yet, then uploads the picked files. Returns true on success. */
  async function submitApplication(options: {
    vacancyId: string
    applicantId: string
    uploaderId: string
    pending: JobApplicationPendingDocumentMap
    reused?: JobApplicationReusedDocumentMap
  }): Promise<boolean> {
    const { vacancyId, applicantId, uploaderId, pending, reused = {} } = options
    if (isLocked.value) {
      toastAlert.error('Application locked', 'The employer has already reviewed your application.')
      return false
    }

    const isNewApplication = !myApplication.value
    isSubmitting.value = true
    try {
      const application = myApplication.value ?? (await jobVacancyApplicationService.apply(vacancyId))
      myApplication.value = application
      try {
        await jobApplicationDocumentService.uploadDocuments({ applicationId: application.id, uploaderId, pending, reused })
      } finally {
        // Re-read even after a failed upload: the application exists either way
        await refreshApplication(vacancyId, applicantId)
      }

      toastAlert.success(
        isNewApplication ? 'Application submitted' : 'Application updated',
        'The employer will review it and you will be notified of any update.'
      )
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to submit your application'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Builds the applicant's NSRP Form 1 PDF from a fresh copy of their registry record (like the GIP
   * and TUPAD stores). The PDF libraries load only when asked. Returns null on failure.
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

  /** Removes a saved file while the application is still editable; returns true on success */
  async function deleteDocument(vacancyId: string, applicantId: string, documentName: string): Promise<boolean> {
    const document = documents.value[documentName]
    if (!myApplication.value || !document || isLocked.value) return false
    deletingDocument.value = documentName
    try {
      await jobApplicationDocumentService.deleteDocument(document)
      await refreshApplication(vacancyId, applicantId)
      toastAlert.success('File removed', `Your ${documentName} file was removed.`)
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, `Failed to remove the ${documentName}`))
      return false
    } finally {
      deletingDocument.value = null
    }
  }

  function reset() {
    vacancy.value = null
    myApplication.value = null
    documents.value = {}
    errorMessage.value = null
  }

  return {
    vacancy,
    myApplication,
    documents,
    isLoading,
    isSubmitting,
    isGeneratingNsrp,
    deletingDocument,
    errorMessage,
    isLocked,
    load,
    submitApplication,
    generateNsrpPdf,
    deleteDocument,
    reset,
  }
})
