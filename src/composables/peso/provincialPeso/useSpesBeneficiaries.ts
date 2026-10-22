import { computed, h, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowUpDown, CircleCheck, FileCheck, History, Pencil, Trash2 } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  countSpesCompletionReports,
  formatSpesDate,
  formatSpesFormName,
  getSpesAppointmentTiming,
  getSpesStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/spesHelper'
import type { SpesAppointmentDisplayStatus, SpesAppointmentEntry } from '@/types/peso/provincialPeso/spes'
import { SPES_COMPLETION_REPORTS, type SpesCompletionReportType } from '@/types/common/spesForm'

const DISPLAY_STATUS_OPTIONS: SpesAppointmentDisplayStatus[] = [
  'Active',
  'Expiring Soon',
  'Expired',
  'Completed',
  'Terminated',
]

export function useSpesBeneficiaries() {
  const store = useSpesStore()
  const {
    spesForms,
    yearAppointments,
    selectedYear,
    availableYears,
    historyBeneficiary,
    isLoadingBeneficiaries,
    beneficiariesError,
    isDeleting,
    appointmentToDelete,
    completionReports,
    reportsAppointment,
    busyReportType,
    isLoadingReports,
  } = storeToRefs(store)
  const {
    fetchSpesBeneficiaries,
    fetchSpesForms,
    setSelectedYear,
    openAppointDialog,
    openEditAppointmentDialog,
    openConcludeDialog,
    requestDeleteAppointment,
    cancelDeleteAppointment,
    deleteAppointment,
    openHistoryDialog,
    closeHistoryDialog,
    openDrawDialog,
    openReportsDialog,
    closeReportsDialog,
    uploadCompletionReport,
    removeCompletionReport,
    fetchCompletionReports,
  } = store

  const sorting = ref<SortingState>([{ id: 'name', desc: false }])
  const columnFilters = ref<ColumnFiltersState>([])

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
  const getRowCard = (row: SpesAppointmentEntry): SwipeCard => ({
    title: formatSpesFormName(row.beneficiary.spes_form),
    subtitle: [row.assigned_municipality, `Availment ${row.availmentNumber}`, row.displayStatus].filter(Boolean).join(' · '),
  })
  const getRowSwipeActions = (row: SpesAppointmentEntry): SwipeAction[] => [
    { id: 'remove', label: 'Remove', icon: Trash2, dismiss: false, onSelect: () => requestDeleteAppointment(row) },
    { id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: () => openEditAppointmentDialog(row) },
    { id: 'reports', label: 'Reports', icon: FileCheck, dismiss: false, onSelect: () => openReportsDialog(row) },
    { id: 'history', label: 'History', icon: History, dismiss: false, onSelect: () => openHistoryDialog(row.spes_id) },
    ...(row.status === 'Active'
      ? [{ id: 'conclude', label: 'Conclude', icon: CircleCheck, dismiss: false, onSelect: () => openConcludeDialog(row) }]
      : []),
  ]

  const columns: ColumnDef<SpesAppointmentEntry>[] = [
    {
      id: 'name',
      accessorFn: (row) => formatSpesFormName(row.beneficiary.spes_form),
      header: sortableHeader('Beneficiary'),
      cell: ({ row }) => {
        const form = row.original.beneficiary.spes_form
        return h('div', { class: 'min-w-[180px] space-y-0.5' }, [
          h('div', { class: 'font-medium' }, formatSpesFormName(form)),
          h('div', { class: 'font-mono text-xs text-muted-foreground' }, row.original.appointment_code),
        ])
      },
    },
    {
      id: 'availment',
      accessorFn: (row) => row.availmentNumber,
      header: sortableHeader('Availment'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm' }, [
          h('div', row.original.availmentNumber > 1 ? 'Returning' : 'New'),
          h('div', { class: 'text-xs text-muted-foreground' }, `#${row.original.availmentNumber}`),
        ]),
    },
    {
      id: 'assignment',
      accessorFn: (row) => row.assigned_municipality,
      header: sortableHeader('Assignment'),
      cell: ({ row }) =>
        h('div', { class: 'max-w-[240px] space-y-0.5' }, [
          h('div', { class: 'truncate text-sm' }, row.original.assigned_municipality),
          row.original.assigned_barangay
            ? h('div', { class: 'truncate text-xs text-muted-foreground' }, `Brgy. ${row.original.assigned_barangay}`)
            : null,
        ]),
    },
    {
      id: 'period',
      accessorFn: (row) => row.start_date,
      header: sortableHeader('Period'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm' }, [
          h('div', `${formatSpesDate(row.original.start_date)} – ${formatSpesDate(row.original.end_date)}`),
          h('div', { class: 'text-xs text-muted-foreground tabular-nums' }, `${row.original.days_duration} days`),
        ]),
    },
    {
      id: 'status',
      accessorFn: (row) => row.displayStatus,
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ row }) => {
        const { displayStatus, daysRemaining, isExpiringSoon } = row.original
        return h('div', { class: 'space-y-0.5' }, [
          h(Badge, { variant: 'outline', class: getSpesStatusBadgeClass(displayStatus) }, () => displayStatus),
          isExpiringSoon && daysRemaining != null
            ? h('div', { class: 'text-xs text-muted-foreground' }, `${daysRemaining} day(s) left`)
            : null,
        ])
      },
    },
    {
      id: 'reports',
      accessorFn: (row) => countSpesCompletionReports(completionReports.value[row.id]),
      header: 'DTR & Report',
      cell: ({ row, getValue }) => {
        const count = getValue() as number
        const total = SPES_COMPLETION_REPORTS.length
        return h(
          Button,
          { variant: 'link', class: 'h-auto px-0 text-sm tabular-nums', onClick: () => openReportsDialog(row.original) },
          () => (count === total ? 'Submitted' : `${count}/${total} submitted`)
        )
      },
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'flex items-center justify-end gap-1' }, [
          iconButton('Appointment history', History, () => openHistoryDialog(row.original.spes_id)),
          iconButton('DTR & accomplishment report', FileCheck, () => openReportsDialog(row.original)),
          iconButton('Edit appointment', Pencil, () => openEditAppointmentDialog(row.original)),
          row.original.status === 'Active'
            ? iconButton('Conclude appointment', CircleCheck, () => openConcludeDialog(row.original))
            : null,
          iconButton(
            'Remove appointment',
            Trash2,
            () => requestDeleteAppointment(row.original),
            'text-destructive hover:bg-destructive/10 hover:text-destructive'
          ),
        ]),
    },
  ]

  const table = useVueTable({
    get data() {
      return yearAppointments.value
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
    get: () => appointmentToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDeleteAppointment()
    },
  })

  // ─── Completion reports dialog ───
  const isReportsDialogOpen = computed({
    get: () => reportsAppointment.value !== null,
    set: (open: boolean) => {
      if (!open) closeReportsDialog()
    },
  })

  const openReports = computed(() =>
    reportsAppointment.value ? completionReports.value[reportsAppointment.value.id] ?? {} : {}
  )

  const onReportPicked = (type: SpesCompletionReportType, file: File) => uploadCompletionReport(type, file)
  const onReportRemoved = (type: SpesCompletionReportType) => removeCompletionReport(type)

  // The table shows how many reports each appointment of the selected year has
  watch(
    () => yearAppointments.value.map((entry) => entry.id).join(','),
    (ids) => {
      if (ids) void fetchCompletionReports(ids.split(','))
    },
    { immediate: true }
  )

  const isHistoryDialogOpen = computed({
    get: () => historyBeneficiary.value !== null,
    set: (open: boolean) => {
      if (!open) closeHistoryDialog()
    },
  })

  /** Appointment history of the open beneficiary, newest year first, with availment numbers. */
  const historyAppointments = computed(() => {
    const appointments = historyBeneficiary.value?.appointments ?? []
    return appointments.map((appointment, index) => ({
      ...appointment,
      ...getSpesAppointmentTiming(appointment),
      availmentNumber: appointments.length - index,
    }))
  })

  /** The open beneficiary can still be appointed for the selected year. */
  const canReappointHistoryBeneficiary = computed(
    () =>
      !!historyBeneficiary.value &&
      !historyBeneficiary.value.appointments.some((a) => a.spes_year === selectedYear.value)
  )

  const reappointFromHistory = () => {
    const spes = historyBeneficiary.value
    if (!spes) return
    closeHistoryDialog()
    openAppointDialog({ kind: 'beneficiary', spesId: spes.id })
  }

  // ─── Summary counts (selected year) ───
  const summary = computed(() => {
    const count = (predicate: (entry: SpesAppointmentEntry) => boolean) => yearAppointments.value.filter(predicate).length
    return {
      applicants: spesForms.value.length,
      pendingApplicants: spesForms.value.filter((form) => (form.status ?? '').toLowerCase() === 'pending').length,
      appointed: yearAppointments.value.length,
      active: count((entry) => entry.status === 'Active'),
      completed: count((entry) => entry.status === 'Completed'),
      returning: count((entry) => entry.availmentNumber > 1),
      expired: count((entry) => entry.isExpired),
      expiringSoon: count((entry) => entry.isExpiringSoon),
    }
  })

  /** Shows only the appointments that ended or are about to, like GIP's pending-decision view. */
  const showNeedsDecision = () => {
    const current = table.getColumn('status')?.getFilterValue()
    table.getColumn('status')?.setFilterValue(current === 'Expired' ? undefined : 'Expired')
  }

  const onYearChange = (value: unknown) => {
    const year = Number(value)
    if (Number.isInteger(year)) setSelectedYear(year)
  }

  // Applicants are needed for the appoint picker and the summary.
  const refreshBeneficiaries = () => Promise.all([fetchSpesBeneficiaries(), fetchSpesForms()])

  onMounted(() => {
    void refreshBeneficiaries()
  })

  return {
    getRowSwipeActions,
    getRowCard,
    table,
    columns,
    yearAppointments,
    selectedYear,
    availableYears,
    summary,
    isLoading: isLoadingBeneficiaries,
    errorMessage: beneficiariesError,
    isDeleting,
    appointmentToDelete,
    isDeleteDialogOpen,
    historyBeneficiary,
    historyAppointments,
    isHistoryDialogOpen,
    canReappointHistoryBeneficiary,
    statusOptions: DISPLAY_STATUS_OPTIONS,
    reportsAppointment,
    openReports,
    busyReportType,
    isLoadingReports,
    isReportsDialogOpen,
    onReportPicked,
    onReportRemoved,
    refreshBeneficiaries,
    onYearChange,
    showNeedsDecision,
    reappointFromHistory,
    openAppointDialog: () => openAppointDialog(),
    openDrawDialog,
    confirmDelete: deleteAppointment,
  }
}
