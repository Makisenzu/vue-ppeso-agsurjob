import { computed, ref } from 'vue'
import { useFieldValue, useSetFieldValue } from 'vee-validate'
import { useReferenceLists } from '@/composables/common/useReferenceLists'
import { MAX_RELATED_COURSES, requiresCourse } from '@/helpers/common/jobVacancyHelper'
import type { SearchSelectOption, SearchSelectValue } from '@/types/common/searchSelect'

/**
 * Course fields of a vacancy form (JobVacancyCourseFields.vue): the required course from
 * core.courses (or "None"), then optional related courses accepted besides it.
 */
export function useJobVacancyCourseFields() {
  const { vacancyCourseOptions, isLoadingReferenceLists } = useReferenceLists()

  const course = useFieldValue<string>('courseShsStrand')
  const relatedValue = useFieldValue<string[]>('relatedCourses')
  const setRelated = useSetFieldValue<string[]>('relatedCourses')

  const relatedCourses = computed(() => relatedValue.value ?? [])
  const hasCourse = computed(() => requiresCourse(course.value))
  const isRelatedFull = computed(() => relatedCourses.value.length >= MAX_RELATED_COURSES)

  const takenKeys = computed(
    () => new Set([course.value, ...relatedCourses.value].map((name) => name?.trim().toLowerCase())),
  )

  /** Listed courses not picked yet, as SearchSelect options grouped by level · field */
  const relatedCourseOptions = computed<SearchSelectOption[]>(() =>
    vacancyCourseOptions.value
      .filter((option) => !option.requiresSpecify && requiresCourse(option.name))
      .filter((option) => !takenKeys.value.has(option.name.toLowerCase()))
      .map((option) => ({
        value: option.name,
        label: option.name,
        description: option.abbreviation ?? undefined,
        group: option.group ?? undefined,
      })),
  )

  /** SearchSelect stays empty: each pick is added to the list */
  const relatedPick = ref<SearchSelectValue | null>(null)

  function addRelatedCourse(value: SearchSelectValue | null) {
    relatedPick.value = null
    const name = String(value ?? '').trim()
    if (!name || isRelatedFull.value || takenKeys.value.has(name.toLowerCase())) return
    setRelated([...relatedCourses.value, name])
  }

  function removeRelatedCourse(index: number) {
    setRelated(relatedCourses.value.filter((_, i) => i !== index))
  }

  return {
    courseOptions: vacancyCourseOptions,
    isLoadingCourses: isLoadingReferenceLists,
    hasCourse,
    relatedCourses,
    relatedCourseOptions,
    relatedPick,
    isRelatedFull,
    maxRelatedCourses: MAX_RELATED_COURSES,
    addRelatedCourse,
    removeRelatedCourse,
  }
}
