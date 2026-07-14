import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '@/stores/profileStore'
import { useAuthStore } from '@/stores/auth'
import { mediaService } from '@/services/mediaService'
import type { ProfileMediaRow } from '@/services/mediaService'

export function useProfileMedia() {
  const store = useProfileStore()
  const authStore = useAuthStore()
  const errorMsg = ref<string | null>(null)

  const isUploading = computed(() => store.isUploading)
  const profileMedia = computed(() => store.currentMedia)

  onMounted(async () => {
    const userId = authStore.user?.id
    if (userId && !store.currentMedia) {
      await store.fetchProfileMedia(userId)
    }
  })

  const handleUpload = async (file: File) => {
    const userId = authStore.user?.id
    if (!userId) {
      errorMsg.value = 'You must be logged in to upload a profile picture.'
      throw new Error(errorMsg.value)
    }
    if (!file) return
    errorMsg.value = null
    
    try {
      await store.uploadProfilePicture(userId, file)
    } catch (err: any) {
      errorMsg.value = err.message || 'Failed to upload profile picture.'
      throw err
    }
  }

  const getAvatarUrl = (displayName: string, initialMedia?: ProfileMediaRow[]) => {
    // Priority 1: Store media (freshly uploaded or fetched on init)
    if (profileMedia.value?.public_url) {
      return profileMedia.value.public_url
    }
    
    // Priority 2: Media passed as a prop from the parent query
    if (initialMedia && initialMedia.length > 0) {
      const sortedMedia = [...initialMedia].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latest = sortedMedia[0]
      if (latest && latest.path) {
        return mediaService.getPublicUrl(latest.path)
      }
    }

    // Priority 3: Fallback to DiceBear avatar
    return `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=09090b&fontFamily=Arial`
  }

  return {
    profileMedia,
    isUploading,
    errorMsg,
    handleUpload,
    getAvatarUrl
  }
}