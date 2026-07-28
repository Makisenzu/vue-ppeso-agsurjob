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
import { ArrowUpDown } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { useUserAccountsStore } from '@/stores/admin/userAccountsStore'
import type { ProfileRow } from '@/types/admin/userAccounts'
import {
  formatDate,
  getRoleBadgeVariant,
  getStatusBadgeVariant,
  getStatusBadgeClass,
  formatRoleLabel,
} from '@/helpers/admin/userAccountsHelper'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export function useUserAccounts(actionTemplateRef?: Component) {
  const store = useUserAccountsStore()
  const {
    profiles,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedProfile,
    isDetailsOpen,
    isAddAccountOpen,
  } = storeToRefs(store)
  const {
    fetchProfiles,
    openProfileDetails,
    closeProfileDetails,
    openAddAccountSheet,
    closeAddAccountSheet,
    createAccount,
    copyId,
  } = store

  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const columnVisibility = ref<VisibilityState>({})
  const rowSelection = ref({})
  const expanded = ref<ExpandedState>({})

  const columns: ColumnDef<ProfileRow>[] = [
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
          () => ['Full Name', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]
        )
      },
      cell: ({ row }) => {
        const p = row.original
        const fullName = `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()
        return h('div', { class: 'font-medium' }, fullName || 'N/A')
      },
    },
    {
      accessorKey: 'username',
      header: ({ column }) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          },
          () => ['Username', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]
        )
      },
      cell: ({ row }) =>
        h('div', { class: 'lowercase text-muted-foreground' }, `@${row.getValue('username') || 'no-username'}`),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as string | null
        return h(Badge, { variant: getRoleBadgeVariant(role), class: 'capitalize' }, () =>
          formatRoleLabel(role)
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
      header: 'Province',
      cell: ({ row }) => h('div', { class: 'text-sm' }, row.getValue('province') || 'N/A'),
    },
    {
      accessorKey: 'barangay',
      header: 'Barangay',
      cell: ({ row }) => h('div', { class: 'text-sm' }, row.getValue('barangay') || 'N/A'),
    },
    {
      accessorKey: 'is_pwd',
      header: 'PWD',
      cell: ({ row }) => {
        const isPwd = row.getValue('is_pwd')
        return isPwd
          ? h(
              Badge,
              { variant: 'outline', class: 'text-[10px] bg-blue-50 text-blue-700 border-blue-200' },
              () => 'Yes'
            )
          : '-'
      },
    },
    {
      accessorKey: 'is_4ps',
      header: '4Ps',
      cell: ({ row }) => {
        const is4ps = row.getValue('is_4ps')
        return is4ps
          ? h(
              Badge,
              { variant: 'outline', class: 'text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200' },
              () => 'Yes'
            )
          : '-'
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) =>
        h('div', { class: 'text-xs text-muted-foreground' }, formatDate(row.getValue('created_at'))),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const profile = row.original
        if (!actionTemplateRef) return null
        return h(actionTemplateRef, {
          profile,
          onExpand: row.toggleExpanded,
        })
      },
    },
  ]

  const table = useVueTable({
    get data() {
      return profiles.value
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
    fetchProfiles()
  })

  return {
    table,
    columns,
    profiles,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedProfile,
    isDetailsOpen,
    isAddAccountOpen,
    fetchProfiles,
    openProfileDetails,
    closeProfileDetails,
    openAddAccountSheet,
    closeAddAccountSheet,
    createAccount,
    copyId,
  }
}
