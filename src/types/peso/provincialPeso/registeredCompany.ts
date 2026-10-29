import type { EstablishmentRow } from '@/types/common/establishment'
import type { Database } from '@/types/database.types'

type CompanyRow = Database['employers']['Tables']['companies']['Row']

/** The Form 2 columns the Registered Companies list shows */
export type RegisteredCompanyEstablishment = Pick<
  EstablishmentRow,
  | 'id'
  | 'business_name'
  | 'trade_name'
  | 'tin'
  | 'industry_line'
  | 'city_municipality'
  | 'province'
>

/** A company account (employers.companies) that signed up through the system, with its linked Form 2 */
export type RegisteredCompanyListItem = Pick<
  CompanyRow,
  'id' | 'company_name' | 'company_email' | 'company_contact' | 'created_at' | 'verification_status'
> & {
  establishments: RegisteredCompanyEstablishment[]
}
