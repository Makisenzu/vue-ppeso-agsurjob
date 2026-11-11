import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { skillsTrainingService } from '@/services/peso/provincialPeso/skillsTrainingService'
import { SKILLS_TRAINING_PAGE_SIZE, errorMessageOf } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type {
  SkillsDemandCourseFilters,
  SkillsDemandCoursePlace,
  SkillsDemandCourseRow,
  SkillsDemandCourseSummary,
  SkillsDemandCourseSupplier,
} from '@/types/peso/provincialPeso/skillsTraining'

const EMPTY_SUMMARY = (): SkillsDemandCourseSummary => ({
  courses_on_record: 0,
  courses_in_demand: 0,
  courses_without_supply: 0,
  total_demand: 0,
})

/**
 * Skills Demand → By Course (migration 119): for each course on the jobseekers' education records, how many
 * have it in each municipality, against the open vacancies asking for it. Counted in SQL, one page at a time.
 */
export const useSkillsDemandCoursesStore = defineStore('pesoSkillsDemandCourses', () => {
  const rows = ref<SkillsDemandCourseRow[]>([])
  const total = ref(0)
  const page = ref(0)
  const filters = reactive<SkillsDemandCourseFilters>({ search: '', level: 'ALL', municipality: 'ALL', supply: 'UNEMPLOYED' })
  const summary = ref<SkillsDemandCourseSummary>(EMPTY_SUMMARY())
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  let request = 0

  async function loadRows(): Promise<void> {
    const current = ++request
    isLoading.value = true
    loadError.value = null
    try {
      const result = await skillsTrainingService.searchDemandCourses(filters, page.value, SKILLS_TRAINING_PAGE_SIZE)
      if (current !== request) return
      rows.value = result.rows
      total.value = result.total
    } catch (error) {
      if (current === request) loadError.value = errorMessageOf(error, 'Could not load the courses.')
    } finally {
      if (current === request) isLoading.value = false
    }
  }

  /** The totals follow who counts as supply only */
  async function loadSummary(): Promise<void> {
    try {
      summary.value = await skillsTrainingService.fetchDemandCourseSummary(filters.supply)
    } catch {
      // The totals just stay as they were; the table shows the error
    }
  }

  const loadAll = () => Promise.all([loadRows(), loadSummary()])

  function setPage(value: number) {
    page.value = Math.max(0, value)
    return loadRows()
  }

  function reloadFromStart() {
    page.value = 0
    return loadRows()
  }

  // ─── One course (its own page): the whole province, broken down by municipality ───
  const course = ref<SkillsDemandCourseRow | null>(null)
  const isLoadingCourse = ref(false)
  const courseError = ref<string | null>(null)
  let courseRequest = 0

  async function loadCourse(courseKey: string): Promise<void> {
    const current = ++courseRequest
    if (course.value?.course_key !== courseKey) course.value = null
    isLoadingCourse.value = true
    courseError.value = null
    try {
      const row = await skillsTrainingService.fetchDemandCourse(courseKey, filters.supply)
      if (current !== courseRequest) return
      course.value = row
      if (!row) courseError.value = 'No jobseeker or open vacancy has this course.'
    } catch (error) {
      if (current === courseRequest) courseError.value = errorMessageOf(error, 'Could not load the course.')
    } finally {
      if (current === courseRequest) isLoadingCourse.value = false
    }
  }

  const places = ref<SkillsDemandCoursePlace[]>([])
  const isLoadingPlaces = ref(false)
  const placesError = ref<string | null>(null)
  let placesRequest = 0

  async function loadPlaces(courseKey: string): Promise<void> {
    const current = ++placesRequest
    isLoadingPlaces.value = true
    placesError.value = null
    try {
      const rowsByPlace = await skillsTrainingService.fetchDemandCoursePlaces(courseKey, filters.supply)
      if (current === placesRequest) places.value = rowsByPlace
    } catch (error) {
      if (current === placesRequest) placesError.value = errorMessageOf(error, 'Could not load the municipalities.')
    } finally {
      if (current === placesRequest) isLoadingPlaces.value = false
    }
  }

  // ─── Who has one course ───
  const suppliers = ref<SkillsDemandCourseSupplier[]>([])
  const supplierTotal = ref(0)
  const supplierPage = ref(0)
  const isLoadingSuppliers = ref(false)
  const suppliersError = ref<string | null>(null)
  /** 'NEEDED' (the municipalities whose vacancies ask for it), 'ALL' (the province) or a municipality name */
  const supplierMunicipality = ref('ALL')
  let suppliersRequest = 0

  async function loadSuppliers(courseKey: string, pageNumber = 0): Promise<void> {
    const current = ++suppliersRequest
    supplierPage.value = Math.max(0, pageNumber)
    if (supplierPage.value === 0) {
      suppliers.value = []
      supplierTotal.value = 0
    }
    isLoadingSuppliers.value = true
    suppliersError.value = null
    try {
      const result = await skillsTrainingService.searchDemandCourseSupply(
        courseKey,
        supplierMunicipality.value,
        filters.supply,
        supplierPage.value,
        SKILLS_TRAINING_PAGE_SIZE,
      )
      if (current !== suppliersRequest) return
      suppliers.value = result.rows
      supplierTotal.value = result.total
    } catch (error) {
      if (current === suppliersRequest) suppliersError.value = errorMessageOf(error, 'Could not load the jobseekers.')
    } finally {
      if (current === suppliersRequest) isLoadingSuppliers.value = false
    }
  }

  /** Everything the course page shows; the jobseekers list starts on the whole province */
  function openCourse(courseKey: string) {
    if (course.value?.course_key !== courseKey) places.value = []
    supplierMunicipality.value = 'ALL'
    return Promise.all([loadCourse(courseKey), loadPlaces(courseKey), loadSuppliers(courseKey)])
  }

  return {
    rows,
    total,
    page,
    filters,
    summary,
    isLoading,
    loadError,
    loadRows,
    loadSummary,
    loadAll,
    setPage,
    reloadFromStart,
    course,
    isLoadingCourse,
    courseError,
    openCourse,
    places,
    isLoadingPlaces,
    placesError,
    suppliers,
    supplierTotal,
    supplierPage,
    isLoadingSuppliers,
    suppliersError,
    supplierMunicipality,
    loadSuppliers,
  }
})
