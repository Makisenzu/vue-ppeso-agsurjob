import { h, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowUpDown, ClipboardCheck } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRegisteredCompanyStore } from '@/stores/peso/provincialPeso/registeredCompanyStore'
import { useRegisteredCompanyReviewStore } from '@/stores/peso/provincialPeso/registeredCompanyReviewStore'
import {
  COMPANY_STATUS_LABELS,
  getCompanyStatusLabel,
  getReviewStatusBadgeClass,
  toReviewStatus,
} from '@/helpers/common/companyRequirementHelper'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import {
  formatRegisteredDate,
  getCompanyDisplayName,
  getCompanyEstablishment,
  getCompanyLocation,
} from '@/helpers/peso/provincialPeso/registeredCompanyHelper'
import type { SwipeCard } from '@/types/common/swipeCard'
import type { RegisteredCompanyListItem } from '@/types/peso/provincialPeso/registeredCompany'

/** Company accounts that signed up through the system (Provincial PESO); Review opens the review sheet. */
export function useRegisteredCompanies() {
  const store = useRegisteredCompanyStore()
  const { companies, isLoading, errorMessage } = storeToRefs(store)
  const { fetchCompanies } = store
  const reviewStore = useRegisteredCompanyReviewStore()

  const openReview = (row: RegisteredCompanyListItem) => void reviewStore.openCompany(row)

  const sorting = ref<SortingState>([{ id: 'created_at', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  /** Mobile card: company name, then one line of key details */
  const getRowCard = (row: RegisteredCompanyListItem): SwipeCard => ({
    title: getCompanyDisplayName(row),
    subtitle: [
      getCompanyLocation(row),
      getCompanyStatusLabel(toReviewStatus(row.verification_status)),
      formatRegisteredDate(row.created_at),
    ]
      .filter(Boolean)
      .join(' · '),
  })

  const getRowSwipeActions = (row: RegisteredCompanyListItem): SwipeAction[] => [
    { id: 'review', label: 'Review', icon: ClipboardCheck, onSelect: () => openReview(row) },
  ]

  const columns: ColumnDef<RegisteredCompanyListItem>[] = [
    {
      id: 'company',
      // Search matches the business name, trade name, account name and TIN
      accessorFn: (row) => {
        const establishment = getCompanyEstablishment(row)
        return [getCompanyDisplayName(row), establishment?.trade_name, row.company_name, establishment?.tin]
          .filter(Boolean)
          .join(' ')
      },
      header: sortableHeader('Company'),
      sortingFn: (a, b) => getCompanyDisplayName(a.original).localeCompare(getCompanyDisplayName(b.original)),
      cell: ({ row }) => {
        const tradeName = getCompanyEstablishment(row.original)?.trade_name
        return h('div', { class: 'min-w-[200px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, getCompanyDisplayName(row.original)),
          tradeName ? h('div', { class: 'text-xs text-muted-foreground' }, tradeName) : null,
        ])
      },
    },
    {
      id: 'tin',
      accessorFn: (row) => getCompanyEstablishment(row)?.tin ?? '',
      header: 'TIN',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm tabular-nums' }, String(getValue() || '—')),
    },
    {
      id: 'industry',
      accessorFn: (row) => getCompanyEstablishment(row)?.industry_line ?? '',
      header: 'Industry',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'max-w-[180px] truncate text-sm' }, String(getValue() || '—')),
    },
    {
      id: 'location',
      accessorFn: getCompanyLocation,
      header: 'Location',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'max-w-[200px] truncate text-sm' }, String(getValue() || '—')),
    },
    {
      id: 'contact',
      header: 'Contact',
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'space-y-0.5 text-sm' }, [
          h('div', { class: 'max-w-[200px] truncate' }, row.original.company_email || '—'),
          row.original.company_contact
            ? h('div', { class: 'text-xs text-muted-foreground' }, row.original.company_contact)
            : null,
        ]),
    },
    {
      id: 'status',
      accessorFn: (row) => getCompanyStatusLabel(toReviewStatus(row.verification_status)),
      header: 'Company Status',
      filterFn: 'equalsString',
      cell: ({ row, getValue }) =>
        h(
          Badge,
          { variant: 'outline', class: getReviewStatusBadgeClass(toReviewStatus(row.original.verification_status) ?? 'pending') },
          () => String(getValue()),
        ),
    },
    {
      accessorKey: 'created_at',
      header: sortableHeader('Registered'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatRegisteredDate(row.original.created_at)),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) =>
        h(Button, { variant: 'outline', size: 'sm', onClick: () => openReview(row.original) }, () => [
          h(ClipboardCheck, { class: 'size-4' }),
          'Review',
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return companies.value
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

  onMounted(() => {
    void fetchCompanies()
  })

  return {
    getRowCard,
    getRowSwipeActions,
    table,
    columns,
    companies,
    isLoading,
    errorMessage,
    statusOptions: COMPANY_STATUS_LABELS.map((label) => ({ value: label, label })),
    refreshCompanies: fetchCompanies,
  }
}
