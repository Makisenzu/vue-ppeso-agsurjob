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
import { formatDisplayDate, formatDisplayDateTime } from '@/helpers/common/dateFormatHelper'
import {
  downloadGipAppointmentRecord,
  formatRate,
  printGipAppointmentRecord,
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

  const filteredRecords = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return records.value.filter((record) => {
      if (programFilter.value !== 'ALL' && record.program !== programFilter.value) return false
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
  const hasFilters = computed(() => !!searchQuery.value.trim() || programFilter.value !== 'ALL')

  function clearFilters() {
    searchQuery.value = ''
    programFilter.value = 'ALL'
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

  function viewRecord(record: SavedGipAppointmentRecord) {
    viewedRecord.value = record
    void privacyService.logPersonalDataAccess('VIEW', AUDIT_TABLE, record.id)
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
      id: 'saved',
      accessorFn: (row) => row.created_at,
      header: sortableHeader('Saved'),
      cell: ({ row }) => h('span', { class: 'text-sm whitespace-nowrap tabular-nums' }, formatDisplayDateTime(row.original.created_at)),
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

  const sorting = ref<SortingState>([{ id: 'saved', desc: true }])
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

  watch([searchQuery, programFilter], () => {
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
    pendingDelete,
    isDeleteDialogOpen,
    isDeleting,
    requestDelete,
    confirmDelete,
    formatRate,
    formatDisplayDateTime,
    programBadgeClass: APPOINTMENT_PROGRAM_BADGE_CLASS,
    goBack,
  }
}
