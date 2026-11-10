import { addDays, format, isWeekend, lastDayOfMonth, parseISO } from 'date-fns'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type { GipAccomplishmentProgram } from '@/types/common/gipAccomplishment'

/**
 * Half-month periods of GIP accomplishment reports (migration 112): the 1st–15th and the 16th–end of month,
 * clipped to the appointment term. All dates are ISO yyyy-MM-dd on the local calendar day.
 */

const toIso = (date: Date) => format(date, 'yyyy-MM-dd')

export interface GipHalfPeriod {
  /** The half's first day (the 1st or the 16th): the report's key */
  start: string
  /** The half's last day (the 15th or the month's last day) */
  end: string
  /** The part inside the term: what the report covers */
  from: string
  to: string
  /** "11/01/2026 – 11/15/2026" (the covered part) */
  label: string
  /** The covered part has ended (on or before today), so the report can be submitted */
  isComplete: boolean
}

/** The half containing `iso`: its first and last day */
export function halfOf(iso: string): { start: string; end: string } {
  const date = parseISO(iso)
  if (date.getDate() <= 15) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    return { start: toIso(start), end: toIso(addDays(start, 14)) }
  }
  return {
    start: toIso(new Date(date.getFullYear(), date.getMonth(), 16)),
    end: toIso(lastDayOfMonth(date)),
  }
}

export function formatPeriodRange(from: string, to: string): string {
  return `${formatDisplayDate(from, from)} – ${formatDisplayDate(to, to)}`
}

/** One half clipped to the term */
export function toHalfPeriod(halfStart: string, termStart: string, termEnd: string, today: string): GipHalfPeriod {
  const { start, end } = halfOf(halfStart)
  const from = start < termStart ? termStart : start
  const to = end > termEnd ? termEnd : end
  return { start, end, from, to, label: formatPeriodRange(from, to), isComplete: to <= today }
}

/** The term's halves that have started (up to today), newest first */
export function startedHalves(termStart: string, termEnd: string, today: string): GipHalfPeriod[] {
  const halves: GipHalfPeriod[] = []
  const last = termEnd < today ? termEnd : today
  let cursor = halfOf(termStart).start
  while (cursor <= last) {
    halves.push(toHalfPeriod(cursor, termStart, termEnd, today))
    cursor = toIso(addDays(parseISO(halfOf(cursor).end), 1))
  }
  return halves.reverse()
}

/** Monday–Friday dates from `from` to `to`, inclusive */
export function weekdaysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = parseISO(from); toIso(day) <= to; day = addDays(day, 1)) {
    if (!isWeekend(day)) days.push(toIso(day))
  }
  return days
}

/** "Mon 11/03/2026" */
export function formatWeekday(iso: string): string {
  return `${format(parseISO(iso), 'EEE')} ${formatDisplayDate(iso, iso)}`
}

/** What a report of this funding needs before it can be submitted */
export function accomplishmentRequirement(program: GipAccomplishmentProgram): string {
  return program === 'DOLE'
    ? 'DOLE interns write what they did on every weekday of the half, one accomplishment per line. Mark holidays and leave days as such.'
    : 'List the activities you accomplished this half with their output, and enter your pay for the half (days on duty × daily stipend) in figures and in words. Daily entries are optional.'
}

/** Every date from `from` to `to`, inclusive (weekends too: the DOLE form lists them) */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = parseISO(from); toIso(day) <= to; day = addDays(day, 1)) days.push(toIso(day))
  return days
}

/** "August 1-15, 2026" (one month; a single day reads "August 15, 2026") */
export function formatHalfPeriod(from: string, to: string): string {
  const start = parseISO(from)
  const end = parseISO(to)
  const days = from === to ? `${start.getDate()}` : `${start.getDate()}-${end.getDate()}`
  return `${format(start, 'MMMM')} ${days}, ${format(start, 'yyyy')}`
}

/** "August 1 TO 15 2026", as the PGAS payment receipt words it */
export function formatReceiptPeriod(from: string, to: string): string {
  const start = parseISO(from)
  const end = parseISO(to)
  const days = from === to ? `${start.getDate()}` : `${start.getDate()} TO ${end.getDate()}`
  return `${format(start, 'MMMM')} ${days} ${format(start, 'yyyy')}`
}

/** "AUGUST 3, 2026" (the DOLE form's date column) */
export function formatLongDate(iso: string): string {
  return format(parseISO(iso), 'MMMM d, yyyy').toUpperCase()
}
