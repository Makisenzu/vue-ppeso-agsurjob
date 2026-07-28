import type { VerificationStatus } from '@/types/companyProfile'
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
