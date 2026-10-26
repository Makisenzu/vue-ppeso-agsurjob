import { ref } from 'vue'
import { defineStore } from 'pinia'
import { applicationStatusService } from '@/services/applicant/applicationStatusService'
import { toApplicationSummaries } from '@/helpers/applicant/applicationStatusHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { ApplicationSummary } from '@/types/applicant/applicationStatus'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** Every application of the signed-in applicant, for the Application Status page. */
export const useApplicationStatusStore = defineStore('applicantApplicationStatus', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const applications = ref<ApplicationSummary[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Actions ───
  async function fetchApplications(applicantId: string, profileId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const rows = await applicationStatusService.fetchMyProgramApplications(applicantId, profileId)
      applications.value = toApplicationSummaries(rows)
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load your applications')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  return { applications, isLoading, errorMessage, fetchApplications }
})
