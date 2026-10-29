import { format, parseISO } from 'date-fns'
import {
  NO_FORM2_STATUS,
  type RegisteredCompanyEstablishment,
  type RegisteredCompanyListItem,
} from '@/types/peso/provincialPeso/registeredCompany'

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  verified: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getEstablishmentStatusBadgeClass(status?: string | null): string {
  return STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

/** A company account has at most one Form 2 (register_company_establishment, migration 074) */
export function getCompanyEstablishment(row: RegisteredCompanyListItem): RegisteredCompanyEstablishment | null {
  return row.establishments?.[0] ?? null
}

/** Form 2 business name, falling back to the account's company name */
export function getCompanyDisplayName(row: RegisteredCompanyListItem): string {
  return getCompanyEstablishment(row)?.business_name || row.company_name
}

export function getCompanyStatus(row: RegisteredCompanyListItem): string {
  return getCompanyEstablishment(row)?.status ?? NO_FORM2_STATUS
}

export function getCompanyLocation(row: RegisteredCompanyListItem): string {
  const establishment = getCompanyEstablishment(row)
  return [establishment?.city_municipality, establishment?.province].filter(Boolean).join(', ')
}

export function formatRegisteredDate(value: string): string {
  return format(parseISO(value), 'MMM d, yyyy')
}
