import type { Component } from 'vue'
import { formatDistanceToNowStrict, isThisWeek, isToday, isYesterday } from 'date-fns'
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

export interface NotificationGroup {
  label: string
  items: NotificationRow[]
}

/** Groups a newest-first list into Today / Yesterday / This week / Earlier, dropping empty groups. */
export function groupNotificationsByDate(items: NotificationRow[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This week', items: [] },
    { label: 'Earlier', items: [] },
  ]
  for (const item of items) {
    const date = new Date(item.created_at)
    const index = isToday(date) ? 0 : isYesterday(date) ? 1 : isThisWeek(date) ? 2 : 3
    groups[index]!.items.push(item)
  }
  return groups.filter(group => group.items.length > 0)
}
