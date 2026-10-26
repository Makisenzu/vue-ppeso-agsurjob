import { supabase } from '@/lib/supabaseClient'
import type { NotificationRow, NotificationUpdate } from '@/types/common/notification'

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

  async setStarred(id: number, isStarred: boolean): Promise<NotificationRow> {
    const { data, error } = await supabase
      .schema('system')
      .from('notifications')
      // is_starred (migration 056) is not in the generated Update type yet
      .update({ is_starred: isStarred } as NotificationUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to star notification')
    return data
  },

  async deleteNotifications(ids: number[]): Promise<void> {
    const { error } = await supabase.schema('system').from('notifications').delete().in('id', ids)
    if (error) throw new Error(error.message || 'Failed to delete notifications')
  },

  /**
   * Live INSERT / UPDATE events for the user's notifications (system.notifications is published by
   * migration 054; RLS still limits events to the recipient). Returns the unsubscribe function.
   */
  subscribe(
    userId: string,
    handlers: { onInsert: (row: NotificationRow) => void; onUpdate: (row: NotificationRow) => void },
  ): () => void {
    const filter = `recipient_id=eq.${userId}`
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'system', table: 'notifications', filter }, (payload) =>
        handlers.onInsert(payload.new as NotificationRow),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'system', table: 'notifications', filter }, (payload) =>
        handlers.onUpdate(payload.new as NotificationRow),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  },
}
