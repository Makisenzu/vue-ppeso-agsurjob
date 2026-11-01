import { format, parseISO } from 'date-fns'
import { DISPLAY_DATE_FORMAT } from '@/helpers/common/dateFormatHelper'

const GENDER_LABELS: Record<string, string> = {
  man: 'Man',
  woman: 'Woman',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
  different_identity: 'Different identity',
}

export function formatGender(gender?: string | null): string {
  return gender ? (GENDER_LABELS[gender] ?? gender) : ''
}

export function formatBirthdate(birthdate?: string | null): string {
  return birthdate ? format(parseISO(birthdate.slice(0, 10)), DISPLAY_DATE_FORMAT) : ''
}

/** Barangay, city / municipality, province (core.profiles stores PSGC names) */
export function formatAccountAddress(profile?: {
  barangay?: string | null
  geographic?: string | null
  province?: string | null
} | null): string {
  return [profile?.barangay, profile?.geographic, profile?.province].filter(Boolean).join(', ')
}
