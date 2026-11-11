import { computed, h, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/vue-table'
import { SquarePen, Trash2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useSkillsTrainingStore } from '@/stores/peso/provincialPeso/skillsTrainingStore'
import { rowActionButton, selectColumn, useServerTable } from '@/composables/peso/provincialPeso/useSkillsTrainingTable'
import { useSkillsTrainingForm } from '@/composables/peso/provincialPeso/useSkillsTrainingForm'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'
import {
  COMPLETION_BADGE_CLASS,
  COMPLETION_FILTER_OPTIONS,
  COMPLETION_STATUSES,
  EMPLOYMENT_BADGE_CLASS,
  EMPLOYMENT_FILTER_OPTIONS,
  EMPLOYMENT_STATUSES,
  SKILLS_TRAINING_PAGE_SIZE,
  formatPlacementRate,
  formatTrainingDates,
  formatTrainingPlace,
  toStatusForm,
  validateStatusForm,
  type StatusFormErrors,
} from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type {
  ParticipantStatusFormValues,
  SkillsTrainingCandidate,
  SkillsTrainingParticipant,
} from '@/types/peso/provincialPeso/skillsTraining'

const todayIso = () => format(new Date(), 'yyyy-MM-dd')

/**
 * Skills Training → one training: its details and the participants data table (DESIGN.md §13.1), where
 * PESO adds participants from the applicant registry and keeps each one's current status up to date.
 */
export function useSkillsTrainingDetails() {
  const route = useRoute()
  const router = useRouter()
  const store = useSkillsTrainingStore()
  const {
    training,
    isLoadingTraining,
    trainingError,
    participants,
    participantTotal,
    participantPage,
    participantFilters,
    isLoadingParticipants,
    participantsError,
    candidates,
    candidateTotal,
    candidatePage,
    candidateFilters,
    isLoadingCandidates,
    isSavingParticipants,
    isRemovingParticipants,
    isDeletingTrainings,
  } = storeToRefs(store)

  // The Edit Training sheet (the store reloads this training after a save)
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
    openEdit: openEditTraining,
    submit: submitTraining,
  } = useSkillsTrainingForm()

  const trainingId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
  watch(trainingId, (id) => id && void store.openTraining(id), { immediate: true })

  const trainingDates = computed(() => (training.value ? formatTrainingDates(training.value) : ''))
  const trainingPlace = computed(() => (training.value ? formatTrainingPlace(training.value) : ''))
  const placementRate = computed(() => (training.value ? formatPlacementRate(training.value) : '—'))

  // ─── Participant filters ───
  watchDebounced(() => participantFilters.value.search, () => void store.reloadParticipantsFromStart(), { debounce: 300 })
  watch(
    () => [participantFilters.value.completion, participantFilters.value.employment],
    () => void store.reloadParticipantsFromStart(),
  )

  const hasParticipantFilters = computed(
    () =>
      !!participantFilters.value.search.trim() ||
      participantFilters.value.completion !== 'ALL' ||
      participantFilters.value.employment !== 'ALL',
  )

  function clearParticipantFilters() {
    Object.assign(participantFilters.value, { search: '', completion: 'ALL', employment: 'ALL' })
  }

  // ─── Update status ───
  const statusDialog = reactive({
    open: false,
    participant: null as SkillsTrainingParticipant | null,
    values: { completionStatus: 'Enrolled', employmentStatus: 'Not Yet Employed', employerName: '', dateHired: '', remarks: '' } as ParticipantStatusFormValues,
    errors: {} as StatusFormErrors,
  })

  function openStatusDialog(participant: SkillsTrainingParticipant) {
    Object.assign(statusDialog, { open: true, participant, values: toStatusForm(participant), errors: {} })
  }

  const isHiredSelected = computed(() => statusDialog.values.employmentStatus === 'Hired')

  async function saveStatus() {
    if (!statusDialog.participant) return
    statusDialog.errors = validateStatusForm(statusDialog.values, todayIso())
    if (Object.keys(statusDialog.errors).length > 0) return
    if (await store.updateParticipantStatus(statusDialog.participant, statusDialog.values)) statusDialog.open = false
  }

  // ─── Remove participants (one or many) ───
  const pendingRemove = ref<SkillsTrainingParticipant[]>([])
  const isRemoveDialogOpen = computed({
    get: () => pendingRemove.value.length > 0,
    set: (open: boolean) => {
      if (!open && !isRemovingParticipants.value) pendingRemove.value = []
    },
  })

  function requestRemove(list: SkillsTrainingParticipant[]) {
    if (list.length > 0) pendingRemove.value = [...list]
  }

  async function confirmRemove() {
    const removed = await store.removeParticipants(pendingRemove.value.map((participant) => participant.id))
    if (removed.length > 0) pendingRemove.value = []
  }

  const rowActions = (participant: SkillsTrainingParticipant) => ({
    status: { label: 'Update status', icon: SquarePen, onSelect: () => openStatusDialog(participant) },
    remove: { label: 'Remove participant', icon: Trash2, onSelect: () => requestRemove([participant]) },
  })

  // ─── Participants table ───
  const columns: ColumnDef<SkillsTrainingParticipant>[] = [
    selectColumn<SkillsTrainingParticipant>((participant) => participant.full_name),
    {
      id: 'participant',
      header: 'Participant',
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', { class: 'text-sm font-medium' }, row.original.full_name),
          h('span', { class: 'text-xs text-muted-foreground' }, row.original.municipality ?? '—'),
        ]),
    },
    {
      id: 'completion',
      header: 'Completion',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: COMPLETION_BADGE_CLASS[row.original.completion_status] }, () => row.original.completion_status),
    },
    {
      id: 'status',
      header: 'Current status',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: EMPLOYMENT_BADGE_CLASS[row.original.employment_status] }, () => row.original.employment_status),
    },
    {
      id: 'employer',
      header: 'Employer',
      cell: ({ row }) =>
        row.original.employer_name
          ? h('div', { class: 'grid gap-0.5' }, [
              h('span', { class: 'block max-w-[220px] truncate text-sm', title: row.original.employer_name }, row.original.employer_name),
              row.original.date_hired
                ? h('span', { class: 'text-xs text-muted-foreground tabular-nums' }, `Hired ${formatDisplayDate(row.original.date_hired)}`)
                : null,
            ])
          : h('span', { class: 'text-sm text-muted-foreground' }, '—'),
    },
    {
      id: 'updated',
      header: 'Updated',
      cell: ({ row }) =>
        h('span', { class: 'text-sm whitespace-nowrap text-muted-foreground tabular-nums' }, formatDisplayDate(row.original.status_updated_at, '—')),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) => {
        const a = rowActions(row.original)
        return h('div', { class: 'flex items-center justify-end gap-1' }, [
          rowActionButton(a.status.label, a.status.icon, a.status.onSelect),
          rowActionButton(a.remove.label, a.remove.icon, a.remove.onSelect, 'text-destructive hover:bg-destructive/10 hover:text-destructive', isRemovingParticipants.value),
        ])
      },
    },
  ]

  const { table, selectedRows, clearSelection, canPrevious, canNext, previousPage, nextPage, rangeLabel } = useServerTable({
    rows: participants,
    columns,
    getRowId: (participant) => participant.id,
    total: participantTotal,
    page: participantPage,
    setPage: store.setParticipantPage,
  })

  // ─── Mobile cards (DESIGN.md §13.2) ───
  const getCard = (participant: SkillsTrainingParticipant): SwipeCard => ({
    title: participant.full_name,
    subtitle: [participant.completion_status, participant.employment_status, participant.employer_name].filter(Boolean).join(' · '),
  })

  /** Remove on the outer edge (destructive), then Update status */
  function getSwipeActions(participant: SkillsTrainingParticipant): SwipeAction[] {
    const a = rowActions(participant)
    return [
      { id: 'remove', label: 'Remove', icon: a.remove.icon, onSelect: a.remove.onSelect, dismiss: false },
      { id: 'status', label: 'Status', icon: a.status.icon, onSelect: a.status.onSelect, dismiss: false },
    ]
  }

  // ─── Add participants (from the applicant registry) ───
  const isAddDialogOpen = ref(false)
  /** Picked applicants by id, kept while paging and searching */
  const pickedCandidates = ref(new Map<string, string>())

  function openAddDialog() {
    store.resetCandidates()
    pickedCandidates.value = new Map()
    isAddDialogOpen.value = true
    void store.loadCandidates()
  }

  watchDebounced(() => candidateFilters.value.search, () => isAddDialogOpen.value && void store.reloadCandidatesFromStart(), { debounce: 300 })
  watch(
    () => candidateFilters.value.municipality,
    () => isAddDialogOpen.value && void store.reloadCandidatesFromStart(),
  )

  const isPicked = (candidate: SkillsTrainingCandidate) => pickedCandidates.value.has(candidate.applicant_id)

  function togglePicked(candidate: SkillsTrainingCandidate, picked: boolean) {
    const next = new Map(pickedCandidates.value)
    if (picked) next.set(candidate.applicant_id, candidate.full_name)
    else next.delete(candidate.applicant_id)
    pickedCandidates.value = next
  }

  const candidateMunicipalityOptions = [
    { value: 'ALL', label: 'All Municipalities' },
    ...LANDING_MUNICIPALITIES.map((municipality) => ({ value: municipality.name, label: municipality.name })),
  ]

  const candidatePageCount = computed(() => Math.max(1, Math.ceil(candidateTotal.value / SKILLS_TRAINING_PAGE_SIZE)))
  const canPreviousCandidates = computed(() => candidatePage.value > 0)
  const canNextCandidates = computed(() => candidatePage.value + 1 < candidatePageCount.value)
  const previousCandidates = () => canPreviousCandidates.value && void store.setCandidatePage(candidatePage.value - 1)
  const nextCandidates = () => canNextCandidates.value && void store.setCandidatePage(candidatePage.value + 1)

  async function addPicked() {
    if (pickedCandidates.value.size === 0) return
    if (await store.addParticipants([...pickedCandidates.value.keys()])) isAddDialogOpen.value = false
  }

  // ─── The training itself ───
  const isDeleteTrainingOpen = ref(false)

  function goBack() {
    if (window.history.state?.back) router.back()
    else void router.push({ name: 'provincial-peso-skills-training' })
  }

  async function confirmDeleteTraining() {
    if (!training.value) return
    const removed = await store.deleteTrainings([training.value.id])
    if (removed.length === 0) return
    isDeleteTrainingOpen.value = false
    void router.replace({ name: 'provincial-peso-skills-training' })
  }

  return {
    training,
    isLoadingTraining,
    trainingError,
    trainingDates,
    trainingPlace,
    placementRate,
    participants,
    participantTotal,
    participantFilters,
    isLoadingParticipants,
    participantsError,
    completionFilterOptions: COMPLETION_FILTER_OPTIONS,
    employmentFilterOptions: EMPLOYMENT_FILTER_OPTIONS,
    hasParticipantFilters,
    clearParticipantFilters,
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
    statusDialog,
    completionOptions: COMPLETION_STATUSES,
    employmentOptions: EMPLOYMENT_STATUSES,
    isHiredSelected,
    todayMax: todayIso(),
    saveStatus,
    isSavingParticipants,
    pendingRemove,
    isRemoveDialogOpen,
    isRemovingParticipants,
    requestRemove,
    confirmRemove,
    isAddDialogOpen,
    openAddDialog,
    candidates,
    candidateTotal,
    candidateFilters,
    candidateMunicipalityOptions,
    isLoadingCandidates,
    pickedCandidates,
    isPicked,
    togglePicked,
    canPreviousCandidates,
    canNextCandidates,
    previousCandidates,
    nextCandidates,
    addPicked,
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
    openEditTraining,
    submitTraining,
    isDeleteTrainingOpen,
    isDeletingTrainings,
    confirmDeleteTraining,
    goBack,
  }
}
