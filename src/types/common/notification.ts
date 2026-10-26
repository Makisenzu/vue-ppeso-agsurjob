import type { Database } from '@/types/database.types'

// system.notifications: one row per recipient, readable / markable / deletable by that recipient only (034 RLS)
export type NotificationRow = Database['system']['Tables']['notifications']['Row']
export type NotificationType = Database['public']['Enums']['notification_type']

/** Tabs of the notification list */
export type NotificationFilter = 'all' | 'unread'

/** Unread rows shown in the bell popover; the full page lists read ones too */
export const NOTIFICATION_PREVIEW_LIMIT = 8
export const NOTIFICATION_PAGE_LIMIT = 100
