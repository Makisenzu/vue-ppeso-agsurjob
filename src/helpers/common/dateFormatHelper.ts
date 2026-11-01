import { format, isValid, parseISO } from 'date-fns'

/**
 * Every date the app shows reads MM/DD/YYYY (DESIGN.md "Dates"). Only the display changes: the database
 * and form inputs keep ISO dates (yyyy-MM-dd / timestamptz), and file names keep yyyy-MM-dd.
 */
export const DISPLAY_DATE_FORMAT = 'MM/dd/yyyy'
export const DISPLAY_DATE_TIME_FORMAT = 'MM/dd/yyyy h:mm a'

type DateInput = string | number | Date | null | undefined

/** A Date, or null when missing / invalid. Plain dates (yyyy-MM-dd) stay on their calendar day. */
export function toDisplayableDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value)
  return isValid(date) ? date : null
}

/** "10/30/2026"; `fallback` when missing or invalid */
export function formatDisplayDate(value: DateInput, fallback = ''): string {
  const date = toDisplayableDate(value)
  return date ? format(date, DISPLAY_DATE_FORMAT) : fallback
}

/** "10/30/2026 2:05 PM"; `fallback` when missing or invalid */
export function formatDisplayDateTime(value: DateInput, fallback = ''): string {
  const date = toDisplayableDate(value)
  return date ? format(date, DISPLAY_DATE_TIME_FORMAT) : fallback
}
