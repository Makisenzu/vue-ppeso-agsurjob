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
import { ArrowUpDown } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useHotsStore } from '@/stores/peso/provincialPeso/hotsStore'
import { formatHireName, formatOptionalDate } from '@/helpers/peso/provincialPeso/jobFairHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import type { HotsWithDetails } from '@/types/peso/provincialPeso/jobFair'

const PAGE_SIZE = 10

export function useJobFairHots() {
  const route = useRoute()
  const store = useHotsStore()
  const { hires, vacancyOptions, isLoading, errorMessage, isDeleting, hiresToDelete } = storeToRefs(store)
  const { loadHots, openCreateDialog, openEditDialog, requestDelete, cancelDelete, deleteHires } = store

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))

  /** Employers that have hires, for the employer filter. */
  const employerOptions = computed(() =>
    [...new Set(hires.value.map((row) => row.job_fair_participants?.business_name).filter(Boolean) as string[])].sort()
  )
  const totalSlots = computed(() => vacancyOptions.value.reduce((sum, v) => sum + (v.vacancy_count ?? 0), 0))
  const hasVacancies = computed(() => vacancyOptions.value.length > 0)

  const sorting = ref<SortingState>([{ id: 'hired_date', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])
  const rowSelection = ref<RowSelectionState>({})

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<HotsWithDetails>[] = [
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
          'aria-label': `Select ${formatHireName(row.original)}`,
        }),
    },
    {
      id: 'applicant',
      accessorFn: (row) => formatHireName(row),
      header: sortableHeader('Applicant'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h('div', { class: 'flex flex-wrap items-center gap-2' }, [
            h('span', { class: 'font-medium' }, formatHireName(row.original)),
            row.original.applicant_id
              ? h(Badge, { variant: 'secondary', class: 'text-xs' }, () => 'Registry')
              : h(Badge, { variant: 'outline', class: 'text-xs' }, () => 'Walk-in'),
          ]),
          h(
            'div',
            { class: 'text-xs text-muted-foreground' },
            [row.original.applicant_contact_phone, row.original.applicant_email].filter(Boolean).join(' · ')
          ),
        ]),
    },
    {
      id: 'employer',
      accessorFn: (row) => row.job_fair_participants?.business_name ?? '',
      header: sortableHeader('Employer'),
      filterFn: 'equalsString',
      cell: ({ getValue }) => h('div', { class: 'min-w-[160px] text-sm' }, String(getValue() || '—')),
    },
    {
      id: 'position',
      accessorFn: (row) => row.job_vacancies?.position_title ?? '',
      header: sortableHeader('Position'),
      cell: ({ getValue }) => h('div', { class: 'min-w-[140px] text-sm' }, String(getValue() || '—')),
    },
    {
      accessorKey: 'hired_date',
      header: sortableHeader('Hired'),
      cell: ({ row }) => h('div', { class: 'text-sm tabular-nums' }, formatOptionalDate(row.original.hired_date)),
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
        renderRowActions({
          onEdit: () => openEditDialog(row.original),
          onDelete: () => requestDelete([row.original]),
        }),
    },
  ]

  const table = useVueTable({
    get data() {
      return hires.value
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

  const refreshHots = () => {
    if (jobFairId.value) void loadHots(jobFairId.value)
  }

  // ─── Bulk actions ───

  /** Selected rows that still exist (a refresh or delete can remove rows). */
  const selectedHires = computed(() => {
    const ids = new Set(Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]))
    return hires.value.filter((row) => ids.has(row.id))
  })

  const clearSelection = () => {
    rowSelection.value = {}
  }

  const requestBulkDelete = () => {
    if (selectedHires.value.length) requestDelete(selectedHires.value)
  }

  const isDeleteDialogOpen = computed({
    get: () => hiresToDelete.value.length > 0,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  const confirmDelete = async () => {
    const deletedIds = await deleteHires()
    if (deletedIds.length === 0) return
    const next = { ...rowSelection.value }
    for (const id of deletedIds) delete next[id]
    rowSelection.value = next
  }

  // A different job fair's rows can't stay selected
  watch(jobFairId, clearSelection)
  watch(jobFairId, refreshHots, { immediate: true })

  return {
    table,
    columns,
    hires,
    isLoading,
    errorMessage,
    isDeleting,
    hiresToDelete,
    isDeleteDialogOpen,
    selectedHires,
    clearSelection,
    requestBulkDelete,
    employerOptions,
    totalSlots,
    hasVacancies,
    refreshHots,
    openCreateDialog,
    confirmDelete,
  }
}
