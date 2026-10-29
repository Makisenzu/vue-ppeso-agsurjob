import { format, parseISO } from 'date-fns'
import type {
  RegisteredCompanyEstablishment,
  RegisteredCompanyListItem,
} from '@/types/peso/provincialPeso/registeredCompany'

/** A company account has at most one Form 2 (register_company_establishment, migration 074) */
export function getCompanyEstablishment(row: RegisteredCompanyListItem): RegisteredCompanyEstablishment | null {
  return row.establishments?.[0] ?? null
}

/** Form 2 business name, falling back to the account's company name */
export function getCompanyDisplayName(row: RegisteredCompanyListItem): string {
  return getCompanyEstablishment(row)?.business_name || row.company_name
}

export function getCompanyLocation(row: RegisteredCompanyListItem): string {
  const establishment = getCompanyEstablishment(row)
  return [establishment?.city_municipality, establishment?.province].filter(Boolean).join(', ')
}

export function formatRegisteredDate(value: string): string {
  return format(parseISO(value), 'MMM d, yyyy')
}
