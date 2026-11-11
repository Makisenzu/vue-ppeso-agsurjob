import { computed, h, ref, watch, type Component, type Ref } from 'vue'
import type { ColumnDef, RowSelectionState } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { valueUpdater } from '@/components/ui/table/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SKILLS_TRAINING_PAGE_SIZE } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'

/** The select column of DESIGN.md §13.1; `label` names the row for screen readers */
export function selectColumn<T>(label: (row: T) => string): ColumnDef<T> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) =>
      h(Checkbox, {
        modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true),
        'aria-label': 'Select all rows on this page',
      }),
    cell: ({ row }) =>
      // Rows may be clickable: a checkbox click never opens the row
      h('div', { class: 'flex', onClick: (event: MouseEvent) => event.stopPropagation() }, [
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(value === true),
          'aria-label': `Select ${label(row.original)}`,
        }),
      ]),
  }
}

/** An icon-only row action */
export const rowActionButton = (label: string, icon: Component, onClick: () => void, extraClass = '', disabled = false) =>
  h(
    Button,
    {
      variant: 'ghost',
      size: 'icon',
      class: `size-8 cursor-pointer ${extraClass}`,
      title: label,
      'aria-label': label,
      disabled,
      onClick: (event: MouseEvent) => {
        event.stopPropagation()
        onClick()
      },
    },
    () => h(icon, { class: 'size-4' }),
  )

interface ServerTableOptions<T> {
  rows: Ref<T[]>
  columns: ColumnDef<T>[]
  getRowId: (row: T) => string
  /** Rows matching the filters on the server, and the zero-based page shown */
  total: Ref<number>
  page: Ref<number>
  setPage: (page: number) => unknown
}

/**
 * A data table whose rows are one server page (BACKEND.md §19): selection covers the page on screen and
 * clears whenever the rows are fetched again (DESIGN.md §13.1 rule 3).
 */
export function useServerTable<T>({ rows, columns, getRowId, total, page, setPage }: ServerTableOptions<T>) {
  const rowSelection = ref<RowSelectionState>({})

  const table = useVueTable({
    get data() {
      return rows.value
    },
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    state: {
      get rowSelection() {
        return rowSelection.value
      },
    },
  })

  const selectedRows = computed(() => rows.value.filter((row) => rowSelection.value[getRowId(row)]))

  function clearSelection() {
    rowSelection.value = {}
  }
  watch(rows, clearSelection)

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / SKILLS_TRAINING_PAGE_SIZE)))
  const canPrevious = computed(() => page.value > 0)
  const canNext = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => canPrevious.value && setPage(page.value - 1)
  const nextPage = () => canNext.value && setPage(page.value + 1)

  /** "1–10 of 42" */
  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 records'
    const first = page.value * SKILLS_TRAINING_PAGE_SIZE + 1
    const last = Math.min(total.value, first + rows.value.length - 1)
    return `${first.toLocaleString()}–${last.toLocaleString()} of ${total.value.toLocaleString()}`
  })

  return { table, selectedRows, clearSelection, canPrevious, canNext, previousPage, nextPage, rangeLabel }
}
