import { ref } from 'vue'
import { defineStore } from 'pinia'
import { siteContentManagerService } from '@/services/peso/provincialPeso/siteContentManagerService'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { getSiteContentDisplayName } from '@/helpers/common/siteContentHelper'
import type {
  SiteContentInsert,
  SiteContentListItem,
  SiteContentMediaType,
  SiteContentPlacement,
  SiteContentUpdate,
} from '@/types/common/siteContent'

/** Background change sent with a save: a new photo / video, removal of the current one, or nothing. */
export interface SiteContentImageChange {
  file: File | null
  /** What `file` is; ignored without a file */
  mediaType: SiteContentMediaType
  remove: boolean
}

export const useSiteContentManagerStore = defineStore('pesoSiteContentManager', () => {
  const toastAlert = useToastAlert()
  const publicSiteContentStore = useSiteContentStore()

  // ─── State ───
  const placement = ref<SiteContentPlacement>('hero_carousel')
  const contents = ref<SiteContentListItem[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── UI Flags ───
  const isFormDialogOpen = ref(false)
  const editingContent = ref<SiteContentListItem | null>(null)
  const contentToDelete = ref<SiteContentListItem | null>(null)

  const replaceRow = (row: SiteContentListItem) => {
    contents.value = contents.value.map((item) => (item.id === row.id ? row : item))
  }

  // Old files are cleaned up best-effort: a leftover file is harmless, a failed save is not
  const removeImagesQuietly = async (paths: (string | null)[]) => {
    try {
      await siteContentManagerService.removeImages(paths.filter((path): path is string => !!path))
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Actions ───
  async function fetchContents(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      contents.value = await siteContentManagerService.fetchAll(placement.value)
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * The photo / video is stored under the new row's id, so the row is inserted first as a draft,
   * then gets its media and its real status in one update (a published row must have one, 047).
   */
  async function createContent(payload: SiteContentInsert, image: SiteContentImageChange): Promise<boolean> {
    isSubmitting.value = true
    try {
      let created = await siteContentManagerService.create({ ...payload, status: 'draft', placement: placement.value })
      contents.value = [...contents.value, created]

      let imageError: string | null = null
      if (image.file) {
        try {
          const path = await siteContentManagerService.uploadMedia(created.id, image.file)
          created = await siteContentManagerService.update(created.id, {
            image_path: path,
            media_type: image.mediaType,
            status: payload.status,
          })
          replaceRow(created)
        } catch (error: any) {
          // The row stays a draft; the photo / video can be added again through Edit
          imageError = error.message
        }
      }

      publicSiteContentStore.resetHeroSlides()
      isFormDialogOpen.value = false
      const name = getSiteContentDisplayName(created)
      if (imageError) {
        toastAlert.error('Background not uploaded', `"${name}" was saved as a draft without its photo or video. ${imageError}`)
      } else {
        toastAlert.success('Slide created', `"${name}" has been created.`)
      }
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateContent(target: SiteContentListItem, payload: SiteContentUpdate, image: SiteContentImageChange): Promise<boolean> {
    isSubmitting.value = true
    let uploadedPath: string | null = null
    try {
      const changes: SiteContentUpdate = { ...payload }
      if (image.file) {
        uploadedPath = await siteContentManagerService.uploadMedia(target.id, image.file)
        changes.image_path = uploadedPath
        changes.media_type = image.mediaType
      } else if (image.remove) {
        changes.image_path = null
        changes.image_alt = null
      }

      const updated = await siteContentManagerService.update(target.id, changes)
      replaceRow(updated)
      if (target.image_path && (image.file || image.remove)) await removeImagesQuietly([target.image_path])

      publicSiteContentStore.resetHeroSlides()
      isFormDialogOpen.value = false
      editingContent.value = null
      toastAlert.success('Slide updated', `"${getSiteContentDisplayName(updated)}" has been updated.`)
      return true
    } catch (error: any) {
      // The row kept its old image, so the file uploaded for this save is an orphan
      if (uploadedPath) await removeImagesQuietly([uploadedPath])
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteContent(): Promise<boolean> {
    const target = contentToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await siteContentManagerService.remove(target.id)
      await removeImagesQuietly([target.image_path])
      contents.value = contents.value.filter((row) => row.id !== target.id)
      contentToDelete.value = null
      publicSiteContentStore.resetHeroSlides()
      toastAlert.success('Slide deleted', `"${getSiteContentDisplayName(target)}" has been deleted.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions ───
  function openAddDialog() {
    editingContent.value = null
    isFormDialogOpen.value = true
  }

  function openEditDialog(row: SiteContentListItem) {
    editingContent.value = row
    isFormDialogOpen.value = true
  }

  function closeFormDialog() {
    isFormDialogOpen.value = false
    editingContent.value = null
  }

  function requestDelete(row: SiteContentListItem) {
    contentToDelete.value = row
  }

  function cancelDelete() {
    if (isDeleting.value) return
    contentToDelete.value = null
  }

  return {
    placement,
    contents,
    isLoading,
    isSubmitting,
    isDeleting,
    errorMessage,
    isFormDialogOpen,
    editingContent,
    contentToDelete,
    fetchContents,
    createContent,
    updateContent,
    deleteContent,
    openAddDialog,
    openEditDialog,
    closeFormDialog,
    requestDelete,
    cancelDelete,
  }
})
