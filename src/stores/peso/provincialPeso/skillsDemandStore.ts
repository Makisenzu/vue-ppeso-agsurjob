import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { skillsTrainingService } from '@/services/peso/provincialPeso/skillsTrainingService'
import { SKILLS_TRAINING_PAGE_SIZE, errorMessageOf } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type {
  SkillsDemandFilters,
  SkillsDemandPlace,
  SkillsDemandRow,
  SkillsDemandSummary,
  SkillsDemandSupplier,
  SkillsDemandVacancy,
  SkillsTraining,
} from '@/types/peso/provincialPeso/skillsTraining'

const EMPTY_SUMMARY = (): SkillsDemandSummary => ({
  skills_in_demand: 0,
  skills_with_gap: 0,
  total_demand: 0,
  total_gap: 0,
  categories: [],
  unlinked_wordings: 0,
})

/**
 * Skills Training → Skills Demand (migration 118): for each skill open vacancies require, the slots against
 * the jobseekers who have it. Counted in SQL; the browser holds one page and the totals.
 */
export const useSkillsDemandStore = defineStore('pesoSkillsDemand', () => {
  const rows = ref<SkillsDemandRow[]>([])
  const total = ref(0)
  const page = ref(0)
  const filters = reactive<SkillsDemandFilters>({ search: '', municipality: 'ALL', category: 'ALL', supply: 'UNEMPLOYED', onlyGaps: false })
  const summary = ref<SkillsDemandSummary>(EMPTY_SUMMARY())
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  let request = 0

  async function loadRows(): Promise<void> {
    const current = ++request
    isLoading.value = true
    loadError.value = null
    try {
      const result = await skillsTrainingService.searchDemand(filters, page.value, SKILLS_TRAINING_PAGE_SIZE)
      if (current !== request) return
      rows.value = result.rows
      total.value = result.total
    } catch (error) {
      if (current === request) loadError.value = errorMessageOf(error, 'Could not load the skills demand.')
    } finally {
      if (current === request) isLoading.value = false
    }
  }

  /** The totals follow the municipality and who counts as supply, not the search or category */
  async function loadSummary(): Promise<void> {
    try {
      summary.value = await skillsTrainingService.fetchDemandSummary(filters.municipality, filters.supply)
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

  // ─── One skill (its own page): the whole province, broken down by municipality ───
  const skill = ref<SkillsDemandRow | null>(null)
  const isLoadingSkill = ref(false)
  const skillError = ref<string | null>(null)
  let skillRequest = 0

  async function loadSkill(skillId: number): Promise<void> {
    const current = ++skillRequest
    if (skill.value?.skill_id !== skillId) skill.value = null
    isLoadingSkill.value = true
    skillError.value = null
    try {
      const row = await skillsTrainingService.fetchDemandSkill(skillId, 'ALL', filters.supply)
      if (current !== skillRequest) return
      skill.value = row
      if (!row) skillError.value = 'No open vacancy requires this skill.'
    } catch (error) {
      if (current === skillRequest) skillError.value = errorMessageOf(error, 'Could not load the skill.')
    } finally {
      if (current === skillRequest) isLoadingSkill.value = false
    }
  }

  const places = ref<SkillsDemandPlace[]>([])
  const isLoadingPlaces = ref(false)
  const placesError = ref<string | null>(null)
  let placesRequest = 0

  async function loadPlaces(skillId: number): Promise<void> {
    const current = ++placesRequest
    isLoadingPlaces.value = true
    placesError.value = null
    try {
      const rowsByPlace = await skillsTrainingService.fetchDemandPlaces(skillId, filters.supply)
      if (current === placesRequest) places.value = rowsByPlace
    } catch (error) {
      if (current === placesRequest) placesError.value = errorMessageOf(error, 'Could not load the municipalities.')
    } finally {
      if (current === placesRequest) isLoadingPlaces.value = false
    }
  }

  /** Everything the skill page shows; the jobseekers list starts on the municipalities that need it */
  function openSkill(skillId: number) {
    if (skill.value?.skill_id !== skillId) places.value = []
    supplierMunicipality.value = 'NEEDED'
    return Promise.all([loadSkill(skillId), loadPlaces(skillId), loadEvidence(skillId), loadSuppliers(skillId)])
  }

  // ─── Evidence behind one skill ───
  const vacancies = ref<SkillsDemandVacancy[]>([])
  const skillTrainings = ref<SkillsTraining[]>([])
  const isLoadingEvidence = ref(false)
  const evidenceError = ref<string | null>(null)
  let evidenceRequest = 0

  async function loadEvidence(skillId: number): Promise<void> {
    const current = ++evidenceRequest
    isLoadingEvidence.value = true
    evidenceError.value = null
    vacancies.value = []
    skillTrainings.value = []
    try {
      const [vacancyRows, trainingRows] = await Promise.all([
        skillsTrainingService.fetchDemandVacancies(skillId, 'ALL'),
        skillsTrainingService.fetchTrainingsForSkill(skillId),
      ])
      if (current !== evidenceRequest) return
      vacancies.value = vacancyRows
      skillTrainings.value = trainingRows
    } catch (error) {
      if (current === evidenceRequest) evidenceError.value = errorMessageOf(error, 'Could not load the details.')
    } finally {
      if (current === evidenceRequest) isLoadingEvidence.value = false
    }
  }

  // ─── Who the supply of one skill is ───
  const suppliers = ref<SkillsDemandSupplier[]>([])
  const supplierTotal = ref(0)
  const supplierPage = ref(0)
  const isLoadingSuppliers = ref(false)
  const suppliersError = ref<string | null>(null)
  /** 'NEEDED' (the municipalities whose vacancies require it), 'ALL' (the province) or a municipality name */
  const supplierMunicipality = ref('NEEDED')
  let suppliersRequest = 0

  /** Same "who counts" as the table, in the municipality picked on the skill page */
  async function loadSuppliers(skillId: number, pageNumber = 0): Promise<void> {
    const current = ++suppliersRequest
    supplierPage.value = Math.max(0, pageNumber)
    if (supplierPage.value === 0) {
      suppliers.value = []
      supplierTotal.value = 0
    }
    isLoadingSuppliers.value = true
    suppliersError.value = null
    try {
      const result = await skillsTrainingService.searchDemandSupply(
        skillId,
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
    skill,
    isLoadingSkill,
    skillError,
    openSkill,
    places,
    isLoadingPlaces,
    placesError,
    vacancies,
    skillTrainings,
    isLoadingEvidence,
    evidenceError,
    loadEvidence,
    suppliers,
    supplierTotal,
    supplierPage,
    isLoadingSuppliers,
    suppliersError,
    supplierMunicipality,
    loadSuppliers,
  }
})
