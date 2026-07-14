import { ref, computed } from 'vue'
import { useProfileStore } from '@/stores/profileStore'

export function useProfileMedia() {
  const store = useProfileStore()
  const errorMsg = ref<string | null>(null)

  const isUploading = computed(() => store.isUploading)
  const profileMedia = computed(() => store.currentMedia)

  const handleUpload = async (userId: string, file: File) => {
    if (!file) return
    errorMsg.value = null
    
    try {
      await store.uploadProfilePicture(userId, file)
    } catch (err: any) {
      errorMsg.value = err.message || 'Failed to upload profile picture.'
    }
  }

  return {
    profileMedia,
    isUploading,
    errorMsg,
    handleUpload
  }
}