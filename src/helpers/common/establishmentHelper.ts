import * as z from 'zod'
import { Constants } from '@/types/database.types'
import {
  ESTABLISHMENT_FORM_FIELDS,
  type EstablishmentFormFields,
  type EstablishmentFormValues,
  type EstablishmentRow,
} from '@/types/common/establishment'

const EMPLOYER_CATEGORIES = Constants.esmdd.Enums.employer_category_enum
const PUBLIC_EMPLOYER_TYPES = Constants.esmdd.Enums.public_employer_type_enum
const PRIVATE_EMPLOYER_TYPES = Constants.esmdd.Enums.private_employer_type_enum
const TOTAL_WORKFORCE_OPTIONS = Constants.esmdd.Enums.total_workforce_enum

/** The Form 2 fields of an establishment, e.g. to merge onto an activity row. */
export function pickEstablishmentFormFields(row: EstablishmentRow): EstablishmentFormFields {
  return Object.fromEntries(ESTABLISHMENT_FORM_FIELDS.map((key) => [key, row[key]])) as EstablishmentFormFields
}

export const EMPTY_ESTABLISHMENT_FORM_VALUES: EstablishmentFormValues = {
  businessName: '',
  tradeName: '',
  acronym: '',
  employerCategory: 'Private',
  publicEmployerType: undefined,
  privateEmployerType: undefined,
  totalWorkforce: undefined,
  industryLine: '',
  tin: '',
  ownerPresidentName: '',
  contactPersonName: '',
  contactPersonPosition: '',
  emailAddress: '',
  mobileNumber: '',
  telephoneNumber: '',
  faxNumber: '',
  street: '',
  barangay: '',
  cityMunicipality: '',
  province: 'Agusan del Sur',
  isMainOffice: true,
}

export function toEstablishmentFormValues(row: EstablishmentFormFields): EstablishmentFormValues {
  return {
    businessName: row.business_name,
    tradeName: row.trade_name ?? '',
    acronym: row.acronym ?? '',
    employerCategory: row.employer_category,
    publicEmployerType: row.public_employer_type ?? undefined,
    privateEmployerType: row.private_employer_type ?? undefined,
    totalWorkforce: row.total_workforce ?? undefined,
    industryLine: row.industry_line ?? '',
    tin: row.tin ?? '',
    ownerPresidentName: row.owner_president_name ?? '',
    contactPersonName: row.contact_person_name ?? '',
    contactPersonPosition: row.contact_person_position ?? '',
    emailAddress: row.email_address ?? '',
    mobileNumber: row.mobile_number ?? '',
    telephoneNumber: row.telephone_number ?? '',
    faxNumber: row.fax_number ?? '',
    street: row.street ?? '',
    barangay: row.barangay ?? '',
    cityMunicipality: row.city_municipality ?? '',
    province: row.province ?? '',
    isMainOffice: row.is_main_office ?? true,
  }
}

const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

export function toEstablishmentFormFields(values: Partial<EstablishmentFormValues>): EstablishmentFormFields {
  const category = values.employerCategory ?? 'Private'
  const isPublic = category === 'Public'
  return {
    business_name: (values.businessName ?? '').trim(),
    trade_name: orNull(values.tradeName),
    acronym: orNull(values.acronym),
    tin: orNull(values.tin),
    employer_category: category,
    // Only the type matching the selected category is kept.
    public_employer_type: isPublic ? (values.publicEmployerType ?? null) : null,
    private_employer_type: isPublic ? null : (values.privateEmployerType ?? null),
    is_main_office: values.isMainOffice ?? true,
    total_workforce: values.totalWorkforce ?? null,
    industry_line: orNull(values.industryLine),
    street: orNull(values.street),
    barangay: orNull(values.barangay),
    city_municipality: orNull(values.cityMunicipality),
    province: orNull(values.province),
    owner_president_name: orNull(values.ownerPresidentName),
    contact_person_name: orNull(values.contactPersonName),
    contact_person_position: orNull(values.contactPersonPosition),
    telephone_number: orNull(values.telephoneNumber),
    mobile_number: orNull(values.mobileNumber),
    fax_number: orNull(values.faxNumber),
    email_address: orNull(values.emailAddress),
  }
}

const optionalText = z.string().trim().optional()

/** Zod shape of the NSRP Form 2 fields; spread into a form's schema. */
export const establishmentFormShape = {
  businessName: optionalText,
  tradeName: optionalText,
  acronym: optionalText,
  employerCategory: z.enum(EMPLOYER_CATEGORIES),
  publicEmployerType: z.enum(PUBLIC_EMPLOYER_TYPES).optional(),
  privateEmployerType: z.enum(PRIVATE_EMPLOYER_TYPES).optional(),
  totalWorkforce: z.enum(TOTAL_WORKFORCE_OPTIONS).optional(),
  industryLine: optionalText,
  tin: optionalText,
  ownerPresidentName: optionalText,
  contactPersonName: optionalText,
  contactPersonPosition: optionalText,
  emailAddress: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional(),
  mobileNumber: optionalText,
  telephoneNumber: optionalText,
  faxNumber: optionalText,
  street: optionalText,
  barangay: optionalText,
  cityMunicipality: optionalText,
  province: optionalText,
  isMainOffice: z.boolean(),
}

/** Fields a complete NSRP Form 2 must have (trade name, acronym, fax and street stay optional). */
const REQUIRED_TEXT_FIELDS: { key: keyof EstablishmentFormValues; label: string }[] = [
  { key: 'businessName', label: 'Business name' },
  { key: 'tin', label: 'TIN' },
  { key: 'industryLine', label: 'Line of industry' },
  { key: 'ownerPresidentName', label: 'Owner / President' },
  { key: 'contactPersonName', label: 'Contact person' },
  { key: 'contactPersonPosition', label: 'Position' },
  { key: 'emailAddress', label: 'Email address' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'cityMunicipality', label: 'City / Municipality' },
  { key: 'province', label: 'Province' },
]

/**
 * Adds an issue for every missing field of a complete NSRP Form 2. `pathPrefix` is used when
 * the Form 2 fields are nested in a larger form.
 */
export function refineCompleteEstablishmentForm(
  values: Partial<EstablishmentFormValues>,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = []
) {
  const missing = (key: keyof EstablishmentFormValues, label: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...pathPrefix, key], message: `${label} is required.` })

  for (const { key, label } of REQUIRED_TEXT_FIELDS) {
    const value = values[key]
    if (typeof value !== 'string' || !value.trim()) missing(key, label)
  }
  if (!values.totalWorkforce) missing('totalWorkforce', 'Total workforce')
  if (values.employerCategory === 'Public' && !values.publicEmployerType) missing('publicEmployerType', 'Employer type')
  if (values.employerCategory === 'Private' && !values.privateEmployerType) missing('privateEmployerType', 'Employer type')
  if (!values.mobileNumber?.trim() && !values.telephoneNumber?.trim()) {
    missing('mobileNumber', 'A mobile or telephone number')
  }
}
