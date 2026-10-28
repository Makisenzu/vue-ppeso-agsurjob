import type { Database } from '@/types/database.types'
import type { EstablishmentFormValues, EstablishmentRow } from '@/types/common/establishment'

export type CompanyRow = Database['employers']['Tables']['companies']['Row']
export type CompanyInsert = Database['employers']['Tables']['companies']['Insert']

/** The company's NSRP Form 2 as the router guard needs it: linked or not, and its review status */
export type CompanyEstablishmentSummary = Pick<EstablishmentRow, 'id' | 'status'>

// ─── Steps ───

export type EmployerCompletionStepKey = 'establishment' | 'contact' | 'review'

export interface EmployerCompletionStepMeta {
  key: EmployerCompletionStepKey
  title: string
  description: string
}

// ─── Form Values ───

export interface EmployerCompletionValues {
  /** NSRP Form 2 (employers.establishments): the source of the company's name, email, contact, industry and address */
  establishment: EstablishmentFormValues
  /** Unlinked PESO-encoded Form 2 the owner chose to link; '' files a new one */
  claim_establishment_id: string
  // employers.companies fields Form 2 doesn't have
  business_type: string
  company_description: string
  website: string
  registration_number: string
}
