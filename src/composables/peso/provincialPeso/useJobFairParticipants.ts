import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
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
import { useJobFairParticipantStore } from '@/stores/peso/provincialPeso/jobFairParticipantStore'
import {
  formatJobFairSchedule,
  getJobFairStatusBadgeClass,
  getParticipantStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/jobFairHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import { hasValidCoordinates } from '@/helpers/common/mapboxHelpers'
import { EMPLOYER_CATEGORIES, type JobFairParticipantWithCount } from '@/types/peso/provincialPeso/jobFair'

export function useJobFairParticipants() {
  const route = useRoute()
  const router = useRouter()
  const store = useJobFairParticipantStore()
  const { jobFair, participants, isLoading, errorMessage, isDeleting, participantToDelete } = storeToRefs(store)
  const { loadJobFair, openCreateDialog, openEditDialog, requestDelete, cancelDelete, deleteParticipant } = store

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))

  const jobFairSchedule = computed(() =>
    jobFair.value ? formatJobFairSchedule(jobFair.value.start_date, jobFair.value.end_date) : ''
  )
  const jobFairStatusClass = computed(() => getJobFairStatusBadgeClass(jobFair.value?.status))
  const hasMapLocation = computed(() => hasValidCoordinates(jobFair.value?.latitude, jobFair.value?.longitude))
  const totalVacancies = computed(() =>
    participants.value.reduce((sum, p) => sum + (p.job_vacancies?.[0]?.count ?? 0), 0)
  )

  const viewVacancies = (row: JobFairParticipantWithCount) =>
    router.push({
      name: 'provincial-peso-job-fair-participant-vacancies',
      params: { jobFairId: jobFairId.value, participantId: row.id },
    })

  const sorting = ref<SortingState>([{ id: 'business_name', desc: false }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<JobFairParticipantWithCount>[] = [
    {
      accessorKey: 'business_name',
      header: sortableHeader('Employer'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'text-left font-medium hover:text-primary hover:underline',
              onClick: () => viewVacancies(row.original),
            },
            row.original.business_name
          ),
          row.original.trade_name || row.original.acronym
            ? h(
                'div',
                { class: 'text-xs text-muted-foreground' },
                [row.original.trade_name, row.original.acronym && `(${row.original.acronym})`].filter(Boolean).join(' ')
              )
            : null,
        ]),
    },
    {
      accessorKey: 'employer_category',
      header: 'Category',
      filterFn: 'equalsString',
      cell: ({ row }) => {
        const type = row.original.public_employer_type ?? row.original.private_employer_type
        return h('div', { class: 'space-y-0.5' }, [
          h(Badge, { variant: 'outline' }, () => row.original.employer_category),
          type ? h('div', { class: 'text-xs text-muted-foreground' }, type) : null,
        ])
      },
    },
    {
      accessorKey: 'contact_person_name',
      header: 'Contact',
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'min-w-[160px] space-y-0.5 text-sm' }, [
          h('div', row.original.contact_person_name || '—'),
          h(
            'div',
            { class: 'text-xs text-muted-foreground' },
            row.original.mobile_number || row.original.email_address || row.original.telephone_number || ''
          ),
        ]),
    },
    {
      accessorKey: 'city_municipality',
      header: 'Location',
      cell: ({ row }) =>
        h(
          'div',
          { class: 'max-w-[200px] truncate text-sm' },
          [row.original.city_municipality, row.original.province].filter(Boolean).join(', ') || '—'
        ),
    },
    {
      id: 'vacancies',
      accessorFn: (row) => row.job_vacancies?.[0]?.count ?? 0,
      header: sortableHeader('Vacancies'),
      cell: ({ getValue }) => h('div', { class: 'text-center text-sm font-medium tabular-nums' }, String(getValue())),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.status
          ? h(
              Badge,
              { variant: 'outline', class: getParticipantStatusBadgeClass(row.original.status) },
              () => row.original.status
            )
          : h('span', { class: 'text-sm text-muted-foreground' }, '—'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        renderRowActions({
          onView: () => viewVacancies(row.original),
          viewLabel: 'View vacancies',
          onEdit: () => openEditDialog(row.original),
          onDelete: () => requestDelete(row.original),
        }),
    },
  ]

  const table = useVueTable({
    get data() {
      return participants.value
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

  const refreshParticipants = () => {
    if (jobFairId.value) void loadJobFair(jobFairId.value)
  }

  const isDeleteDialogOpen = computed({
    get: () => participantToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  watch(jobFairId, refreshParticipants, { immediate: true })

  return {
    table,
    columns,
    jobFair,
    participants,
    isLoading,
    errorMessage,
    isDeleting,
    participantToDelete,
    isDeleteDialogOpen,
    jobFairSchedule,
    jobFairStatusClass,
    hasMapLocation,
    totalVacancies,
    categoryOptions: EMPLOYER_CATEGORIES,
    refreshParticipants,
    openCreateDialog,
    confirmDelete: deleteParticipant,
  }
}
