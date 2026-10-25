import { ref } from 'vue'
import { defineStore } from 'pinia'
import { siteContentManagerService } from '@/services/peso/provincialPeso/siteContentManagerService'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  OrgChartPositionInsert,
  OrgChartPositionItem,
  OrgChartUnitInsert,
  OrgChartUnitRow,
} from '@/types/common/siteContent'

/** A photo picked in the position form: a new file, removal of the saved one, or neither. */
export interface OrgPhotoChange {
  file: File | null
  remove: boolean
}

const positionLabel = (position: Pick<OrgChartPositionItem, 'holder_name' | 'title'>) =>
  position.holder_name ?? `Vacant ${position.title}`

/** Provincial PESO management of the organizational chart (system.org_chart_units / org_chart_positions, 052). */
export const useOrgChartManagerStore = defineStore('pesoOrgChartManager', () => {
  const toastAlert = useToastAlert()
  const publicSiteContentStore = useSiteContentStore()

  // ─── State ───
  const units = ref<OrgChartUnitRow[]>([])
  const positions = ref<OrgChartPositionItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)

  // ─── UI Flags ───
  const isUnitDialogOpen = ref(false)
  const editingUnit = ref<OrgChartUnitRow | null>(null)
  const unitToDelete = ref<OrgChartUnitRow | null>(null)
  const isPositionDialogOpen = ref(false)
  const editingPosition = ref<OrgChartPositionItem | null>(null)
  // Group a new position starts in: a unit id, or null for the top of the chart
  const newPositionUnitId = ref<string | null>(null)
  const positionToDelete = ref<OrgChartPositionItem | null>(null)

  const replaceUnit = (unit: OrgChartUnitRow) => {
    units.value = units.value.some((item) => item.id === unit.id)
      ? units.value.map((item) => (item.id === unit.id ? unit : item))
      : [...units.value, unit]
  }

  const replacePosition = (position: OrgChartPositionItem) => {
    positions.value = positions.value.some((item) => item.id === position.id)
      ? positions.value.map((item) => (item.id === position.id ? position : item))
      : [...positions.value, position]
  }

  // Old files are cleaned up best-effort: a leftover file is harmless, a failed save is not
  const removeImagesQuietly = async (paths: (string | null | undefined)[]) => {
    try {
      await siteContentManagerService.removeImages(paths.filter((path): path is string => !!path))
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Actions ───
  async function fetchChart(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const [unitRows, positionRows] = await Promise.all([
        siteContentManagerService.fetchOrgUnits(),
        siteContentManagerService.fetchOrgPositions(),
      ])
      units.value = unitRows
      positions.value = positionRows
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  async function saveUnit(payload: OrgChartUnitInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const target = editingUnit.value
      replaceUnit(
        target
          ? await siteContentManagerService.updateOrgUnit(target.id, payload)
          : await siteContentManagerService.createOrgUnit(payload)
      )
      publicSiteContentStore.resetOrgChart()
      isUnitDialogOpen.value = false
      toastAlert.success(target ? 'Division updated' : 'Division added', `"${payload.name}" has been saved.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteUnit(): Promise<boolean> {
    const target = unitToDelete.value
    if (!target) return false
    isDeleting.value = true
    try {
      await siteContentManagerService.deleteOrgUnit(target.id)
      units.value = units.value.filter((unit) => unit.id !== target.id)
      unitToDelete.value = null
      publicSiteContentStore.resetOrgChart()
      toastAlert.success('Division deleted', `"${target.name}" has been removed from the chart.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  /**
   * Creates or updates a position, then its photo: a new file is uploaded under the position's folder
   * (so a new position is saved first), and the previous file is removed once the row points elsewhere.
   */
  async function savePosition(payload: OrgChartPositionInsert, photo: OrgPhotoChange): Promise<boolean> {
    isSubmitting.value = true
    const target = editingPosition.value
    let uploadedPath: string | null = null
    try {
      let saved = target
        ? await siteContentManagerService.updateOrgPosition(target.id, payload)
        : await siteContentManagerService.createOrgPosition(payload)
      replacePosition(saved)

      let photoError: string | null = null
      if (photo.file || photo.remove) {
        try {
          if (photo.file) uploadedPath = await siteContentManagerService.uploadOrgPositionPhoto(saved.id, photo.file)
          saved = await siteContentManagerService.updateOrgPosition(saved.id, { photo_path: uploadedPath })
          replacePosition(saved)
          await removeImagesQuietly([target?.photo_path])
        } catch (error: any) {
          // The position is saved; only its photo didn't change, and can be retried through Edit
          if (uploadedPath) await removeImagesQuietly([uploadedPath])
          photoError = error.message
        }
      }

      publicSiteContentStore.resetOrgChart()
      isPositionDialogOpen.value = false
      if (photoError) {
        toastAlert.error('Photo not saved', `${positionLabel(saved)} was saved without the photo change. ${photoError}`)
      } else {
        toastAlert.success(target ? 'Position updated' : 'Position added', `${positionLabel(saved)} has been saved.`)
      }
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deletePosition(): Promise<boolean> {
    const target = positionToDelete.value
    if (!target) return false
    isDeleting.value = true
    try {
      await siteContentManagerService.deleteOrgPosition(target.id)
      await removeImagesQuietly([target.photo_path])
      positions.value = positions.value.filter((position) => position.id !== target.id)
      positionToDelete.value = null
      publicSiteContentStore.resetOrgChart()
      toastAlert.success('Position deleted', `${positionLabel(target)} has been removed from the chart.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions ───
  function openUnitDialog(unit: OrgChartUnitRow | null = null) {
    editingUnit.value = unit
    isUnitDialogOpen.value = true
  }

  function closeUnitDialog() {
    if (isSubmitting.value) return
    isUnitDialogOpen.value = false
  }

  function openPositionDialog(position: OrgChartPositionItem | null = null, unitId: string | null = null) {
    editingPosition.value = position
    newPositionUnitId.value = position ? position.unit_id : unitId
    isPositionDialogOpen.value = true
  }

  function closePositionDialog() {
    if (isSubmitting.value) return
    isPositionDialogOpen.value = false
  }

  function requestDeleteUnit(unit: OrgChartUnitRow) {
    unitToDelete.value = unit
  }

  function requestDeletePosition(position: OrgChartPositionItem) {
    positionToDelete.value = position
  }

  function cancelDelete() {
    if (isDeleting.value) return
    unitToDelete.value = null
    positionToDelete.value = null
  }

  return {
    units,
    positions,
    isLoading,
    errorMessage,
    isSubmitting,
    isDeleting,
    isUnitDialogOpen,
    editingUnit,
    unitToDelete,
    isPositionDialogOpen,
    editingPosition,
    newPositionUnitId,
    positionToDelete,
    fetchChart,
    saveUnit,
    deleteUnit,
    savePosition,
    deletePosition,
    openUnitDialog,
    closeUnitDialog,
    openPositionDialog,
    closePositionDialog,
    requestDeleteUnit,
    requestDeletePosition,
    cancelDelete,
  }
})
