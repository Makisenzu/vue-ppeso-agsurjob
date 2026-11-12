import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSkillsDemandStore } from '@/stores/peso/provincialPeso/skillsDemandStore'
import {
  SKILLS_TRAINING_PAGE_SIZE,
  demandSupplyTotal,
  formatTrainingDates,
  trainingRecommendation,
  vacancyStatusBadgeClass,
  vacancyStatusLabel,
} from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type { SkillsDemandPlace } from '@/types/peso/provincialPeso/skillsTraining'

const SUPPLY_OPTIONS = [
  { value: 'UNEMPLOYED', label: 'Unemployed Jobseekers' },
  { value: 'ALL', label: 'All Jobseekers' },
]

/**
 * Skills Demand → one skill, for the whole province: its demand, supply and gap; each municipality's gap
 * (train or refer there) and surplus (people other municipalities could draw on); the jobseekers who have it,
 * starting with those in the municipalities that need it; the open vacancies; the trainings conducted.
 * "Who counts" is the Skills Demand page's filter, so the totals match the row that was opened.
 */
export function useSkillsDemandSkill() {
  const route = useRoute()
  const router = useRouter()
  const store = useSkillsDemandStore()
  const {
    filters,
    skill,
    isLoadingSkill,
    skillError,
    places,
    isLoadingPlaces,
    placesError,
    vacancies,
    skillTrainings,
    isLoadingEvidence,
    evidenceError,
    suppliers,
    supplierTotal,
    supplierPage,
    supplierMunicipality,
    isLoadingSuppliers,
    suppliersError,
  } = storeToRefs(store)

  const skillId = computed(() => {
    const id = Number(route.params.skillId)
    return Number.isInteger(id) && id > 0 ? id : null
  })

  // The skill, or who is counted, changed: everything on the page is counted again
  watch(
    () => [skillId.value, filters.value.supply] as const,
    ([id]) => id && void store.openSkill(id),
    { immediate: true },
  )

  const recommendation = computed(() => (skill.value ? trainingRecommendation(skill.value) : ''))
  const stats = computed(() =>
    skill.value
      ? [
          { label: 'Demand', value: skill.value.demand_slots, hint: `${skill.value.vacancies} vacanc${skill.value.vacancies === 1 ? 'y' : 'ies'}${
              skill.value.closed_vacancies > 0 ? ` · ${skill.value.closed_vacancies} closed` : ''
            }`,
            alert: false,
          },
          {
            label: 'Supply (Agusan del Sur)',
            value: demandSupplyTotal(skill.value),
            hint: skill.value.trained > 0 ? `${skill.value.trained.toLocaleString()} from trainings` : 'jobseekers',
            alert: false,
          },
          { label: 'Gap (where needed)', value: skill.value.gap, hint: 'not covered locally', alert: skill.value.gap > 0 },
        ]
      : [],
  )

  // ─── By municipality ───
  /** What PESO can do in a municipality, from its own gap / surplus */
  function placeAction(place: SkillsDemandPlace): { label: string; tone: 'gap' | 'surplus' | 'even' } {
    if (place.gap > 0) return { label: `Short ${place.gap.toLocaleString()}`, tone: 'gap' }
    if (place.surplus > 0) return { label: `Can supply ${place.surplus.toLocaleString()}`, tone: 'surplus' }
    return { label: 'Covered', tone: 'even' }
  }

  /** A municipality's row shows its jobseekers below */
  function showPlaceSuppliers(place: SkillsDemandPlace) {
    supplierMunicipality.value = place.place
  }

  // ─── Supply: the jobseekers, one page at a time ───
  const supplierMunicipalityOptions = computed(() => [
    { value: 'NEEDED', label: 'Where needed' },
    { value: 'ALL', label: 'All of Agusan del Sur' },
    ...places.value
      .filter((place) => place.supply + place.trained > 0)
      .map((place) => ({ value: place.place, label: place.place, description: `${(place.supply + place.trained).toLocaleString()} with the skill` })),
  ])

  watch(supplierMunicipality, () => skillId.value && void store.loadSuppliers(skillId.value, 0))

  const supplierPageCount = computed(() => Math.max(1, Math.ceil(supplierTotal.value / SKILLS_TRAINING_PAGE_SIZE)))
  const canPreviousSuppliers = computed(() => supplierPage.value > 0)
  const canNextSuppliers = computed(() => supplierPage.value + 1 < supplierPageCount.value)
  const goToSupplierPage = (pageNumber: number) => skillId.value && void store.loadSuppliers(skillId.value, pageNumber)
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

  /** Trainings Conducted opens its Add Training form with the skill filled in */
  function addTraining() {
    if (skillId.value) void router.push({ name: 'provincial-peso-skills-training', query: { skill: String(skillId.value) } })
  }

  const openTraining = (id: string) => router.push({ name: 'provincial-peso-skills-training-details', params: { id } })

  return {
    filters,
    supplyOptions: SUPPLY_OPTIONS,
    skill,
    isLoadingSkill,
    skillError,
    recommendation,
    stats,
    places,
    isLoadingPlaces,
    placesError,
    placeAction,
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
    vacancies,
    skillTrainings,
    isLoadingEvidence,
    evidenceError,
    formatTrainingDates,
    formatDisplayDate,
    vacancyStatusLabel,
    vacancyStatusBadgeClass,
    goBack,
    addTraining,
    openTraining,
  }
}
