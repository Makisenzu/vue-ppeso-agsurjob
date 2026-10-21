import { supabase } from '@/lib/supabaseClient'

export const notificationService = {
  /** Unread `system_announcement` rows addressed to the user; RLS already limits rows to the recipient */
  async countUnreadAnnouncements(userId: string): Promise<number> {
    const { count, error } = await supabase
      .schema('system')
      .from('notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_id', userId)
      .eq('type', 'system_announcement')
      .eq('is_read', false)

    if (error) throw new Error(error.message || 'Failed to load unread announcements')
    return count ?? 0
  },
}
