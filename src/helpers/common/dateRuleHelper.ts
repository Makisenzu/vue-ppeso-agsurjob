import { format, isValid, parseISO, subYears } from 'date-fns'

/**
 * Rules for date fields (DESIGN.md §3.1): what a picker may offer (`min` / `max`) and what a schema accepts.
 * Values are the ISO days date inputs use (yyyy-MM-dd); a datetime-local value is checked by its day. "Today"
 * is the device's calendar day, the same day the date input highlights.
 *
 *   birthdates          not in the future, not more than MAX_BIRTHDATE_AGE years ago
 *   things that happened (exam, return to the Philippines, hiring, assessment)   not in the future
 *   things scheduled (posting, deadline, orientation)   not in the past, unless the saved value is kept as is
 *   ranges              the end is not before the start
 */

/** Oldest age a date of birth may give */
export const MAX_BIRTHDATE_AGE = 100

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export const DATE_RULE_MESSAGES = {
  future: 'Date cannot be in the future.',
  past: 'Date cannot be in the past.',
  birthFuture: 'Date of birth cannot be in the future.',
  birthTooOld: `Enter a date of birth within the last ${MAX_BIRTHDATE_AGE} years.`,
  endBeforeStart: 'End date cannot be before the start date.',
} as const

/** Today as yyyy-MM-dd */
export const todayIso = (): string => format(new Date(), 'yyyy-MM-dd')

/** The day `years` years ago, as yyyy-MM-dd (birthdate `max` for a minimum age, `min` for the oldest) */
export const yearsAgoIso = (years: number): string => format(subYears(new Date(), years), 'yyyy-MM-dd')

/** Earliest date of birth a picker offers */
export const minBirthdateIso = (): string => yearsAgoIso(MAX_BIRTHDATE_AGE)

/** The yyyy-MM-dd day of a date or datetime-local value; '' when it isn't one */
export function toIsoDay(value?: string | null): string {
  const day = value?.trim().slice(0, 10) ?? ''
  return ISO_DAY.test(day) && isValid(parseISO(day)) ? day : ''
}

/** True for a day after today (blank / invalid → false, leave those to the required check) */
export const isFutureDay = (value?: string | null): boolean => {
  const day = toIsoDay(value)
  return !!day && day > todayIso()
}

/** True for a day before today */
export const isPastDay = (value?: string | null): boolean => {
  const day = toIsoDay(value)
  return !!day && day < todayIso()
}

/** A date of birth that is neither in the future nor older than MAX_BIRTHDATE_AGE; null when fine */
export function birthdateIssue(value?: string | null): string | null {
  const day = toIsoDay(value)
  if (!day) return null
  if (day > todayIso()) return DATE_RULE_MESSAGES.birthFuture
  if (day < minBirthdateIso()) return DATE_RULE_MESSAGES.birthTooOld
  return null
}

/**
 * A scheduled date may not be in the past, except the value already saved (editing an older record
 * doesn't force moving its date). `saved` is the stored value, if any.
 */
export const isNewPastDay = (value?: string | null, saved?: string | null): boolean =>
  isPastDay(value) && toIsoDay(value) !== toIsoDay(saved)

/** True when both are days and the end is before the start */
export const isEndBeforeStart = (start?: string | null, end?: string | null): boolean => {
  const from = toIsoDay(start)
  const to = toIsoDay(end)
  return !!from && !!to && to < from
}

/** The picker `min` of a scheduled date: today, or the saved day when it's earlier */
export function scheduledMinIso(saved?: string | null): string {
  const today = todayIso()
  const kept = toIsoDay(saved)
  return kept && kept < today ? kept : today
}

/** The later of two yyyy-MM-dd days (blank ones ignored) */
export function laterIsoDay(...days: (string | null | undefined)[]): string {
  return days.map((day) => toIsoDay(day)).filter(Boolean).sort().at(-1) ?? ''
}
