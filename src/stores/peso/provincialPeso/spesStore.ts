import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { spesService } from '@/services/peso/provincialPeso/spesService'
import { spesAttachmentService } from '@/services/common/spesAttachmentService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatSpesFormName } from '@/helpers/peso/provincialPeso/spesHelper'
import type {
  SpesFormInsert,
  SpesFormReview,
  SpesFormRow,
  SpesFormUpdate,
  SpesInsert,
  SpesLinkableJobseeker,
  SpesUpdate,
  SpesWithApplicant,
} from '@/types/peso/provincialPeso/spes'
import type { SpesDocumentAttachmentMap, SpesDocumentKey, SpesPendingAttachmentMap } from '@/types/common/spesForm'

export const useSpesStore = defineStore('pesoSpes', () => {
  const toastAlert = useToastAlert()
  const authStore = useAuthStore()

  // ─── State ───
  /** SPES applicants — every submitted SPES form (`applicants.spes_form`). */
  const spesForms = ref<SpesFormRow[]>([])
  const spesBeneficiaries = ref<SpesWithApplicant[]>([])
  const jobseekers = ref<SpesLinkableJobseeker[]>([])

  const isLoadingForms = ref(false)
  const isLoadingBeneficiaries = ref(false)
  const isLoadingJobseekers = ref(false)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  const formsError = ref<string | null>(null)
  /** Requirement attachments of the form being viewed / reviewed / edited. */
  const formAttachments = ref<SpesDocumentAttachmentMap>({})
  const attachmentsFormId = ref<string | null>(null)
  const isLoadingAttachments = ref(false)
  const beneficiariesError = ref<string | null>(null)

  // ─── UI Flags: SPES Applicants ───
  const viewingForm = ref<SpesFormRow | null>(null)
  const reviewingForm = ref<SpesFormRow | null>(null)
  const spesFormToDelete = ref<SpesFormRow | null>(null)

  // ─── UI Flags: SPES Beneficiaries ───
  const isSpesFormOpen = ref(false)
  const editingSpes = ref<SpesWithApplicant | null>(null)
  const spesToDelete = ref<SpesWithApplicant | null>(null)

  // ─── Getters ───
  /** Approved applicants not yet enrolled — the choices for "Add Beneficiary". */
  const enrollableApplicants = computed(() => {
    const enrolled = new Set(spesBeneficiaries.value.map((spes) => spes.application_id))
    return spesForms.value.filter((form) => form.status?.toLowerCase() === 'approved' && !enrolled.has(form.id))
  })

  /** Replaces a form everywhere it is shown (applicant list and joined beneficiary rows). */
  function syncForm(updated: SpesFormRow) {
    spesForms.value = spesForms.value.map((form) => (form.id === updated.id ? updated : form))
    spesBeneficiaries.value = spesBeneficiaries.value.map((spes) =>
      spes.application_id === updated.id ? { ...spes, spes_form: updated } : spes
    )
  }

  // ─── Actions: Fetch ───
  async function fetchSpesForms(): Promise<void> {
    isLoadingForms.value = true
    formsError.value = null
    try {
      spesForms.value = await spesService.fetchSpesForms()
    } catch (error: any) {
      formsError.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingForms.value = false
    }
  }

  async function fetchSpesBeneficiaries(): Promise<void> {
    isLoadingBeneficiaries.value = true
    beneficiariesError.value = null
    try {
      spesBeneficiaries.value = await spesService.fetchSpes()
    } catch (error: any) {
      beneficiariesError.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingBeneficiaries.value = false
    }
  }

  async function fetchJobseekers(): Promise<void> {
    isLoadingJobseekers.value = true
    try {
      jobseekers.value = await spesService.fetchLinkableJobseekers()
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingJobseekers.value = false
    }
  }

  /** Loads one form for the entry page; null when it could not be loaded. */
  async function fetchSpesFormById(formId: string): Promise<SpesFormRow | null> {
    isLoadingForms.value = true
    try {
      return await spesService.fetchSpesFormById(formId)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return null
    } finally {
      isLoadingForms.value = false
    }
  }

  async function fetchFormAttachments(formId: string): Promise<void> {
    attachmentsFormId.value = formId
    formAttachments.value = {}
    isLoadingAttachments.value = true
    try {
      const attachments = await spesAttachmentService.fetchAttachments(formId)
      // Ignore a slower response for a form that is no longer open
      if (attachmentsFormId.value === formId) formAttachments.value = attachments
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      if (attachmentsFormId.value === formId) isLoadingAttachments.value = false
    }
  }

  /**
   * Uploads the picked files and drops attachments of unchecked requirements. Attachments are
   * optional for PESO, so a failure is reported without undoing the saved form.
   */
  async function syncFormAttachments(form: SpesFormRow, pendingAttachments: SpesPendingAttachmentMap) {
    try {
      const uploaderId = authStore.user?.id
      if (!uploaderId) throw new Error('Your session has expired. Sign in again to upload attachments.')
      const checked: Partial<Record<SpesDocumentKey, boolean>> = form
      await spesAttachmentService.syncAttachments({
        formId: form.id,
        profileId: form.profile_id,
        uploaderId,
        checked,
        pending: pendingAttachments,
      })
    } catch (error: any) {
      toastAlert.error('Attachments not saved', `The SPES form was saved, but its attachments were not: ${error.message}`)
    }
  }

  // ─── Actions: SPES Applicants (applicants.spes_form) ───
  async function createSpesForm(payload: SpesFormInsert, pendingAttachments: SpesPendingAttachmentMap = {}): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await spesService.createSpesForm(payload)
      spesForms.value = [created, ...spesForms.value]
      await syncFormAttachments(created, pendingAttachments)
      toastAlert.success('Applicant added', `${formatSpesFormName(created)} has been added as a SPES applicant.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateSpesForm(
    formId: string,
    payload: SpesFormUpdate,
    pendingAttachments: SpesPendingAttachmentMap = {}
  ): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await spesService.updateSpesForm(formId, payload)
      syncForm(updated)
      await syncFormAttachments(updated, pendingAttachments)
      toastAlert.success('SPES form updated', `${formatSpesFormName(updated)}'s SPES form has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function reviewSpesForm(review: SpesFormReview): Promise<boolean> {
    const target = reviewingForm.value
    if (!target) return false

    isSubmitting.value = true
    try {
      const updated = await spesService.reviewSpesForm(target.id, review)
      syncForm(updated)
      reviewingForm.value = null
      toastAlert.success('Applicant updated', `${formatSpesFormName(updated)} is now ${updated.status}.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteSpesForm(): Promise<boolean> {
    const target = spesFormToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await spesService.deleteSpesForm(target.id)
      // The beneficiary record is cascade-deleted with the form
      spesForms.value = spesForms.value.filter((form) => form.id !== target.id)
      spesBeneficiaries.value = spesBeneficiaries.value.filter((spes) => spes.application_id !== target.id)
      spesFormToDelete.value = null
      toastAlert.success('Applicant deleted', `${formatSpesFormName(target)}'s SPES application has been deleted.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Actions: SPES Beneficiaries CRUD ───
  async function createSpes(payload: SpesInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await spesService.createSpes(payload)
      spesBeneficiaries.value = [created, ...spesBeneficiaries.value]
      isSpesFormOpen.value = false
      toastAlert.success('Beneficiary added', `${formatSpesFormName(created.spes_form)} has been enrolled in SPES.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateSpes(spesId: string, payload: SpesUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await spesService.updateSpes(spesId, payload)
      spesBeneficiaries.value = spesBeneficiaries.value.map((spes) => (spes.id === updated.id ? updated : spes))
      isSpesFormOpen.value = false
      editingSpes.value = null
      toastAlert.success('Beneficiary updated', `${formatSpesFormName(updated.spes_form)} has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteSpes(): Promise<boolean> {
    const target = spesToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await spesService.deleteSpes(target.id)
      spesBeneficiaries.value = spesBeneficiaries.value.filter((spes) => spes.id !== target.id)
      spesToDelete.value = null
      toastAlert.success(
        'Beneficiary deleted',
        `${formatSpesFormName(target.spes_form)} has been removed from the SPES beneficiaries.`
      )
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions: SPES Applicants ───
  function openApplicantDetails(row: SpesFormRow) {
    viewingForm.value = row
    void fetchFormAttachments(row.id)
  }

  function closeApplicantDetails() {
    viewingForm.value = null
  }

  function openReviewDialog(row: SpesFormRow) {
    reviewingForm.value = row
    void fetchFormAttachments(row.id)
  }

  function closeReviewDialog() {
    if (isSubmitting.value) return
    reviewingForm.value = null
  }

  function requestDeleteSpesForm(row: SpesFormRow) {
    spesFormToDelete.value = row
  }

  function cancelDeleteSpesForm() {
    if (isDeleting.value) return
    spesFormToDelete.value = null
  }

  // ─── UI Actions: SPES Beneficiaries ───
  function openAddSpesDialog() {
    editingSpes.value = null
    isSpesFormOpen.value = true
  }

  function openEditSpesDialog(row: SpesWithApplicant) {
    editingSpes.value = row
    isSpesFormOpen.value = true
  }

  function closeSpesFormDialog() {
    isSpesFormOpen.value = false
    editingSpes.value = null
  }

  function requestDeleteSpes(row: SpesWithApplicant) {
    spesToDelete.value = row
  }

  function cancelDeleteSpes() {
    if (isDeleting.value) return
    spesToDelete.value = null
  }

  return {
    spesForms,
    spesBeneficiaries,
    jobseekers,
    isLoadingForms,
    isLoadingBeneficiaries,
    isLoadingJobseekers,
    isSubmitting,
    isDeleting,
    formsError,
    beneficiariesError,
    formAttachments,
    isLoadingAttachments,
    viewingForm,
    reviewingForm,
    spesFormToDelete,
    isSpesFormOpen,
    editingSpes,
    spesToDelete,
    enrollableApplicants,
    fetchSpesForms,
    fetchSpesBeneficiaries,
    fetchJobseekers,
    fetchSpesFormById,
    fetchFormAttachments,
    createSpesForm,
    updateSpesForm,
    reviewSpesForm,
    deleteSpesForm,
    createSpes,
    updateSpes,
    deleteSpes,
    openApplicantDetails,
    closeApplicantDetails,
    openReviewDialog,
    closeReviewDialog,
    requestDeleteSpesForm,
    cancelDeleteSpesForm,
    openAddSpesDialog,
    openEditSpesDialog,
    closeSpesFormDialog,
    requestDeleteSpes,
    cancelDeleteSpes,
  }
})
