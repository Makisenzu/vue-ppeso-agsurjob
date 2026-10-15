import { format, isValid, parseISO } from 'date-fns'
import { LANGUAGE_ABILITIES } from '@/helpers/applicant/applicantCompletionHelper'
import type { LanguageEntryForm } from '@/types/applicant/applicantCompletion'

/** Read-only formatting for the applicant profile's NSRP details. Blank values return ''. */

export function formatNsrpDate(value: string): string {
  if (!value) return ''
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMMM d, yyyy') : value
}

export function formatNsrpPeso(value: string): string {
  const amount = Number(value)
  return value && Number.isFinite(amount) ? `₱${amount.toLocaleString('en-PH')}` : ''
}

/** "Read, write and speak" */
export function describeLanguageAbilities(entry: LanguageEntryForm): string {
  const abilities = LANGUAGE_ABILITIES.filter((ability) => entry[ability])
  if (abilities.length === 0) return ''
  const sentence = abilities.length === 1 ? abilities[0] : `${abilities.slice(0, -1).join(', ')} and ${abilities.at(-1)}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/** Joins list values and a free-text "others" value into one readable line. */
export function joinNsrpList(items: readonly string[], extra = ''): string {
  return [...items, extra.trim()].filter(Boolean).join(', ')
}
