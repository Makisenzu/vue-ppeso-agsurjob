import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { useOrgChartManagerStore } from '@/stores/peso/provincialPeso/orgChartManagerStore'
import { getNameInitials } from '@/helpers/common/siteContentHelper'
import {
  ORG_EMPLOYMENT_STATUS_LABELS,
  type OrgChartPositionItem,
  type OrgChartUnitRow,
} from '@/types/common/siteContent'

// Same status colors as the public chart's legend (tokens in style.css)
const STATUS_BADGE_CLASS = {
  elected: 'bg-org-elected/10 text-org-elected border-org-elected/30',
  permanent: 'bg-org-permanent/10 text-org-permanent border-org-permanent/30',
  casual: 'bg-org-casual/10 text-org-casual border-org-casual/30',
  job_order: 'bg-org-job-order/15 text-foreground border-org-job-order/40',
  vacant: 'bg-muted text-muted-foreground border-border border-dashed',
}

const bySortOrder = <T extends { sort_order: number; created_at: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)

/** A position row of the management list, with what its badges and avatar show. */
const toPositionRow = (position: OrgChartPositionItem) => ({
  ...position,
  initials: getNameInitials(position.holder_name),
  statusLabel: position.holder_name ? ORG_EMPLOYMENT_STATUS_LABELS[position.employment_status] : 'Vacant',
  statusClass: STATUS_BADGE_CLASS[position.holder_name ? position.employment_status : 'vacant'],
})

/** "Organizational chart" panel of Site Contents: the top of the chart and each division, with their positions. */
export function useOrgChartManager() {
  const store = useOrgChartManagerStore()
  const { units, positions, isLoading, errorMessage, isDeleting, unitToDelete, positionToDelete } = storeToRefs(store)
  const {
    fetchChart,
    deleteUnit,
    deletePosition,
    openUnitDialog,
    openPositionDialog,
    requestDeleteUnit,
    requestDeletePosition,
    cancelDelete,
  } = store

  /** The top of the chart first, then each division in display order, each with its sorted positions. */
  const groups = computed(() => {
    const sorted = [...positions.value].sort(bySortOrder)
    const top = {
      key: 'top',
      unit: null as OrgChartUnitRow | null,
      title: 'Top of the chart',
      subtitle: 'Above the divisions, e.g. the Governor and the PESO Manager',
      positions: sorted.filter((position) => !position.unit_id).map(toPositionRow),
    }
    return [
      top,
      ...[...units.value].sort(bySortOrder).map((unit) => ({
        key: unit.id,
        unit,
        title: unit.name,
        subtitle: unit.abbreviation,
        positions: sorted.filter((position) => position.unit_id === unit.id).map(toPositionRow),
      })),
    ]
  })

  // Collapsed groups, remembered per browser like the Site Contents sections; every group starts open
  const closedGroups = useLocalStorage<string[]>('site-contents:org-chart:closed-groups', [])
  const isGroupOpen = (key: string) => !closedGroups.value.includes(key)
  const setGroupOpen = (key: string, open: boolean) => {
    closedGroups.value = open
      ? closedGroups.value.filter((item) => item !== key)
      : [...new Set([...closedGroups.value, key])]
  }

  const positionCount = computed(() => positions.value.length)
  const vacantCount = computed(() => positions.value.filter((position) => !position.holder_name).length)

  const deleteTargetName = computed(() =>
    unitToDelete.value
      ? unitToDelete.value.name
      : positionToDelete.value
        ? (positionToDelete.value.holder_name ?? `Vacant ${positionToDelete.value.title}`)
        : ''
  )

  const isDeleteDialogOpen = computed({
    get: () => unitToDelete.value !== null || positionToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  onMounted(() => {
    void fetchChart()
  })

  return {
    groups,
    isGroupOpen,
    setGroupOpen,
    positionCount,
    vacantCount,
    isLoading,
    errorMessage,
    isDeleting,
    isDeletingUnit: computed(() => unitToDelete.value !== null),
    deleteTargetName,
    isDeleteDialogOpen,
    refreshChart: fetchChart,
    confirmDelete: () => (unitToDelete.value ? deleteUnit() : deletePosition()),
    openUnitDialog,
    openPositionDialog,
    requestDeleteUnit,
    requestDeletePosition,
  }
}
