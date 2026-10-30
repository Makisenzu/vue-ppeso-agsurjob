import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useReferenceListStore } from '@/stores/common/referenceListStore'
import {
  getCourseLevel,
  toCourseOptions,
  toReligionOptions,
  toVacancyCourseOptions,
} from '@/helpers/common/referenceListHelper'
import type { CourseLevel, ReferenceOption } from '@/types/common/referenceList'

/** Religion and course choices for ReferencePicker (core.religions / core.courses). */
export function useReferenceLists() {
  const store = useReferenceListStore()
  const { religions, courses, isLoading } = storeToRefs(store)

  onMounted(() => {
    void store.loadReferenceLists()
  })

  const religionOptions = computed(() => toReligionOptions(religions.value))

  const coursesByLevel = computed(() => {
    const levels: CourseLevel[] = ['tertiary', 'graduate', 'shs_strand', 'techvoc']
    return Object.fromEntries(levels.map((level) => [level, toCourseOptions(courses.value, level)])) as Record<
      CourseLevel,
      ReferenceOption[]
    >
  })

  /** Course choices for an NSRP education level; null when the level has no courses (e.g. Elementary). */
  const getCourseOptions = (educationLevel?: string | null): ReferenceOption[] | null => {
    const level = getCourseLevel(educationLevel)
    return level ? coursesByLevel.value[level] : null
  }

  const trainingOptions = computed(() => coursesByLevel.value.techvoc)

  /** Every level for job vacancies, with "None (not required)" */
  const vacancyCourseOptions = computed(() => toVacancyCourseOptions(courses.value))

  return { religionOptions, getCourseOptions, trainingOptions, vacancyCourseOptions, isLoadingReferenceLists: isLoading }
}
