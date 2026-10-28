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

/** NSRP Form 2 as form fields (camelCase), shared by the forms that fill it in. */
export type EstablishmentFormValues = {
  businessName: string
  tradeName: string
  acronym: string
  employerCategory: EstablishmentRow['employer_category']
  publicEmployerType: NonNullable<EstablishmentRow['public_employer_type']> | undefined
  privateEmployerType: NonNullable<EstablishmentRow['private_employer_type']> | undefined
  totalWorkforce: NonNullable<EstablishmentRow['total_workforce']> | undefined
  industryLine: string
  tin: string
  ownerPresidentName: string
  contactPersonName: string
  contactPersonPosition: string
  emailAddress: string
  mobileNumber: string
  telephoneNumber: string
  faxNumber: string
  street: string
  barangay: string
  cityMunicipality: string
  province: string
  isMainOffice: boolean
}

/** Search result row for the "find existing establishment" picker. */
export type EstablishmentSearchResult = Pick<
  EstablishmentRow,
  'id' | 'business_name' | 'trade_name' | 'acronym' | 'tin' | 'city_municipality' | 'province' | 'status'
>

/** A PESO-encoded Form 2 with no account yet, offered at company signup (employers.find_unclaimed_establishments) */
export type UnclaimedEstablishmentMatch = Pick<
  EstablishmentRow,
  'id' | 'business_name' | 'trade_name' | 'city_municipality' | 'province'
>
