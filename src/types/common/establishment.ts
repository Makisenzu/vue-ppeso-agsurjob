import type { Database } from '@/types/database.types'

type EmployersTables = Database['employers']['Tables']

/** NSRP Form 2 (`employers.establishments`), shared by job fairs, LRA, SRA and company accounts. */
export type EstablishmentRow = EmployersTables['establishments']['Row']
export type EstablishmentInsert = EmployersTables['establishments']['Insert']
export type EstablishmentUpdate = EmployersTables['establishments']['Update']

/** The Form 2 fields an activity form edits; ids, source and review columns are left out. */
export const ESTABLISHMENT_FORM_FIELDS = [
  'business_name',
  'trade_name',
  'acronym',
  'tin',
  'employer_category',
  'public_employer_type',
  'private_employer_type',
  'is_main_office',
  'total_workforce',
  'industry_line',
  'street',
  'barangay',
  'city_municipality',
  'province',
  'owner_president_name',
  'contact_person_name',
  'contact_person_position',
  'telephone_number',
  'mobile_number',
  'fax_number',
  'email_address',
] as const

export type EstablishmentFormFields = Pick<EstablishmentRow, (typeof ESTABLISHMENT_FORM_FIELDS)[number]>

/** Search result row for the "find existing establishment" picker. */
export type EstablishmentSearchResult = Pick<
  EstablishmentRow,
  'id' | 'business_name' | 'trade_name' | 'acronym' | 'tin' | 'city_municipality' | 'province' | 'status'
>
