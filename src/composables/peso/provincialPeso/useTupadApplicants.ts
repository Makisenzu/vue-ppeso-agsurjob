import { computed, h, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import type { ColumnDef, ColumnFiltersState, RowSelectionState, SortingState } from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowUpDown, Pencil, Trash2 } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTupadStore } from '@/stores/peso/provincialPeso/tupadStore'
import {
  countTupadRequiredDocuments,
  formatTupadApplicantName,
  formatTupadDate,
  formatTupadIncome,
  getTupadMunicipality,
  getTupadStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/tupadHelper'
import {
  parseTupadIncome,
  toggleTupadDocument,
  tupadDocumentsSchema,
  tupadIncomeSchema,
  withLockedTupadDocument,
} from '@/helpers/common/tupadFormHelper'
import {
  TUPAD_APPLICANT_STATUSES,
  TUPAD_DOCUMENT_OPTIONS,
  TUPAD_LOCKED_DOCUMENT,
  type TupadApplicantStatus,
  type TupadApplicantWithRegistry,
} from '@/types/peso/provincialPeso/tupad'
import { normalizeStatusRemarks, refineStatusRemarks, requiresStatusRemarks } from '@/helpers/common/statusRemarksHelper'
import { useStatusRemarks } from '@/composables/common/useStatusRemarks'

const reviewSchema = toTypedSchema(
  z
    .object({
      status: z.enum(TUPAD_APPLICANT_STATUSES),
      // Accepts the number v-model gives for <input type="number"> (was string-only: "Expected string, received number")
      monthly_income: tupadIncomeSchema,
      dependent_name: z.string().trim().optional(),
      doc_submitted: tupadDocumentsSchema,
      remarks: z.string().trim().optional(),
    })
    // Rejecting needs remarks; the applicant reads them in their notification
    .superRefine(refineStatusRemarks)
)

const INITIAL_VALUES = {
  status: 'Pending' as TupadApplicantStatus,
  monthly_income: '' as number | string,
  dependent_name: '',
  doc_submitted: [TUPAD_LOCKED_DOCUMENT] as string[],
  remarks: '',
}

function toFormValues(row: TupadApplicantWithRegistry): typeof INITIAL_VALUES {
  return {
    status: TUPAD_APPLICANT_STATUSES.find((s) => s === row.status) ?? 'Pending',
    monthly_income: row.monthly_income ?? '',
    dependent_name: row.dependent_name ?? '',
    doc_submitted: withLockedTupadDocument(row.doc_submitted),
    remarks: row.status_remarks ?? '',
  }
}

/**
 * TUPAD applicants — registry applicants whose referred_programs include TUPAD
 * (added automatically by applicantEntryService), with the PESO review dialog.
 */
export function useTupadApplicants() {
  const store = useTupadStore()
  const {
    tupadApplicants,
    isLoadingApplicants,
    applicantsError,
    reviewingApplicant,
    reviewDocuments,
    isLoadingReviewDocuments,
    applicantsToDelete,
    isSubmitting,
    isDeleting,
  } = storeToRefs(store)
  const { fetchTupadApplicants, openReviewApplicant, closeReviewApplicant, saveApplicantReview } = store

  const {
    bulkUpdateApplicantStatus,
    requestDeleteApplicants,
    cancelDeleteApplicants,
    deleteApplicants,
  } = store

  const sorting = ref<SortingState>([{ id: 'created_at', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])
  const rowSelection = ref<RowSelectionState>({})

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  // Mobile card + swipe actions (DESIGN.md 13.2): the same handlers as the desktop buttons, Delete first (outer edge)
  const getRowCard = (row: TupadApplicantWithRegistry): SwipeCard => ({
    title: formatTupadApplicantName(row),
    subtitle: [getTupadMunicipality(row.applicant), row.status].filter(Boolean).join(' · '),
  })
  const getRowSwipeActions = (row: TupadApplicantWithRegistry): SwipeAction[] => [
    { id: 'delete', label: 'Delete', icon: Trash2, dismiss: false, onSelect: () => requestDeleteApplicants([row]) },
    { id: 'review', label: 'Review', icon: Pencil, dismiss: false, onSelect: () => openReviewApplicant(row) },
  ]

  const columns: ColumnDef<TupadApplicantWithRegistry>[] = [
    {
      id: 'select',
      enableSorting: false,
      header: ({ table }) =>
        h(Checkbox, {
          modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true),
          'aria-label': 'Select all on this page',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(value === true),
          'aria-label': `Select ${formatTupadApplicantName(row.original)}`,
        }),
    },
    {
      id: 'name',
      accessorFn: (row) => formatTupadApplicantName(row),
      header: sortableHeader('Applicant'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[180px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, formatTupadApplicantName(row.original)),
          row.original.applicant?.contact_numbers?.[0]
            ? h('div', { class: 'text-xs text-muted-foreground' }, row.original.applicant.contact_numbers[0])
            : null,
        ]),
    },
    {
      id: 'municipality',
      accessorFn: (row) => getTupadMunicipality(row.applicant),
      header: sortableHeader('Municipality'),
      filterFn: 'equalsString',
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm' }, getValue() as string),
    },
    {
      accessorKey: 'monthly_income',
      header: sortableHeader('Monthly Income'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm tabular-nums' }, formatTupadIncome(row.original.monthly_income)),
    },
    {
      accessorKey: 'dependent_name',
      header: 'Dependent',
      enableSorting: false,
      cell: ({ row }) => h('div', { class: 'max-w-[200px] truncate text-sm' }, row.original.dependent_name || '—'),
    },
    {
      id: 'documents',
      accessorFn: (row) => countTupadRequiredDocuments(row),
      header: sortableHeader('Documents'),
      cell: ({ getValue }) =>
        h('div', { class: 'text-center text-sm tabular-nums' }, `${getValue()}/${TUPAD_DOCUMENT_OPTIONS.length}`),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: getTupadStatusBadgeClass(row.original.status) }, () => row.original.status),
    },
    {
      accessorKey: 'created_at',
      header: sortableHeader('Date Referred'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatTupadDate(row.original.created_at)),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'flex items-center justify-end gap-1' }, [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'icon',
              class: 'size-8',
              title: 'Review',
              'aria-label': 'Review',
              onClick: () => openReviewApplicant(row.original),
            },
            () => h(Pencil, { class: 'size-4' })
          ),
          h(
            Button,
            {
              variant: 'ghost',
              size: 'icon',
              class: 'size-8 text-destructive hover:bg-destructive/10 hover:text-destructive',
              title: 'Delete',
              'aria-label': 'Delete',
              onClick: () => requestDeleteApplicants([row.original]),
            },
            () => h(Trash2, { class: 'size-4' })
          ),
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return tupadApplicants.value
    },
    columns,
    // Keeps the selection on the right rows across refreshes and sorting
    getRowId: (row) => row.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    onColumnFiltersChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnFilters),
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get rowSelection() {
        return rowSelection.value
      },
    },
  })

  // ─── Bulk actions ───

  /** Selected applicants that still exist (a refresh or delete can remove rows). */
  const selectedApplicants = computed(() => {
    const ids = new Set(Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]))
    return tupadApplicants.value.filter((row) => ids.has(row.id))
  })

  const bulkStatus = ref<TupadApplicantStatus | ''>('')
  // Bulk Rejected applies one set of remarks to every selected applicant
  const {
    remarks: bulkRemarks,
    remarksError: bulkRemarksError,
    isRemarksRequired: isBulkRemarksRequired,
    remarksToSave: bulkRemarksToSave,
    validateRemarks: validateBulkRemarks,
    resetRemarks: resetBulkRemarks,
  } = useStatusRemarks(bulkStatus)

  const clearSelection = () => {
    rowSelection.value = {}
    bulkStatus.value = ''
    resetBulkRemarks()
  }

  const applyBulkStatus = async () => {
    if (!bulkStatus.value || selectedApplicants.value.length === 0 || !validateBulkRemarks()) return
    const ok = await bulkUpdateApplicantStatus(
      selectedApplicants.value.map((row) => row.id),
      bulkStatus.value,
      bulkRemarksToSave.value
    )
    if (ok) clearSelection()
  }

  const requestBulkDelete = () => {
    if (selectedApplicants.value.length) requestDeleteApplicants(selectedApplicants.value)
  }

  const isDeleteDialogOpen = computed({
    get: () => applicantsToDelete.value.length > 0,
    set: (open: boolean) => {
      if (!open && !isDeleting.value) cancelDeleteApplicants()
    },
  })

  const confirmDelete = async () => {
    const deletedIds = await deleteApplicants()
    if (deletedIds.length === 0) return
    const next = { ...rowSelection.value }
    for (const id of deletedIds) delete next[id]
    rowSelection.value = next
  }

  const municipalityOptions = computed(() =>
    [...new Set(tupadApplicants.value.map((row) => getTupadMunicipality(row.applicant)).filter((m) => m !== '—'))].sort()
  )

  // ─── Review dialog ───

  const { handleSubmit, resetForm, values: reviewValues } = useForm({
    validationSchema: reviewSchema,
    initialValues: INITIAL_VALUES,
  })

  const isReviewDialogOpen = computed(() => reviewingApplicant.value !== null)
  const isReviewRemarksRequired = computed(() => requiresStatusRemarks(reviewValues.status))

  watch(reviewingApplicant, (row) => {
    if (row) resetForm({ values: toFormValues(row) })
  })

  const onReviewDialogOpenChange = (open: boolean) => {
    if (!open) closeReviewApplicant()
  }

  /** PESO ticks documents without a file; the applicant's own uploads are shown next to them. */
  const toggleDocument = toggleTupadDocument

  const submitReview = handleSubmit(async (values) => {
    await saveApplicantReview({
      status: values.status,
      monthly_income: parseTupadIncome(values.monthly_income),
      dependent_name: values.dependent_name || null,
      doc_submitted: values.doc_submitted,
      status_remarks: normalizeStatusRemarks(values.remarks),
    })
  })

  onMounted(() => {
    void fetchTupadApplicants()
  })

  return {
    getRowSwipeActions,
    getRowCard,
    table,
    columns,
    tupadApplicants,
    isLoading: isLoadingApplicants,
    errorMessage: applicantsError,
    statusOptions: TUPAD_APPLICANT_STATUSES,
    documentOptions: TUPAD_DOCUMENT_OPTIONS,
    lockedDocument: TUPAD_LOCKED_DOCUMENT,
    municipalityOptions,
    refresh: fetchTupadApplicants,
    reviewingApplicant,
    reviewDocuments,
    isLoadingReviewDocuments,
    isReviewDialogOpen,
    isReviewRemarksRequired,
    // bulk actions & delete
    selectedApplicants,
    bulkStatus,
    bulkRemarks,
    bulkRemarksError,
    isBulkRemarksRequired,
    clearSelection,
    applyBulkStatus,
    requestBulkDelete,
    applicantsToDelete,
    isDeleting,
    isDeleteDialogOpen,
    confirmDelete,
    isSubmitting,
    onReviewDialogOpenChange,
    toggleDocument,
    submitReview,
  }
}
