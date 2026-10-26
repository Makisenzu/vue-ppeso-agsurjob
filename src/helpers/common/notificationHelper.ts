import type { Component } from 'vue'
import { format, formatDistanceToNowStrict, isThisYear, isToday } from 'date-fns'
import { Bell, Building2, BriefcaseBusiness, CalendarClock, CalendarX, FileCheck, Megaphone, ShieldAlert, Share2, UserRoundCheck, UsersRound, Workflow } from '@lucide/vue'
import type { NotificationRow, NotificationType } from '@/types/common/notification'

const TYPE_META: Record<NotificationType, { label: string; icon: Component }> = {
  application_status: { label: 'Application', icon: BriefcaseBusiness },
  interview_alert: { label: 'Interview', icon: CalendarClock },
  referral_update: { label: 'Referral', icon: Share2 },
  compliance_alert: { label: 'Compliance', icon: ShieldAlert },
  system_announcement: { label: 'Announcement', icon: Megaphone },
  account_status: { label: 'Account', icon: UserRoundCheck },
  document_status: { label: 'Document', icon: FileCheck },
  deployment: { label: 'Deployment', icon: Workflow },
  establishment_status: { label: 'Establishment', icon: Building2 },
  recruitment_activity: { label: 'Recruitment Activity', icon: UsersRound },
  job_fair: { label: 'Job Fair', icon: CalendarX },
}

/** Label and icon for a notification's type; `type` is free text in the table, so unknown ones get a plain bell. */
export function getNotificationTypeMeta(type: string | null): { label: string; icon: Component } {
  return TYPE_META[type as NotificationType] ?? { label: 'Notification', icon: Bell }
}

/** "5 minutes ago"-style time; "Just now" under a minute. */
export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Date.now() - date.getTime() < 60_000) return 'Just now'
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

// Rows written before migration 057 carry staff remarks inside the message: "... was rejected. Remarks: ..."
const LEGACY_REMARKS_MARKER = ' Remarks: '

/** The message and the staff remarks apart, so the remarks can be shown in their own box. */
export function splitNotificationRemarks(item: Pick<NotificationRow, 'message' | 'remarks'>): {
  body: string
  remarks: string | null
} {
  const message = item.message ?? ''
  if (item.remarks?.trim()) return { body: message, remarks: item.remarks.trim() }

  const index = message.lastIndexOf(LEGACY_REMARKS_MARKER)
  if (index === -1) return { body: message, remarks: null }
  return {
    body: message.slice(0, index).trim(),
    remarks: message.slice(index + LEGACY_REMARKS_MARKER.length).trim() || null,
  }
}

/** Gmail-style list date: "11:46 AM" today, "Oct 25" this year, "10/25/25" before that. */
export function formatNotificationListDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (isToday(date)) return format(date, 'h:mm a')
  if (isThisYear(date)) return format(date, 'MMM d')
  return format(date, 'M/d/yy')
}

/** Full date on the opened notification: "Mon, Oct 26, 2026, 11:46 AM (5 minutes ago)". */
export function formatNotificationFullDate(createdAt: string): string {
  return `${format(new Date(createdAt), 'EEE, MMM d, yyyy, h:mm a')} (${formatNotificationTime(createdAt)})`
}
