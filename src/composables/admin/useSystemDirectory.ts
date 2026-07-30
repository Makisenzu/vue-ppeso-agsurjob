import { ref, onMounted, h, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowUpDown, FileCheck, FileX } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { useSystemDirectoryStore } from '@/stores/admin/systemDirectoryStore'
import type { DirectoryProfileRow } from '@/types/admin/systemDirectory'
import {
  formatDate,
  getRoleBadgeVariant,
  getRoleBadgeClass,
  getStatusBadgeVariant,
  getStatusBadgeClass,
  formatRoleLabel,
} from '@/helpers/admin/systemDirectoryHelper'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export function useSystemDirectory(actionTemplateRef?: Component) {
  const store = useSystemDirectoryStore()
  const {
    records,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedRecord,
    isDetailsOpen,
    isEditStatusOpen,
    isEditDocStatusOpen,
    selectedDocument,
  } = storeToRefs(store)
  const {
    fetchRecords,
    openRecordDetails,
    closeRecordDetails,
    openEditStatusModal,
    closeEditStatusModal,
    updateAccountStatus,
    openEditDocumentStatusModal,
    closeEditDocumentStatusModal,
    updateDocumentStatus,
    copyId,
  } = store

  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const columnVisibility = ref<VisibilityState>({})
  const rowSelection = ref({})
  const expanded = ref<ExpandedState>({})

  const columns: ColumnDef<DirectoryProfileRow>[] = [
    {
      id: 'select',
      header: ({ table }) =>
        h(Checkbox, {
          modelValue:
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value) => table.toggleAllPageRowsSelected(!!value),
          ariaLabel: 'Select all',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value) => row.toggleSelected(!!value),
          ariaLabel: 'Select row',
        }),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'firstname',
      header: ({ column }) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          },
          () => ['Name / Entity', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]
        )
      },
      cell: ({ row }) => {
        const p = row.original
        const fullName = `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()
        const companyName = p.companyDetails?.company_name

        if (p.category === 'company' && companyName) {
          return h('div', { class: 'space-y-0.5' }, [
            h('div', { class: 'font-semibold text-foreground flex items-center gap-1.5' }, [
              companyName,
            ]),
            h('div', { class: 'text-xs text-muted-foreground' }, `Contact Person: ${fullName || 'N/A'}`),
          ])
        }

        return h('div', { class: 'flex items-center gap-1.5 font-medium' }, [
          fullName || 'N/A',
        ])
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          },
          () => ['Email', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]
        )
      },
      cell: ({ row }) => {
        const email = row.original.email
        return h('div', { class: 'lowercase text-muted-foreground font-mono text-xs' }, email || 'N/A')
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as string | null
        return h(
          Badge,
          {
            variant: getRoleBadgeVariant(role),
            class: ['capitalize', getRoleBadgeClass(role)].filter(Boolean).join(' '),
          },
          () => formatRoleLabel(role)
        )
      },
    },
    {
      accessorKey: 'hasDocuments',
      header: 'Submitted Files',
      cell: ({ row }) => {
        const count = row.original.documentCount
        if (count > 0) {
          return h(
            Badge,
            {
              variant: 'outline',
              class:
                'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium inline-flex items-center gap-1',
            },
            () => [h(FileCheck, { class: 'h-3 w-3' }), `${count} File(s)`]
          )
        }
        return h(
          Badge,
          {
            variant: 'secondary',
            class: 'text-muted-foreground font-normal inline-flex items-center gap-1',
          },
          () => [h(FileX, { class: 'h-3 w-3' }), 'No Files']
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string | null
        return h(
          Badge,
          {
            variant: getStatusBadgeVariant(status),
            class: ['capitalize', getStatusBadgeClass(status)].filter(Boolean).join(' '),
          },
          () => status || 'Unknown'
        )
      },
    },
    {
      accessorKey: 'contact_number',
      header: 'Contact',
      cell: ({ row }) => h('div', { class: 'text-sm' }, row.getValue('contact_number') || 'N/A'),
    },
    {
      accessorKey: 'province',
      header: 'Location',
      cell: ({ row }) => {
        const p = row.original
        const loc = p.province || p.companyDetails?.company_address || p.geographic || 'N/A'
        return h('div', { class: 'text-sm truncate max-w-[150px]' }, loc)
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Registered Date',
      cell: ({ row }) =>
        h('div', { class: 'text-xs text-muted-foreground' }, formatDate(row.getValue('created_at'))),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original
        if (!actionTemplateRef) return null
        return h(actionTemplateRef, {
          record,
          onExpand: row.toggleExpanded,
        })
      },
    },
  ]

  const table = useVueTable({
    get data() {
      return records.value
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    onColumnFiltersChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnFilters),
    onColumnVisibilityChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnVisibility),
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    onExpandedChange: (updaterOrValue) => valueUpdater(updaterOrValue, expanded),
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get columnVisibility() {
        return columnVisibility.value
      },
      get rowSelection() {
        return rowSelection.value
      },
      get expanded() {
        return expanded.value
      },
    },
  })

  onMounted(() => {
    fetchRecords()
  })

  return {
    table,
    columns,
    records,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedRecord,
    isDetailsOpen,
    isEditStatusOpen,
    isEditDocStatusOpen,
    selectedDocument,
    fetchRecords,
    openRecordDetails,
    closeRecordDetails,
    openEditStatusModal,
    closeEditStatusModal,
    updateAccountStatus,
    openEditDocumentStatusModal,
    closeEditDocumentStatusModal,
    updateDocumentStatus,
    copyId,
  }
}
