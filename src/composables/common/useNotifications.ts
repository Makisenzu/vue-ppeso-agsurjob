import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useWindowFocus } from '@vueuse/core'
import { useAuthStore } from '@/stores/common/auth'
import { useNotificationStore } from '@/stores/common/notificationStore'
import {
  formatNotificationFullDate,
  formatNotificationListDate,
  formatNotificationTime,
  getNotificationTypeMeta,
  splitNotificationRemarks,
} from '@/helpers/common/notificationHelper'
import { NOTIFICATION_PREVIEW_LIMIT, type NotificationFilter, type NotificationRow } from '@/types/common/notification'

/** Notification list state and actions for the signed-in user, whatever their role. */
export function useNotifications() {
  const { user } = storeToRefs(useAuthStore())
  const store = useNotificationStore()
  const { notifications, unreadCount, isLoading, hasLoaded, isMutating, idsToDelete } = storeToRefs(store)

  const userId = () => user.value?.id

  const load = () => store.fetchNotifications(userId())
  const toggleRead = (item: NotificationRow) => store.setRead(item, !item.is_read)
  const markAllRead = () => store.markAllRead(userId())

  return {
    notifications,
    unreadCount,
    isLoading,
    hasLoaded,
    isMutating,
    idsToDelete,
    load,
    toggleRead,
    markAllRead,
    setReadMany: store.setReadMany,
    toggleStar: store.toggleStar,
    deleteNotifications: store.deleteNotifications,
    // Row display helpers, exposed so templates don't import helpers
    getTypeMeta: getNotificationTypeMeta,
    formatTime: formatNotificationTime,
    formatListDate: formatNotificationListDate,
    formatFullDate: formatNotificationFullDate,
    getBody: (item: NotificationRow) => splitNotificationRemarks(item).body,
    getRemarks: (item: NotificationRow) => splitNotificationRemarks(item).remarks,
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

/**
 * Bell popover: reloads the list each time it opens and shows the newest unread few.
 * `pageRoute` is the role's notifications page; clicking a row opens it there.
 */
export function useNotificationBell(pageRoute: () => RouteLocationRaw) {
  const router = useRouter()
  const notifications = useNotifications()
  const open = ref(false)

  watch(open, isOpen => {
    if (isOpen) notifications.load()
  })

  // Unread only: read notifications are listed on the full page ("View all notifications")
  const preview = computed(() =>
    notifications.notifications.value.filter(item => !item.is_read).slice(0, NOTIFICATION_PREVIEW_LIMIT),
  )

  /** Opens the notification on the notifications page (which marks it read) */
  function readItem(item: NotificationRow) {
    open.value = false
    const target = pageRoute()
    void router.push(typeof target === 'string' ? { path: target, query: { id: item.id } } : { ...target, query: { id: item.id } })
  }

  return { ...notifications, open, preview, readItem }
}

/**
 * Full notifications page, laid out like an email inbox: All / Unread / Starred tabs, row selection with a
 * bulk toolbar, and an opened notification (`?id=` in the URL, so the bell and Back work).
 */
export function useNotificationCenter() {
  const route = useRoute()
  const router = useRouter()
  const notifications = useNotifications()
  const { notifications: list, idsToDelete } = notifications
  const filter = ref<NotificationFilter>('all')

  const filtered = computed(() => {
    if (filter.value === 'unread') return list.value.filter(item => !item.is_read)
    if (filter.value === 'starred') return list.value.filter(item => item.is_starred)
    return list.value
  })
  const starredCount = computed(() => list.value.filter(item => item.is_starred).length)

  // ─── Selection ───
  const selectedIds = ref<number[]>([])
  const selectedCount = computed(() => selectedIds.value.length)
  const isAllSelected = computed(() => filtered.value.length > 0 && selectedIds.value.length === filtered.value.length)
  const selectAllState = computed<boolean | 'indeterminate'>(() =>
    isAllSelected.value ? true : selectedIds.value.length > 0 ? 'indeterminate' : false,
  )
  const isSelected = (item: NotificationRow) => selectedIds.value.includes(item.id)

  function toggleSelected(item: NotificationRow, checked: boolean | 'indeterminate') {
    selectedIds.value = checked === true
      ? [...new Set([...selectedIds.value, item.id])]
      : selectedIds.value.filter(id => id !== item.id)
  }

  function toggleSelectAll() {
    selectedIds.value = isAllSelected.value ? [] : filtered.value.map(item => item.id)
  }

  // Switching tabs or rows disappearing (deleted, realtime) drops selections that are no longer listed
  watch(filter, () => {
    selectedIds.value = []
  })
  watch(filtered, rows => {
    const visible = new Set(rows.map(item => item.id))
    if (selectedIds.value.some(id => !visible.has(id))) selectedIds.value = selectedIds.value.filter(id => visible.has(id))
  })

  const selectedHasUnread = computed(() => list.value.some(item => isSelected(item) && !item.is_read))
  const markSelected = (isRead: boolean) => notifications.setReadMany(selectedIds.value, isRead)
  const requestDeleteSelected = () => {
    idsToDelete.value = [...selectedIds.value]
  }

  // ─── Opened notification ───
  const openedId = computed(() => {
    const id = Number(route.query.id)
    return Number.isInteger(id) && id > 0 ? id : null
  })
  const opened = computed(() => (openedId.value === null ? null : list.value.find(item => item.id === openedId.value) ?? null))

  const openItem = (item: NotificationRow) => {
    void router.push({ query: { ...route.query, id: item.id } })
  }
  const closeItem = () => {
    const { id: _id, ...query } = route.query
    void router.push({ query })
  }

  // Opening (from a row or the bell) marks it read. Watches the id, not the row: "Mark as unread" on the
  // opened notification replaces the row and must not be read again straight away
  watch(
    [openedId, notifications.hasLoaded],
    () => {
      const item = opened.value
      if (item && !item.is_read) notifications.toggleRead(item)
    },
    { immediate: true },
  )

  const requestDeleteOpened = () => {
    if (opened.value) idsToDelete.value = [opened.value.id]
  }
  const markOpenedUnread = async () => {
    if (!opened.value) return
    await notifications.setReadMany([opened.value.id], false)
    closeItem()
  }

  // ─── Delete confirmation ───
  const isDeleteDialogOpen = computed({
    get: () => idsToDelete.value.length > 0,
    set: (open: boolean) => {
      if (!open && !notifications.isMutating.value) idsToDelete.value = []
    },
  })
  const confirmDelete = async () => {
    const ids = [...idsToDelete.value]
    if (ids.length === 0) return
    const closesOpened = openedId.value !== null && ids.includes(openedId.value)
    await notifications.deleteNotifications(ids)
    selectedIds.value = selectedIds.value.filter(id => !ids.includes(id))
    if (closesOpened) closeItem()
  }

  onMounted(() => {
    notifications.load()
  })

  return {
    ...notifications,
    filter,
    filtered,
    starredCount,
    selectedCount,
    selectAllState,
    isSelected,
    toggleSelected,
    toggleSelectAll,
    selectedHasUnread,
    markSelected,
    requestDeleteSelected,
    opened,
    openedId,
    openItem,
    closeItem,
    requestDeleteOpened,
    markOpenedUnread,
    isDeleteDialogOpen,
    confirmDelete,
  }
}
