import { computed, h, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
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
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  formatSpesDate,
  formatSpesDays,
  formatSpesFormName,
  getSpesEducationSummary,
  getSpesStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/spesHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import { SPES_STATUSES, type SpesWithApplicant } from '@/types/peso/provincialPeso/spes'

export function useSpesBeneficiaries() {
  const store = useSpesStore()
  const { spesBeneficiaries, spesForms, isLoadingBeneficiaries, beneficiariesError, isDeleting, spesToDelete } =
    storeToRefs(store)
  const {
    fetchSpesBeneficiaries,
    fetchSpesForms,
    openAddSpesDialog,
    openEditSpesDialog,
    requestDeleteSpes,
    cancelDeleteSpes,
    deleteSpes,
  } = store

  const sorting = ref<SortingState>([{ id: 'created_at', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<SpesWithApplicant>[] = [
    {
      id: 'name',
      accessorFn: (row) => formatSpesFormName(row.spes_form),
      header: sortableHeader('Beneficiary'),
      cell: ({ row }) => {
        const form = row.original.spes_form
        return h('div', { class: 'min-w-[180px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, formatSpesFormName(form)),
          form?.contact_number ? h('div', { class: 'text-xs text-muted-foreground' }, form.contact_number) : null,
        ])
      },
    },
    {
      id: 'education',
      accessorFn: (row) => getSpesEducationSummary(row.spes_form),
      header: 'Education',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'max-w-[240px] truncate text-sm' }, getValue() as string),
    },
    {
      accessorKey: 'beneficiary',
      header: 'Type',
      cell: ({ row }) => h('div', { class: 'text-sm' }, row.original.beneficiary || '—'),
    },
    {
      id: 'days_duration',
      accessorFn: (row) => Number(row.days_duration) || 0,
      header: sortableHeader('Duration'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm tabular-nums' }, formatSpesDays(row.original.days_duration)),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) =>
        h(
          Badge,
          { variant: 'outline', class: ['capitalize', getSpesStatusBadgeClass(row.original.status)].join(' ') },
          () => row.original.status || 'Active'
        ),
    },
    {
      accessorKey: 'created_at',
      header: sortableHeader('Date Enrolled'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatSpesDate(row.original.created_at)),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        renderRowActions({
          onEdit: () => openEditSpesDialog(row.original),
          onDelete: () => requestDeleteSpes(row.original),
        }),
    },
  ]

  const table = useVueTable({
    get data() {
      return spesBeneficiaries.value
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
    get: () => spesToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDeleteSpes()
    },
  })

  // ─── Summary counts ───
  const summary = computed(() => {
    const count = (status: string) =>
      spesBeneficiaries.value.filter((spes) => (spes.status ?? '').toLowerCase() === status).length
    return {
      applicants: spesForms.value.length,
      pendingApplicants: spesForms.value.filter((form) => (form.status ?? '').toLowerCase() === 'pending').length,
      active: count('active'),
      completed: count('completed'),
    }
  })

  // Applicants are needed for the "Add Beneficiary" picker and the summary.
  const refreshBeneficiaries = () => Promise.all([fetchSpesBeneficiaries(), fetchSpesForms()])

  onMounted(() => {
    void refreshBeneficiaries()
  })

  return {
    table,
    columns,
    spesBeneficiaries,
    summary,
    isLoading: isLoadingBeneficiaries,
    errorMessage: beneficiariesError,
    isDeleting,
    spesToDelete,
    isDeleteDialogOpen,
    statusOptions: SPES_STATUSES,
    refreshBeneficiaries,
    openAddSpesDialog,
    confirmDelete: deleteSpes,
  }
}
