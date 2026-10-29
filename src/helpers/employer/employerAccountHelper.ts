import { format, parseISO } from 'date-fns'

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
  return birthdate ? format(parseISO(birthdate.slice(0, 10)), 'MMMM d, yyyy') : ''
}

/** Barangay, city / municipality, province (core.profiles stores PSGC names) */
export function formatAccountAddress(profile?: {
  barangay?: string | null
  geographic?: string | null
  province?: string | null
} | null): string {
  return [profile?.barangay, profile?.geographic, profile?.province].filter(Boolean).join(', ')
}

const FORM2_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  verified: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getForm2StatusBadgeClass(status?: string | null): string {
  return FORM2_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}
