import type { CompanyMediaFields, VerificationStatus } from '@/types/employer/companyProfile'
import type { BadgeVariants } from '@/components/ui/badge'

/**
 * Maps a verification status enum value to a human-readable label.
 */
export function formatVerificationStatus(
  status: VerificationStatus | null | undefined,
): string {
  if (!status) return 'Unverified'

  const labels: Record<VerificationStatus, string> = {
    pending: 'Pending Review',
    approved: 'Verified',
    rejected: 'Rejected',
    active: 'Active',
    closed: 'Closed',
  }

  return labels[status] ?? 'Unknown'
}

/**
 * Returns the appropriate shadcn Badge variant for a given verification status.
 */
export function getVerificationBadgeVariant(
  status: VerificationStatus | null | undefined,
): BadgeVariants['variant'] {
  if (!status) return 'outline'

  const variants: Record<VerificationStatus, BadgeVariants['variant']> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
    active: 'default',
    closed: 'outline',
  }

  return variants[status] ?? 'outline'
}

/**
 * Formats an employee count into a display-friendly string.
 */
export function formatEmployeeCount(count: number | null | undefined): string {
  if (count === null || count === undefined) return 'Not specified'
  if (count === 0) return 'Not specified'
  if (count === 1) return '1 employee'
  return `${count.toLocaleString()} employees`
}

/**
 * Null-safe field formatter. Returns the value if truthy, otherwise the fallback.
 */
export function formatCompanyField(
  value: string | null | undefined,
  fallback = 'Not specified',
): string {
  return value?.trim() || fallback
}

/** Reads the cover path (migration 076) from a company row, typed or not yet regenerated */
export function getCompanyCoverPath(company: object | null | undefined): string | null {
  return (company as CompanyMediaFields | null | undefined)?.cover_photo_path ?? null
}

/** Reads the logo path (migration 078) from a company row, typed or not yet regenerated */
export function getCompanyLogoPath(company: object | null | undefined): string | null {
  return (company as CompanyMediaFields | null | undefined)?.logo_path ?? null
}

/** Up to two initials of a person's name, for avatar fallbacks */
export function getNameInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')).toUpperCase()
}
