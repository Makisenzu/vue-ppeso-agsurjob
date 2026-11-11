import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSkillsDemandStore } from '@/stores/peso/provincialPeso/skillsDemandStore'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'
import {
  SKILLS_TRAINING_PAGE_SIZE,
  demandSupplyTotal,
  formatTrainingDates,
  trainingRecommendation,
} from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'

const SUPPLY_OPTIONS = [
  { value: 'UNEMPLOYED', label: 'Unemployed Jobseekers' },
  { value: 'ALL', label: 'All Jobseekers' },
]

/**
 * Skills Demand → one skill: its demand, supply and gap, the jobseekers who have it (the supply, by name),
 * the open vacancies that require it and the trainings already conducted for it. The municipality and
 * "who counts" filters are the Skills Demand page's, so the figures match the row that was opened.
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
    vacancies,
    skillTrainings,
    isLoadingEvidence,
    evidenceError,
    suppliers,
    supplierTotal,
    supplierPage,
    isLoadingSuppliers,
    suppliersError,
  } = storeToRefs(store)

  const skillId = computed(() => {
    const id = Number(route.params.skillId)
    return Number.isInteger(id) && id > 0 ? id : null
  })

  // The skill, or where / who is counted, changed: everything on the page is counted again
  watch(
    () => [skillId.value, filters.value.municipality, filters.value.supply] as const,
    ([id]) => id && void store.openSkill(id),
    { immediate: true },
  )

  const municipalityOptions = [
    { value: 'ALL', label: 'All Municipalities' },
    ...LANDING_MUNICIPALITIES.map((municipality) => ({ value: municipality.name, label: municipality.name })),
  ]

  const recommendation = computed(() => (skill.value ? trainingRecommendation(skill.value) : ''))
  const stats = computed(() =>
    skill.value
      ? [
          { label: 'Demand', value: skill.value.demand_slots, hint: `${skill.value.vacancies} vacanc${skill.value.vacancies === 1 ? 'y' : 'ies'}`, alert: false },
          {
            label: 'Supply',
            value: demandSupplyTotal(skill.value),
            hint: skill.value.trained > 0 ? `${skill.value.trained.toLocaleString()} from trainings` : 'jobseekers',
            alert: false,
          },
          { label: 'Gap', value: skill.value.gap, hint: 'people to train', alert: skill.value.gap > 0 },
        ]
      : [],
  )

  // ─── Supply: the jobseekers, one page at a time ───
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
    municipalityOptions,
    supplyOptions: SUPPLY_OPTIONS,
    skill,
    isLoadingSkill,
    skillError,
    recommendation,
    stats,
    suppliers,
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
    goBack,
    addTraining,
    openTraining,
  }
}
