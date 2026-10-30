import { computed, h, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { watchDebounced } from '@vueuse/core'
import * as z from 'zod'
import type { ColumnDef, RowSelectionState } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { CheckCircle2, MoreHorizontal, Pencil, RotateCcw, Trash2, XCircle } from '@lucide/vue'
import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useAuthStore } from '@/stores/common/auth'
import { useJobPostingStore } from '@/stores/employer/jobPostingStore'
import { useJobPostingAttachments } from '@/composables/employer/useJobPostingAttachments'
import {
  EMPTY_JOB_VACANCY_FORM_VALUES,
  jobVacancyFormShape,
  refineCompleteJobVacancyForm,
  toJobVacancyFields,
  toJobVacancyFormValues,
  toJobVacancyMatching,
} from '@/helpers/common/jobVacancyHelper'
import { toReviewStatus } from '@/helpers/common/companyRequirementHelper'
import {
  JOB_POSTING_STATUS_FILTER_OPTIONS,
  formatJobPostingDate,
  getJobPostingStatusLabel,
  getJobPostingStatusVariant,
  isJobPostingExpired,
  isJobPostingStatusFilter,
  jobPostingRequirementsSchema,
  toJobPostingRequirementValues,
  toJobVacancyRequirements,
} from '@/helpers/employer/jobPostingHelper'
import type { JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import type { JobPostingFormValues, JobPostingListRow, JobPostingStatusFilter } from '@/types/employer/jobPosting'

/**
 * Every job_vacancies field is required, as on PESO's vacancy forms, including the skills used for matching,
 * plus the documents applicants submit (employer postings only, migration 088)
 */
const jobPostingSchema = toTypedSchema(
  z.object({ ...jobVacancyFormShape, requirements: jobPostingRequirementsSchema }).superRefine(refineCompleteJobVacancyForm),
)

/** Up to 3 skill names, then "+N" */
function summarizeSkills(row: JobPostingListRow): string {
  const names = row.skills.map((skill) => skill.skill_name)
  if (names.length === 0) return 'No skills listed'
  const shown = names.slice(0, 3).join(', ')
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown
}

const todayIso = () => new Date().toISOString().slice(0, 10)

/** Job Posting page (owner only): stats, server-paged list, create / edit sheet, status changes, delete */
export function useJobPostings() {
  const authStore = useAuthStore()
  const store = useJobPostingStore()
  const {
    rows,
    total,
    stats,
    statusFilter,
    page,
    pageSize,
    isLoading,
    isLoadingStats,
    isFormOpen,
    editingPosting,
    isSaving,
    busyId,
    isBulkDeleting,
  } = storeToRefs(store)

  /** PESO verifies the company before its postings reach applicants */
  const isCompanyVerified = computed(
    () => toReviewStatus(authStore.employerProfile?.verification_status) === 'approved',
  )

  // ─── Stats ───
  const statCards = computed(() => [
    { key: 'all' as const, label: 'All postings', value: stats.value.all },
    { key: 'open' as const, label: 'Open', value: stats.value.open },
    { key: 'filled' as const, label: 'Filled', value: stats.value.filled },
    { key: 'closed' as const, label: 'Closed', value: stats.value.closed + stats.value.cancelled },
  ])

  // ─── Search & filter (debounced, server side) ───
  const searchInput = ref('')
  watchDebounced(searchInput, (value) => store.setSearch(value), { debounce: 300 })

  const statusFilterModel = computed({
    get: () => statusFilter.value,
    set: (value: unknown) => {
      if (isJobPostingStatusFilter(value)) store.setStatusFilter(value)
    },
  })

  const selectStat = (key: JobPostingStatusFilter) => {
    statusFilterModel.value = statusFilter.value === key ? 'all' : key
  }

  const hasFilters = computed(() => searchInput.value.trim() !== '' || statusFilter.value !== 'all')
  function clearFilters() {
    searchInput.value = ''
    store.setStatusFilter('all')
  }

  // ─── Row actions (same handlers for desktop menu and mobile swipe) ───
  const postingToDelete = ref<JobPostingListRow | null>(null)
  const isDeleteOpen = computed({
    get: () => postingToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) postingToDelete.value = null
    },
  })

  const requestDelete = (row: JobPostingListRow) => {
    postingToDelete.value = row
  }
  const editPosting = (row: JobPostingListRow) => store.openEdit(row.id)
  const setStatus = (row: JobPostingListRow, status: JobVacancyStatus) => store.setPostingStatus(row, status)

  /** Open postings can be filled or closed; any other status can be reopened */
  function getStatusActions(row: JobPostingListRow) {
    if ((row.status ?? 'open') === 'open') {
      return [
        { id: 'filled', label: 'Mark as filled', icon: CheckCircle2, status: 'filled' as const },
        { id: 'closed', label: 'Close posting', icon: XCircle, status: 'closed' as const },
      ]
    }
    return [{ id: 'open', label: 'Reopen', icon: RotateCcw, status: 'open' as const }]
  }

  /** Delete first (outer edge); it's confirmed by an AlertDialog, so no action collapses the card */
  const getRowSwipeActions = (row: JobPostingListRow): SwipeAction[] => [
    { id: 'delete', label: 'Delete', icon: Trash2, dismiss: false, onSelect: () => requestDelete(row) },
    { id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: () => editPosting(row) },
    ...getStatusActions(row).map((action) => ({
      id: action.id,
      label: action.id === 'filled' ? 'Filled' : action.id === 'closed' ? 'Close' : 'Reopen',
      icon: action.icon,
      dismiss: false,
      onSelect: () => setStatus(row, action.status),
    })),
  ]

  /** Mobile card: position, then status · openings · skills */
  const getRowCard = (row: JobPostingListRow): SwipeCard => ({
    title: row.position_title,
    subtitle: [
      getJobPostingStatusLabel(row.status),
      `${row.vacancy_count ?? 1} opening${(row.vacancy_count ?? 1) === 1 ? '' : 's'}`,
      summarizeSkills(row),
    ].join(' · '),
  })

  // ─── Table (DESIGN.md §13), paged on the server ───
  const rowSelection = ref<RowSelectionState>({})

  const columns: ColumnDef<JobPostingListRow>[] = [
    {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) =>
        h(Checkbox, {
          modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all rows',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row',
        }),
    },
    {
      id: 'position',
      header: 'Position',
      cell: ({ row }) =>
        h('div', { class: 'min-w-0 max-w-xs' }, [
          h('p', { class: 'truncate text-sm font-medium' }, row.original.position_title),
          h(
            'p',
            { class: 'truncate text-xs text-muted-foreground' },
            [row.original.nature_of_work, row.original.place_of_work].filter(Boolean).join(' · '),
          ),
        ]),
    },
    {
      id: 'skills',
      header: 'Skills',
      cell: ({ row }) =>
        h(
          'p',
          {
            class: ['max-w-56 truncate text-sm', row.original.skills.length ? '' : 'text-destructive'],
            title: row.original.skills.map((skill) => skill.skill_name).join(', '),
          },
          summarizeSkills(row.original),
        ),
    },
    {
      id: 'openings',
      header: 'Openings',
      cell: ({ row }) => h('div', { class: 'text-sm tabular-nums' }, String(row.original.vacancy_count ?? 1)),
    },
    {
      id: 'period',
      header: 'Posting period',
      cell: ({ row }) => {
        const expired = (row.original.status ?? 'open') === 'open' && isJobPostingExpired(row.original.valid_until)
        return h('div', { class: 'whitespace-nowrap text-sm' }, [
          h('p', `${formatJobPostingDate(row.original.posting_date)} – ${formatJobPostingDate(row.original.valid_until)}`),
          expired ? h('p', { class: 'text-xs text-destructive' }, 'Past its end date') : null,
        ])
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        h(Badge, { variant: getJobPostingStatusVariant(row.original.status) }, () =>
          getJobPostingStatusLabel(row.original.status),
        ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) =>
        h('div', { class: 'flex justify-end' }, [
          h(DropdownMenu, null, () => [
            h(DropdownMenuTrigger, { asChild: true }, () =>
              h(
                Button,
                {
                  variant: 'ghost',
                  size: 'icon',
                  class: 'size-8',
                  'aria-label': `Actions for ${row.original.position_title}`,
                  disabled: busyId.value === row.original.id,
                },
                () => h(MoreHorizontal, { class: 'size-4' }),
              ),
            ),
            h(DropdownMenuContent, { align: 'end' }, () => [
              h(DropdownMenuItem, { onSelect: () => editPosting(row.original) }, () => [
                h(Pencil, { class: 'size-4' }),
                'Edit',
              ]),
              ...getStatusActions(row.original).map((action) =>
                h(DropdownMenuItem, { key: action.id, onSelect: () => setStatus(row.original, action.status) }, () => [
                  h(action.icon, { class: 'size-4' }),
                  action.label,
                ]),
              ),
              h(DropdownMenuSeparator),
              h(
                DropdownMenuItem,
                { variant: 'destructive', onSelect: () => requestDelete(row.original) },
                () => [h(Trash2, { class: 'size-4' }), 'Delete'],
              ),
            ]),
          ]),
        ]),
    },
  ]

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const table = useVueTable({
    get data() {
      return rows.value
    },
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    get pageCount() {
      return pageCount.value
    },
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    state: {
      get rowSelection() {
        return rowSelection.value
      },
      get pagination() {
        return { pageIndex: page.value, pageSize: pageSize.value }
      },
    },
  })

  const selectedIds = computed(() => table.getSelectedRowModel().rows.map((row) => row.original.id))
  const clearSelection = () => table.resetRowSelection()

  // A refetch, page change or filter change replaces the rows: start the selection over (§13.1 rule 3)
  watch(rows, clearSelection)

  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 postings'
    const from = page.value * pageSize.value + 1
    const to = Math.min(total.value, from + rows.value.length - 1)
    return `${from}–${to} of ${total.value} posting${total.value === 1 ? '' : 's'}`
  })
  const canPreviousPage = computed(() => page.value > 0)
  const canNextPage = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => store.setPage(page.value - 1)
  const nextPage = () => store.setPage(page.value + 1)

  // ─── Delete (AlertDialog) ───
  async function confirmDelete() {
    const posting = postingToDelete.value
    if (posting && (await store.deletePostings([posting.id]))) postingToDelete.value = null
  }

  const isBulkDeleteOpen = ref(false)
  async function confirmBulkDelete() {
    if (await store.deletePostings([...selectedIds.value])) isBulkDeleteOpen.value = false
  }

  // ─── Create / edit sheet ───
  const { handleSubmit, resetForm } = useForm<JobPostingFormValues>({
    validationSchema: jobPostingSchema,
    initialValues: { ...EMPTY_JOB_VACANCY_FORM_VALUES, requirements: toJobPostingRequirementValues() },
  })

  const attachments = useJobPostingAttachments()

  const isEditMode = computed(() => editingPosting.value !== null)
  const formTitle = computed(() => (isEditMode.value ? 'Edit Job Posting' : 'Post a Job'))

  // Load the selected posting (or blank values, starting today) each time the sheet opens
  watch(isFormOpen, (open) => {
    if (!open) return
    attachments.resetAttachments(editingPosting.value?.attachments ?? [])
    resetForm({
      values: editingPosting.value
        ? {
            ...toJobVacancyFormValues(editingPosting.value, editingPosting.value),
            requirements: toJobPostingRequirementValues(editingPosting.value.requirements),
          }
        : {
            ...EMPTY_JOB_VACANCY_FORM_VALUES,
            postingDate: todayIso(),
            placeOfWork: authStore.employerProfile?.company_address ?? '',
            requirements: toJobPostingRequirementValues(),
          },
    })
  })

  const onFormOpenChange = (open: boolean) => {
    if (open || isSaving.value) return
    store.closeForm()
  }

  const submitPosting = handleSubmit(async (values) => {
    const matching = toJobVacancyMatching(values)
    await store.savePosting({
      vacancy: {
        ...toJobVacancyFields(values),
        vacancy_count: values.vacancyCount,
        status: values.status,
        related_courses: matching.related_courses,
      },
      skills: matching.skills,
      requirements: toJobVacancyRequirements(values.requirements),
    }, attachments.attachmentChanges.value)
  })

  onMounted(async () => {
    await authStore.init()
    searchInput.value = store.search
    await store.refresh()
  })

  return {
    isCompanyVerified,
    // Stats
    statCards,
    isLoadingStats,
    selectStat,
    // Toolbar
    searchInput,
    statusFilter: statusFilterModel,
    statusFilterOptions: JOB_POSTING_STATUS_FILTER_OPTIONS,
    hasFilters,
    clearFilters,
    // Table
    table,
    columns,
    rows,
    isLoading,
    getRowCard,
    getRowSwipeActions,
    selectedIds,
    clearSelection,
    rangeLabel,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    // Delete
    postingToDelete,
    isDeleteOpen,
    busyId,
    confirmDelete,
    isBulkDeleteOpen,
    isBulkDeleting,
    confirmBulkDelete,
    // Sheet
    isFormOpen,
    isEditMode,
    formTitle,
    isSaving,
    openCreate: store.openCreate,
    onFormOpenChange,
    submitPosting,
    // Attachments (optional, staged until save)
    attachmentItems: attachments.attachmentItems,
    attachmentError: attachments.attachmentError,
    attachmentRemainingSlots: attachments.remainingSlots,
    attachmentAccept: attachments.attachmentAccept,
    attachmentMaxSizeMB: attachments.attachmentMaxSizeMB,
    attachmentMaxFiles: attachments.attachmentMaxFiles,
    addAttachments: attachments.addAttachments,
    removeAttachment: attachments.removeAttachment,
  }
}
