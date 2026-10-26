import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useWindowFocus } from '@vueuse/core'
import { useAuthStore } from '@/stores/common/auth'
import { useNotificationStore } from '@/stores/common/notificationStore'
import { getNotificationTypeMeta, formatNotificationTime, groupNotificationsByDate } from '@/helpers/common/notificationHelper'
import { NOTIFICATION_PREVIEW_LIMIT, type NotificationFilter, type NotificationRow } from '@/types/common/notification'

/** Notification list state and actions for the signed-in user, whatever their role. */
export function useNotifications() {
  const { user } = storeToRefs(useAuthStore())
  const store = useNotificationStore()
  const { notifications, unreadCount, isLoading, hasLoaded, isMutating, isClearReadOpen, hasRead } = storeToRefs(store)

  const userId = () => user.value?.id

  const load = () => store.fetchNotifications(userId())
  const toggleRead = (item: NotificationRow) => store.setRead(item, !item.is_read)
  const markAllRead = () => store.markAllRead(userId())
  const remove = (item: NotificationRow) => store.deleteNotification(item)
  const clearRead = () => store.clearRead(userId())

  return {
    notifications,
    unreadCount,
    isLoading,
    hasLoaded,
    isMutating,
    isClearReadOpen,
    hasRead,
    load,
    toggleRead,
    markAllRead,
    remove,
    clearRead,
    // Row display helpers, exposed so templates don't import helpers
    getTypeMeta: getNotificationTypeMeta,
    formatTime: formatNotificationTime,
  }
}

/**
 * Unread count for the bell badge. Live through Supabase Realtime (migration 054) while signed in;
 * also re-counted on login, navigation and tab focus in case the connection dropped.
 */
export function useNotificationBadge() {
  const route = useRoute()
  const focused = useWindowFocus()
  const { user } = storeToRefs(useAuthStore())
  const store = useNotificationStore()
  const { unreadCount } = storeToRefs(store)

  const refresh = () => store.fetchUnreadCount(user.value?.id)

  watch(
    () => user.value?.id,
    userId => {
      refresh()
      store.startRealtime(userId)
    },
    { immediate: true },
  )
  // The badge lives in every layout's header, so leaving the layout (signing out) ends the subscription
  onScopeDispose(() => store.stopRealtime())
  watch(() => route.fullPath, refresh)
  watch(focused, isFocused => {
    if (isFocused) refresh()
  })

  // Keeps the badge narrow; the exact number isn't useful past this
  const countLabel = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)))

  return { unreadCount, countLabel }
}

/** Bell popover: reloads the list each time it opens and shows the newest unread few. */
export function useNotificationBell() {
  const notifications = useNotifications()
  const open = ref(false)

  watch(open, isOpen => {
    if (isOpen) notifications.load()
  })

  // Unread only: read notifications are listed on the full page ("View all notifications")
  const preview = computed(() =>
    notifications.notifications.value.filter(item => !item.is_read).slice(0, NOTIFICATION_PREVIEW_LIMIT),
  )

  /** Clicking an unread row marks it read */
  function readItem(item: NotificationRow) {
    if (!item.is_read) notifications.toggleRead(item)
  }

  return { ...notifications, open, preview, readItem }
}

/** Full notifications page: All / Unread tabs, grouped by day. */
export function useNotificationCenter() {
  const notifications = useNotifications()
  const filter = ref<NotificationFilter>('all')

  const filtered = computed(() =>
    filter.value === 'unread'
      ? notifications.notifications.value.filter(item => !item.is_read)
      : notifications.notifications.value,
  )
  const groups = computed(() => groupNotificationsByDate(filtered.value))

  onMounted(() => {
    notifications.load()
  })

  return { ...notifications, filter, groups }
}
