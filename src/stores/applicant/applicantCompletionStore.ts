import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { applicantCompletionService } from '@/services/applicant/applicantCompletionService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { buildCompletionPatch } from '@/helpers/applicant/applicantCompletionHelper'
import type {
  ApplicantCompletionValues,
  ApplicantRecordInsert,
  ApplicantRecordRow,
} from '@/types/applicant/applicantCompletion'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

export const useApplicantCompletionStore = defineStore('applicantCompletion', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  // shallowRef: rows are replaced wholesale, and deep-unwrapping the Json columns overflows TS (TS2589)
  const record = shallowRef<ApplicantRecordRow | null>(null)
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Actions ───
  async function fetchMyRecord(profileId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      record.value = await applicantCompletionService.fetchMyRecord(profileId)
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load your applicant record')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Saves the whole form after each wizard step so progress survives a closed tab.
   * `reachedStep` is the furthest validated step; `isFinal` shows the completion toast.
   */
  async function saveMyRecord(
    profileId: string,
    values: ApplicantCompletionValues,
    reachedStep: number,
    isFinal: boolean,
  ): Promise<boolean> {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      const patch = buildCompletionPatch(values, reachedStep)

      let saved: ApplicantRecordRow
      if (record.value) {
        saved = await applicantCompletionService.updateMyRecord(record.value.id, patch)
      } else {
        const profile = authStore.profile
        const insert: ApplicantRecordInsert = {
          ...patch,
          profile_id: profileId,
          first_name: profile?.firstname?.trim() || '',
          middle_name: profile?.middlename?.trim() || null,
          surname: profile?.lastname?.trim() || '',
          date_of_birth: values.date_of_birth,
          email: authStore.userEmail || null,
          contact_numbers: profile?.contact_number ? [profile.contact_number] : null,
          address: {
            barangay: profile?.barangay ?? '',
            municipality: profile?.geographic ?? '',
            province: profile?.province ?? '',
            region: profile?.region ?? '',
          },
        }
        saved = await applicantCompletionService.insertMyRecord(insert)
      }

      await applicantCompletionService.syncProfileFlags(profileId, {
        is_4ps: values.is_4ps_beneficiary,
        is_pwd: values.has_disability,
      })

      record.value = saved
      authStore.setApplicantProfile(saved)
      if (isFinal) toastAlert.success('Profile completed', 'You now have full access to AGSURJOBS.')
      return true
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to save your profile')
      toastAlert.error('Save failed', errorMessage.value)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    record,
    isLoading,
    isSubmitting,
    errorMessage,
    fetchMyRecord,
    saveMyRecord,
  }
})
