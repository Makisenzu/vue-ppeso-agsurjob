import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import type { ColumnDef } from '@tanstack/vue-table'
import { Eye, Pencil, Trash2 } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useSkillsTrainingStore } from '@/stores/peso/provincialPeso/skillsTrainingStore'
import { useSkillListStore } from '@/stores/peso/provincialPeso/skillListStore'
import { rowActionButton, selectColumn, useServerTable } from '@/composables/peso/provincialPeso/useSkillsTrainingTable'
import { useSkillsTrainingForm } from '@/composables/peso/provincialPeso/useSkillsTrainingForm'
import { formatPlacementRate, formatTrainingDates, formatTrainingPlace, formatTrainingSkills } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type { SkillsTraining } from '@/types/peso/provincialPeso/skillsTraining'

/**
 * Skills Training → Trainings Conducted: the data table of trainings (DESIGN.md §13.1: select column, bulk
 * delete; one server page at a time). A row opens the training with its participants.
 */
export function useSkillsTrainings() {
  const route = useRoute()
  const router = useRouter()
  const store = useSkillsTrainingStore()
  const skillStore = useSkillListStore()
  const { trainings, trainingTotal, trainingPage, trainingFilters, filterOptions, isLoadingTrainings, trainingsError, isDeletingTrainings } =
    storeToRefs(store)
  const { skills } = storeToRefs(skillStore)

  /** A new training opens straight away so its participants can be added */
  function onTrainingSaved(id: string, created: boolean) {
    if (created) void router.push({ name: 'provincial-peso-skills-training-details', params: { id } })
  }

  // The Add / Edit Training sheet
  const {
    form: trainingForm,
    title: trainingFormTitle,
    isSavingTraining,
    selectedSkills,
    skillOptions,
    skillPickerModel,
    canAddSkill,
    removeSkill,
    municipalityOptions,
    municipalityModel,
    agencyOptions,
    agencyModel,
    openCreate: openCreateTraining,
    openEdit: openEditTraining,
    submit: submitTraining,
  } = useSkillsTrainingForm(onTrainingSaved)

  onMounted(() => {
    void store.loadTrainings()
    void store.loadFilterOptions()
    if (skills.value.length === 0) void skillStore.loadSkills()

    // Skills Demand → "Add Training" for a skill: /skills-training?skill=<id>
    const skillId = Number(route.query.skill)
    if (Number.isInteger(skillId) && skillId > 0) {
      openCreateTraining({ skillIds: [skillId] })
      void router.replace({ query: { ...route.query, skill: undefined } })
    }
  })

  // ─── Filters ───
  watchDebounced(() => trainingFilters.value.search, () => void store.reloadTrainingsFromStart(), { debounce: 300 })
  watch(
    () => [trainingFilters.value.agency, trainingFilters.value.skill, trainingFilters.value.year],
    () => void store.reloadTrainingsFromStart(),
  )

  const agencyFilterOptions = computed(() => [
    { value: 'ALL', label: 'All Agencies' },
    ...filterOptions.value.agencies.map((agency) => ({ value: agency, label: agency })),
  ])
  const yearFilterOptions = computed(() => [
    { value: 'ALL', label: 'All Years' },
    ...filterOptions.value.years.map((year) => ({ value: String(year), label: String(year) })),
  ])
  const skillFilterOptions = computed(() => [
    { value: 'ALL', label: 'All Skills' },
    ...skills.value.map((skill) => ({ value: String(skill.id), label: skill.name })),
  ])

  const hasFilters = computed(
    () =>
      !!trainingFilters.value.search.trim() ||
      trainingFilters.value.agency !== 'ALL' ||
      trainingFilters.value.skill !== 'ALL' ||
      trainingFilters.value.year !== 'ALL',
  )

  function clearFilters() {
    Object.assign(trainingFilters.value, { search: '', agency: 'ALL', skill: 'ALL', year: 'ALL' })
  }

  // ─── Row actions ───
  function openTraining(training: SkillsTraining) {
    void router.push({ name: 'provincial-peso-skills-training-details', params: { id: training.id } })
  }

  const pendingDelete = ref<SkillsTraining[]>([])
  const isDeleteDialogOpen = computed({
    get: () => pendingDelete.value.length > 0,
    set: (open: boolean) => {
      if (!open && !isDeletingTrainings.value) pendingDelete.value = []
    },
  })

  function requestDelete(list: SkillsTraining[]) {
    if (list.length > 0) pendingDelete.value = [...list]
  }

  async function confirmDelete() {
    const removed = await store.deleteTrainings(pendingDelete.value.map((training) => training.id))
    // On failure the selection stays so the delete can be retried
    if (removed.length > 0) pendingDelete.value = []
  }

  const rowActions = (training: SkillsTraining) => ({
    view: { label: 'View participants', icon: Eye, onSelect: () => openTraining(training) },
    edit: { label: 'Edit training', icon: Pencil, onSelect: () => openEditTraining(training) },
    remove: { label: 'Delete training', icon: Trash2, onSelect: () => requestDelete([training]) },
  })

  // ─── Table ───
  const columns: ColumnDef<SkillsTraining>[] = [
    selectColumn<SkillsTraining>((training) => training.title),
    {
      id: 'training',
      header: 'Training',
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', { class: 'max-w-[320px] truncate text-sm font-medium', title: row.original.title }, row.original.title),
          h(
            'span',
            { class: 'max-w-[320px] truncate text-xs text-muted-foreground', title: row.original.skill_names.join(', ') },
            formatTrainingSkills(row.original),
          ),
        ]),
    },
    {
      id: 'agency',
      header: 'Agency',
      cell: ({ row }) => h('span', { class: 'text-sm whitespace-nowrap' }, row.original.agency),
    },
    {
      id: 'dates',
      header: 'Dates',
      cell: ({ row }) => h('span', { class: 'text-sm whitespace-nowrap tabular-nums' }, formatTrainingDates(row.original)),
    },
    {
      id: 'venue',
      header: 'Venue',
      cell: ({ row }) => {
        const place = formatTrainingPlace(row.original)
        return h('span', { class: 'block max-w-[220px] truncate text-sm', title: place }, place || '—')
      },
    },
    {
      id: 'participants',
      header: () => h('div', { class: 'text-right' }, 'Participants'),
      cell: ({ row }) => h('div', { class: 'text-right text-sm tabular-nums' }, row.original.participant_count.toLocaleString()),
    },
    {
      id: 'employed',
      header: () => h('div', { class: 'text-right' }, 'Employed'),
      cell: ({ row }) =>
        h('div', { class: 'text-right text-sm tabular-nums' }, [
          row.original.employed_count.toLocaleString(),
          h('span', { class: 'ml-1.5 text-xs text-muted-foreground' }, formatPlacementRate(row.original)),
        ]),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) => {
        const a = rowActions(row.original)
        return h('div', { class: 'flex items-center justify-end gap-1' }, [
          rowActionButton(a.view.label, a.view.icon, a.view.onSelect),
          rowActionButton(a.edit.label, a.edit.icon, a.edit.onSelect),
          rowActionButton(a.remove.label, a.remove.icon, a.remove.onSelect, 'text-destructive hover:bg-destructive/10 hover:text-destructive', isDeletingTrainings.value),
        ])
      },
    },
  ]

  const { table, selectedRows, clearSelection, canPrevious, canNext, previousPage, nextPage, rangeLabel } = useServerTable({
    rows: trainings,
    columns,
    getRowId: (training) => training.id,
    total: trainingTotal,
    page: trainingPage,
    setPage: store.setTrainingPage,
  })

  // ─── Mobile cards (DESIGN.md §13.2) ───
  const getCard = (training: SkillsTraining): SwipeCard => ({
    title: training.title,
    subtitle: [training.agency, formatTrainingDates(training), `${training.participant_count} participant${training.participant_count === 1 ? '' : 's'}`].join(' · '),
  })

  /** Delete on the outer edge (destructive), then Edit and View */
  function getSwipeActions(training: SkillsTraining): SwipeAction[] {
    const a = rowActions(training)
    return [
      { id: 'delete', label: 'Delete', icon: a.remove.icon, onSelect: a.remove.onSelect, dismiss: false },
      { id: 'edit', label: 'Edit', icon: a.edit.icon, onSelect: a.edit.onSelect, dismiss: false },
      { id: 'view', label: 'View', icon: a.view.icon, onSelect: a.view.onSelect, dismiss: false },
    ]
  }

  const goToDemand = () => router.push({ name: 'provincial-peso-skills-demand' })

  return {
    trainings,
    trainingTotal,
    trainingFilters,
    isLoadingTrainings,
    trainingsError,
    reload: store.loadTrainings,
    agencyFilterOptions,
    yearFilterOptions,
    skillFilterOptions,
    hasFilters,
    clearFilters,
    table,
    columns,
    selectedRows,
    clearSelection,
    canPrevious,
    canNext,
    previousPage,
    nextPage,
    rangeLabel,
    getCard,
    getSwipeActions,
    openTraining,
    pendingDelete,
    isDeleteDialogOpen,
    isDeletingTrainings,
    requestDelete,
    confirmDelete,
    trainingForm,
    trainingFormTitle,
    isSavingTraining,
    selectedSkills,
    skillOptions,
    skillPickerModel,
    canAddSkill,
    removeSkill,
    municipalityOptions,
    municipalityModel,
    agencyOptions,
    agencyModel,
    openCreateTraining,
    submitTraining,
    goToDemand,
  }
}
