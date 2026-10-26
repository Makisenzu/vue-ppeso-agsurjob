import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAchievementManagerStore, type AchievementUpload } from '@/stores/peso/provincialPeso/achievementManagerStore'
import { assertAchievementPhoto } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import {
  ACHIEVEMENT_MAX_FILES_PER_UPLOAD,
  SITE_CONTENT_IMAGE_MAX_MB,
  type AchievementItem,
} from '@/types/common/siteContent'

/** The photo's own pixel size; null when the browser can't decode it (the masonry then uses a square tile). */
function readImageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      resolve({ width: null, height: null })
      URL.revokeObjectURL(url)
    }
    image.src = url
  })
}

/** "Achievements" panel of Site Contents: the PESO achievements masonry under the org chart on "What is PESO?". */
export function useAchievements() {
  const store = useAchievementManagerStore()
  const { achievements, isLoading, errorMessage, isUploading, uploadedCount, isDeleting, savingTitleId, achievementToDelete } =
    storeToRefs(store)
  const { fetchAchievements, uploadAchievements, saveTitle, deleteAchievement, requestDelete, cancelDelete } = store

  // Files of the last pick that were skipped (wrong type, too large, over the batch limit)
  const fileErrors = ref<string[]>([])
  const pendingCount = ref(0)

  const selectPhotos = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return

    const errors: string[] = []
    if (files.length > ACHIEVEMENT_MAX_FILES_PER_UPLOAD) {
      errors.push(`Only the first ${ACHIEVEMENT_MAX_FILES_PER_UPLOAD} photos are added at a time.`)
    }
    const valid = files.slice(0, ACHIEVEMENT_MAX_FILES_PER_UPLOAD).filter((file) => {
      try {
        assertAchievementPhoto(file)
        return true
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`)
        return false
      }
    })
    fileErrors.value = errors
    if (valid.length === 0) return

    pendingCount.value = valid.length
    const uploads: AchievementUpload[] = await Promise.all(
      valid.map(async (file) => ({ file, ...(await readImageSize(file)) })),
    )
    await uploadAchievements(uploads)
  }

  /** Saves the title when the field loses focus; blank clears it. */
  const onTitleBlur = (achievement: AchievementItem, event: Event) => {
    const value = (event.target as HTMLInputElement).value.trim() || null
    void saveTitle(achievement, value)
  }

  const uploadLabel = computed(() =>
    isUploading.value ? `Uploading ${Math.min(uploadedCount.value + 1, pendingCount.value)} of ${pendingCount.value}...` : '',
  )

  const isDeleteDialogOpen = computed({
    get: () => achievementToDelete.value !== null,
    set: (open: boolean) => {
      if (!open) cancelDelete()
    },
  })

  onMounted(() => {
    void fetchAchievements()
  })

  return {
    achievements,
    isLoading,
    errorMessage,
    isUploading,
    uploadLabel,
    isDeleting,
    savingTitleId,
    fileErrors,
    isDeleteDialogOpen,
    achievementToDeleteTitle: computed(() => achievementToDelete.value?.title ?? ''),
    imageAccept: '.jpg,.jpeg,.png,.webp',
    imageMaxMb: SITE_CONTENT_IMAGE_MAX_MB,
    maxFiles: ACHIEVEMENT_MAX_FILES_PER_UPLOAD,
    selectPhotos,
    onTitleBlur,
    requestDelete,
    confirmDelete: deleteAchievement,
  }
}
