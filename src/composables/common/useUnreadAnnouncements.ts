import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useWindowFocus } from '@vueuse/core'
import { useAuthStore } from '@/stores/common/auth'
import { useNotificationStore } from '@/stores/common/notificationStore'

/** Unread announcement count for the notification bell; refreshes on login, navigation and tab focus. */
export function useUnreadAnnouncements() {
  const route = useRoute()
  const focused = useWindowFocus()
  const authStore = useAuthStore()
  const store = useNotificationStore()
  const { user } = storeToRefs(authStore)
  const { unreadAnnouncementCount } = storeToRefs(store)
  const { fetchUnreadAnnouncementCount } = store

  const refresh = () => fetchUnreadAnnouncementCount(user.value?.id)

  watch(() => user.value?.id, refresh, { immediate: true })
  watch(() => route.fullPath, refresh)
  watch(focused, isFocused => {
    if (isFocused) refresh()
  })

  // Keeps the badge narrow; the exact number isn't useful past this
  const countLabel = computed(() => (unreadAnnouncementCount.value > 99 ? '99+' : String(unreadAnnouncementCount.value)))

  return { unreadAnnouncementCount, countLabel }
}
