import type { EstablishmentRow } from '@/types/common/establishment'
import type { Database } from '@/types/database.types'

type CompanyRow = Database['employers']['Tables']['companies']['Row']

/** NSRP Form 2 review states (employers.establishments.status, migration 037) */
export const ESTABLISHMENT_REVIEW_STATUSES = ['Pending', 'Verified', 'Rejected'] as const

/** Shown for a company account that has not filed its Form 2 yet */
export const NO_FORM2_STATUS = 'Not filed'

/** The Form 2 columns the Registered Companies list shows */
export type RegisteredCompanyEstablishment = Pick<
  EstablishmentRow,
  'id' | 'business_name' | 'trade_name' | 'tin' | 'industry_line' | 'city_municipality' | 'province' | 'status'
>

/** A company account (employers.companies) that signed up through the system, with its linked Form 2 */
export type RegisteredCompanyListItem = Pick<
  CompanyRow,
  'id' | 'company_name' | 'company_email' | 'company_contact' | 'created_at'
> & {
  establishments: RegisteredCompanyEstablishment[]
}
