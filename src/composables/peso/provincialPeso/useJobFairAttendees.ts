import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import type { ColumnDef, ColumnFiltersState, RowSelectionState, SortingState } from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowUpDown, Loader2, UserCheck, UserMinus } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useJobFairAttendeeStore } from '@/stores/peso/provincialPeso/jobFairAttendeeStore'
import {
  formatOptionalDate,
  formatRegistryName,
  getAttendeeStatusBadgeClass,
  getRegistryPhone,
} from '@/helpers/peso/provincialPeso/jobFairHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import { JOB_FAIR_APPLICANT_STATUSES, type JobFairAttendee } from '@/types/peso/provincialPeso/jobFair'

const PAGE_SIZE = 10

export function useJobFairAttendees() {
  const route = useRoute()
  const store = useJobFairAttendeeStore()
  const { attendees, isLoading, errorMessage, isDeleting, attendeesToDelete, updatingStatusId } = storeToRefs(store)
  const { loadAttendees, openCreateDialog, openEditDialog, requestDelete, cancelDelete, deleteAttendees, setAttendeeStatus } =
    store

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))

  const attendedCount = computed(() => attendees.value.filter((row) => row.status === 'Attended').length)

  const sorting = ref<SortingState>([{ id: 'applicant', desc: false }])
  const columnFilters = ref<ColumnFiltersState>([])
  const rowSelection = ref<RowSelectionState>({})

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  /** Mark Attended / back to Registered straight from the table. */
  const renderStatusToggle = (row: JobFairAttendee) => {
    const isAttended = row.status === 'Attended'
    const isBusy = updatingStatusId.value === row.id
    const label = isAttended ? 'Mark as registered only' : 'Mark as attended'
    return h(
      Button,
      {
        variant: 'ghost',
        size: 'icon',
        class: 'size-8',
        title: label,
        'aria-label': label,
        disabled: isBusy,
        onClick: () => setAttendeeStatus(row, isAttended ? 'Registered' : 'Attended'),
      },
      () => h(isBusy ? Loader2 : isAttended ? UserMinus : UserCheck, { class: ['size-4', isBusy && 'animate-spin'] })
    )
  }

  const columns: ColumnDef<JobFairAttendee>[] = [
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
          'aria-label': `Select ${row.original.applicant ? formatRegistryName(row.original.applicant) : 'applicant'}`,
        }),
    },
    {
      id: 'applicant',
      accessorFn: (row) => (row.applicant ? formatRegistryName(row.applicant) : ''),
      header: sortableHeader('Applicant'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, row.original.applicant ? formatRegistryName(row.original.applicant) : 'Unknown applicant'),
          row.original.applicant?.sex ? h('div', { class: 'text-xs text-muted-foreground' }, row.original.applicant.sex) : null,
        ]),
    },
    {
      id: 'contact',
      header: 'Contact',
      enableSorting: false,
      cell: ({ row }) => {
        const applicant = row.original.applicant
        return h('div', { class: 'min-w-[160px] space-y-0.5 text-sm' }, [
          h('div', (applicant && getRegistryPhone(applicant)) || '—'),
          applicant?.email ? h('div', { class: 'text-xs text-muted-foreground break-all' }, applicant.email) : null,
        ])
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: getAttendeeStatusBadgeClass(row.original.status) }, () => row.original.status),
    },
    {
      accessorKey: 'attended_at',
      header: sortableHeader('Attended'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm tabular-nums' }, formatOptionalDate(row.original.attended_at)),
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'max-w-[220px] truncate text-sm text-muted-foreground' }, row.original.remarks || '—'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'flex items-center justify-end gap-1' }, [
          renderStatusToggle(row.original),
          renderRowActions({
            onEdit: () => openEditDialog(row.original),
            onDelete: () => requestDelete([row.original]),
          }),
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return attendees.value
    },
    columns,
    // Keeps the selection on the right rows across refreshes and sorting
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: PAGE_SIZE },
    },
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

  const refreshAttendees = () => {
    if (jobFairId.value) void loadAttendees(jobFairId.value)
  }

  // ─── Bulk actions ───

  /** Selected rows that still exist (a refresh or delete can remove rows). */
  const selectedAttendees = computed(() => {
    const ids = new Set(Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]))
    return attendees.value.filter((row) => ids.has(row.id))
  })

  const clearSelection = () => {
    rowSelection.value = {}
  }

  const requestBulkDelete = () => {
    if (selectedAttendees.value.length) requestDelete(selectedAttendees.value)
  }

  const isDeleteDialogOpen = computed({
    get: () => attendeesToDelete.value.length > 0,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  const confirmDelete = async () => {
    const deletedIds = await deleteAttendees()
    if (deletedIds.length === 0) return
    const next = { ...rowSelection.value }
    for (const id of deletedIds) delete next[id]
    rowSelection.value = next
  }

  // A different job fair's rows can't stay selected
  watch(jobFairId, clearSelection)
  watch(jobFairId, refreshAttendees, { immediate: true })

  return {
    table,
    columns,
    attendees,
    attendedCount,
    isLoading,
    errorMessage,
    isDeleting,
    attendeesToDelete,
    isDeleteDialogOpen,
    selectedAttendees,
    clearSelection,
    requestBulkDelete,
    statusOptions: JOB_FAIR_APPLICANT_STATUSES,
    refreshAttendees,
    openCreateDialog,
    confirmDelete,
  }
}
