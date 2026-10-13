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
import { ArrowUpDown, ClipboardCheck } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  formatSpesDate,
  formatSpesFormName,
  getSpesApplicantStatusBadgeClass,
  getSpesBeneficiaryType,
  getSpesDocumentChecklist,
  getSpesEducationSummary,
} from '@/helpers/peso/provincialPeso/spesHelper'
import { renderRowActions } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import { SPES_APPLICANT_STATUSES, type SpesFormRow } from '@/types/peso/provincialPeso/spes'

/** SPES applicants are the submitted SPES forms (`applicants.spes_form`). */
export function useSpesApplicants() {
  const router = useRouter()
  const store = useSpesStore()
  const { spesForms, isLoadingForms, formsError, isDeleting, spesFormToDelete, viewingForm, formAttachments, isLoadingAttachments } =
    storeToRefs(store)
  const {
    fetchSpesForms,
    openReviewDialog,
    requestDeleteSpesForm,
    cancelDeleteSpesForm,
    deleteSpesForm,
    openApplicantDetails,
    closeApplicantDetails,
  } = store

  const openAddApplicant = () => router.push({ name: 'provincial-peso-spes-applicants-new' })
  const openEditApplicant = (row: SpesFormRow) =>
    router.push({ name: 'provincial-peso-spes-applicants-details', params: { id: row.id } })

  const sorting = ref<SortingState>([{ id: 'created_at', desc: true }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const columns: ColumnDef<SpesFormRow>[] = [
    {
      id: 'name',
      accessorFn: (row) => formatSpesFormName(row),
      header: sortableHeader('Applicant'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-[180px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, formatSpesFormName(row.original)),
          row.original.email_address
            ? h('div', { class: 'text-xs text-muted-foreground' }, row.original.email_address)
            : null,
        ]),
    },
    {
      id: 'student_category',
      accessorFn: (row) => row.student_category ?? '',
      header: 'Category',
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm' }, (getValue() as string) || '—'),
    },
    {
      id: 'education',
      accessorFn: (row) => getSpesEducationSummary(row),
      header: 'Education',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'max-w-[240px] truncate text-sm' }, getValue() as string),
    },
    {
      id: 'documents',
      accessorFn: (row) => getSpesDocumentChecklist(row).filter((doc) => doc.submitted).length,
      header: sortableHeader('Documents'),
      cell: ({ getValue }) => h('div', { class: 'text-center text-sm tabular-nums' }, `${getValue()}/5`),
    },
    {
      id: 'beneficiary',
      accessorFn: (row) => getSpesBeneficiaryType(row),
      header: 'Beneficiary',
      cell: ({ getValue }) => h('div', { class: 'text-sm' }, getValue() as string),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) =>
        h(
          Badge,
          { variant: 'outline', class: ['capitalize', getSpesApplicantStatusBadgeClass(row.original.status)].join(' ') },
          () => row.original.status || 'Pending'
        ),
    },
    {
      accessorKey: 'created_at',
      header: sortableHeader('Date Added'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatSpesDate(row.original.created_at)),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'flex items-center justify-end gap-1' }, [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'icon',
              class: 'size-8',
              title: 'Review',
              'aria-label': 'Review',
              onClick: () => openReviewDialog(row.original),
            },
            () => h(ClipboardCheck, { class: 'size-4' })
          ),
          renderRowActions({
            onView: () => openApplicantDetails(row.original),
            viewLabel: 'View SPES form',
            onEdit: () => openEditApplicant(row.original),
            onDelete: () => requestDeleteSpesForm(row.original),
          }),
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return spesForms.value
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
    get: () => spesFormToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDeleteSpesForm()
    },
  })

  const isDetailsDialogOpen = computed({
    get: () => viewingForm.value !== null,
    set: (open: boolean) => {
      if (!open) closeApplicantDetails()
    },
  })

  const refreshApplicants = () => fetchSpesForms()

  onMounted(() => {
    void refreshApplicants()
  })

  return {
    table,
    columns,
    spesForms,
    isLoading: isLoadingForms,
    errorMessage: formsError,
    isDeleting,
    spesFormToDelete,
    viewingForm,
    formAttachments,
    isLoadingAttachments,
    isDeleteDialogOpen,
    isDetailsDialogOpen,
    statusOptions: SPES_APPLICANT_STATUSES,
    refreshApplicants,
    openAddApplicant,
    confirmDelete: deleteSpesForm,
  }
}
