import * as z from 'zod'
import type { EstablishmentFormFields } from '@/types/common/establishment'
import type {
  CompanyEstablishmentSummary,
  CompanyInsert,
  CompanyRow,
  EmployerCompletionStepKey,
  EmployerCompletionStepMeta,
  EmployerCompletionValues,
} from '@/types/employer/employerCompletion'
import {
  EMPTY_ESTABLISHMENT_FORM_VALUES,
  TIN_FORMAT_MESSAGE,
  TIN_PATTERN,
  establishmentFormShape,
  refineCompleteEstablishmentForm,
  toEstablishmentFormFields,
} from '@/helpers/common/establishmentHelper'

// ─── Steps ───

export const EMPLOYER_COMPLETION_STEPS: EmployerCompletionStepMeta[] = [
  { key: 'establishment', title: 'Establishment', description: 'NSRP Form 2 of the company you represent.' },
  { key: 'contact', title: 'Contact & Address', description: 'How PESO and applicants can reach the company.' },
  { key: 'review', title: 'Review & Submit', description: 'Check the details before sending them to PESO.' },
]

/**
 * Company owners must register their establishment (NSRP Form 2) before using the portal
 * (enforced by the router guard): a company record with a linked Form 2.
 */
export function isEmployerRecordComplete(
  company: CompanyRow | null | undefined,
  establishment: CompanyEstablishmentSummary | null | undefined,
): boolean {
  return !!company && !!establishment
}

// ─── Select Options ───

export const BUSINESS_TYPE_OPTIONS = [
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Cooperative', label: 'Cooperative' },
  { value: 'Government', label: 'Government' },
  { value: 'NGO', label: 'NGO' },
] as const

// ─── Validation Schemas (one per step) ───

const requiredText = (message: string) => z.string().trim().min(1, message)
const optionalText = (max: number) => z.string().trim().max(max, `Maximum of ${max} characters.`)

/** NSRP Form 2 fields filled on each step; the two together make a complete Form 2 */
const ESTABLISHMENT_STEP_FIELDS = {
  establishment: [
    'businessName', 'tradeName', 'acronym', 'employerCategory', 'publicEmployerType', 'privateEmployerType',
    'totalWorkforce', 'industryLine', 'tin', 'ownerPresidentName',
  ],
  contact: [
    'contactPersonName', 'contactPersonPosition', 'emailAddress', 'mobileNumber', 'telephoneNumber', 'faxNumber',
    'street', 'barangay', 'cityMunicipality', 'province', 'isMainOffice',
  ],
} as const satisfies Record<string, (keyof typeof establishmentFormShape)[]>

/** The Form 2 schema for one step: only that step's fields are checked */
function establishmentStepSchema(step: keyof typeof ESTABLISHMENT_STEP_FIELDS) {
  const keys: readonly string[] = ESTABLISHMENT_STEP_FIELDS[step]
  const shape: Record<string, z.ZodTypeAny> = Object.fromEntries(
    Object.entries(establishmentFormShape).filter(([key]) => keys.includes(key))
  )
  // A company account's TIN is required (refineCompleteEstablishmentForm) and must be a valid BIR TIN
  if (keys.includes('tin')) {
    shape.tin = z.string().trim().refine((value) => value === '' || TIN_PATTERN.test(value), TIN_FORMAT_MESSAGE).optional()
  }
  return z.object(shape).superRefine((values, ctx) =>
    refineCompleteEstablishmentForm(values, {
      path: ctx.path,
      addIssue: (issue) => {
        if (keys.includes(String(issue.path?.[0]))) ctx.addIssue(issue)
      },
    })
  )
}

/** Establishment step: the employer half of NSRP Form 2 plus the employers.companies fields Form 2 doesn't have */
const establishmentSchema = z.object({
  establishment: establishmentStepSchema('establishment'),
  business_type: requiredText('Select a business type.'),
  registration_number: optionalText(50).optional(),
  company_description: optionalText(1000).optional(),
})

/** Contact step: the contact and address half of NSRP Form 2 */
const contactSchema = z.object({
  establishment: establishmentStepSchema('contact'),
  website: z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().url().safeParse(value).success, 'Enter a full URL, e.g. https://company.com.')
    .optional(),
})

const emptySchema = z.object({})

/** Validation schema for one step — vee-validate swaps it as the owner moves between steps. */
export function getEmployerCompletionStepSchema(step: EmployerCompletionStepKey) {
  switch (step) {
    case 'establishment':
      return establishmentSchema
    case 'contact':
      return contactSchema
    default:
      return emptySchema
  }
}

// ─── Factory ───

/**
 * Starts from the company record when one exists (an older account without Form 2), and fills the
 * contact person from the owner, who usually is the one PESO calls.
 */
export function createInitialEmployerCompletionValues(
  company: CompanyRow | null,
  owner: { fullName: string; email: string; mobile: string },
): EmployerCompletionValues {
  return {
    establishment: {
      ...EMPTY_ESTABLISHMENT_FORM_VALUES,
      businessName: company?.company_name ?? '',
      industryLine: company?.industry ?? '',
      contactPersonName: owner.fullName,
      emailAddress: company?.company_email ?? owner.email,
      mobileNumber: company?.company_contact ?? owner.mobile,
    },
    claim_establishment_id: '',
    business_type: company?.business_type ?? '',
    company_description: company?.company_description ?? '',
    website: company?.website ?? '',
    registration_number: company?.registration_number ?? '',
  }
}

/**
 * vee-validate can report untouched / cleared optional fields as `undefined` (e.g. after the
 * step schema swaps), so fill every key back to its default before display or submit.
 */
export function normalizeEmployerCompletionValues(
  values: Partial<Record<keyof EmployerCompletionValues, unknown>>,
): EmployerCompletionValues {
  // Undefined entries would overwrite the defaults (and break .trim()), so only defined ones are kept
  const defined = Object.entries((values.establishment as object | undefined) ?? {}).filter(
    ([, entry]) => entry !== undefined && entry !== null
  )
  const text = (value: unknown) => (value === undefined || value === null ? '' : String(value))
  return {
    establishment: { ...EMPTY_ESTABLISHMENT_FORM_VALUES, ...Object.fromEntries(defined) },
    claim_establishment_id: text(values.claim_establishment_id),
    business_type: text(values.business_type),
    company_description: text(values.company_description),
    website: text(values.website),
    registration_number: text(values.registration_number),
  }
}

// ─── Display ───

/** The establishment address on one line (employers.companies.company_address) */
export function formatEstablishmentAddress(values: EmployerCompletionValues['establishment']): string {
  return [values.street, values.barangay && `Brgy. ${values.barangay}`, values.cityMunicipality, values.province]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ')
}

// ─── Payload Builders ───

const textOrNull = (value: string | null | undefined) => value?.trim() || null

/** NSRP Form 2 columns for employers.register_company_establishment (migration 074) */
export function buildEstablishmentForm(values: EmployerCompletionValues): EstablishmentFormFields {
  return toEstablishmentFormFields(values.establishment)
}

/** employers.companies, derived from Form 2 so both records name the same establishment */
export function buildCompanyPayload(values: EmployerCompletionValues, profileId: string): CompanyInsert {
  const establishment = values.establishment
  return {
    profile_id: profileId,
    company_name: establishment.businessName.trim(),
    company_email: textOrNull(establishment.emailAddress),
    company_contact: textOrNull(establishment.mobileNumber) ?? textOrNull(establishment.telephoneNumber),
    business_type: textOrNull(values.business_type),
    industry: textOrNull(establishment.industryLine),
    company_address: textOrNull(formatEstablishmentAddress(establishment)),
    company_description: textOrNull(values.company_description),
    website: textOrNull(values.website),
    registration_number: textOrNull(values.registration_number),
  }
}
