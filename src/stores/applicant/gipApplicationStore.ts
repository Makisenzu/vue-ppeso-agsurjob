import { ref } from 'vue'
import { defineStore } from 'pinia'
import { gipApplicationService } from '@/services/applicant/gipApplicationService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { GipApplicationRow, MyGipInternship } from '@/types/applicant/gipApplication'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

export const useGipApplicationStore = defineStore('applicantGipApplication', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  /** The applicant's GIP application — null when PESO has not referred them to GIP. */
  const myApplication = ref<GipApplicationRow | null>(null)
  const internships = ref<MyGipInternship[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Actions ───
  async function fetchMyApplication(applicantId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const application = await gipApplicationService.fetchMyApplication(applicantId)
      myApplication.value = application
      internships.value = application ? await gipApplicationService.fetchMyInternships(application.id) : []
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to load your GIP application')
      toastAlert.error('Error', errorMessage.value)
    } finally {
      isLoading.value = false
    }
  }

  return {
    myApplication,
    internships,
    isLoading,
    errorMessage,
    fetchMyApplication,
  }
})
