import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import type {
  RecruitmentActivityListItem,
  RecruitmentActivityRequirement,
  RecruitmentActivityRow,
  RecruitmentActivityStatus,
} from '@/types/peso/provincialPeso/recruitmentActivity'

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-info/10 text-info border-info/30',
  conducted: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getRecruitmentActivityStatusBadgeClass(status?: string | null): string {
  return STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

/** "3 / 7" style progress of the `before` checklist, from the list row's embedded requirements. */
export function getBeforeChecklistProgress(row: RecruitmentActivityListItem): { done: number; total: number } {
  const before = (row.recruitment_activity_requirements ?? []).filter((item) => item.stage === 'before')
  return { done: before.filter((item) => item.is_submitted).length, total: before.length }
}

export function getJobOrderCount(row: RecruitmentActivityListItem): number {
  return row.recruitment_activity_vacancies?.[0]?.count ?? 0
}

/** Statuses the activity can move to next; the database still checks the checklist (migration 041). */
export function getNextStatuses(status: RecruitmentActivityStatus): RecruitmentActivityStatus[] {
  switch (status) {
    case 'Pending':
      return ['Approved', 'Cancelled']
    case 'Approved':
      return ['Conducted', 'Pending', 'Cancelled']
    case 'Conducted':
      return ['Completed', 'Approved']
    case 'Completed':
      return ['Conducted']
    case 'Cancelled':
      return ['Pending']
  }
}

export function isChecklistStageComplete(requirements: RecruitmentActivityRequirement[], stage: 'before' | 'after'): boolean {
  const items = requirements.filter((item) => item.stage === stage)
  return items.length > 0 && items.every((item) => item.is_submitted)
}

/**
 * The NSRP Form 2 item is completed with the activity itself, so it is always checked
 * and cannot be unchecked (enforced by trigger, migration 042).
 */
export function isLockedRequirement(requirement: Pick<RecruitmentActivityRequirement, 'requirement_name'>): boolean {
  return /^\s*NSRP Form 2\b/i.test(requirement.requirement_name)
}

/**
 * Terminal report deadline label for activities that have been conducted but not completed:
 * "Due in 3 days", "Due today" or "Overdue by 2 days". Null when it doesn't apply.
 */
export function getTerminalReportDueLabel(row: Pick<RecruitmentActivityRow, 'status' | 'terminal_report_due_date'>): string | null {
  if (!row.terminal_report_due_date || (row.status !== 'Conducted' && row.status !== 'Approved')) return null
  const days = differenceInCalendarDays(parseISO(row.terminal_report_due_date), new Date())
  if (days > 0) return `Report due in ${days} day${days > 1 ? 's' : ''}`
  if (days === 0) return 'Report due today'
  return `Report overdue by ${-days} day${days < -1 ? 's' : ''}`
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy h:mm a')
}

/** Accepts names one per line or comma-separated. */
export function parseRepresentatives(value?: string | null): string[] {
  return (value ?? '')
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean)
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
