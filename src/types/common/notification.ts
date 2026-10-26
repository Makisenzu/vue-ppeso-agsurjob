import type { Database } from '@/types/database.types'

// system.notifications: one row per recipient, readable / markable / deletable by that recipient only (034 RLS)
export type NotificationRow = Database['system']['Tables']['notifications']['Row']
// `type` is free text: the original enum values plus the ones written by 053_notification_triggers.sql
export type NotificationType =
  | Database['public']['Enums']['notification_type']
  | 'account_status'
  | 'document_status'
  | 'deployment'
  | 'establishment_status'
  | 'recruitment_activity'
  | 'job_fair'

/** Tabs of the notification list */
export type NotificationFilter = 'all' | 'unread'

/** Unread rows shown in the bell popover; the full page lists read ones too */
export const NOTIFICATION_PREVIEW_LIMIT = 8
export const NOTIFICATION_PAGE_LIMIT = 100
