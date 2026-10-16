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

/**
 * "Barangay, Municipality, Province" from the NSRP address JSON. Street and village stay off the
 * public profile; falls back to the profile's province when the address is empty.
 */
export function formatProfileLocation(address: unknown, fallbackProvince?: string | null): string {
  const parts =
    address && typeof address === 'object' && !Array.isArray(address)
      ? (['barangay', 'municipality', 'province'] as const)
          .map((key) => (address as Record<string, unknown>)[key])
          .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
          .map((part) => part.trim())
      : []
  return parts.length ? parts.join(', ') : (fallbackProvince?.trim() ?? '')
}
