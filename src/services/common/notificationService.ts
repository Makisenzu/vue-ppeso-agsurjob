import { supabase } from '@/lib/supabaseClient'
import type { NotificationRow } from '@/types/common/notification'

// RLS already limits system.notifications to the recipient's own rows (034); the recipient_id
// filters keep each query on that user's rows explicitly
export const notificationService = {
  /** The user's notifications, newest first */
  async fetchNotifications(userId: string, limit: number): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .schema('system')
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message || 'Failed to load notifications')
    return data ?? []
  },

  /** Unread rows of every type, for the bell badge */
  async countUnread(userId: string): Promise<number> {
    const { count, error } = await supabase
      .schema('system')
      .from('notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) throw new Error(error.message || 'Failed to load unread notifications')
    return count ?? 0
  },

  async setRead(ids: number[], isRead: boolean): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .schema('system')
      .from('notifications')
      .update({ is_read: isRead })
      .in('id', ids)
      .select()

    if (error) throw new Error(error.message || 'Failed to update notifications')
    return data ?? []
  },

  async markAllRead(userId: string): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .schema('system')
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .select()

    if (error) throw new Error(error.message || 'Failed to mark notifications as read')
    return data ?? []
  },

  async deleteNotification(id: number): Promise<void> {
    const { error } = await supabase.schema('system').from('notifications').delete().eq('id', id)
    if (error) throw new Error(error.message || 'Failed to delete notification')
  },

  async deleteRead(userId: string): Promise<void> {
    const { error } = await supabase
      .schema('system')
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .eq('is_read', true)

    if (error) throw new Error(error.message || 'Failed to clear read notifications')
  },
}
