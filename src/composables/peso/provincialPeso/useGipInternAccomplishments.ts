import { computed, h, ref, watch, type Ref } from 'vue'
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/vue-table'
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { ArrowUpDown, Check, ChevronRight, Download, Eye, FileDown, FileText, Printer, Undo2 } from '@lucide/vue'
import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { gipAccomplishmentService } from '@/services/common/gipAccomplishmentService'
import { privacyService } from '@/services/common/privacyService'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { formatPesoAmount } from '@/helpers/common/amountInWordsHelper'
import { ALL_MONTHS, formatPeriodRange, monthFilterOptions, periodInMonth } from '@/helpers/common/gipAccomplishmentHelper'
import { downloadGipAccomplishmentPdf, printGipAccomplishment } from '@/helpers/common/gipAccomplishmentReportHelper'
import type { GipAppointmentRecord, GipInternRecord } from '@/types/peso/provincialPeso/gip'
import { GIP_ACCOMPLISHMENT_BADGE_CLASS, type GipAccomplishmentRow } from '@/types/common/gipAccomplishment'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback
const AUDIT_TABLE = 'esmdd.gip_accomplishments'
const PAGE_SIZE = 10

/** A term row of Table 1, with its report counts (submitted reports only) */
export interface GipInternTermRow {
  id: string
  term: GipAppointmentRecord
  reportCount: number
  /** Submitted, waiting for PESO's review */
  pendingCount: number
}

/**
 * Intern page → Accomplishments (Provincial PESO), like the intern's own page: two data tables (DESIGN.md §13).
 *   Table 1 — the intern's appointment terms; opening one shows
 *   Table 2 — that term's submitted reports (filter by month, View, generated form, signed copy, Return,
 *             Mark reviewed — one or many).
 * Report contents and files are personal data: opening or saving one is logged (PRIVACY.md rule 5).
 */
export function useGipInternAccomplishments(intern: Ref<GipInternRecord | null>) {
  const toastAlert = useToastAlert()
  const { openDocument, downloadDocument } = usePrivateDocuments()

  // ─── Terms ───
  /** Every appointment term of the intern, newest first (current + history, deduplicated) */
  const terms = computed<GipAppointmentRecord[]>(() => {
    const current = intern.value
    if (!current) return []
    const byId = new Map<string, GipAppointmentRecord>()
    for (const apt of [current.currentAppointment, ...(current.appointmentHistory ?? [])]) {
      if (apt?.id && !byId.has(apt.id)) byId.set(apt.id, apt)
    }
    return [...byId.values()].sort((a, b) => b.termNumber - a.termNumber)
  })
  const termIds = computed(() => terms.value.map((t) => t.id))

  // ─── Reports ───
  const reports = ref<GipAccomplishmentRow[]>([])
  const isLoading = ref(false)
  const hasError = ref(false)

  async function load() {
    const ids = termIds.value
    hasError.value = false
    if (!ids.length) {
      reports.value = []
      return
    }
    isLoading.value = true
    try {
      const rows = await gipAccomplishmentService.listByAppointments(ids)
      // A slower response for a previous intern must not overwrite this one
      if (termIds.value.join(',') === ids.join(',')) reports.value = rows
    } catch (error) {
      console.error('[useGipInternAccomplishments] Failed to load reports:', errorMessageOf(error, ''))
      hasError.value = true
    } finally {
      isLoading.value = false
    }
  }

  // Keyed on the term ids, not the record: a background refresh replaces the record but not its terms
  watch(() => termIds.value.join(','), () => void load(), { immediate: true })

  // Drafts are the intern's work in progress: PESO sees a report once it is submitted
  const submittedReports = computed(() => reports.value.filter((r) => r.status !== 'Draft'))
  const pendingCount = computed(() => reports.value.filter((r) => r.status === 'Submitted').length)

  function replace(updated: GipAccomplishmentRow[]) {
    const byId = new Map(updated.map((r) => [r.id, r]))
    reports.value = reports.value.map((r) => byId.get(r.id) ?? r)
  }

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  const iconButton = (label: string, icon: typeof Eye, onClick: () => void, extraClass = '', disabled = false) =>
    h(
      Button,
      { variant: 'ghost', size: 'icon', class: `size-8 cursor-pointer ${extraClass}`, title: label, 'aria-label': label, disabled, onClick },
      () => h(icon, { class: 'size-4' })
    )

  // ═══ Table 1: terms ═══
  const selectedTermId = ref<string | null>(null)
  const selectedTerm = computed(() => terms.value.find((t) => t.id === selectedTermId.value) ?? null)

  function openTerm(id: string) {
    selectedTermId.value = id
  }

  function showAllTerms() {
    selectedTermId.value = null
  }

  // Another intern's page starts on the terms table
  watch(() => intern.value?.id, showAllTerms)

  const termRows = computed<GipInternTermRow[]>(() =>
    terms.value.map((term) => {
      const termReports = submittedReports.value.filter((r) => r.appointment_id === term.id)
      return {
        id: term.id,
        term,
        reportCount: termReports.length,
        pendingCount: termReports.filter((r) => r.status === 'Submitted').length,
      }
    })
  )

  // Read-only: terms are managed on the intern page (Renew / Conclude), so this table has no select column or
  // bulk delete (DESIGN.md §13.1 rule 8)
  const termColumns: ColumnDef<GipInternTermRow>[] = [
    {
      id: 'term',
      accessorFn: (row) => row.term.termNumber,
      header: sortableHeader('Term'),
      cell: ({ row }) => h('span', { class: 'font-medium' }, `Term ${row.original.term.termNumber}`),
    },
    {
      id: 'program',
      accessorFn: (row) => row.term.program,
      header: 'Program',
      enableSorting: false,
      cell: ({ getValue }) => h('span', { class: 'text-sm' }, String(getValue())),
    },
    {
      id: 'office',
      accessorFn: (row) => row.term.assignedOffice,
      header: 'Office',
      enableSorting: false,
      cell: ({ getValue }) => h('div', { class: 'max-w-[220px] truncate text-sm', title: String(getValue()) }, String(getValue())),
    },
    {
      id: 'period',
      header: 'Period',
      enableSorting: false,
      cell: ({ row }) =>
        h('span', { class: 'text-sm whitespace-nowrap tabular-nums' }, formatPeriodRange(row.original.term.startDate, row.original.term.endDate)),
    },
    {
      id: 'reports',
      accessorFn: (row) => row.reportCount,
      header: sortableHeader('Reports'),
      cell: ({ row }) =>
        h('div', { class: 'flex items-center gap-2 text-sm tabular-nums' }, [
          String(row.original.reportCount),
          row.original.pendingCount
            ? h(Badge, { variant: 'outline', class: GIP_ACCOMPLISHMENT_BADGE_CLASS.Submitted }, () => `${row.original.pendingCount} to review`)
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

  const getTermCard = (row: GipInternTermRow): SwipeCard => ({
    title: `Term ${row.term.termNumber} · ${row.term.program}`,
    subtitle: [
      `${row.reportCount} report${row.reportCount === 1 ? '' : 's'}`,
      row.pendingCount ? `${row.pendingCount} to review` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  })
  const getTermSwipeActions = (row: GipInternTermRow): SwipeAction[] => [
    { id: 'view', label: 'Reports', icon: Eye, dismiss: false, onSelect: () => openTerm(row.id) },
  ]

  // ═══ Table 2: the open term's reports ═══
  const monthFilter = ref<string>(ALL_MONTHS)
  const monthOptions = monthFilterOptions(new Date().getFullYear())

  const termReports = computed(() =>
    selectedTerm.value ? submittedReports.value.filter((r) => r.appointment_id === selectedTerm.value!.id) : []
  )
  const reportRows = computed(() => termReports.value.filter((r) => periodInMonth(r.period_start, r.period_end, monthFilter.value)))
  /** Drafts of the open term, hidden until the intern submits them */
  const draftCount = computed(() =>
    selectedTerm.value ? reports.value.filter((r) => r.appointment_id === selectedTerm.value!.id && r.status === 'Draft').length : 0
  )

  const reportSummary = (report: GipAccomplishmentRow) =>
    report.program === 'DOLE'
      ? `${report.daily_entries.length} daily entr${report.daily_entries.length === 1 ? 'y' : 'ies'}`
      : [
          `${report.activities.length} activit${report.activities.length === 1 ? 'y' : 'ies'}`,
          report.amount != null ? `₱${formatPesoAmount(report.amount)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  // ─── Viewing a report (dialog) ───
  const viewedReport = ref<GipAccomplishmentRow | null>(null)
  function viewReport(report: GipAccomplishmentRow) {
    viewedReport.value = report
    void privacyService.logPersonalDataAccess('VIEW', AUDIT_TABLE, report.id)
  }

  // ─── Files & generated form ───
  const downloadingId = ref<string | null>(null)
  const generatingId = ref<string | null>(null)

  function viewFile(report: GipAccomplishmentRow) {
    if (!report.file_path) return
    // Not awaited before opening: the new tab must open inside the click so popup blockers allow it
    void openDocument(report.file_path)
    void privacyService.logPersonalDataAccess('VIEW', AUDIT_TABLE, report.id, { file: true })
  }

  async function downloadFile(report: GipAccomplishmentRow) {
    if (!report.file_path || !report.file_name || downloadingId.value) return
    downloadingId.value = report.id
    try {
      void privacyService.logPersonalDataAccess('EXPORT', AUDIT_TABLE, report.id, { file: true, download: true })
      await downloadDocument(report.file_path, report.file_name)
    } finally {
      downloadingId.value = null
    }
  }

  /** The report on its funding's official form, as the intern prints it */
  async function generateReport(report: GipAccomplishmentRow, mode: 'download' | 'print') {
    const current = intern.value
    if (!current || generatingId.value) return
    const term = terms.value.find((t) => t.id === report.appointment_id)
    generatingId.value = report.id
    try {
      void privacyService.logPersonalDataAccess('EXPORT', AUDIT_TABLE, report.id, { form: true, mode })
      const data = {
        program: report.program,
        dailyEntries: report.daily_entries,
        activities: report.activities,
        designation: report.designation,
        supervisorName: report.supervisor_name,
        approverName: report.approver_name,
        approverPosition: report.approver_position,
        amount: report.amount,
        amountInWords: report.amount_in_words,
      }
      const ctx = {
        internName: current.fullName,
        office: term?.assignedOffice ?? current.assignedOffice,
        from: report.period_start,
        to: report.period_end,
      }
      if (mode === 'download') await downloadGipAccomplishmentPdf(data, ctx)
      else await printGipAccomplishment(data, ctx)
    } catch (error) {
      toastAlert.error('Could not generate the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      generatingId.value = null
    }
  }

  // ─── Review ───
  const reviewingId = ref<string | null>(null)

  async function markReviewed(report: GipAccomplishmentRow) {
    if (reviewingId.value) return
    reviewingId.value = report.id
    try {
      replace([await gipAccomplishmentService.review(report.id, 'Reviewed', null)])
      toastAlert.success('Report reviewed', 'The intern has been notified.')
    } catch (error) {
      toastAlert.error('Could not update the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      reviewingId.value = null
    }
  }

  // Return: remarks are required (CHECK in migration 112) and shown to the intern
  const reportToReturn = ref<GipAccomplishmentRow | null>(null)
  const returnRemarks = ref('')
  const returnRemarksError = ref<string | null>(null)

  function openReturn(report: GipAccomplishmentRow) {
    reportToReturn.value = report
    returnRemarks.value = report.review_remarks ?? ''
    returnRemarksError.value = null
  }

  function closeReturn() {
    if (reviewingId.value) return
    reportToReturn.value = null
  }

  async function confirmReturn() {
    const report = reportToReturn.value
    if (!report || reviewingId.value) return
    const remarks = returnRemarks.value.trim()
    if (!remarks) {
      returnRemarksError.value = 'Tell the intern what to fix.'
      return
    }
    reviewingId.value = report.id
    try {
      replace([await gipAccomplishmentService.review(report.id, 'Returned', remarks)])
      reportToReturn.value = null
      toastAlert.success('Report returned', 'The intern has been notified with your remarks.')
    } catch (error) {
      toastAlert.error('Could not return the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      reviewingId.value = null
    }
  }

  /** Shared by the desktop row actions and the mobile swipe actions (DESIGN.md 13.2) */
  function reportActions(report: GipAccomplishmentRow) {
    return {
      view: { label: 'View', icon: Eye, onSelect: () => viewReport(report) },
      download: { label: 'Download form', icon: FileDown, onSelect: () => void generateReport(report, 'download') },
      print: { label: 'Print form', icon: Printer, onSelect: () => void generateReport(report, 'print') },
      signedCopy: report.file_path ? { label: 'Signed copy', icon: FileText, onSelect: () => viewFile(report) } : null,
      downloadSigned: report.file_path ? { label: 'Download signed copy', icon: Download, onSelect: () => void downloadFile(report) } : null,
      ret: report.status === 'Submitted' ? { label: 'Return', icon: Undo2, onSelect: () => openReturn(report) } : null,
      review: report.status === 'Submitted' ? { label: 'Mark reviewed', icon: Check, onSelect: () => void markReviewed(report) } : null,
    }
  }

  // Reports are the intern's own records: PESO reviews or returns them but never deletes them here, so the
  // bulk action is Mark reviewed instead of delete (DESIGN.md §13.1 rule 8)
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
          'aria-label': `Select the report for ${formatPeriodRange(row.original.period_start, row.original.period_end)}`,
        }),
    },
    {
      id: 'period',
      accessorFn: (row) => row.period_start,
      header: sortableHeader('Period'),
      cell: ({ row }) =>
        h('span', { class: 'text-sm font-medium whitespace-nowrap tabular-nums' }, formatPeriodRange(row.original.period_start, row.original.period_end)),
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
          h(Badge, { variant: 'outline', class: `w-fit ${GIP_ACCOMPLISHMENT_BADGE_CLASS[row.original.status]}` }, () => row.original.status),
          row.original.status === 'Returned' && row.original.review_remarks
            ? h('span', { class: 'max-w-[200px] truncate text-xs text-warning', title: row.original.review_remarks }, row.original.review_remarks)
            : null,
        ]),
    },
    {
      id: 'submitted',
      accessorFn: (row) => row.submitted_at ?? '',
      header: sortableHeader('Submitted'),
      cell: ({ row }) => h('span', { class: 'text-sm whitespace-nowrap tabular-nums' }, formatDate(row.original.submitted_at) || '—'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const a = reportActions(row.original)
        const busy = generatingId.value !== null
        const reviewing = reviewingId.value !== null
        return h('div', { class: 'flex items-center justify-end gap-1' }, [
          iconButton(a.view.label, a.view.icon, a.view.onSelect),
          iconButton(a.download.label, a.download.icon, a.download.onSelect, '', busy),
          iconButton(a.print.label, a.print.icon, a.print.onSelect, '', busy),
          a.signedCopy ? iconButton(a.signedCopy.label, a.signedCopy.icon, a.signedCopy.onSelect) : null,
          a.downloadSigned ? iconButton(a.downloadSigned.label, a.downloadSigned.icon, a.downloadSigned.onSelect, '', downloadingId.value !== null) : null,
          a.ret ? iconButton(a.ret.label, a.ret.icon, a.ret.onSelect, '', reviewing) : null,
          a.review ? iconButton(a.review.label, a.review.icon, a.review.onSelect, 'text-success hover:bg-success/10 hover:text-success', reviewing) : null,
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

  const getReportCard = (report: GipAccomplishmentRow): SwipeCard => ({
    title: formatPeriodRange(report.period_start, report.period_end),
    subtitle: [report.status, reportSummary(report)].join(' · '),
  })

  /** View first (primary edge, nothing destructive); none collapses the card (DESIGN.md 13.2) */
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
      swipe('view', a.view),
      a.review ? swipe('review', { ...a.review, label: 'Reviewed' }) : null,
      a.ret ? swipe('return', a.ret) : null,
      swipe('download', a.download),
    ].filter((action): action is SwipeAction => action !== null)
  }

  // ─── Bulk: mark reviewed ───
  const selectedReports = computed(() => {
    const ids = new Set(Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]))
    return reportRows.value.filter((r) => ids.has(r.id))
  })
  /** Selected reports still waiting for review (only those can be marked) */
  const reviewableSelected = computed(() => selectedReports.value.filter((r) => r.status === 'Submitted'))
  const isBulkReviewing = ref(false)
  const isBulkReviewDialogOpen = ref(false)

  function clearSelection() {
    rowSelection.value = {}
  }

  watch([selectedTermId, monthFilter], () => {
    clearSelection()
    reportTable.setPageIndex(0)
  })

  async function confirmBulkReview() {
    const ids = reviewableSelected.value.map((r) => r.id)
    if (!ids.length) return
    isBulkReviewing.value = true
    try {
      const updated = await gipAccomplishmentService.markManyReviewed(ids)
      replace(updated)
      clearSelection()
      isBulkReviewDialogOpen.value = false
      toastAlert.success(
        updated.length === 1 ? 'Report reviewed' : `${updated.length} reports reviewed`,
        'The intern has been notified.'
      )
    } catch (error) {
      // The selection stays so PESO can retry
      toastAlert.error('Could not update the reports', errorMessageOf(error, 'Please try again.'))
    } finally {
      isBulkReviewing.value = false
    }
  }

  // ─── Display ───
  function formatDate(iso: string | null) {
    return iso ? formatDisplayDate(iso, iso) : ''
  }
  const formatSize = (size: number | null) => (size == null ? '' : formatFileSize(size))

  return {
    isLoading,
    hasError,
    reload: load,
    pendingCount,
    // Table 1
    termTable,
    termColumns,
    termRows,
    getTermCard,
    getTermSwipeActions,
    openTerm,
    // Table 2
    selectedTermId,
    selectedTerm,
    showAllTerms,
    monthFilter,
    monthOptions,
    termReports,
    reportRows,
    draftCount,
    reportTable,
    reportColumns,
    getReportCard,
    getReportSwipeActions,
    // Bulk
    selectedReports,
    reviewableSelected,
    clearSelection,
    isBulkReviewDialogOpen,
    isBulkReviewing,
    confirmBulkReview,
    // View dialog
    viewedReport,
    // Return dialog
    reviewingId,
    reportToReturn,
    returnRemarks,
    returnRemarksError,
    closeReturn,
    confirmReturn,
    // Display
    badgeClass: GIP_ACCOMPLISHMENT_BADGE_CLASS,
    formatPeriod: formatPeriodRange,
    formatDate,
    formatSize,
    formatPesoAmount,
  }
}
