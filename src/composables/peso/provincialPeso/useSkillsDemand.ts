import { computed, h, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import type { ColumnDef } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Eye } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useSkillsDemandStore } from '@/stores/peso/provincialPeso/skillsDemandStore'
import { useSkillsDemandCoursesStore } from '@/stores/peso/provincialPeso/skillsDemandCoursesStore'
import { rowActionButton } from '@/composables/peso/provincialPeso/useSkillsTrainingTable'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'
import { SKILLS_TRAINING_PAGE_SIZE, demandSupplyTotal, formatPlaces } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type { SkillsDemandRow } from '@/types/peso/provincialPeso/skillsTraining'

const SUPPLY_OPTIONS = [
  { value: 'UNEMPLOYED', label: 'Unemployed Jobseekers' },
  { value: 'ALL', label: 'All Jobseekers' },
]
const GAP_OPTIONS = [
  { value: 'ALL', label: 'All Skills in Demand' },
  { value: 'GAPS', label: 'With a Gap Only' },
]

/**
 * Skills Training → Skills Demand: for each skill open vacancies require, the slots (demand), the jobseekers
 * across Agusan del Sur who have it (supply), and the shortage where it is needed (each municipality's demand
 * against its own jobseekers). Counted in SQL, one page at a time.
 */
export function useSkillsDemand() {
  const router = useRouter()
  const store = useSkillsDemandStore()
  const { rows, total, page, filters, summary, isLoading, loadError, tab, vacancyOptions, isLoadingVacancyOptions } = storeToRefs(store)
  const coursesStore = useSkillsDemandCoursesStore()
  const { isLoading: isLoadingCourses } = storeToRefs(coursesStore)

  // ─── Tabs: By Skill (this composable) and By Course (useSkillsDemandCourses) ───
  const tabs = [
    { key: 'skills', label: 'By Skill' },
    { key: 'courses', label: 'By Course' },
  ] as const
  /** Refresh reloads the open tab */
  const isRefreshing = computed(() => (tab.value === 'courses' ? isLoadingCourses.value : isLoading.value))
  const refresh = () => (tab.value === 'courses' ? coursesStore.loadAll() : store.loadAll())
  /** A job vacancy is picked: the tab lists that vacancy's skills (useSkillsDemandVacancy) */
  const isVacancyPicked = computed(() => filters.value.vacancy !== 'ALL')

  onMounted(() => void store.loadAll())

  // ─── Filters ───
  watchDebounced(() => filters.value.search, () => void store.reloadFromStart(), { debounce: 300 })
  watch(
    () => [filters.value.category, filters.value.onlyGaps],
    () => void store.reloadFromStart(),
  )
  // Where and who is counted changes the totals too
  watch(
    () => [filters.value.municipality, filters.value.supply],
    () => {
      void store.reloadFromStart()
      void store.loadSummary()
    },
  )
  // The vacancies to pick follow the municipality; a picked vacancy's counts follow who counts as supply
  watch(
    () => filters.value.municipality,
    () => void store.loadVacancyOptions(),
  )
  watch(
    () => [filters.value.vacancy, filters.value.supply],
    () => void store.loadVacancySkills(),
  )

  const municipalityOptions = [
    { value: 'ALL', label: 'All Municipalities' },
    ...LANDING_MUNICIPALITIES.map((municipality) => ({ value: municipality.name, label: municipality.name })),
  ]
  const categoryOptions = computed(() => [
    { value: 'ALL', label: 'All Categories' },
    ...summary.value.categories.map((category) => ({ value: category, label: category })),
  ])
  const vacancyPickerOptions = computed(() => [
    { value: 'ALL', label: 'All Job Vacancies' },
    ...vacancyOptions.value.map((option) => ({
      value: option.vacancy_id,
      label: option.position_title,
      description: `${option.employer_name} · ${option.place} · ${option.slots.toLocaleString()} slot${option.slots === 1 ? '' : 's'} · ${option.skills} skill${option.skills === 1 ? '' : 's'}`,
    })),
  ])
  const gapModel = computed({
    get: () => (filters.value.onlyGaps ? 'GAPS' : 'ALL'),
    set: (value: string | number) => {
      filters.value.onlyGaps = value === 'GAPS'
    },
  })

  const hasFilters = computed(
    () =>
      !!filters.value.search.trim() ||
      filters.value.municipality !== 'ALL' ||
      filters.value.category !== 'ALL' ||
      filters.value.supply !== 'UNEMPLOYED' ||
      filters.value.onlyGaps ||
      filters.value.vacancy !== 'ALL',
  )

  function clearFilters() {
    Object.assign(filters.value, { search: '', municipality: 'ALL', category: 'ALL', supply: 'UNEMPLOYED', onlyGaps: false, vacancy: 'ALL' })
  }

  const stats = computed(() => [
    { label: 'Skills in demand', value: summary.value.skills_in_demand },
    { label: 'Skills with a gap', value: summary.value.skills_with_gap },
    { label: 'Slots needing a skill', value: summary.value.total_demand },
    { label: 'Short where needed', value: summary.value.total_gap },
  ])

  /** A skill opens on its own page: who has it, the vacancies that need it, the trainings conducted */
  function viewSkill(row: SkillsDemandRow) {
    void router.push({ name: 'provincial-peso-skills-demand-skill', params: { skillId: String(row.skill_id) } })
  }

  const rowActions = (row: SkillsDemandRow) => ({
    view: { label: 'View skill details', icon: Eye, onSelect: () => viewSkill(row) },
  })

  // ─── Table ───
  // Read-only analysis: the rows are computed from vacancies and applicant records and can't be deleted,
  // so there is no select column or bulk delete (DESIGN.md §13.1 rule 8).
  const numberCell = (value: number, extraClass = '') => h('div', { class: `text-right text-sm tabular-nums ${extraClass}` }, value.toLocaleString())
  const rightHeader = (label: string) => () => h('div', { class: 'text-right' }, label)

  const columns: ColumnDef<SkillsDemandRow>[] = [
    {
      id: 'skill',
      header: 'Skill',
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', { class: 'max-w-[280px] truncate text-sm font-medium', title: row.original.skill_name }, row.original.skill_name),
          h('span', { class: 'text-xs text-muted-foreground' }, row.original.category),
        ]),
    },
    {
      id: 'demand',
      header: rightHeader('Demand'),
      cell: ({ row }) =>
        h('div', { class: 'grid justify-items-end gap-0.5' }, [
          h('span', { class: 'text-sm tabular-nums' }, row.original.demand_slots.toLocaleString()),
          h('span', { class: 'text-xs text-muted-foreground tabular-nums' }, `${row.original.vacancies} vacanc${row.original.vacancies === 1 ? 'y' : 'ies'}`),
        ]),
    },
    {
      id: 'supply',
      header: rightHeader('Supply (Agusan del Sur)'),
      cell: ({ row }) =>
        h('div', { class: 'grid justify-items-end gap-0.5' }, [
          h('span', { class: 'text-sm tabular-nums' }, demandSupplyTotal(row.original).toLocaleString()),
          row.original.trained > 0
            ? h('span', { class: 'text-xs text-muted-foreground tabular-nums' }, `${row.original.trained.toLocaleString()} from trainings`)
            : null,
        ]),
    },
    {
      id: 'gap',
      header: rightHeader('Gap (where needed)'),
      cell: ({ row }) => numberCell(row.original.gap, row.original.gap > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'),
    },
    {
      id: 'places',
      header: 'Where needed',
      cell: ({ row }) =>
        h('span', { class: 'block max-w-[240px] truncate text-sm', title: row.original.places.join(', ') }, formatPlaces(row.original.places)),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) => {
        const a = rowActions(row.original)
        return h('div', { class: 'flex items-center justify-end gap-1' }, [rowActionButton(a.view.label, a.view.icon, a.view.onSelect)])
      },
    },
  ]

  const table = useVueTable({
    get data() {
      return rows.value
    },
    columns,
    getRowId: (row) => String(row.skill_id),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / SKILLS_TRAINING_PAGE_SIZE)))
  const canPrevious = computed(() => page.value > 0)
  const canNext = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => canPrevious.value && void store.setPage(page.value - 1)
  const nextPage = () => canNext.value && void store.setPage(page.value + 1)
  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 skills'
    const first = page.value * SKILLS_TRAINING_PAGE_SIZE + 1
    return `${first.toLocaleString()}–${Math.min(total.value, first + rows.value.length - 1).toLocaleString()} of ${total.value.toLocaleString()}`
  })

  // ─── Mobile cards (DESIGN.md §13.2) ───
  const getCard = (row: SkillsDemandRow): SwipeCard => ({
    title: row.skill_name,
    subtitle: `Demand ${row.demand_slots.toLocaleString()} · Supply ${demandSupplyTotal(row).toLocaleString()} · Gap ${row.gap.toLocaleString()} · ${formatPlaces(row.places, 1)}`,
  })

  function getSwipeActions(row: SkillsDemandRow): SwipeAction[] {
    const a = rowActions(row)
    return [{ id: 'view', label: 'View', icon: a.view.icon, onSelect: a.view.onSelect, dismiss: false }]
  }

  const goToTrainings = () => router.push({ name: 'provincial-peso-skills-training' })
  const goToSkillList = () => router.push({ name: 'provincial-peso-skill-list' })

  return {
    rows,
    filters,
    summary,
    stats,
    isLoading,
    loadError,
    reload: store.loadAll,
    tab,
    tabs,
    isRefreshing,
    refresh,
    municipalityOptions,
    categoryOptions,
    vacancyPickerOptions,
    isLoadingVacancyOptions,
    isVacancyPicked,
    supplyOptions: SUPPLY_OPTIONS,
    gapOptions: GAP_OPTIONS,
    gapModel,
    hasFilters,
    clearFilters,
    table,
    columns,
    canPrevious,
    canNext,
    previousPage,
    nextPage,
    rangeLabel,
    getCard,
    getSwipeActions,
    viewSkill,
    goToTrainings,
    goToSkillList,
  }
}
