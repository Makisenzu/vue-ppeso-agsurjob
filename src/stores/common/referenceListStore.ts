import { defineStore } from 'pinia'
import { ref } from 'vue'
import { referenceListService } from '@/services/common/referenceListService'
import type { CourseRow, EligibilityRow, ReligionRow } from '@/types/common/referenceList'

export const useReferenceListStore = defineStore('referenceList', () => {
  // ─── State ───
  const religions = ref<ReligionRow[]>([])
  const courses = ref<CourseRow[]>([])
  const eligibilities = ref<EligibilityRow[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)

  // ─── Actions ───
  // The lists rarely change, so they load once per session. No toast on failure: the pickers
  // still accept typed values through "Others".
  const loadReferenceLists = async () => {
    if (isLoaded.value || isLoading.value) return
    isLoading.value = true
    try {
      // Eligibilities fail on their own (e.g. before migration 094) without emptying the other lists
      const [religionRows, courseRows, eligibilityRows] = await Promise.all([
        referenceListService.fetchReligions(),
        referenceListService.fetchCourses(),
        referenceListService.fetchEligibilities().catch((error) => {
          console.error(error)
          return []
        }),
      ])
      religions.value = religionRows
      courses.value = courseRows
      eligibilities.value = eligibilityRows
      isLoaded.value = true
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  return { religions, courses, eligibilities, isLoading, loadReferenceLists }
})
