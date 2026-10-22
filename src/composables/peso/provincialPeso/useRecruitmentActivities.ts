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
import { useRecruitmentActivityStore } from '@/stores/peso/provincialPeso/recruitmentActivityStore'
import { formatJobFairSchedule } from '@/helpers/peso/provincialPeso/jobFairHelper'
import {
  getBeforeChecklistProgress,
  getJobOrderCount,
  getRecruitmentActivityStatusBadgeClass,
  getTerminalReportDueLabel,
} from '@/helpers/peso/provincialPeso/recruitmentActivityHelper'
import { renderRowActions, toSwipeActions, type RowActionHandlers } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import type { SwipeCard } from '@/types/common/swipeCard'
import {
  RECRUITMENT_ACTIVITY_STATUSES,
  RECRUITMENT_ACTIVITY_TYPES,
  type RecruitmentActivityListItem,
} from '@/types/peso/provincialPeso/recruitmentActivity'

export function useRecruitmentActivities() {
  const router = useRouter()
  const store = useRecruitmentActivityStore()
  const { activities, isLoading, errorMessage, isDeleting, activityToDelete } = storeToRefs(store)
  const { fetchActivities, openAddDialog, openEditDialog, requestDelete, cancelDelete, deleteActivity } = store

  const viewActivity = (row: RecruitmentActivityListItem) =>
    router.push({ name: 'provincial-peso-recruitment-activity-details', params: { activityId: row.id } })

  const sorting = ref<SortingState>([{ id: 'start_date', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  // Shared by the desktop action buttons and the mobile swipe actions (DESIGN.md 13.2)
  const getRowActionHandlers = (row: RecruitmentActivityListItem): RowActionHandlers => ({
    onView: () => viewActivity(row),
    viewLabel: 'View details',
    onEdit: () => openEditDialog(row),
    onDelete: () => requestDelete(row),
  })
  const getRowSwipeActions = (row: RecruitmentActivityListItem) => toSwipeActions(getRowActionHandlers(row))

  /** Mobile card: main name, then one line of key details */
  const getRowCard = (row: RecruitmentActivityListItem): SwipeCard => ({
    title: row.agency_name,
    subtitle: [row.type, formatJobFairSchedule(row.start_date, row.end_date), row.status].filter(Boolean).join(' · '),
  })

  const columns: ColumnDef<RecruitmentActivityListItem>[] = [
    {
      accessorKey: 'agency_name',
      header: sortableHeader('Agency'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'text-left font-medium hover:text-primary hover:underline',
              onClick: () => viewActivity(row.original),
            },
            row.original.agency_name
          ),
          row.original.cono_number
            ? h('div', { class: 'text-xs text-muted-foreground' }, `CONO ${row.original.cono_number}`)
            : null,
        ]),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      filterFn: 'equalsString',
      cell: ({ row }) => h(Badge, { variant: 'outline' }, () => row.original.type),
    },
    {
      accessorKey: 'start_date',
      header: sortableHeader('Date of Conduct'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm' }, formatJobFairSchedule(row.original.start_date, row.original.end_date)),
    },
    {
      accessorKey: 'venue',
      header: 'Venue',
      enableSorting: false,
      cell: ({ row }) =>
        h(
          'div',
          { class: 'max-w-[220px] truncate text-sm' },
          [row.original.venue, row.original.city_municipality].filter(Boolean).join(', ') || '—'
        ),
    },
    {
      id: 'checklist',
      accessorFn: (row) => getBeforeChecklistProgress(row).done,
      header: 'Requirements',
      cell: ({ row }) => {
        const { done, total } = getBeforeChecklistProgress(row.original)
        return h('div', { class: 'text-sm tabular-nums' }, `${done} / ${total}`)
      },
    },
    {
      id: 'jobOrders',
      accessorFn: getJobOrderCount,
      header: sortableHeader('Vacancies'),
      cell: ({ getValue }) => h('div', { class: 'text-center text-sm font-medium tabular-nums' }, String(getValue())),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) => {
        const dueLabel = getTerminalReportDueLabel(row.original)
        return h('div', { class: 'space-y-1' }, [
          h(
            Badge,
            { variant: 'outline', class: getRecruitmentActivityStatusBadgeClass(row.original.status) },
            () => row.original.status
          ),
          dueLabel ? h('div', { class: 'whitespace-nowrap text-xs text-muted-foreground' }, dueLabel) : null,
        ])
      },
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
      return activities.value
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

  const isDeleteDialogOpen = computed({
    get: () => activityToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  onMounted(() => {
    void fetchActivities()
  })

  return {
    getRowSwipeActions,
    getRowCard,
    table,
    columns,
    activities,
    isLoading,
    errorMessage,
    isDeleting,
    activityToDelete,
    isDeleteDialogOpen,
    typeOptions: RECRUITMENT_ACTIVITY_TYPES,
    statusOptions: RECRUITMENT_ACTIVITY_STATUSES,
    refreshActivities: fetchActivities,
    openAddDialog,
    confirmDelete: deleteActivity,
  }
}
