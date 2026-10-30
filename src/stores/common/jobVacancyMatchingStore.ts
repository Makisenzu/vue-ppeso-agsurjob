import { ref } from 'vue'
import { defineStore } from 'pinia'
import { jobVacancyMatchingService } from '@/services/common/jobVacancyMatchingService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { JobVacancyMatching } from '@/types/common/jobVacancy'

const EMPTY_MATCHING: JobVacancyMatching = { skills: [], related_courses: [] }

/**
 * Loads the skills / related courses of the vacancy a PESO form is editing (job fair, recruitment
 * activity); the form stores save them after the vacancy itself (saveMatching).
 */
export const useJobVacancyMatchingStore = defineStore('jobVacancyMatching', () => {
  const toastAlert = useToastAlert()

  const isLoading = ref(false)

  /** Never throws: a failed load opens the form with no skills and says so */
  async function loadMatching(vacancyId: string): Promise<JobVacancyMatching> {
    isLoading.value = true
    try {
      return await jobVacancyMatchingService.fetchMatching(vacancyId)
    } catch {
      toastAlert.error('Error', "Failed to load this vacancy's skills.")
      return { ...EMPTY_MATCHING, skills: [], related_courses: [] }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Saves after the vacancy is saved. Returns false (with a toast) when only this part failed, so
   * the caller can keep the form open for a retry.
   */
  async function saveMatching(vacancyId: string, matching: JobVacancyMatching): Promise<boolean> {
    try {
      await jobVacancyMatchingService.saveMatching(vacancyId, matching)
      return true
    } catch {
      toastAlert.error('Skills not saved', 'The vacancy was saved, but not its skills. Edit it to add them.')
      return false
    }
  }

  return { isLoading, loadMatching, saveMatching }
})
