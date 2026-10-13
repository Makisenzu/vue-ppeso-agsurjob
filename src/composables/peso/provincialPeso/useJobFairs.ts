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
import { ArrowUpDown, ExternalLink, MapPin } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useJobFairStore } from '@/stores/peso/provincialPeso/jobFairStore'
import {
  formatJobFairSchedule,
  getJobFairParticipantCount,
  getJobFairStatusBadgeClass,
  getJobFairVacancyTotal,
} from '@/helpers/peso/provincialPeso/jobFairHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import type { JobFairWithCounts } from '@/types/peso/provincialPeso/jobFair'

export function useJobFairs() {
  const router = useRouter()
  const store = useJobFairStore()
  const { jobFairs, isLoading, errorMessage, isDeleting, jobFairToDelete } = storeToRefs(store)
  const { fetchJobFairs, openAddDialog, openEditDialog, requestDelete, cancelDelete, deleteJobFair } = store

  const viewJobFair = (row: JobFairWithCounts) =>
    router.push({ name: 'provincial-peso-job-fair-participants', params: { jobFairId: row.id } })

  const sorting = ref<SortingState>([{ id: 'start_date', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<JobFairWithCounts>[] = [
    {
      accessorKey: 'title',
      header: sortableHeader('Job Fair'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, row.original.title),
          row.original.description
            ? h('div', { class: 'line-clamp-1 text-xs text-muted-foreground' }, row.original.description)
            : null,
        ]),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) =>
        h('div', { class: 'flex max-w-[220px] items-center gap-1.5 text-sm' }, [
          row.original.latitude !== null && row.original.longitude !== null
            ? h(MapPin, { class: 'size-3.5 shrink-0 text-primary', title: 'Pinned on map' })
            : null,
          h('span', { class: 'truncate' }, row.original.location),
        ]),
    },
    {
      accessorKey: 'start_date',
      header: sortableHeader('Schedule'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm' }, formatJobFairSchedule(row.original.start_date, row.original.end_date)),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) =>
        h(
          Badge,
          { variant: 'outline', class: ['capitalize', getJobFairStatusBadgeClass(row.original.status)].join(' ') },
          () => row.original.status
        ),
    },
    {
      id: 'participants',
      accessorFn: getJobFairParticipantCount,
      header: sortableHeader('Participants'),
      cell: ({ getValue }) => h('div', { class: 'text-center text-sm font-medium tabular-nums' }, String(getValue())),
    },
    {
      id: 'vacancies',
      accessorFn: getJobFairVacancyTotal,
      header: sortableHeader('Vacancies'),
      cell: ({ getValue }) => h('div', { class: 'text-center text-sm font-medium tabular-nums' }, String(getValue())),
    },
    {
      accessorKey: 'registration_link',
      header: 'Registration',
      enableSorting: false,
      cell: ({ row }) => {
        const link = row.original.registration_link
        if (!link) return h('span', { class: 'text-sm text-muted-foreground' }, '—')
        return h(
          'a',
          {
            href: link,
            target: '_blank',
            rel: 'noopener noreferrer',
            class: 'inline-flex items-center gap-1 text-sm text-primary hover:underline',
          },
          ['Open', h(ExternalLink, { class: 'size-3.5' })]
        )
      },
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        renderRowActions({
          onView: () => viewJobFair(row.original),
          viewLabel: 'View participants',
          onEdit: () => openEditDialog(row.original),
          onDelete: () => requestDelete(row.original),
        }),
    },
  ]

  const table = useVueTable({
    get data() {
      return jobFairs.value
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
    get: () => jobFairToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  onMounted(() => {
    void fetchJobFairs()
  })

  return {
    table,
    columns,
    jobFairs,
    isLoading,
    errorMessage,
    isDeleting,
    jobFairToDelete,
    isDeleteDialogOpen,
    refreshJobFairs: fetchJobFairs,
    openAddDialog,
    confirmDelete: deleteJobFair,
  }
}
