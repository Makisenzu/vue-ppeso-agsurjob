import { format, isValid, parse } from 'date-fns'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/vue-table'
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { ArrowUpDown, Download, Eye, Printer, Trash2 } from '@lucide/vue'
import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { gipAppointmentRecordService } from '@/services/peso/provincialPeso/gipAppointmentRecordService'
import { privacyService } from '@/services/common/privacyService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { formatAppointmentPeriodLabel } from '@/helpers/peso/provincialPeso/gipHelper'
import {
  downloadGipAppointmentRecord,
  printGipAppointmentRecord,
  renderGipAppointmentRecordPages,
  type GipAppointmentRecordRow,
  type GipAppointmentRecordSettings,
} from '@/helpers/peso/provincialPeso/gipAppointmentRecordHelper'
import type { SavedGipAppointmentRecord } from '@/types/peso/provincialPeso/gipAppointmentRecord'

const AUDIT_TABLE = 'esmdd.gip_appointment_records'
const PAGE_SIZE = 10

export const APPOINTMENT_PROGRAM_FILTERS = [
  { value: 'ALL', label: 'All programs' },
  { value: 'PGAS', label: 'PGAS' },
  { value: 'DOLE', label: 'DOLE' },
  { value: 'Mixed', label: 'PGAS + DOLE' },
] as const

export const APPOINTMENT_PROGRAM_BADGE_CLASS: Record<SavedGipAppointmentRecord['program'], string> = {
  PGAS: 'border-primary/30 bg-primary/10 text-primary',
  DOLE: 'border-info/30 bg-info/10 text-info',
  Mixed: 'border-warning/30 bg-warning/10 text-warning',
}

/** Appointment term of the listed interns: a first appointment or a renewal */
export const APPOINTMENT_TERM_FILTERS = [
  { value: 'ALL', label: 'All Terms' },
  { value: 'New Enrollment', label: 'New Enrollment' },
  { value: 'Renewal', label: 'Renewal' },
] as const

/** Filter value of an entry's employment period, as printed: "NOVEMBER 1, 2026|NOVEMBER 30, 2026" */
const entryPeriodKey = (entry: GipAppointmentRecordRow) => `${entry.periodStart}|${entry.periodEnd}`

/** "NOVEMBER 1, 2026" → "2026-11-01"; null when the printed date can't be read */
function printedDateToIso(value: string): string | null {
  const date = parse(value.trim(), 'MMMM d, yyyy', new Date())
  return isValid(date) ? format(date, 'yyyy-MM-dd') : null
}

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** "Dagondon, Al Kevin C., Resondo, Naden E. +3" */
export function recordNames(record: SavedGipAppointmentRecord, max = 2): string {
  const names = record.entries.map((e) => e.name)
  const shown = names.slice(0, max).join('; ')
  return names.length > max ? `${shown} +${names.length - max}` : shown
}

/** Earliest start to latest end of the listed interns, as printed ("OCTOBER 5, 2026 – DECEMBER 30, 2026") */
export function recordPeriod(record: SavedGipAppointmentRecord): string {
  const starts = [...new Set(record.entries.map((e) => e.periodStart).filter(Boolean))]
  const ends = [...new Set(record.entries.map((e) => e.periodEnd).filter(Boolean))]
  if (starts.length === 0 && ends.length === 0) return ''
  const start = starts.length === 1 ? starts[0] : 'Various'
  const end = ends.length === 1 ? ends[0] : 'Various'
  return start === end ? start! : `${start} – ${end}`
}

/**
 * GIP → Appointments (View Appointments): every saved Appointment Record (DESIGN.md §13.1 data table: select
 * column, bulk delete). View shows the record as saved; Download / Print regenerate the same PDF from the snapshot.
 * Records list interns' names and addresses, so viewing or exporting one is logged (PRIVACY.md rule 5).
 */
export function useGipAppointmentRecords() {
  const router = useRouter()
  const toastAlert = useToastAlert()

  const records = ref<SavedGipAppointmentRecord[]>([])
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  async function load() {
    isLoading.value = true
    loadError.value = null
    try {
      records.value = await gipAppointmentRecordService.list()
    } catch (error) {
      loadError.value = errorMessageOf(error, 'Could not load the appointment records.')
    } finally {
      isLoading.value = false
    }
  }
  onMounted(load)

  // ─── Filters ───
  const searchQuery = ref('')
  const programFilter = ref<string>('ALL')
  /** Term ('New Enrollment' / 'Renewal') and employment period of the listed interns; 'ALL' for any */
  const termFilter = ref<string>('ALL')
  const periodFilter = ref<string>('ALL')

  // Employment periods on the saved records, newest first, in month names ("Nov 1 – Nov 30, 2026")
  const periodFilterOptions = computed(() => {
    const periods = new Map<string, { label: string; sort: string }>()
    for (const record of records.value) {
      for (const entry of record.entries) {
        const key = entryPeriodKey(entry)
        if (!entry.periodStart || !entry.periodEnd || periods.has(key)) continue
        const start = printedDateToIso(entry.periodStart)
        const end = printedDateToIso(entry.periodEnd)
        periods.set(key, {
          label: start && end ? formatAppointmentPeriodLabel(start, end, true) : `${entry.periodStart} – ${entry.periodEnd}`,
          sort: `${start ?? ''}|${end ?? ''}`,
        })
      }
    }
    return [
      { value: 'ALL', label: 'All Periods' },
      ...[...periods.entries()]
        .sort(([, a], [, b]) => b.sort.localeCompare(a.sort))
        .map(([value, { label }]) => ({ value, label })),
    ]
  })

  const filteredRecords = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return records.value.filter((record) => {
      if (programFilter.value !== 'ALL' && record.program !== programFilter.value) return false
      // One listed intern matching both: e.g. a renewal, in that period
      if (
        (termFilter.value !== 'ALL' || periodFilter.value !== 'ALL') &&
        !record.entries.some(
          (e) =>
            (termFilter.value === 'ALL' || e.currentStatus === termFilter.value) &&
            (periodFilter.value === 'ALL' || entryPeriodKey(e) === periodFilter.value),
        )
      ) {
        return false
      }
      if (!q) return true
      return (
        record.source_of_funds.toLowerCase().includes(q) ||
        record.entries.some(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.address.toLowerCase().includes(q) ||
            (e.areaOfAssignment ?? '').toLowerCase().includes(q),
        )
      )
    })
  })
  const hasFilters = computed(
    () => !!searchQuery.value.trim() || programFilter.value !== 'ALL' || termFilter.value !== 'ALL' || periodFilter.value !== 'ALL',
  )

  function clearFilters() {
    searchQuery.value = ''
    programFilter.value = 'ALL'
    termFilter.value = 'ALL'
    periodFilter.value = 'ALL'
  }

  // ─── Actions ───
  const generatingId = ref<string | null>(null)

  const settingsOf = (record: SavedGipAppointmentRecord): GipAppointmentRecordSettings => ({
    designation: record.designation,
    sourceOfFunds: record.source_of_funds,
    signatories: record.signatories,
  })

  async function generate(record: SavedGipAppointmentRecord, kind: 'download' | 'print') {
    if (generatingId.value) return
    generatingId.value = record.id
    try {
      if (kind === 'download') await downloadGipAppointmentRecord(record.entries, settingsOf(record))
      else await printGipAppointmentRecord(record.entries, settingsOf(record))
      void privacyService.logPersonalDataAccess('EXPORT', AUDIT_TABLE, record.id)
    } catch (error) {
      toastAlert.error('Appointment Record', errorMessageOf(error, 'Could not generate the appointment record.'))
    } finally {
      generatingId.value = null
    }
  }

  // View
  const viewedRecord = ref<SavedGipAppointmentRecord | null>(null)
  const isViewOpen = computed({
    get: () => viewedRecord.value !== null,
    set: (open: boolean) => {
      if (!open) viewedRecord.value = null
    },
  })

  // The record is shown as its printable form: the same pages the PDF has, rendered as images
  const viewPages = ref<string[]>([])
  const isViewRendering = ref(false)
  const viewError = ref<string | null>(null)

  async function renderViewPages(record: SavedGipAppointmentRecord) {
    viewPages.value = []
    viewError.value = null
    isViewRendering.value = true
    try {
      const pages = await renderGipAppointmentRecordPages(record.entries, settingsOf(record))
      if (viewedRecord.value?.id === record.id) viewPages.value = pages
    } catch (error) {
      if (viewedRecord.value?.id === record.id) viewError.value = errorMessageOf(error, 'Could not show the appointment record.')
    } finally {
      if (viewedRecord.value?.id === record.id || viewedRecord.value === null) isViewRendering.value = false
    }
  }

  function viewRecord(record: SavedGipAppointmentRecord) {
    viewedRecord.value = record
    void renderViewPages(record)
    void privacyService.logPersonalDataAccess('VIEW', AUDIT_TABLE, record.id)
  }

  const retryView = () => {
    if (viewedRecord.value) void renderViewPages(viewedRecord.value)
  }

  // Delete (one or many)
  const pendingDelete = ref<SavedGipAppointmentRecord[]>([])
  const isDeleting = ref(false)
  const isDeleteDialogOpen = computed({
    get: () => pendingDelete.value.length > 0,
    set: (open: boolean) => {
      if (!open && !isDeleting.value) pendingDelete.value = []
    },
  })

  function requestDelete(list: SavedGipAppointmentRecord[]) {
    if (list.length > 0) pendingDelete.value = [...list]
  }

  async function confirmDelete() {
    if (pendingDelete.value.length === 0 || isDeleting.value) return
    isDeleting.value = true
    try {
      const removed = new Set(await gipAppointmentRecordService.removeMany(pendingDelete.value.map((r) => r.id)))
      records.value = records.value.filter((r) => !removed.has(r.id))
      if (viewedRecord.value && removed.has(viewedRecord.value.id)) viewedRecord.value = null
      clearSelection()
      const missed = pendingDelete.value.length - removed.size
      if (removed.size > 0) {
        toastAlert.success(
          'Appointment Records Deleted',
          `${removed.size} record${removed.size === 1 ? '' : 's'} deleted.` + (missed > 0 ? ` ${missed} could not be deleted.` : ''),
        )
      } else {
        toastAlert.error('Delete Failed', 'The selected records could not be deleted.')
      }
      pendingDelete.value = []
    } catch (error) {
      toastAlert.error('Delete Failed', errorMessageOf(error, 'Could not delete the appointment records.'))
    } finally {
      isDeleting.value = false
    }
  }

  const recordActions = (record: SavedGipAppointmentRecord) => ({
    view: { label: 'View record', icon: Eye, onSelect: () => viewRecord(record) },
    download: { label: 'Download PDF', icon: Download, onSelect: () => void generate(record, 'download') },
    print: { label: 'Print', icon: Printer, onSelect: () => void generate(record, 'print') },
    remove: { label: 'Delete record', icon: Trash2, onSelect: () => requestDelete([record]) },
  })

  // ─── Table ───
  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })],
      )

  const iconButton = (label: string, icon: typeof Eye, onClick: () => void, extraClass = '', disabled = false) =>
    h(
      Button,
      { variant: 'ghost', size: 'icon', class: `size-8 cursor-pointer ${extraClass}`, title: label, 'aria-label': label, disabled, onClick },
      () => h(icon, { class: 'size-4' }),
    )

  const columns: ColumnDef<SavedGipAppointmentRecord>[] = [
    {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) =>
        h(Checkbox, {
          modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true),
          'aria-label': 'Select all records on this page',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(value === true),
          'aria-label': `Select the record saved ${formatDisplayDate(row.original.created_at)}`,
        }),
    },
    {
      id: 'interns',
      accessorFn: (row) => row.intern_count,
      header: sortableHeader('Interns'),
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', { class: 'text-sm font-medium' }, `${row.original.intern_count} intern${row.original.intern_count === 1 ? '' : 's'}`),
          h('span', { class: 'max-w-[280px] truncate text-xs text-muted-foreground', title: row.original.entries.map((e) => e.name).join('; ') }, recordNames(row.original)),
        ]),
    },
    {
      id: 'program',
      accessorFn: (row) => row.program,
      header: 'Program',
      enableSorting: false,
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: APPOINTMENT_PROGRAM_BADGE_CLASS[row.original.program] }, () =>
          row.original.program === 'Mixed' ? 'PGAS + DOLE' : row.original.program,
        ),
    },
    {
      id: 'funds',
      accessorFn: (row) => row.source_of_funds,
      header: 'Source of funds',
      enableSorting: false,
      cell: ({ row }) => h('span', { class: 'block max-w-[220px] truncate text-sm', title: row.original.source_of_funds }, row.original.source_of_funds),
    },
    {
      id: 'period',
      header: 'Employment period',
      enableSorting: false,
      cell: ({ row }) => h('span', { class: 'text-xs whitespace-nowrap' }, recordPeriod(row.original) || '—'),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const a = recordActions(row.original)
        const busy = generatingId.value !== null
        return h('div', { class: 'flex items-center justify-end gap-1' }, [
          iconButton(a.view.label, a.view.icon, a.view.onSelect),
          iconButton(a.download.label, a.download.icon, a.download.onSelect, '', busy),
          iconButton(a.print.label, a.print.icon, a.print.onSelect, '', busy),
          iconButton(a.remove.label, a.remove.icon, a.remove.onSelect, 'text-destructive hover:bg-destructive/10 hover:text-destructive', isDeleting.value),
        ])
      },
    },
  ]

  // Unsorted, the list keeps the service's order: newest saved first
  const sorting = ref<SortingState>([])
  const rowSelection = ref<RowSelectionState>({})

  const table = useVueTable({
    get data() {
      return filteredRecords.value
    },
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
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

  const selectedRecords = computed(() => {
    const ids = new Set(Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]))
    return records.value.filter((r) => ids.has(r.id))
  })

  function clearSelection() {
    rowSelection.value = {}
  }

  watch([searchQuery, programFilter, termFilter, periodFilter], () => {
    clearSelection()
    table.setPageIndex(0)
  })

  // ─── Mobile cards (DESIGN.md 13.2) ───
  const getRecordCard = (record: SavedGipAppointmentRecord): SwipeCard => ({
    title: `${record.intern_count} intern${record.intern_count === 1 ? '' : 's'} · ${record.program === 'Mixed' ? 'PGAS + DOLE' : record.program}`,
    subtitle: [formatDisplayDate(record.created_at), recordNames(record, 1)].join(' · '),
  })

  /** Delete on the outer edge (destructive), then View and Download */
  function getRecordSwipeActions(record: SavedGipAppointmentRecord): SwipeAction[] {
    const a = recordActions(record)
    return [
      { id: 'delete', label: 'Delete', icon: a.remove.icon, onSelect: a.remove.onSelect, dismiss: false },
      { id: 'view', label: 'View', icon: a.view.icon, onSelect: a.view.onSelect, dismiss: false },
      { id: 'download', label: 'Download', icon: a.download.icon, onSelect: a.download.onSelect, dismiss: false },
    ]
  }

  function goBack() {
    if (window.history.state?.back) router.back()
    else router.push({ name: 'provincial-peso-gip-details' })
  }

  return {
    records,
    filteredRecords,
    isLoading,
    loadError,
    load,
    searchQuery,
    programFilter,
    programFilterOptions: APPOINTMENT_PROGRAM_FILTERS,
    termFilter,
    termFilterOptions: APPOINTMENT_TERM_FILTERS,
    periodFilter,
    periodFilterOptions,
    hasFilters,
    clearFilters,
    table,
    columns,
    selectedRecords,
    clearSelection,
    getRecordCard,
    getRecordSwipeActions,
    generatingId,
    generate,
    viewedRecord,
    isViewOpen,
    viewPages,
    isViewRendering,
    viewError,
    retryView,
    pendingDelete,
    isDeleteDialogOpen,
    isDeleting,
    requestDelete,
    confirmDelete,
    programBadgeClass: APPOINTMENT_PROGRAM_BADGE_CLASS,
    goBack,
  }
}
