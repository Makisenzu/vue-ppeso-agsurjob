import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import type { ColumnDef } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Eye } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useJobApplicantStore } from '@/stores/employer/jobApplicantStore'
import { useStatusRemarks } from '@/composables/common/useStatusRemarks'
import { describeGipApplicant, formatGipDate } from '@/helpers/applicant/gipApplicationHelper'
import { formatJobPostingDate, getJobPostingStatusLabel } from '@/helpers/employer/jobPostingHelper'
import {
  JOB_APPLICATION_STAGE_BADGE_CLASS,
  getJobApplicationStageLabel,
  jobApplicationCode,
  toJobApplicationRequirements,
} from '@/helpers/common/jobVacancyApplicationHelper'
import { toApplicantMoveOptions } from '@/helpers/employer/jobApplicantHelper'
import type { ApplicantStageFilter, VacancyApplicantRow, VacancyApplicationDetails } from '@/types/employer/jobApplicant'

/**
 * Where an application sits, as the "Move to" dropdown names it: 'rejected' or the step id. An application
 * from before migration 091 without a step reads as the first step (Paper Screening).
 */
const currentTarget = (
  application: Pick<VacancyApplicationDetails, 'stage' | 'stage_id'>,
  firstStepId: string | null,
): ApplicantStageFilter =>
  application.stage === 'rejected' ? 'rejected' : (application.stage_id ?? firstStepId ?? 'applied')

/**
 * Applicants of one job posting: stage counts, server-paged list, review sheet with the applicant's
 * summary, files and stage. Opening the sheet is logged in the database (PRIVACY.md §5.2).
 */
export function useVacancyApplicants() {
  const route = useRoute()
  const store = useJobApplicantStore()
  const {
    vacancy,
    applicants,
    total,
    stageCounts,
    stageFilter,
    page,
    pageSize,
    isLoading,
    errorMessage,
    isDetailOpen,
    selectedApplication,
    documents,
    isSavingStage,
    busyId,
  } = storeToRefs(store)

  const vacancyId = computed(() => String(route.params.vacancyId ?? ''))

  // ─── Header ───
  const vacancyHeader = computed(() => {
    const row = vacancy.value
    if (!row) return null
    const openings = row.vacancy_count ?? 1
    return {
      title: row.position_title,
      summary: [
        getJobPostingStatusLabel(row.status),
        `${openings} opening${openings === 1 ? '' : 's'}`,
        row.valid_until ? `until ${formatJobPostingDate(row.valid_until)}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })

  // ─── Step chips: click to filter (All, the employer's hiring steps from Paper Screening, Not selected) ───
  const steps = computed(() => [...(vacancy.value?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order))

  const stageCards = computed(() => [
    { key: 'all', label: 'All', value: stageCounts.value.all },
    ...steps.value.map((step, index) => ({
      key: step.id,
      label: `${index + 1}. ${step.stage_name}`,
      value: stageCounts.value.byStep[step.id] ?? 0,
    })),
    { key: 'rejected', label: 'Not selected', value: stageCounts.value.rejected },
  ])

  const selectStage = (key: ApplicantStageFilter) => {
    void store.setStageFilter(stageFilter.value === key ? 'all' : key)
  }

  // ─── Search (debounced, server side) ───
  const searchInput = ref(store.search)
  watchDebounced(searchInput, (value) => store.setSearch(value), { debounce: 300 })

  const hasFilters = computed(() => searchInput.value.trim() !== '' || stageFilter.value !== 'all')
  function clearFilters() {
    searchInput.value = ''
    store.setStageFilter('all')
  }

  // ─── Rows (same handler for the desktop button and the mobile swipe) ───
  const viewApplicant = (row: VacancyApplicantRow) => store.openApplication(row.id)

  const getRowSwipeActions = (row: VacancyApplicantRow): SwipeAction[] => [
    { id: 'view', label: 'Review', icon: Eye, dismiss: false, onSelect: () => viewApplicant(row) },
  ]

  /** Mobile card: name, then stage · municipality · date applied */
  const getRowCard = (row: VacancyApplicantRow): SwipeCard => ({
    title: row.full_name,
    subtitle: [getJobApplicationStageLabel(row.stage, row.stage_name), row.municipality, `Applied ${formatGipDate(row.created_at)}`]
      .filter(Boolean)
      .join(' · '),
  })

  // ─── Table (DESIGN.md §13), paged on the server ───
  // No select / bulk delete column (DESIGN.md §13.1 rule 8): an application is the applicant's own record,
  // so employers never delete it — they move it to a stage, Not selected included.
  const columns: ColumnDef<VacancyApplicantRow>[] = [
    {
      id: 'applicant',
      header: 'Applicant',
      cell: ({ row }) =>
        h('div', { class: 'min-w-0 max-w-xs' }, [
          h('p', { class: 'truncate text-sm font-medium' }, row.original.full_name),
          h('p', { class: 'truncate text-xs text-muted-foreground' }, row.original.municipality ?? '—'),
        ]),
    },
    {
      id: 'applied',
      header: 'Applied',
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatGipDate(row.original.created_at)),
    },
    {
      id: 'updated',
      header: 'Last updated',
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatGipDate(row.original.updated_at)),
    },
    {
      id: 'stage',
      header: 'Step',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: JOB_APPLICATION_STAGE_BADGE_CLASS[row.original.stage] }, () =>
          getJobApplicationStageLabel(row.original.stage, row.original.stage_name),
        ),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) =>
        h('div', { class: 'flex justify-end' }, [
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              disabled: busyId.value === row.original.id,
              'aria-label': `Review ${row.original.full_name}`,
              onClick: () => viewApplicant(row.original),
            },
            () => [h(Eye, { class: 'size-4' }), 'Review'],
          ),
        ]),
    },
  ]

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const table = useVueTable({
    get data() {
      return applicants.value
    },
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    get pageCount() {
      return pageCount.value
    },
    state: {
      get pagination() {
        return { pageIndex: page.value, pageSize: pageSize.value }
      },
    },
  })

  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 applicants'
    const from = page.value * pageSize.value + 1
    const to = Math.min(total.value, from + applicants.value.length - 1)
    return `${from}–${to} of ${total.value} applicant${total.value === 1 ? '' : 's'}`
  })
  const canPreviousPage = computed(() => page.value > 0)
  const canNextPage = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => store.setPage(page.value - 1)
  const nextPage = () => store.setPage(page.value + 1)

  // ─── Review sheet ───
  /** A hiring step id or 'rejected'; Not selected needs remarks */
  const stage = ref<ApplicantStageFilter>('applied')
  const stageOptions = computed(() => toApplicantMoveOptions(steps.value))
  const stageModel = computed({
    get: () => stage.value,
    set: (value: unknown) => {
      if (typeof value === 'string' && stageOptions.value.some((option) => option.value === value)) stage.value = value
    },
  })
  const { remarks, remarksError, isRemarksRequired, remarksToSave, validateRemarks, resetRemarks } =
    useStatusRemarks(stage)

  // Load the opened application's stage and remarks each time the sheet opens
  watch(isDetailOpen, (open) => {
    if (!open || !selectedApplication.value) return
    stage.value = currentTarget(selectedApplication.value, steps.value[0]?.id ?? null)
    resetRemarks(selectedApplication.value.status_remarks)
  })

  const review = computed(() => {
    const application = selectedApplication.value
    if (!application) return null
    const applicant = application.applicant
    return {
      name: [applicant.first_name, applicant.middle_name, applicant.surname, applicant.suffix].filter(Boolean).join(' '),
      reference: jobApplicationCode(application.id, application.created_at),
      appliedOn: formatGipDate(application.created_at),
      details: describeGipApplicant(applicant),
      documents: toJobApplicationRequirements(vacancy.value?.requirements ?? [], documents.value).map(({ name, isOptional }) => {
        const file = documents.value[name]
        return { name, isOptional, fileName: file?.file_name ?? null, url: file?.url ?? null }
      }),
    }
  })

  const hasStageChange = computed(
    () =>
      !!selectedApplication.value &&
      (stage.value !== currentTarget(selectedApplication.value, steps.value[0]?.id ?? null) ||
        (stage.value === 'rejected' && remarksToSave.value !== (selectedApplication.value.status_remarks ?? null))),
  )

  const onDetailOpenChange = (open: boolean) => {
    if (open || isSavingStage.value) return
    store.closeApplication()
  }

  async function saveStage() {
    if (!hasStageChange.value || !validateRemarks()) return
    const label = String(stageOptions.value.find((option) => option.value === stage.value)?.label ?? 'the new step')
    await store.updateStage(stage.value, label.replace(/^\d+\. /, ''), remarksToSave.value)
  }

  // Another posting reuses the page: load its applicants
  watch(
    vacancyId,
    (id) => {
      if (!id) return
      searchInput.value = ''
      void store.openVacancy(id)
    },
    { immediate: true },
  )

  return {
    vacancyHeader,
    errorMessage,
    reload: () => store.openVacancy(vacancyId.value),
    // Stage chips & toolbar
    stageCards,
    selectStage,
    stageFilter,
    searchInput,
    hasFilters,
    clearFilters,
    // Table
    table,
    columns,
    applicants,
    isLoading,
    getRowCard,
    getRowSwipeActions,
    rangeLabel,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    // Review sheet
    isDetailOpen,
    review,
    stage: stageModel,
    stageOptions,
    remarks,
    remarksError,
    isRemarksRequired,
    hasStageChange,
    isSavingStage,
    onDetailOpenChange,
    saveStage,
  }
}
