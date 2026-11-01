/**
 * Training duration (NSRP vocational_trainings[].duration, free text in the stored JSON). The applicant
 * form takes a number of hours and stores "40 hours"; older entries and the PESO forms may say "5 days" or
 * "3 months". Same reading as esmdd.training_duration_hours (migration 102), which the vacancy fit uses.
 */

export const TRAINING_HOURS_MAX = 5000

/** How other units count toward hours (an 8-hour day, 5-day week, 20-day month) */
export const TRAINING_HOURS_PER_UNIT = { hour: 1, day: 8, week: 40, month: 160 } as const

const UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|days?|weeks?|wks?|months?|mos?)\b/i
const BARE_NUMBER_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*$/

/** Hours in a duration text: "40 hours" → 40, "5 days" → 40, "40" → 40; null when it can't be read */
export function parseTrainingHours(value: string | null | undefined): number | null {
  const text = (value ?? '').toLowerCase()
  const withUnit = UNIT_PATTERN.exec(text)
  if (withUnit) {
    const amount = Number(withUnit[1])
    const unit = withUnit[2]!
    const perUnit = unit.startsWith('d')
      ? TRAINING_HOURS_PER_UNIT.day
      : unit.startsWith('w')
        ? TRAINING_HOURS_PER_UNIT.week
        : unit.startsWith('m')
          ? TRAINING_HOURS_PER_UNIT.month
          : TRAINING_HOURS_PER_UNIT.hour
    return amount * perUnit
  }
  const bare = BARE_NUMBER_PATTERN.exec(text)
  return bare ? Number(bare[1]) : null
}

/** The form's hours box from a stored duration: "40 hours" → "40", "5 days" → "40", unreadable → "" */
export function toTrainingHoursInput(value: string | null | undefined): string {
  const hours = parseTrainingHours(value)
  return hours && hours > 0 ? String(Math.round(Math.min(hours, TRAINING_HOURS_MAX))) : ''
}

/** What's stored from the hours box: "40" → "40 hours", "1" → "1 hour", blank → "" */
export function formatTrainingDuration(hoursInput: string): string {
  const hours = Number(hoursInput.trim())
  if (!hoursInput.trim() || !Number.isFinite(hours) || hours <= 0) return ''
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

/** Whole hours from 1 to TRAINING_HOURS_MAX, or blank */
export const isValidTrainingHoursInput = (value: string) =>
  value.trim() === '' || (/^\d{1,4}$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= TRAINING_HOURS_MAX)
