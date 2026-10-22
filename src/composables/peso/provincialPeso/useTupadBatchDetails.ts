import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import type { ColumnDef, SortingState } from '@tanstack/vue-table'
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { ArrowUpDown, Eye, Pencil, Trash2 } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTupadStore } from '@/stores/peso/provincialPeso/tupadStore'
import {
  buildTupadDailyLog,
  formatTupadApplicantName,
  formatTupadContact,
  formatTupadMemberName,
  formatTupadSex,
  getTupadAge,
  getTupadBarangay,
  getDefaultTupadDays,
  getTupadMunicipality,
  getTupadBatchMissingRequirements,
  getTupadStatusBadgeClass,
  isTupadBatchOpen,
  isTupadBatchReady,
} from '@/helpers/peso/provincialPeso/tupadHelper'
import { TUPAD_STATUSES, type TupadMember, type TupadStatus } from '@/types/peso/provincialPeso/tupad'

const daysSchema = z.coerce
  .number({ invalid_type_error: 'Enter the number of days.' })
  .int({ message: 'Use whole days.' })
  .min(1, { message: 'At least 1 day.' })
  .max(365, { message: 'At most 365 days.' })

const memberSchema = toTypedSchema(
  z.object({
    days_duration: daysSchema,
    status: z.enum(TUPAD_STATUSES),
    remarks: z.string().trim().optional(),
  })
)

const MEMBER_INITIAL_VALUES = {
  days_duration: 10,
  status: 'Active' as TupadStatus,
  remarks: '',
}

/** Batch details — the beneficiaries of one TUPAD batch, adding more from the TUPAD applicant pool, and their daily attachments. */
export function useTupadBatchDetails() {
  const route = useRoute()
  const store = useTupadStore()
  const {
    currentBatch,
    members,
    eligibleApplicants,
    isLoadingBatch,
    batchError,
    isSubmitting,
    isDeleting,
    isAddMembersOpen,
    editingMember,
    memberToRemove,
    viewingMember,
    memberAttachments,
    isLoadingAttachments,
    attachmentsError,
  } = storeToRefs(store)
  const {
    loadBatch,
    addMembers,
    openEditBatch,
    openEditMember,
    closeEditMember,
    saveMember,
    requestRemoveMember,
    cancelRemoveMember,
    removeMember,
    openMemberDetails,
    refreshMemberAttachments,
    closeMemberDetails,
  } = store

  const batchId = computed(() => String(route.params.id ?? ''))
  const canAddApplicants = computed(() => isTupadBatchOpen(currentBatch.value))

  const reload = () => (batchId.value ? loadBatch(batchId.value) : Promise.resolve())
  watch(batchId, () => void reload(), { immediate: true })

  // ─── Members table ───

  const sorting = ref<SortingState>([{ id: 'name', desc: false }])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const iconButton = (label: string, icon: typeof Pencil, onClick: () => void, extraClass = '') =>
    h(
      Button,
      { variant: 'ghost', size: 'icon', class: `size-8 ${extraClass}`, title: label, 'aria-label': label, onClick },
      () => h(icon, { class: 'size-4' })
    )

  // Mobile card + swipe actions (DESIGN.md 13.2): the same handlers as the desktop buttons, Remove first (outer edge)
  const getRowCard = (row: TupadMember): SwipeCard => ({
    title: formatTupadMemberName(row),
    subtitle: [getTupadMunicipality(row.tupad_applicant?.applicant), `${row.days_duration} days`, row.status].filter(Boolean).join(' · '),
  })
  const getRowSwipeActions = (row: TupadMember): SwipeAction[] => [
    { id: 'remove', label: 'Remove', icon: Trash2, dismiss: false, onSelect: () => requestRemoveMember(row) },
    { id: 'view', label: 'View', icon: Eye, dismiss: false, onSelect: () => openMemberDetails(row) },
    { id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: () => openEditMember(row) },
  ]

  const columns: ColumnDef<TupadMember>[] = [
    {
      id: 'name',
      accessorFn: (row) => formatTupadMemberName(row),
      header: sortableHeader('Beneficiary'),
      cell: ({ row }) => h('div', { class: 'min-w-[180px] font-medium' }, formatTupadMemberName(row.original)),
    },
    {
      id: 'age',
      // Unknown ages sort last
      accessorFn: (row) => getTupadAge(row.tupad_applicant?.applicant) ?? Number.MAX_SAFE_INTEGER,
      header: sortableHeader('Age'),
      cell: ({ row }) =>
        h('div', { class: 'text-center text-sm tabular-nums' }, String(getTupadAge(row.original.tupad_applicant?.applicant) ?? '—')),
    },
    {
      id: 'gender',
      accessorFn: (row) => formatTupadSex(row.tupad_applicant?.applicant),
      header: sortableHeader('Gender'),
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm' }, getValue() as string),
    },
    {
      id: 'contact',
      accessorFn: (row) => formatTupadContact(row.tupad_applicant?.applicant),
      header: 'Contact Number',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm tabular-nums' }, getValue() as string),
    },
    {
      id: 'municipality',
      accessorFn: (row) => getTupadMunicipality(row.tupad_applicant?.applicant),
      header: sortableHeader('Municipality'),
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm' }, getValue() as string),
    },
    {
      id: 'barangay',
      accessorFn: (row) => getTupadBarangay(row.tupad_applicant?.applicant),
      header: sortableHeader('Barangay'),
      cell: ({ getValue }) => h('div', { class: 'whitespace-nowrap text-sm' }, getValue() as string),
    },
    {
      accessorKey: 'days_duration',
      header: sortableHeader('Days'),
      cell: ({ row }) => h('div', { class: 'text-center text-sm tabular-nums' }, String(row.original.days_duration)),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: getTupadStatusBadgeClass(row.original.status) }, () => row.original.status),
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      enableSorting: false,
      cell: ({ row }) => h('div', { class: 'max-w-[240px] truncate text-sm' }, row.original.remarks || '—'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'flex items-center justify-end gap-1' }, [
          iconButton('View daily attachments', Eye, () => openMemberDetails(row.original)),
          iconButton('Edit', Pencil, () => openEditMember(row.original)),
          iconButton(
            'Remove from batch',
            Trash2,
            () => requestRemoveMember(row.original),
            'text-destructive hover:bg-destructive/10 hover:text-destructive'
          ),
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return members.value
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    state: {
      get sorting() {
        return sorting.value
      },
    },
  })

  const memberStats = computed(() => ({
    total: members.value.length,
    active: members.value.filter((m) => m.status === 'Active').length,
    completed: members.value.filter((m) => m.status === 'Completed').length,
    terminated: members.value.filter((m) => m.status === 'Terminated').length,
  }))

  // ─── Add applicants dialog ───

  const pickerSearch = ref('')
  const selectedIds = ref<string[]>([])
  const daysDuration = ref(10)

  const filteredEligible = computed(() => {
    const term = pickerSearch.value.trim().toLowerCase()
    if (!term) return eligibleApplicants.value
    return eligibleApplicants.value.filter((row) =>
      `${formatTupadApplicantName(row)} ${getTupadMunicipality(row.applicant)}`.toLowerCase().includes(term)
    )
  })

  const isDaysValid = computed(() => daysSchema.safeParse(daysDuration.value).success)
  const canSubmitAdd = computed(() => selectedIds.value.length > 0 && isDaysValid.value && !isSubmitting.value)

  /** Listed applicants who have their income and all required documents — only they can be selected. */
  const readyFiltered = computed(() => filteredEligible.value.filter((row) => isTupadBatchReady(row)))
  const notReadyCount = computed(() => eligibleApplicants.value.filter((row) => !isTupadBatchReady(row)).length)

  const allFilteredSelected = computed(
    () => readyFiltered.value.length > 0 && readyFiltered.value.every((row) => selectedIds.value.includes(row.id))
  )

  const isSelected = (id: string) => selectedIds.value.includes(id)

  const toggleSelected = (id: string, checked: boolean | 'indeterminate') => {
    selectedIds.value =
      checked === true ? [...new Set([...selectedIds.value, id])] : selectedIds.value.filter((value) => value !== id)
  }

  const toggleAllFiltered = (checked: boolean | 'indeterminate') => {
    const ids = readyFiltered.value.map((row) => row.id)
    selectedIds.value =
      checked === true
        ? [...new Set([...selectedIds.value, ...ids])]
        : selectedIds.value.filter((value) => !ids.includes(value))
  }

  const openAddApplicants = () => {
    pickerSearch.value = ''
    selectedIds.value = []
    daysDuration.value = getDefaultTupadDays(currentBatch.value)
    isAddMembersOpen.value = true
  }

  const onAddApplicantsOpenChange = (open: boolean) => {
    if (!open && !isSubmitting.value) isAddMembersOpen.value = false
  }

  const submitAddApplicants = async () => {
    if (!canSubmitAdd.value) return
    await addMembers(selectedIds.value, Number(daysDuration.value))
  }

  // ─── Edit member dialog ───

  const { handleSubmit, resetForm } = useForm({
    validationSchema: memberSchema,
    initialValues: MEMBER_INITIAL_VALUES,
  })

  const isEditMemberOpen = computed(() => editingMember.value !== null)

  watch(editingMember, (member) => {
    if (!member) return
    resetForm({
      values: {
        days_duration: member.days_duration,
        status: TUPAD_STATUSES.find((s) => s === member.status) ?? 'Active',
        remarks: member.remarks ?? '',
      },
    })
  })

  const onEditMemberOpenChange = (open: boolean) => {
    if (!open) closeEditMember()
  }

  const submitMember = handleSubmit(async (values) => {
    await saveMember({ days_duration: values.days_duration, status: values.status, remarks: values.remarks || null })
  })

  // ─── Beneficiary daily attachments ───

  const isMemberDetailsOpen = computed(() => viewingMember.value !== null)

  /** Work days of the viewed beneficiary with the files uploaded on each. */
  const dailyLog = computed(() =>
    viewingMember.value ? buildTupadDailyLog(viewingMember.value, memberAttachments.value) : null
  )

  const onMemberDetailsOpenChange = (open: boolean) => {
    if (!open) closeMemberDetails()
  }

  // ─── Remove member dialog ───

  const isRemoveDialogOpen = computed({
    get: () => memberToRemove.value !== null,
    set: (open: boolean) => {
      if (!open) cancelRemoveMember()
    },
  })

  const editCurrentBatch = () => {
    if (currentBatch.value) openEditBatch(currentBatch.value)
  }

  return {
    getRowSwipeActions,
    getRowCard,
    table,
    columns,
    currentBatch,
    members,
    memberStats,
    isLoading: isLoadingBatch,
    errorMessage: batchError,
    isSubmitting,
    isDeleting,
    canAddApplicants,
    reload,
    editCurrentBatch,
    // add applicants
    isAddMembersOpen,
    eligibleApplicants,
    filteredEligible,
    pickerSearch,
    selectedIds,
    daysDuration,
    isDaysValid,
    canSubmitAdd,
    allFilteredSelected,
    readyFiltered,
    notReadyCount,
    isTupadBatchReady,
    getTupadBatchMissingRequirements,
    isSelected,
    toggleSelected,
    toggleAllFiltered,
    openAddApplicants,
    onAddApplicantsOpenChange,
    submitAddApplicants,
    // edit member
    editingMember,
    isEditMemberOpen,
    statusOptions: TUPAD_STATUSES,
    onEditMemberOpenChange,
    submitMember,
    // daily attachments
    viewingMember,
    isMemberDetailsOpen,
    dailyLog,
    isLoadingAttachments,
    attachmentsError,
    refreshMemberAttachments,
    onMemberDetailsOpenChange,
    // remove member
    memberToRemove,
    isRemoveDialogOpen,
    confirmRemove: removeMember,
  }
}
