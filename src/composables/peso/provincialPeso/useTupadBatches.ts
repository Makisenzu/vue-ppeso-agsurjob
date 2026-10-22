import { computed, h, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/vue-table'
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
import { useTupadStore } from '@/stores/peso/provincialPeso/tupadStore'
import { formatTupadDate, formatTupadPeriod, getTupadStatusBadgeClass } from '@/helpers/peso/provincialPeso/tupadHelper'
import { renderRowActions, toSwipeActions, type RowActionHandlers } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import type { SwipeCard } from '@/types/common/swipeCard'
import { TUPAD_BATCH_STATUSES, type TupadBatchWithCount } from '@/types/peso/provincialPeso/tupad'

/** TUPAD dashboard — the list of batches (step 1 of the process) and the applicant pool summary. */
export function useTupadBatches() {
  const router = useRouter()
  const store = useTupadStore()
  const { batches, tupadApplicants, isLoadingBatches, isLoadingApplicants, batchesError, batchToDelete, isDeleting } =
    storeToRefs(store)
  const { fetchBatches, fetchTupadApplicants, openCreateBatch, openEditBatch, requestDeleteBatch, cancelDeleteBatch, deleteBatch } = store

  const openBatch = (batch: TupadBatchWithCount) =>
    router.push({ name: 'provincial-peso-tupad-batch-details', params: { id: batch.id } })
  const openApplicants = () => router.push({ name: 'provincial-peso-tupad-applicants' })

  const sorting = ref<SortingState>([{ id: 'created_at', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  // Shared by the desktop action buttons and the mobile swipe actions (DESIGN.md 13.2)
  const getRowActionHandlers = (row: TupadBatchWithCount): RowActionHandlers => ({
    onView: () => openBatch(row),
    viewLabel: 'Open batch',
    onEdit: () => openEditBatch(row),
    onDelete: () => requestDeleteBatch(row),
  })
  const getRowSwipeActions = (row: TupadBatchWithCount) => toSwipeActions(getRowActionHandlers(row))

  /** Mobile card: main name, then one line of key details */
  const getRowCard = (row: TupadBatchWithCount): SwipeCard => ({
    title: row.edl_number,
    subtitle: [`${row.member_count} member${row.member_count === 1 ? '' : 's'}`, row.status, formatTupadDate(row.created_at)].filter(Boolean).join(' · '),
  })

  const columns: ColumnDef<TupadBatchWithCount>[] = [
    {
      accessorKey: 'edl_number',
      header: sortableHeader('EDL Number'),
      cell: ({ row }) => h('div', { class: 'font-medium whitespace-nowrap' }, row.original.edl_number),
    },
    {
      id: 'period',
      accessorFn: (row) => row.start_date ?? '',
      header: sortableHeader('Period'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatTupadPeriod(row.original)),
    },
    {
      accessorKey: 'member_count',
      header: sortableHeader('Beneficiaries'),
      cell: ({ row }) => h('div', { class: 'text-center text-sm tabular-nums' }, String(row.original.member_count)),
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
      header: sortableHeader('Date Created'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatTupadDate(row.original.created_at)),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        renderRowActions(getRowActionHandlers(row.original)),
    },
  ]

  const table = useVueTable({
    get data() {
      return batches.value
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    onColumnFiltersChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnFilters),
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
    },
  })

  const stats = computed(() => ({
    batches: batches.value.length,
    openBatches: batches.value.filter((b) => b.status === 'Pending' || b.status === 'Ongoing').length,
    engaged: batches.value.reduce((sum, b) => sum + b.member_count, 0),
    applicants: tupadApplicants.value.length,
    pendingApplicants: tupadApplicants.value.filter((a) => a.status === 'Pending').length,
  }))

  const isDeleteDialogOpen = computed({
    get: () => batchToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDeleteBatch()
    },
  })

  const refresh = () => Promise.all([fetchBatches(), fetchTupadApplicants()])

  onMounted(() => {
    void refresh()
  })

  return {
    getRowSwipeActions,
    getRowCard,
    table,
    columns,
    batches,
    stats,
    isLoading: isLoadingBatches,
    isLoadingApplicants,
    errorMessage: batchesError,
    batchToDelete,
    isDeleting,
    isDeleteDialogOpen,
    statusOptions: TUPAD_BATCH_STATUSES,
    refresh,
    openApplicants,
    openCreateBatch,
    confirmDelete: deleteBatch,
  }
}
