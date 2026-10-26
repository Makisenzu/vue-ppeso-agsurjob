import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationService } from '@/services/common/notificationService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { NOTIFICATION_PAGE_LIMIT, type NotificationRow } from '@/types/common/notification'
import { splitNotificationRemarks } from '@/helpers/common/notificationHelper'

// Shared by every role: the bell popover and the notifications page read the same list
export const useNotificationStore = defineStore('notification', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const notifications = ref<NotificationRow[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const isMutating = ref(false)

  // ─── UI Flags ───
  /** Ids waiting for the delete confirmation on the notifications page */
  const idsToDelete = ref<number[]>([])

  // ─── Actions ───
  // No toast on failure: this runs in the background on every page, so a failed refresh keeps the last count
  const fetchUnreadCount = async (userId: string | undefined) => {
    if (!userId) {
      unreadCount.value = 0
      return
    }
    try {
      unreadCount.value = await notificationService.countUnread(userId)
    } catch (error) {
      console.error(error)
    }
  }

  // One list for the bell and the page: the bell shows its first rows
  const fetchNotifications = async (userId: string | undefined) => {
    if (!userId) {
      notifications.value = []
      return
    }
    isLoading.value = true
    try {
      notifications.value = await notificationService.fetchNotifications(userId, NOTIFICATION_PAGE_LIMIT)
      hasLoaded.value = true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Swaps updated rows into the list and re-derives the badge from the change */
  const applyUpdates = (updated: NotificationRow[]) => {
    const byId = new Map(updated.map(item => [item.id, item]))
    const before = notifications.value
    notifications.value = before.map(item => byId.get(item.id) ?? item)
    const delta = updated.reduce((sum, item) => {
      const previous = before.find(row => row.id === item.id)
      if (!previous || !!previous.is_read === !!item.is_read) return sum
      return sum + (item.is_read ? -1 : 1)
    }, 0)
    unreadCount.value = Math.max(0, unreadCount.value + delta)
  }

  const setRead = async (notification: NotificationRow, isRead: boolean) => {
    if (!!notification.is_read === isRead) return
    try {
      applyUpdates(await notificationService.setRead([notification.id], isRead))
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    }
  }

  const markAllRead = async (userId: string | undefined) => {
    if (!userId || unreadCount.value === 0) return
    isMutating.value = true
    try {
      await notificationService.markAllRead(userId)
      notifications.value = notifications.value.map(item => ({ ...item, is_read: true }))
      unreadCount.value = 0
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isMutating.value = false
    }
  }

  /** Marks several notifications read / unread (the page's bulk toolbar) */
  const setReadMany = async (ids: number[], isRead: boolean) => {
    const targets = notifications.value.filter(item => ids.includes(item.id) && !!item.is_read !== isRead)
    if (targets.length === 0) return
    isMutating.value = true
    try {
      applyUpdates(await notificationService.setRead(targets.map(item => item.id), isRead))
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isMutating.value = false
    }
  }

  const toggleStar = async (notification: NotificationRow) => {
    try {
      applyUpdates([await notificationService.setStarred(notification.id, !notification.is_starred)])
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    }
  }

  const deleteNotifications = async (ids: number[]) => {
    if (ids.length === 0) return
    isMutating.value = true
    try {
      await notificationService.deleteNotifications(ids)
      const removedUnread = notifications.value.filter(item => ids.includes(item.id) && !item.is_read).length
      notifications.value = notifications.value.filter(item => !ids.includes(item.id))
      unreadCount.value = Math.max(0, unreadCount.value - removedUnread)
      idsToDelete.value = []
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isMutating.value = false
    }
  }

  // ─── Realtime ───
  // One live subscription per signed-in user, however many bells are mounted
  let unsubscribe: (() => void) | null = null
  let subscribedUserId: string | null = null

  const handleInsert = (row: NotificationRow) => {
    if (notifications.value.some(item => item.id === row.id)) return
    notifications.value = [row, ...notifications.value]
    if (!row.is_read) {
      unreadCount.value += 1
      toastAlert.info(row.title || 'New notification', splitNotificationRemarks(row).body || undefined)
    }
  }

  // Keeps other tabs / devices in step when the user reads a notification somewhere else
  const handleUpdate = (row: NotificationRow) => {
    const previous = notifications.value.find(item => item.id === row.id)
    if (previous) {
      applyUpdates([row])
    } else if (row.is_read) {
      // Not in the loaded list (e.g. never opened the bell): only the badge needs the change
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  const startRealtime = (userId: string | undefined) => {
    if (userId === subscribedUserId) return
    stopRealtime()
    if (!userId) return
    subscribedUserId = userId
    unsubscribe = notificationService.subscribe(userId, { onInsert: handleInsert, onUpdate: handleUpdate })
  }

  const stopRealtime = () => {
    unsubscribe?.()
    unsubscribe = null
    subscribedUserId = null
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    hasLoaded,
    isMutating,
    idsToDelete,
    fetchUnreadCount,
    fetchNotifications,
    setRead,
    markAllRead,
    setReadMany,
    toggleStar,
    deleteNotifications,
    startRealtime,
    stopRealtime,
  }
})
