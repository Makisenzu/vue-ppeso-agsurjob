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
import { useJobFairParticipantStore } from '@/stores/peso/provincialPeso/jobFairParticipantStore'
import {
  formatOptionalDate,
  formatParticipantAddress,
  formatWorkExperience,
  getParticipantStatusBadgeClass,
  getVacancyStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/jobFairHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import { NATURE_OF_WORK_OPTIONS, type JobVacancyRow } from '@/types/peso/provincialPeso/jobFair'

export function useParticipantVacancies() {
  const route = useRoute()
  const store = useJobFairParticipantStore()
  const { jobFair, participant, vacancies, isVacanciesLoading, vacanciesErrorMessage, isDeleting, vacancyToDelete } =
    storeToRefs(store)
  const {
    loadParticipantVacancies,
    openCreateVacancyDialog,
    openEditVacancyDialog,
    requestVacancyDelete,
    cancelVacancyDelete,
    deleteVacancy,
  } = store

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))
  const participantId = computed(() => String(route.params.participantId ?? ''))

  const participantAddress = computed(() => (participant.value ? formatParticipantAddress(participant.value) : '—'))
  const participantStatusClass = computed(() => getParticipantStatusBadgeClass(participant.value?.status))
  const totalOpenings = computed(() => vacancies.value.reduce((sum, v) => sum + (v.vacancy_count ?? 0), 0))

  const sorting = ref<SortingState>([{ id: 'position_title', desc: false }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<JobVacancyRow>[] = [
    {
      accessorKey: 'position_title',
      header: sortableHeader('Position'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, row.original.position_title),
          row.original.job_description
            ? h('div', { class: 'line-clamp-2 text-xs text-muted-foreground' }, row.original.job_description)
            : null,
        ]),
    },
    {
      accessorKey: 'nature_of_work',
      header: 'Nature of Work',
      filterFn: 'equalsString',
      cell: ({ row }) => h(Badge, { variant: 'outline', class: 'whitespace-nowrap' }, () => row.original.nature_of_work),
    },
    {
      accessorKey: 'vacancy_count',
      header: sortableHeader('Openings'),
      cell: ({ row }) =>
        h('div', { class: 'text-center text-sm font-medium tabular-nums' }, String(row.original.vacancy_count ?? 0)),
    },
    {
      accessorKey: 'salary',
      header: 'Salary',
      enableSorting: false,
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, row.original.salary || '—'),
    },
    {
      accessorKey: 'place_of_work',
      header: 'Place of Work',
      enableSorting: false,
      cell: ({ row }) => h('div', { class: 'max-w-[180px] truncate text-sm' }, row.original.place_of_work || '—'),
    },
    {
      id: 'qualifications',
      header: 'Qualifications',
      enableSorting: false,
      cell: ({ row }) => {
        const v = row.original
        return h('div', { class: 'min-w-[180px] space-y-0.5 text-xs' }, [
          h('div', { class: 'text-sm' }, v.educational_level || 'Any education level'),
          v.course_shs_strand ? h('div', { class: 'text-muted-foreground' }, v.course_shs_strand) : null,
          h('div', { class: 'text-muted-foreground' }, `Experience: ${formatWorkExperience(v.work_experience_months)}`),
        ])
      },
    },
    {
      id: 'inclusivity',
      header: 'Open To',
      enableSorting: false,
      cell: ({ row }) => {
        const tags = [
          row.original.accepts_pwd ? 'PWD' : null,
          row.original.accepts_returning_ofw ? 'Returning OFW' : null,
        ].filter((tag): tag is string => Boolean(tag))
        if (!tags.length) return h('span', { class: 'text-sm text-muted-foreground' }, '—')
        return h(
          'div',
          { class: 'flex flex-wrap gap-1' },
          tags.map((tag) => h(Badge, { variant: 'secondary', class: 'whitespace-nowrap' }, () => tag))
        )
      },
    },
    {
      accessorKey: 'valid_until',
      header: sortableHeader('Valid Until'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatOptionalDate(row.original.valid_until)),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.status
          ? h(
              Badge,
              { variant: 'outline', class: ['capitalize', getVacancyStatusBadgeClass(row.original.status)].join(' ') },
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
          onEdit: () => openEditVacancyDialog(row.original),
          onDelete: () => requestVacancyDelete(row.original),
        }),
    },
  ]

  const table = useVueTable({
    get data() {
      return vacancies.value
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

  const refreshVacancies = () => {
    if (jobFairId.value && participantId.value) void loadParticipantVacancies(jobFairId.value, participantId.value)
  }

  const isDeleteDialogOpen = computed({
    get: () => vacancyToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelVacancyDelete()
    },
  })

  watch([jobFairId, participantId], refreshVacancies, { immediate: true })

  return {
    table,
    columns,
    jobFair,
    jobFairId,
    participant,
    participantAddress,
    participantStatusClass,
    vacancies,
    totalOpenings,
    isLoading: isVacanciesLoading,
    errorMessage: vacanciesErrorMessage,
    natureOfWorkOptions: NATURE_OF_WORK_OPTIONS,
    isDeleting,
    vacancyToDelete,
    isDeleteDialogOpen,
    refreshVacancies,
    openCreateVacancyDialog,
    confirmDelete: deleteVacancy,
  }
}
