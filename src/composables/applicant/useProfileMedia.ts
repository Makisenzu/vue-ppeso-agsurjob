import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { useProfileStore } from '@/stores/applicant/profileStore'
import { useAuthStore } from '@/stores/common/auth'
import { mediaService } from '@/services/common/mediaService'
import type { ProfileMediaRow } from '@/services/common/mediaService'
type AvatarMedia = (ProfileMediaRow & { public_url?: string }) | null | undefined
export function useProfileMedia() {
  const store = useProfileStore()
  const authStore = useAuthStore()
  const errorMsg = ref<string | null>(null)

  const isUploading = computed(() => store.isUploading)
  const profileMedia = computed(() => store.currentMedia)
  const displayMedia = computed(() => store.previousMedia || store.currentMedia)

  watch(
    () => authStore.user?.id,
    async (userId) => {
      if (userId && !store.currentMedia) {
        await store.fetchProfileMedia(userId)
      }
    },
    { immediate: true }
  )

  const handleUpload = async (file: File, currentUrl?: string) => {
    const userId = authStore.user?.id
    if (!userId) {
      errorMsg.value = 'You must be logged in to upload a profile picture.'
      throw new Error(errorMsg.value)
    }
    if (!file) return
    errorMsg.value = null
    
    try {
      const result = await store.uploadProfilePicture(userId, file, currentUrl)
      return result
    } catch (err: any) {
      errorMsg.value = err.message || 'Failed to upload profile picture.'
      throw err
    }
  }

  const getAvatarUrl = (displayName: string, initialMedia?: AvatarMedia[] | AvatarMedia) => {
    const mediaList = Array.isArray(initialMedia)
      ? initialMedia
      : initialMedia
        ? [initialMedia]
        : undefined

    // Priority 1: Use display media (which keeps showing previous during upload)
    if (displayMedia.value?.public_url) {
      return displayMedia.value.public_url
    }
    
    // Priority 2: Media passed as a prop from the parent query
    if (mediaList && mediaList.length > 0) {
      const sortedMedia = mediaList
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latest = sortedMedia[0]
      if (latest?.public_url) {
        return latest.public_url
      }
      if (latest?.path) {
        return mediaService.getPublicUrl(latest.path)
      }
    }

    // Priority 3: Fallback to DiceBear avatar
    return `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=09090b&fontFamily=Arial`
  }

  const createAvatarSource = (
    displayName: MaybeRefOrGetter<string>,
    initialMedia?: MaybeRefOrGetter<AvatarMedia[] | AvatarMedia>
  ) => {
    const avatarUrl = computed(() => getAvatarUrl(toValue(displayName), toValue(initialMedia)))
    const avatarSrc = ref(avatarUrl.value)

    watch(
      [avatarUrl, isUploading],
      ([url, uploading]) => {
        if (!uploading) {
          avatarSrc.value = url
        }
      },
      { immediate: true }
    )

    return {
      avatarUrl,
      avatarSrc,
    }
  }

  return {
    profileMedia,
    displayMedia,
    isUploading,
    errorMsg,
    handleUpload,
    getAvatarUrl,
    createAvatarSource
  }
}