import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSkillsDemandCoursesStore } from '@/stores/peso/provincialPeso/skillsDemandCoursesStore'
import { SKILLS_TRAINING_PAGE_SIZE, courseLevelLabel } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type { SkillsDemandCoursePlace } from '@/types/peso/provincialPeso/skillsTraining'

const SUPPLY_OPTIONS = [
  { value: 'UNEMPLOYED', label: 'Unemployed Jobseekers' },
  { value: 'ALL', label: 'All Jobseekers' },
]

/**
 * Skills Demand → one course, for the whole province: its demand, supply and gap; each municipality's demand,
 * supply and surplus; and the jobseekers who have it. "Who counts" is the By Course tab's filter, so the
 * totals match the row that was opened.
 */
export function useSkillsDemandCourse() {
  const route = useRoute()
  const router = useRouter()
  const store = useSkillsDemandCoursesStore()
  const {
    filters,
    course,
    isLoadingCourse,
    courseError,
    places,
    isLoadingPlaces,
    placesError,
    suppliers,
    supplierTotal,
    supplierPage,
    supplierMunicipality,
    isLoadingSuppliers,
    suppliersError,
  } = storeToRefs(store)

  const courseKey = computed(() => {
    const key = route.params.courseKey
    return typeof key === 'string' && key.trim() ? key : null
  })

  // The course, or who is counted, changed: everything on the page is counted again
  watch(
    () => [courseKey.value, filters.value.supply] as const,
    ([key]) => key && void store.openCourse(key),
    { immediate: true },
  )

  const levelLabel = computed(() => (course.value ? courseLevelLabel(course.value) : ''))
  const stats = computed(() =>
    course.value
      ? [
          { label: 'Demand', value: course.value.demand_slots, hint: `${course.value.vacancies} vacanc${course.value.vacancies === 1 ? 'y' : 'ies'}`, alert: false },
          { label: 'Supply (Agusan del Sur)', value: course.value.applicants, hint: 'jobseekers', alert: false },
          { label: 'Gap (where needed)', value: course.value.gap, hint: 'not covered locally', alert: course.value.gap > 0 },
        ]
      : [],
  )

  // ─── By municipality ───
  /** What PESO can do in a municipality, from its own gap / surplus */
  function placeStatus(place: SkillsDemandCoursePlace): { label: string; tone: 'gap' | 'surplus' | 'even' } {
    if (place.gap > 0) return { label: `Short ${place.gap.toLocaleString()}`, tone: 'gap' }
    if (place.surplus > 0) return { label: `Can supply ${place.surplus.toLocaleString()}`, tone: 'surplus' }
    return { label: 'Covered', tone: 'even' }
  }

  /** A municipality's row lists its jobseekers below */
  function showPlaceSuppliers(place: SkillsDemandCoursePlace) {
    if (place.supply > 0) supplierMunicipality.value = place.place
  }

  // ─── Supply: the jobseekers, one page at a time ───
  const supplierMunicipalityOptions = computed(() => [
    { value: 'ALL', label: 'All of Agusan del Sur' },
    { value: 'NEEDED', label: 'Where needed' },
    ...places.value
      .filter((place) => place.supply > 0)
      .map((place) => ({ value: place.place, label: place.place, description: `${place.supply.toLocaleString()} with the course` })),
  ])

  watch(supplierMunicipality, () => courseKey.value && void store.loadSuppliers(courseKey.value, 0))

  const supplierPageCount = computed(() => Math.max(1, Math.ceil(supplierTotal.value / SKILLS_TRAINING_PAGE_SIZE)))
  const canPreviousSuppliers = computed(() => supplierPage.value > 0)
  const canNextSuppliers = computed(() => supplierPage.value + 1 < supplierPageCount.value)
  const goToSupplierPage = (pageNumber: number) => courseKey.value && void store.loadSuppliers(courseKey.value, pageNumber)
  const previousSuppliers = () => canPreviousSuppliers.value && goToSupplierPage(supplierPage.value - 1)
  const nextSuppliers = () => canNextSuppliers.value && goToSupplierPage(supplierPage.value + 1)
  const supplierRangeLabel = computed(() => {
    if (supplierTotal.value === 0) return '0 jobseekers'
    const first = supplierPage.value * SKILLS_TRAINING_PAGE_SIZE + 1
    return `${first.toLocaleString()}–${Math.min(supplierTotal.value, first + suppliers.value.length - 1).toLocaleString()} of ${supplierTotal.value.toLocaleString()}`
  })

  // ─── Navigation ───
  function goBack() {
    if (window.history.state?.back) router.back()
    else void router.push({ name: 'provincial-peso-skills-demand' })
  }

  return {
    filters,
    supplyOptions: SUPPLY_OPTIONS,
    course,
    isLoadingCourse,
    courseError,
    levelLabel,
    stats,
    places,
    isLoadingPlaces,
    placesError,
    placeStatus,
    showPlaceSuppliers,
    suppliers,
    supplierMunicipality,
    supplierMunicipalityOptions,
    isLoadingSuppliers,
    suppliersError,
    canPreviousSuppliers,
    canNextSuppliers,
    previousSuppliers,
    nextSuppliers,
    supplierRangeLabel,
    goBack,
  }
}
