import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/vue-table'
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { ArrowUpDown, ChevronRight, Download, Eye, FileText, Pencil, Printer, Trash2 } from '@lucide/vue'
import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { gipAccomplishmentService } from '@/services/common/gipAccomplishmentService'
import { ALL_MONTHS, monthFilterOptions, periodInMonth } from '@/helpers/common/gipAccomplishmentHelper'
import { errorMessageOf, useGipAccomplishmentData } from '@/composables/applicant/useGipAccomplishmentData'
import type { MyGipAppointment } from '@/types/applicant/gipApplication'
import type { GipAccomplishmentRow } from '@/types/common/gipAccomplishment'

const PAGE_SIZE = 10

/** A term row of Table 1, with its report counts */
export interface GipTermRow {
  id: string
  appointment: MyGipAppointment
  reportCount: number
  /** Reports not yet submitted (Draft) or sent back (Returned) */
  openCount: number
}

/** Appointment statuses on the term table (DESIGN.md tokens) */
const TERM_BADGE_CLASS: Record<string, string> = {
  Active: 'border-success/30 bg-success/10 text-success',
  Renewed: 'border-info/30 bg-info/10 text-info',
}

/**
 * GIP portal → Accomplishments: two data tables (DESIGN.md §13).
 *   Table 1 — the intern's appointment terms; opening one shows
 *   Table 2 — that term's reports (filter by month, generate / print, Edit, Remove, bulk remove).
 * The open term is in the URL (`?term=<appointment id>`), so Back returns to Table 1. "Add Accomplishment" opens the
 * report form (useGipAccomplishmentForm) on its own page.
 */
export function useGipAccomplishments() {
  const route = useRoute()
  const router = useRouter()
  const data = useGipAccomplishmentData()
  const { appointments, activeAppointment, reports, toastAlert, generating, generateSaved, viewOwnFile } = data

  // ─── Navigation ───
  function addAccomplishment() {
    void router.push({ name: 'gip-accomplishment-new' })
  }

  function openTerm(termId: string) {
    void router.push({ query: { ...route.query, term: termId } })
  }

  function showAllTerms() {
    void router.push({ query: Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'term')) })
  }

  /** Reports of any term open in the form; only the Active term's can be changed (the form shows the rest read-only) */
  function openReport(report: GipAccomplishmentRow) {
    void router.push({ name: 'gip-accomplishment-edit', params: { id: report.id } })
  }

  // ═══ Table 1: terms ═══
  const termRows = computed<GipTermRow[]>(() =>
    appointments.value.map((appointment) => {
      const termReports = reports.value.filter((r) => r.appointment_id === appointment.id)
      return {
        id: appointment.id,
        appointment,
        reportCount: termReports.length,
        openCount: termReports.filter((r) => r.status === 'Draft' || r.status === 'Returned').length,
      }
    })
  )

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  // Read-only for interns: terms are PESO's appointments and can't be deleted here, so this table has no select
  // column or bulk delete (DESIGN.md §13.1 rule 8)
  const termColumns: ColumnDef<GipTermRow>[] = [
    {
      id: 'term',
      accessorFn: (row) => row.appointment.term_number,
      header: sortableHeader('Term'),
      cell: ({ row }) =>
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-medium' }, `Term ${row.original.appointment.term_number}`),
          row.original.id === activeAppointment.value?.id
            ? h(Badge, { variant: 'secondary', class: 'text-xs' }, () => 'Current')
            : null,
        ]),
    },
    {
      id: 'program',
      accessorFn: (row) => row.appointment.program,
      header: 'Program',
      enableSorting: false,
      cell: ({ getValue }) => h('span', { class: 'text-sm' }, String(getValue())),
    },
    {
      id: 'office',
      accessorFn: (row) => row.appointment.assigned_office,
      header: 'Office',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'max-w-[220px] truncate text-sm', title: String(getValue()) }, String(getValue())),
    },
    {
      id: 'period',
      accessorFn: (row) => row.appointment.start_date,
      header: 'Period',
      enableSorting: false,
      cell: ({ row }) =>
        h('span', { class: 'text-sm whitespace-nowrap tabular-nums' }, data.formatPeriodRange(row.original.appointment.start_date, row.original.appointment.end_date)),
    },
    {
      id: 'status',
      accessorFn: (row) => row.appointment.status,
      header: 'Status',
      enableSorting: false,
      cell: ({ getValue }) =>
        h(Badge, { variant: 'outline', class: TERM_BADGE_CLASS[String(getValue())] ?? '' }, () => String(getValue())),
    },
    {
      id: 'reports',
      accessorFn: (row) => row.reportCount,
      header: sortableHeader('Reports'),
      cell: ({ row }) =>
        h('div', { class: 'text-sm tabular-nums' }, [
          String(row.original.reportCount),
          row.original.openCount
            ? h('span', { class: 'text-muted-foreground' }, ` · ${row.original.openCount} not submitted`)
            : null,
        ]),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'flex justify-end' }, [
          h(
            Button,
            { variant: 'ghost', size: 'sm', class: 'cursor-pointer', onClick: () => openTerm(row.original.id) },
            () => ['View reports', h(ChevronRight, { class: 'size-4' })]
          ),
        ]),
    },
  ]

  const termSorting = ref<SortingState>([{ id: 'term', desc: true }])

  const termTable = useVueTable({
    get data() {
      return termRows.value
    },
    columns: termColumns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, termSorting),
    state: {
      get sorting() {
        return termSorting.value
      },
    },
  })

  /** Mobile card for a term: its number and program, then the office and report count */
  const getTermCard = (row: GipTermRow): SwipeCard => ({
    title: `Term ${row.appointment.term_number} · ${row.appointment.program}${row.id === activeAppointment.value?.id ? ' · Current' : ''}`,
    subtitle: [row.appointment.assigned_office, `${row.reportCount} report${row.reportCount === 1 ? '' : 's'}`].join(' · '),
  })
  const getTermSwipeActions = (row: GipTermRow): SwipeAction[] => [
    { id: 'view', label: 'Reports', icon: Eye, dismiss: false, onSelect: () => openTerm(row.id) },
  ]

  // ═══ Table 2: the open term's reports ═══
  const selectedTermId = computed(() => (typeof route.query.term === 'string' ? route.query.term : null))
  const selectedTerm = computed(() => appointments.value.find((a) => a.id === selectedTermId.value) ?? null)
  const isSelectedTermActive = computed(() => !!selectedTerm.value && selectedTerm.value.id === activeAppointment.value?.id)

  // Month filter (this year): reports whose dates touch the month
  const monthFilter = ref<string>(ALL_MONTHS)
  const monthOptions = monthFilterOptions(new Date().getFullYear())

  const termReports = computed(() =>
    selectedTerm.value ? reports.value.filter((r) => r.appointment_id === selectedTerm.value!.id) : []
  )
  const reportRows = computed(() =>
    termReports.value.filter((r) => periodInMonth(r.period_start, r.period_end, monthFilter.value))
  )

  const canDiscard = (report: GipAccomplishmentRow) => report.status !== 'Reviewed'

  /** Shared by the desktop row actions and the mobile swipe actions (DESIGN.md 13.2) */
  function reportActions(report: GipAccomplishmentRow) {
    const editable = isSelectedTermActive.value && report.status !== 'Reviewed'
    return {
      open: { label: editable ? 'Edit' : 'View', icon: editable ? Pencil : Eye, onSelect: () => openReport(report) },
      download: { label: 'Download PDF', icon: Download, onSelect: () => generateSaved(report, 'download') },
      print: { label: 'Print', icon: Printer, onSelect: () => generateSaved(report, 'print') },
      signedCopy: report.file_path ? { label: 'Signed copy', icon: FileText, onSelect: () => viewOwnFile(report) } : null,
      remove: { label: 'Remove', icon: Trash2, onSelect: () => requestDiscard([report]), disabled: !canDiscard(report) },
    }
  }

  const iconButton = (label: string, icon: typeof Eye, onClick: () => void, extraClass = '', disabled = false) => {
    const button = h(
      Button,
      { variant: 'ghost', size: 'icon', class: `size-8 cursor-pointer ${extraClass}`, title: label, 'aria-label': label, disabled, onClick },
      () => h(icon, { class: 'size-4' })
    )
    // A disabled button ignores the pointer, so its reason shows on a wrapper
    return disabled ? h('span', { class: 'inline-flex cursor-not-allowed', title: label }, [button]) : button
  }

  const reportSummary = (report: GipAccomplishmentRow) =>
    report.program === 'DOLE'
      ? `${report.daily_entries.length} daily entr${report.daily_entries.length === 1 ? 'y' : 'ies'}`
      : [
          `${report.activities.length} activit${report.activities.length === 1 ? 'y' : 'ies'}`,
          report.amount != null ? `₱${data.formatPesoAmount(report.amount)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  const reportColumns: ColumnDef<GipAccomplishmentRow>[] = [
    {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) =>
        h(Checkbox, {
          modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true),
          'aria-label': 'Select all reports on this page',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(value === true),
          'aria-label': `Select the report for ${data.formatPeriodRange(row.original.period_start, row.original.period_end)}`,
        }),
    },
    {
      id: 'period',
      accessorFn: (row) => row.period_start,
      header: sortableHeader('Period'),
      cell: ({ row }) =>
        h('span', { class: 'text-sm font-medium whitespace-nowrap tabular-nums' }, data.formatPeriodRange(row.original.period_start, row.original.period_end)),
    },
    {
      id: 'report',
      header: 'Report',
      enableSorting: false,
      cell: ({ row }) => h('span', { class: 'text-sm whitespace-nowrap text-muted-foreground' }, reportSummary(row.original)),
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) =>
        h('div', { class: 'grid gap-1' }, [
          h(Badge, { variant: 'outline', class: `w-fit ${data.badgeClass[row.original.status]}` }, () => row.original.status),
          row.original.status === 'Returned' && row.original.review_remarks
            ? h('span', { class: 'max-w-[220px] truncate text-xs text-warning', title: row.original.review_remarks }, row.original.review_remarks)
            : null,
        ]),
    },
    {
      id: 'submitted',
      accessorFn: (row) => row.submitted_at ?? '',
      header: sortableHeader('Submitted'),
      cell: ({ row }) =>
        h('span', { class: 'text-sm whitespace-nowrap tabular-nums' }, row.original.submitted_at ? data.formatDate(row.original.submitted_at) : '—'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const a = reportActions(row.original)
        const busy = generating.value !== null
        return h('div', { class: 'flex items-center justify-end gap-1' }, [
          iconButton(a.open.label, a.open.icon, a.open.onSelect),
          iconButton(a.download.label, a.download.icon, a.download.onSelect, '', busy),
          iconButton(a.print.label, a.print.icon, a.print.onSelect, '', busy),
          a.signedCopy ? iconButton(a.signedCopy.label, a.signedCopy.icon, a.signedCopy.onSelect) : null,
          iconButton(
            a.remove.disabled ? "Reviewed reports can't be removed" : a.remove.label,
            a.remove.icon,
            a.remove.onSelect,
            'text-destructive hover:bg-destructive/10 hover:text-destructive',
            a.remove.disabled
          ),
        ])
      },
    },
  ]

  const reportSorting = ref<SortingState>([{ id: 'period', desc: true }])
  const rowSelection = ref<RowSelectionState>({})

  const reportTable = useVueTable({
    get data() {
      return reportRows.value
    },
    columns: reportColumns,
    // Keeps the selection on the right rows across refreshes and sorting
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, reportSorting),
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    state: {
      get sorting() {
        return reportSorting.value
      },
      get rowSelection() {
        return rowSelection.value
      },
    },
  })

  /** Mobile card for a report: its dates, then status and contents */
  const getReportCard = (report: GipAccomplishmentRow): SwipeCard => ({
    title: data.formatPeriodRange(report.period_start, report.period_end),
    subtitle: [report.status, reportSummary(report)].join(' · '),
  })

  /** Remove first (primary edge) when allowed (Reviewed reports are locked); none collapses the card (DESIGN.md 13.2) */
  function getReportSwipeActions(report: GipAccomplishmentRow): SwipeAction[] {
    const a = reportActions(report)
    const swipe = (id: string, action: { label: string; icon: typeof Eye; onSelect: () => void }): SwipeAction => ({
      id,
      label: action.label.split(' ')[0]!,
      icon: action.icon,
      dismiss: false,
      onSelect: action.onSelect,
    })
    return [
      a.remove.disabled ? null : swipe('remove', a.remove),
      swipe('open', a.open),
      swipe('download', a.download),
      swipe('print', a.print),
    ].filter((action): action is SwipeAction => action !== null)
  }

  // ─── Selection & discard ───
  /** Selected reports that still exist (a refresh or discard can remove rows) */
  const selectedReports = computed(() => {
    const ids = new Set(Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]))
    return reportRows.value.filter((r) => ids.has(r.id))
  })

  function clearSelection() {
    rowSelection.value = {}
  }

  // A different term or month can't keep rows selected
  watch([selectedTermId, monthFilter], () => {
    clearSelection()
    reportTable.setPageIndex(0)
  })

  const reportsToDiscard = ref<GipAccomplishmentRow[]>([])
  const isDiscarding = ref(false)
  const isDiscardDialogOpen = computed({
    get: () => reportsToDiscard.value.length > 0,
    set: (open: boolean) => {
      if (!open && !isDiscarding.value) reportsToDiscard.value = []
    },
  })

  /** Selected Reviewed reports a bulk remove leaves in place (they are locked) */
  const skippedCount = ref(0)

  function requestDiscard(rows: GipAccomplishmentRow[]) {
    const removable = rows.filter(canDiscard)
    skippedCount.value = rows.length - removable.length
    if (!removable.length) {
      toastAlert.error("Can't remove reviewed reports", 'PESO has already reviewed the selected reports.')
      return
    }
    reportsToDiscard.value = removable
  }

  function requestBulkDiscard() {
    requestDiscard(selectedReports.value)
  }

  /** Selected reports that can be removed (not Reviewed) */
  const removableSelectedCount = computed(() => selectedReports.value.filter(canDiscard).length)

  async function confirmDiscard() {
    const rows = reportsToDiscard.value
    if (!rows.length) return
    isDiscarding.value = true
    try {
      const deleted = new Set(await gipAccomplishmentService.removeMany(rows))
      reports.value = reports.value.filter((r) => !deleted.has(r.id))
      const next = { ...rowSelection.value }
      for (const id of deleted) delete next[id]
      rowSelection.value = next
      reportsToDiscard.value = []
      if (deleted.size === rows.length) {
        toastAlert.success(deleted.size === 1 ? 'Report removed' : `${deleted.size} reports removed`, 'They were removed with their files.')
      } else {
        toastAlert.error('Some reports were not removed', `${rows.length - deleted.size} could not be removed. Please try again.`)
      }
    } catch (error) {
      // The selection stays so the intern can retry
      toastAlert.error('Could not remove the reports', errorMessageOf(error, 'Please try again.'))
    } finally {
      isDiscarding.value = false
    }
  }

  return {
    // State
    isLoading: data.isLoading,
    isEnrolled: data.isEnrolled,
    activeAppointment,
    termNotStarted: data.termNotStarted,
    canAddReport: data.canAddReport,
    addAccomplishment,
    // Table 1: terms
    termTable,
    termColumns,
    termRows,
    getTermCard,
    getTermSwipeActions,
    openTerm,
    // Table 2: the open term's reports
    selectedTermId,
    selectedTerm,
    isSelectedTermActive,
    showAllTerms,
    monthFilter,
    monthOptions,
    termReports,
    reportTable,
    reportColumns,
    reportRows,
    getReportCard,
    getReportSwipeActions,
    // Selection & discard
    selectedReports,
    clearSelection,
    requestBulkDiscard,
    removableSelectedCount,
    skippedCount,
    reportsToDiscard,
    isDiscardDialogOpen,
    isDiscarding,
    confirmDiscard,
    // Display
    formatPeriodRange: data.formatPeriodRange,
    formatDate: data.formatDate,
  }
}
