import { computed, h, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import type { ColumnDef } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Eye } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useSkillsDemandCoursesStore } from '@/stores/peso/provincialPeso/skillsDemandCoursesStore'
import { rowActionButton } from '@/composables/peso/provincialPeso/useSkillsTrainingTable'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'
import { COURSE_LEVEL_LABEL, SKILLS_TRAINING_PAGE_SIZE, courseLevelLabel as levelLabel } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type { SkillsDemandCourseLevel, SkillsDemandCourseRow } from '@/types/peso/provincialPeso/skillsTraining'

const SUPPLY_OPTIONS = [
  { value: 'UNEMPLOYED', label: 'Unemployed Jobseekers' },
  { value: 'ALL', label: 'All Jobseekers' },
]

const LEVEL_OPTIONS = [
  { value: 'ALL', label: 'All Levels' },
  ...(Object.entries(COURSE_LEVEL_LABEL) as [SkillsDemandCourseLevel, string][]).map(([value, label]) => ({ value, label })),
  { value: 'OTHER', label: 'Other (vacancies only)' },
]

/**
 * Skills Demand → By Course: each course on the jobseekers' education records with how many have it in each
 * municipality (one column per municipality), against the open vacancies asking for it.
 */
export function useSkillsDemandCourses() {
  const router = useRouter()
  const store = useSkillsDemandCoursesStore()
  const { rows, total, page, filters, summary, isLoading, loadError } = storeToRefs(store)

  onMounted(() => void store.loadAll())

  // ─── Filters ───
  watchDebounced(() => filters.value.search, () => void store.reloadFromStart(), { debounce: 300 })
  watch(
    () => [filters.value.level, filters.value.municipality],
    () => void store.reloadFromStart(),
  )
  // Who is counted changes the totals too
  watch(
    () => filters.value.supply,
    () => {
      void store.reloadFromStart()
      void store.loadSummary()
    },
  )

  const municipalityOptions = [
    { value: 'ALL', label: 'All Municipalities' },
    ...LANDING_MUNICIPALITIES.map((municipality) => ({ value: municipality.name, label: municipality.name })),
  ]

  const hasFilters = computed(
    () =>
      !!filters.value.search.trim() ||
      filters.value.level !== 'ALL' ||
      filters.value.municipality !== 'ALL' ||
      filters.value.supply !== 'UNEMPLOYED',
  )

  function clearFilters() {
    Object.assign(filters.value, { search: '', level: 'ALL', municipality: 'ALL', supply: 'UNEMPLOYED' })
  }

  const stats = computed(() => [
    { label: 'Courses on record', value: summary.value.courses_on_record },
    { label: 'Courses vacancies ask for', value: summary.value.courses_in_demand },
    { label: 'Asked for, no jobseeker', value: summary.value.courses_without_supply },
    { label: 'Slots asking for a course', value: summary.value.total_demand },
  ])

  /** A course opens on its own page: each municipality's demand and supply, and who has it */
  function viewCourse(row: SkillsDemandCourseRow) {
    void router.push({ name: 'provincial-peso-skills-demand-course', params: { courseKey: row.course_key } })
  }

  const rowActions = (row: SkillsDemandCourseRow) => ({
    view: { label: 'View course details', icon: Eye, onSelect: () => viewCourse(row) },
  })

  /** Jobseekers in the municipality filtered, when one is picked */
  const pickedCount = (row: SkillsDemandCourseRow) => {
    const index = LANDING_MUNICIPALITIES.findIndex((municipality) => municipality.name === filters.value.municipality)
    return index < 0 ? null : (row.places[index] ?? 0)
  }

  // ─── Table ───
  // Read-only counts, so no select column or bulk delete (DESIGN.md §13.1 rule 8).
  const numberCell = (value: number, extraClass = '') => h('div', { class: `text-right text-sm tabular-nums ${extraClass}` }, value.toLocaleString())
  const rightHeader = (label: string) => () => h('div', { class: 'text-right' }, label)

  const columns: ColumnDef<SkillsDemandCourseRow>[] = [
    {
      id: 'course',
      header: 'Course',
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', { class: 'max-w-[280px] truncate text-sm font-medium', title: row.original.course }, row.original.course),
          h('span', { class: 'text-xs text-muted-foreground' }, levelLabel(row.original)),
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
      cell: ({ row }) => {
        const picked = pickedCount(row.original)
        return h('div', { class: 'grid justify-items-end gap-0.5' }, [
          h('span', { class: 'text-sm tabular-nums' }, row.original.applicants.toLocaleString()),
          picked !== null
            ? h('span', { class: 'text-xs text-muted-foreground tabular-nums' }, `${picked.toLocaleString()} in ${filters.value.municipality}`)
            : null,
        ])
      },
    },
    {
      id: 'gap',
      header: rightHeader('Gap (where needed)'),
      cell: ({ row }) => numberCell(row.original.gap, row.original.gap > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'),
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
    getRowId: (row) => row.course_key,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / SKILLS_TRAINING_PAGE_SIZE)))
  const canPrevious = computed(() => page.value > 0)
  const canNext = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => canPrevious.value && void store.setPage(page.value - 1)
  const nextPage = () => canNext.value && void store.setPage(page.value + 1)
  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 courses'
    const first = page.value * SKILLS_TRAINING_PAGE_SIZE + 1
    return `${first.toLocaleString()}–${Math.min(total.value, first + rows.value.length - 1).toLocaleString()} of ${total.value.toLocaleString()}`
  })

  // ─── Mobile cards (DESIGN.md §13.2) ───
  const getCard = (row: SkillsDemandCourseRow): SwipeCard => ({
    title: row.course,
    subtitle: `Demand ${row.demand_slots.toLocaleString()} · Supply ${row.applicants.toLocaleString()} · Gap ${row.gap.toLocaleString()} · ${levelLabel(row)}`,
  })

  function getSwipeActions(row: SkillsDemandCourseRow): SwipeAction[] {
    const a = rowActions(row)
    return [{ id: 'view', label: 'View', icon: a.view.icon, onSelect: a.view.onSelect, dismiss: false }]
  }

  return {
    rows,
    filters,
    stats,
    isLoading,
    loadError,
    municipalityOptions,
    levelOptions: LEVEL_OPTIONS,
    supplyOptions: SUPPLY_OPTIONS,
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
    viewCourse,
  }
}
