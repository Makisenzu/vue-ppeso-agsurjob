import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationService } from '@/services/common/notificationService'

export const useNotificationStore = defineStore('notification', () => {
  // ─── State ───
  const unreadAnnouncementCount = ref(0)

  // ─── Actions ───
  // No toast on failure: this runs in the background on every page, so a failed refresh keeps the last count
  const fetchUnreadAnnouncementCount = async (userId: string | undefined) => {
    if (!userId) {
      unreadAnnouncementCount.value = 0
      return
    }
    try {
      unreadAnnouncementCount.value = await notificationService.countUnreadAnnouncements(userId)
    } catch (error) {
      console.error(error)
    }
  }

  return { unreadAnnouncementCount, fetchUnreadAnnouncementCount }
})
