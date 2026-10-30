import { computed, h, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/vue-table'
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { ArrowUpDown, UserMinus } from '@lucide/vue'
import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyAccessStore } from '@/stores/employer/companyAccessStore'
import {
  formatAccessDate,
  getMemberRoleLabel,
  inviteMemberSchema,
} from '@/helpers/employer/companyAccessHelper'
import {
  COMPANY_MEMBER_ROLE_OPTIONS,
  type CompanyMemberAccount,
  type InviteMemberFormValues,
} from '@/types/employer/companyAccess'

interface MemberRow {
  member: CompanyMemberAccount
  name: string
  email: string
  roleLabel: string
  joinedLabel: string
}

/** Team page (owner only): members who sign in for the company, pending invitations, invite dialog */
export function useCompanyAccess() {
  const authStore = useAuthStore()
  const store = useCompanyAccessStore()
  const { members, invitations, isLoading, isInviting, isBulkRemoving, busyId } = storeToRefs(store)

  const memberRows = computed<MemberRow[]>(() =>
    members.value.map((member) => ({
      member,
      name: member.full_name ?? member.email ?? 'Member',
      email: member.email ?? '',
      roleLabel: getMemberRoleLabel(member.member_role),
      joinedLabel: formatAccessDate(member.joined_at),
    })),
  )

  // ─── Members data table (DESIGN.md §13) ───
  const sorting = ref<SortingState>([{ id: 'joined_at', desc: true }])
  const rowSelection = ref<RowSelectionState>({})

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })],
      )

  /** Same handler for the desktop button and the mobile swipe action */
  const requestRemove = (row: MemberRow) => {
    memberToRemove.value = row.member
  }

  /** Remove is confirmed by an AlertDialog, so the card stays */
  const getRowSwipeActions = (row: MemberRow): SwipeAction[] => [
    { id: 'remove', label: 'Remove', icon: UserMinus, dismiss: false, onSelect: () => requestRemove(row) },
  ]

  /** Mobile card: name, then email · role */
  const getRowCard = (row: MemberRow): SwipeCard => ({
    title: row.name,
    subtitle: [row.email, row.roleLabel].filter(Boolean).join(' · '),
  })

  const columns: ColumnDef<MemberRow>[] = [
    {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) =>
        h(Checkbox, {
          modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all rows',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row',
        }),
    },
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: sortableHeader('Name'),
      cell: ({ row }) =>
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'truncate text-sm font-medium' }, row.original.name),
          row.original.email ? h('p', { class: 'truncate text-xs text-muted-foreground' }, row.original.email) : null,
        ]),
    },
    {
      id: 'role',
      accessorFn: (row) => row.roleLabel,
      header: sortableHeader('Role'),
      cell: ({ row }) => h(Badge, { variant: 'outline' }, () => row.original.roleLabel),
    },
    {
      id: 'joined_at',
      accessorFn: (row) => row.member.joined_at,
      header: sortableHeader('Joined'),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, row.original.joinedLabel),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) =>
        h('div', { class: 'flex justify-end' }, [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'icon',
              class: 'size-8 text-destructive hover:bg-destructive/10 hover:text-destructive',
              title: 'Remove',
              'aria-label': `Remove ${row.original.name}`,
              disabled: busyId.value === row.original.member.member_id,
              onClick: () => requestRemove(row.original),
            },
            () => h(UserMinus, { class: 'size-4' }),
          ),
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return memberRows.value
    },
    columns,
    getRowId: (row) => String(row.member.member_id),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    state: {
      get sorting() {
        return sorting.value
      },
      get rowSelection() {
        return rowSelection.value
      },
    },
  })

  const selectedIds = computed(() => table.getSelectedRowModel().rows.map((row) => row.original.member.member_id))
  const clearSelection = () => table.resetRowSelection()

  // A refetch or a removal changes the rows: start the selection over (DESIGN.md §13.1 rule 3)
  watch(members, clearSelection)

  // ─── Bulk remove (AlertDialog) ───
  const isBulkRemoveOpen = ref(false)

  async function confirmBulkRemove() {
    if (await store.removeMembers([...selectedIds.value])) isBulkRemoveOpen.value = false
  }

  const invitationRows = computed(() =>
    invitations.value.map((invitation) => ({
      invitation,
      roleLabel: getMemberRoleLabel(invitation.member_role),
      isExpired: new Date(invitation.expires_at) < new Date(),
      expiresLabel: formatAccessDate(invitation.expires_at),
    })),
  )

  // ─── Invite dialog ───
  const isInviteOpen = ref(false)
  const { handleSubmit, resetForm } = useForm<InviteMemberFormValues>({
    validationSchema: toTypedSchema(inviteMemberSchema),
  })

  function openInvite() {
    resetForm({ values: { email: '', member_role: 'recruiter' } })
    isInviteOpen.value = true
  }

  const sendInvite = handleSubmit(async (values) => {
    if (await store.invite(values.email, values.member_role)) isInviteOpen.value = false
  })

  // ─── Remove member (AlertDialog) ───
  const memberToRemove = ref<CompanyMemberAccount | null>(null)
  const isRemoveOpen = computed({
    get: () => memberToRemove.value !== null,
    set: (open: boolean) => {
      if (!open) memberToRemove.value = null
    },
  })

  async function confirmRemove() {
    const member = memberToRemove.value
    if (member && (await store.removeMember(member))) memberToRemove.value = null
  }

  onMounted(async () => {
    await authStore.init()
    await store.fetchAccess()
  })

  return {
    memberRows,
    // Members table
    table,
    columns,
    getRowCard,
    getRowSwipeActions,
    selectedIds,
    clearSelection,
    isBulkRemoving,
    isBulkRemoveOpen,
    confirmBulkRemove,
    invitationRows,
    isLoading,
    busyId,
    // Invite
    isInviteOpen,
    isInviting,
    roleOptions: COMPANY_MEMBER_ROLE_OPTIONS,
    openInvite,
    sendInvite,
    resend: store.resend,
    revoke: store.revoke,
    // Remove
    memberToRemove,
    isRemoveOpen,
    confirmRemove,
  }
}
