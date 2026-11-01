import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useReferenceListStore } from '@/stores/common/referenceListStore'
import {
  getCourseLevel,
  toCourseOptions,
  toReligionOptions,
  toVacancyCourseOptions,
  toVacancyEligibilityOptions,
  toEligibilityTitleOptions,
} from '@/helpers/common/referenceListHelper'
import type { CourseLevel, ReferenceOption } from '@/types/common/referenceList'

/** Religion and course choices for ReferencePicker (core.religions / core.courses). */
export function useReferenceLists() {
  const store = useReferenceListStore()
  const { religions, courses, eligibilities, isLoading } = storeToRefs(store)

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

  /** Eligibility and license choices for job vacancies (core.eligibilities), with "None" */
  const vacancyEligibilityOptions = computed(() => toVacancyEligibilityOptions(eligibilities.value, 'eligibility'))
  const vacancyLicenseOptions = computed(() => toVacancyEligibilityOptions(eligibilities.value, 'license'))

  /** Eligibilities and licenses together, for an applicant's NSRP eligibility rows */
  const eligibilityTitleOptions = computed(() => toEligibilityTitleOptions(eligibilities.value))

  return {
    religionOptions,
    eligibilityTitleOptions,
    getCourseOptions,
    trainingOptions,
    vacancyCourseOptions,
    vacancyEligibilityOptions,
    vacancyLicenseOptions,
    isLoadingReferenceLists: isLoading,
  }
}
