import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { spesFormService } from '@/services/applicant/spesFormService'
import { spesAttachmentService } from '@/services/common/spesAttachmentService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  SpesApplicationRecord,
  SpesDocumentAttachmentMap,
  SpesDocumentKey,
  SpesFormInsert,
  SpesFormRow,
  SpesPendingAttachmentMap,
} from '@/types/common/spesForm'

export const useSpesFormStore = defineStore('applicantSpesForm', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const myForm = ref<SpesFormRow | null>(null)
  const attachments = ref<SpesDocumentAttachmentMap>({})
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Getters ───
  /** PESO's review of the form — status / remarks live on the form itself. */
  const applicationRecord = computed<SpesApplicationRecord | null>(() => {
    const form = myForm.value
    if (!form) return null
    return { id: form.id, status: form.status, remarks: form.remarks, created_at: form.created_at, updated_at: form.updated_at }
  })

  /** PESO has finished reviewing the application, so the form can no longer be changed. */
  const isLocked = computed(() => {
    const status = (applicationRecord.value?.status ?? '').toLowerCase()
    return status === 'approved' || status === 'rejected'
  })

  // ─── Actions ───
  async function fetchMyForm(profileId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      myForm.value = await spesFormService.fetchMyForm(profileId)
      attachments.value = myForm.value ? await spesAttachmentService.fetchAttachments(myForm.value.id) : {}
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  async function saveForm(
    profileId: string,
    payload: Omit<SpesFormInsert, 'profile_id'>,
    pendingAttachments: SpesPendingAttachmentMap = {}
  ): Promise<boolean> {
    if (isLocked.value) {
      toastAlert.error('Application locked', 'Your SPES application has already been reviewed by PESO.')
      return false
    }

    isSubmitting.value = true
    try {
      const isNew = !myForm.value
      myForm.value = myForm.value
        ? await spesFormService.updateForm(myForm.value.id, payload)
        : await spesFormService.createForm({ ...payload, profile_id: profileId })

      const checked: Partial<Record<SpesDocumentKey, boolean>> = payload
      try {
        await spesAttachmentService.syncAttachments({
          formId: myForm.value.id,
          profileId,
          uploaderId: profileId,
          checked,
          pending: pendingAttachments,
        })
      } finally {
        attachments.value = await spesAttachmentService.fetchAttachments(myForm.value.id)
      }

      if (isNew) toastAlert.success('Application submitted', 'PESO will review your SPES application form.')
      else toastAlert.success('Application updated', 'Your SPES application form has been updated.')
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    myForm,
    attachments,
    applicationRecord,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    fetchMyForm,
    saveForm,
  }
})
