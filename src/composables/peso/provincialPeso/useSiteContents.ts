import { computed, h, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ArrowUpDown, ImageOff, Video } from '@lucide/vue'

import { valueUpdater } from '@/components/ui/table/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSiteContentManagerStore } from '@/stores/peso/provincialPeso/siteContentManagerStore'
import { renderRowActions, toSwipeActions, type RowActionHandlers } from '@/helpers/peso/provincialPeso/jobFairTableHelper'
import type { SwipeCard } from '@/types/common/swipeCard'
import {
  formatSiteContentSchedule,
  getSiteContentState,
  getSiteContentStateBadgeClass,
} from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import { getSiteContentDisplayName } from '@/helpers/common/siteContentHelper'
import type { SiteContentListItem, SiteContentState } from '@/types/common/siteContent'

const STATE_OPTIONS: SiteContentState[] = ['Live', 'Scheduled', 'Draft', 'Expired', 'Archived']

export function useSiteContents() {
  const store = useSiteContentManagerStore()
  const { contents, isLoading, errorMessage, isDeleting, contentToDelete } = storeToRefs(store)
  const { fetchContents, openAddDialog, openEditDialog, requestDelete, cancelDelete, deleteContent } = store

  const sorting = ref<SortingState>([{ id: 'sort_order', desc: false }])
  const columnFilters = ref<ColumnFiltersState>([])

  const sortableHeader = (label: string) =>
    ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) =>
      h(
        Button,
        { variant: 'ghost', class: '-ml-3', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') },
        () => [label, h(ArrowUpDown, { class: 'ml-2 size-4' })]
      )

  // Shared by the desktop action buttons and the mobile swipe actions (DESIGN.md 13.2)
  const getRowActionHandlers = (row: SiteContentListItem): RowActionHandlers => ({
    onEdit: () => openEditDialog(row),
    onDelete: () => requestDelete(row),
  })
  const getRowSwipeActions = (row: SiteContentListItem) => toSwipeActions(getRowActionHandlers(row))

  /** Mobile card: main name, then one line of key details */
  const getRowCard = (row: SiteContentListItem): SwipeCard => ({
    title: getSiteContentDisplayName(row),
    subtitle: [`#${row.sort_order}`, getSiteContentState(row), formatSiteContentSchedule(row.published_at, row.expires_at)].join(' · '),
  })

  const columns: ColumnDef<SiteContentListItem>[] = [
    {
      accessorKey: 'sort_order',
      header: sortableHeader('Order'),
      cell: ({ row }) => h('div', { class: 'w-10 text-center text-sm font-medium tabular-nums' }, String(row.original.sort_order)),
    },
    {
      id: 'title',
      // Searchable by whatever text the slide has; media-only slides match "Photo-only slide" / "Video-only slide"
      accessorFn: (row) => [row.title, row.eyebrow, row.description].filter(Boolean).join(' ') || getSiteContentDisplayName(row),
      header: sortableHeader('Content'),
      cell: ({ row }) =>
        h('div', { class: 'flex min-w-[260px] items-center gap-3' }, [
          row.original.image_url && row.original.media_type === 'video'
            ? // First frame as the thumbnail, with a badge so videos stand out from photos
              h('div', { class: 'relative h-12 w-20 shrink-0', title: 'Background video' }, [
                h('video', {
                  src: row.original.image_url,
                  muted: true,
                  preload: 'metadata',
                  'aria-hidden': 'true',
                  class: 'size-full rounded-md border border-border object-cover',
                }),
                h(
                  'span',
                  { class: 'absolute right-1 bottom-1 flex size-5 items-center justify-center rounded bg-background/90 text-foreground' },
                  h(Video, { class: 'size-3' })
                ),
              ])
            : row.original.image_url
            ? h('img', {
                src: row.original.image_url,
                alt: row.original.image_alt ?? '',
                loading: 'lazy',
                class: 'h-12 w-20 shrink-0 rounded-md border border-border object-cover',
              })
            : h(
                'div',
                {
                  class: 'flex h-12 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground',
                  title: 'No background photo or video: the slide uses the plain background',
                },
                h(ImageOff, { class: 'size-4' })
              ),
          h('div', { class: 'min-w-0 space-y-0.5' }, [
            row.original.eyebrow ? h('div', { class: 'truncate text-xs text-muted-foreground' }, row.original.eyebrow) : null,
            h(
              'button',
              {
                type: 'button',
                class: [
                  'line-clamp-2 text-left font-medium hover:text-primary hover:underline',
                  row.original.title ? '' : 'italic text-muted-foreground',
                ],
                onClick: () => openEditDialog(row.original),
              },
              row.original.title || getSiteContentDisplayName(row.original)
            ),
          ]),
        ]),
    },
    {
      id: 'buttons',
      header: 'Buttons',
      enableSorting: false,
      cell: ({ row }) => {
        const labels = [row.original.primary_label, row.original.secondary_label].filter(Boolean) as string[]
        return labels.length
          ? h('div', { class: 'flex flex-wrap gap-1' }, labels.map((label) => h(Badge, { variant: 'outline', class: 'font-normal' }, () => label)))
          : h('span', { class: 'text-sm text-muted-foreground' }, '—')
      },
    },
    {
      id: 'state',
      accessorFn: (row) => getSiteContentState(row),
      header: 'Status',
      filterFn: 'equalsString',
      cell: ({ getValue }) => {
        const state = getValue() as SiteContentState
        return h(Badge, { variant: 'outline', class: getSiteContentStateBadgeClass(state) }, () => state)
      },
    },
    {
      accessorKey: 'published_at',
      header: sortableHeader('Schedule'),
      cell: ({ row }) =>
        h('div', { class: 'whitespace-nowrap text-sm' }, formatSiteContentSchedule(row.original.published_at, row.original.expires_at)),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      enableSorting: false,
      cell: ({ row }) =>
        renderRowActions(getRowActionHandlers(row.original)),
    },
  ]

  const table = useVueTable({
    get data() {
      return contents.value
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

  /** Slides visitors see right now; shown in the header so PESO knows what's on the landing page. */
  const liveCount = computed(() => contents.value.filter((row) => getSiteContentState(row) === 'Live').length)

  const isDeleteDialogOpen = computed({
    get: () => contentToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  onMounted(() => {
    void fetchContents()
  })

  return {
    getRowSwipeActions,
    getRowCard,
    table,
    columns,
    contents,
    liveCount,
    isLoading,
    errorMessage,
    isDeleting,
    contentToDeleteName: computed(() => (contentToDelete.value ? getSiteContentDisplayName(contentToDelete.value) : '')),
    isDeleteDialogOpen,
    stateOptions: STATE_OPTIONS,
    refreshContents: fetchContents,
    openAddDialog,
    confirmDelete: deleteContent,
  }
}
