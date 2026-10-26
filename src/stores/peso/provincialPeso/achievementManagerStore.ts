import { ref } from 'vue'
import { defineStore } from 'pinia'
import { siteContentManagerService } from '@/services/peso/provincialPeso/siteContentManagerService'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { AchievementItem } from '@/types/common/siteContent'

/** An achievement photo picked for upload, with its own pixel size (read in the browser). */
export interface AchievementUpload {
  file: File
  width: number | null
  height: number | null
}

/** Provincial PESO management of the "What is PESO?" achievements (system.peso_achievements, 059). */
export const useAchievementManagerStore = defineStore('pesoAchievementManager', () => {
  const toastAlert = useToastAlert()
  const publicSiteContentStore = useSiteContentStore()

  // ─── State ───
  const achievements = ref<AchievementItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isUploading = ref(false)
  /** Achievements added so far in the current batch, for the progress label */
  const uploadedCount = ref(0)
  const isDeleting = ref(false)
  const savingTitleId = ref<string | null>(null)

  // ─── UI Flags ───
  const achievementToDelete = ref<AchievementItem | null>(null)

  // Old files are cleaned up best-effort: a leftover file is harmless, a failed save is not
  const removeImagesQuietly = async (paths: string[]) => {
    try {
      await siteContentManagerService.removeImages(paths)
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Actions ───
  async function fetchAchievements(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      achievements.value = await siteContentManagerService.fetchAchievements()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Uploads each photo then adds its row; one failure does not stop the rest of the batch. */
  async function uploadAchievements(uploads: AchievementUpload[]): Promise<void> {
    if (uploads.length === 0) return
    isUploading.value = true
    uploadedCount.value = 0
    const failed: string[] = []
    try {
      for (const upload of uploads) {
        let path: string | null = null
        try {
          path = await siteContentManagerService.uploadAchievementPhoto(upload.file)
          const achievement = await siteContentManagerService.createAchievement({
            image_path: path,
            title: null,
            width: upload.width,
            height: upload.height,
          })
          achievements.value = [achievement, ...achievements.value]
          uploadedCount.value += 1
        } catch (error) {
          console.error(error)
          // The row was not created, so the uploaded file is an orphan
          if (path) await removeImagesQuietly([path])
          failed.push(upload.file.name)
        }
      }
      publicSiteContentStore.resetAchievements()
      if (uploadedCount.value > 0) {
        toastAlert.success(
          'Achievements added',
          `${uploadedCount.value} photo${uploadedCount.value === 1 ? '' : 's'} added. Give each one a title.`,
        )
      }
      if (failed.length > 0) toastAlert.error('Some photos were not added', failed.join(', '))
    } finally {
      isUploading.value = false
    }
  }

  async function saveTitle(achievement: AchievementItem, title: string | null): Promise<void> {
    if ((achievement.title ?? null) === title) return
    savingTitleId.value = achievement.id
    try {
      const updated = await siteContentManagerService.updateAchievementTitle(achievement.id, title)
      achievements.value = achievements.value.map((item) => (item.id === updated.id ? updated : item))
      publicSiteContentStore.resetAchievements()
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      savingTitleId.value = null
    }
  }

  async function deleteAchievement(): Promise<boolean> {
    const achievement = achievementToDelete.value
    if (!achievement) return false
    isDeleting.value = true
    try {
      await siteContentManagerService.deleteAchievement(achievement.id)
      await removeImagesQuietly([achievement.image_path])
      achievements.value = achievements.value.filter((item) => item.id !== achievement.id)
      achievementToDelete.value = null
      publicSiteContentStore.resetAchievements()
      toastAlert.success('Achievement removed', 'It is no longer shown on the What is PESO? page.')
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions ───
  function requestDelete(achievement: AchievementItem) {
    achievementToDelete.value = achievement
  }

  function cancelDelete() {
    if (isDeleting.value) return
    achievementToDelete.value = null
  }

  return {
    achievements,
    isLoading,
    errorMessage,
    isUploading,
    uploadedCount,
    isDeleting,
    savingTitleId,
    achievementToDelete,
    fetchAchievements,
    uploadAchievements,
    saveTitle,
    deleteAchievement,
    requestDelete,
    cancelDelete,
  }
})
