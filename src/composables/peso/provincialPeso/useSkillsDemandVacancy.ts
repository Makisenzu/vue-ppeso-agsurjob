import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { ColumnDef } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Eye } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useSkillsDemandStore } from '@/stores/peso/provincialPeso/skillsDemandStore'
import { rowActionButton } from '@/composables/peso/provincialPeso/useSkillsTrainingTable'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type { SkillsDemandVacancySkill } from '@/types/peso/provincialPeso/skillsTraining'

/**
 * Skills Demand → By Skill with a job vacancy picked: the vacancy's required skills, each with the vacancy's
 * slots (demand), the jobseekers in its municipality who have it (supply) and the ones to spare (surplus).
 * The tab's search, category and gap filters narrow the list here.
 */
export function useSkillsDemandVacancy() {
  const router = useRouter()
  const store = useSkillsDemandStore()
  const { filters, vacancyOptions, vacancySkills, isLoadingVacancySkills, vacancySkillsError } = storeToRefs(store)

  const vacancy = computed(() => vacancyOptions.value.find((option) => option.vacancy_id === filters.value.vacancy) ?? null)
  const vacancyDetails = computed(() => {
    const picked = vacancy.value
    if (!picked) return ''
    return [
      picked.employer_name,
      picked.place,
      `${picked.slots.toLocaleString()} slot${picked.slots === 1 ? '' : 's'}`,
      picked.valid_until ? `until ${formatDisplayDate(picked.valid_until)}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  })

  const rows = computed(() => {
    const search = filters.value.search.trim().toLowerCase()
    return vacancySkills.value.filter(
      (row) =>
        (!search || row.skill_name.toLowerCase().includes(search)) &&
        (filters.value.category === 'ALL' || row.category === filters.value.category) &&
        (!filters.value.onlyGaps || row.gap > 0),
    )
  })

  const stats = computed(() => [
    { label: 'Skills required', value: vacancySkills.value.length },
    { label: 'Skills short', value: vacancySkills.value.filter((row) => row.gap > 0).length },
    { label: 'Slots', value: vacancy.value?.slots ?? 0 },
    { label: 'Skills with a surplus', value: vacancySkills.value.filter((row) => row.surplus > 0).length },
  ])

  const hasNarrowing = computed(() => !!filters.value.search.trim() || filters.value.category !== 'ALL' || filters.value.onlyGaps)
  const clearNarrowing = () => Object.assign(filters.value, { search: '', category: 'ALL', onlyGaps: false })
  const clearVacancy = () => {
    filters.value.vacancy = 'ALL'
  }

  /** The skill's own page: who has it, the vacancies that need it, the trainings conducted */
  function viewSkill(row: SkillsDemandVacancySkill) {
    void router.push({ name: 'provincial-peso-skills-demand-skill', params: { skillId: String(row.skill_id) } })
  }

  const viewAction = (row: SkillsDemandVacancySkill) => ({ label: 'View skill details', icon: Eye, onSelect: () => viewSkill(row) })

  const supplyTotal = (row: SkillsDemandVacancySkill) => row.supply + row.trained

  // ─── Table (read-only counts: no select column, DESIGN.md §13.1 rule 8) ───
  const rightHeader = (label: string) => () => h('div', { class: 'text-right' }, label)

  const columns: ColumnDef<SkillsDemandVacancySkill>[] = [
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
      cell: ({ row }) => h('div', { class: 'text-right text-sm tabular-nums' }, row.original.demand.toLocaleString()),
    },
    {
      id: 'supply',
      header: rightHeader('Supply (where needed)'),
      cell: ({ row }) =>
        h('div', { class: 'grid justify-items-end gap-0.5' }, [
          h('span', { class: 'text-sm tabular-nums' }, supplyTotal(row.original).toLocaleString()),
          h(
            'span',
            { class: 'text-xs text-muted-foreground tabular-nums' },
            [
              row.original.trained > 0 ? `${row.original.trained.toLocaleString()} from trainings` : null,
              `${row.original.province_supply.toLocaleString()} in province`,
            ]
              .filter(Boolean)
              .join(' · '),
          ),
        ]),
    },
    {
      id: 'surplus',
      header: rightHeader('Surplus'),
      cell: ({ row }) =>
        row.original.gap > 0
          ? h('div', { class: 'text-right text-sm font-semibold text-destructive tabular-nums' }, `Short ${row.original.gap.toLocaleString()}`)
          : h(
              'div',
              { class: `text-right text-sm tabular-nums ${row.original.surplus > 0 ? 'font-semibold' : 'text-muted-foreground'}` },
              row.original.surplus.toLocaleString(),
            ),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) => {
        const action = viewAction(row.original)
        return h('div', { class: 'flex items-center justify-end gap-1' }, [rowActionButton(action.label, action.icon, action.onSelect)])
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
  })

  // ─── Mobile cards (DESIGN.md §13.2) ───
  const getCard = (row: SkillsDemandVacancySkill): SwipeCard => ({
    title: row.skill_name,
    subtitle: `Demand ${row.demand.toLocaleString()} · Supply ${supplyTotal(row).toLocaleString()} · ${
      row.gap > 0 ? `Short ${row.gap.toLocaleString()}` : `Surplus ${row.surplus.toLocaleString()}`
    }`,
  })

  function getSwipeActions(row: SkillsDemandVacancySkill): SwipeAction[] {
    const action = viewAction(row)
    return [{ id: 'view', label: 'View', icon: action.icon, onSelect: action.onSelect, dismiss: false }]
  }

  return {
    vacancy,
    vacancyDetails,
    rows,
    stats,
    isLoading: isLoadingVacancySkills,
    loadError: vacancySkillsError,
    hasNarrowing,
    clearNarrowing,
    clearVacancy,
    table,
    columns,
    getCard,
    getSwipeActions,
    viewSkill,
  }
}
