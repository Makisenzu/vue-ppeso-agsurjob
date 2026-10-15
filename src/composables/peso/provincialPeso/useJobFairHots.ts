import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
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
import { useHotsStore } from '@/stores/peso/provincialPeso/hotsStore'
import { formatHireName, formatOptionalDate } from '@/helpers/peso/provincialPeso/jobFairHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import type { HotsWithDetails } from '@/types/peso/provincialPeso/jobFair'

export function useJobFairHots() {
  const route = useRoute()
  const store = useHotsStore()
  const { hires, vacancyOptions, isLoading, errorMessage, isDeleting, hireToDelete } = storeToRefs(store)
  const { loadHots, openCreateDialog, openEditDialog, requestDelete, cancelDelete, deleteHire } = store

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))

  /** Employers that have hires, for the employer filter. */
  const employerOptions = computed(() =>
    [...new Set(hires.value.map((row) => row.job_fair_participants?.business_name).filter(Boolean) as string[])].sort()
  )
  const totalSlots = computed(() => vacancyOptions.value.reduce((sum, v) => sum + (v.vacancy_count ?? 0), 0))
  const hasVacancies = computed(() => vacancyOptions.value.length > 0)

  const sorting = ref<SortingState>([{ id: 'hired_date', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<HotsWithDetails>[] = [
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
          onDelete: () => requestDelete(row.original),
        }),
    },
  ]

  const table = useVueTable({
    get data() {
      return hires.value
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

  const refreshHots = () => {
    if (jobFairId.value) void loadHots(jobFairId.value)
  }

  const isDeleteDialogOpen = computed({
    get: () => hireToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  watch(jobFairId, refreshHots, { immediate: true })

  return {
    table,
    columns,
    hires,
    isLoading,
    errorMessage,
    isDeleting,
    hireToDelete,
    isDeleteDialogOpen,
    employerOptions,
    totalSlots,
    hasVacancies,
    refreshHots,
    openCreateDialog,
    confirmDelete: deleteHire,
  }
}
