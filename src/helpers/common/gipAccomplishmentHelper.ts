import { addDays, format, isWeekend, lastDayOfMonth, parseISO } from 'date-fns'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'

/**
 * Dates of GIP accomplishment reports (migrations 112 / 114): each report covers a date range the intern picks
 * inside their appointment term. All dates are ISO yyyy-MM-dd on the local calendar day.
 */

const toIso = (date: Date) => format(date, 'yyyy-MM-dd')

/** "11/01/2026 – 11/15/2026" */
export function formatPeriodRange(from: string, to: string): string {
  return `${formatDisplayDate(from, from)} – ${formatDisplayDate(to, to)}`
}

/** Monday–Friday dates from `from` to `to`, inclusive */
export function weekdaysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = parseISO(from); toIso(day) <= to; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(toIso(day))
  }
  return days
}

/** Every date from `from` to `to`, inclusive (weekends too: the DOLE form lists them) */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = parseISO(from); toIso(day) <= to; day = addDays(day, 1)) days.push(toIso(day))
  return days
}

/** The day after `iso` */
export function nextDay(iso: string): string {
  return toIso(addDays(parseISO(iso), 1))
}

/** "Mon 11/03/2026" */
export function formatWeekday(iso: string): string {
  return `${format(parseISO(iso), 'EEE')} ${formatDisplayDate(iso, iso)}`
}

/**
 * The period as the forms print it: "August 1-15, 2026"; across months "October 28 - November 5, 2026";
 * across years "December 29, 2026 - January 9, 2027"; a single day "August 15, 2026".
 */
export function formatReportPeriod(from: string, to: string): string {
  const start = parseISO(from)
  const end = parseISO(to)
  if (from === to) return format(start, 'MMMM d, yyyy')
  if (start.getFullYear() !== end.getFullYear()) return `${format(start, 'MMMM d, yyyy')} - ${format(end, 'MMMM d, yyyy')}`
  if (start.getMonth() !== end.getMonth()) return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`
  return `${format(start, 'MMMM')} ${start.getDate()}-${end.getDate()}, ${format(start, 'yyyy')}`
}

/** "August 1 TO 15 2026", as the PGAS payment receipt words it (across months "October 28 TO November 5 2026") */
export function formatReceiptPeriod(from: string, to: string): string {
  const start = parseISO(from)
  const end = parseISO(to)
  if (from === to) return format(start, 'MMMM d yyyy')
  if (start.getFullYear() !== end.getFullYear()) return `${format(start, 'MMMM d yyyy')} TO ${format(end, 'MMMM d yyyy')}`
  if (start.getMonth() !== end.getMonth()) return `${format(start, 'MMMM d')} TO ${format(end, 'MMMM d yyyy')}`
  return `${format(start, 'MMMM')} ${start.getDate()} TO ${end.getDate()} ${format(start, 'yyyy')}`
}

/** "AUGUST 3, 2026" (the DOLE form's date column) */
export function formatLongDate(iso: string): string {
  return format(parseISO(iso), 'MMMM d, yyyy').toUpperCase()
}

// ─── Month filter (report lists) ───

export const ALL_MONTHS = 'ALL'

/** "All months", then January–December of `year`; values are "yyyy-MM" */
export function monthFilterOptions(year: number): { value: string; label: string }[] {
  return [
    { value: ALL_MONTHS, label: 'All months' },
    ...Array.from({ length: 12 }, (_, month) => {
      const first = new Date(year, month, 1)
      return { value: format(first, 'yyyy-MM'), label: format(first, 'MMMM yyyy') }
    }),
  ]
}

/** Whether a report's period touches the month ("yyyy-MM"); every report matches "All months" */
export function periodInMonth(periodStart: string, periodEnd: string, month: string): boolean {
  if (month === ALL_MONTHS) return true
  const first = `${month}-01`
  const last = toIso(lastDayOfMonth(parseISO(first)))
  return periodStart <= last && periodEnd >= first
}
