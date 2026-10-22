import { defineStore } from 'pinia'
import { ref } from 'vue'
import { referenceListService } from '@/services/common/referenceListService'
import type { CourseRow, ReligionRow } from '@/types/common/referenceList'

export const useReferenceListStore = defineStore('referenceList', () => {
  // ─── State ───
  const religions = ref<ReligionRow[]>([])
  const courses = ref<CourseRow[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)

  // ─── Actions ───
  // The lists rarely change, so they load once per session. No toast on failure: the pickers
  // still accept typed values through "Others".
  const loadReferenceLists = async () => {
    if (isLoaded.value || isLoading.value) return
    isLoading.value = true
    try {
      const [religionRows, courseRows] = await Promise.all([
        referenceListService.fetchReligions(),
        referenceListService.fetchCourses(),
      ])
      religions.value = religionRows
      courses.value = courseRows
      isLoaded.value = true
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  return { religions, courses, isLoading, loadReferenceLists }
})
