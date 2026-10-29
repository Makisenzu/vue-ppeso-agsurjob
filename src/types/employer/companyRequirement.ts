import type { Database } from '@/types/database.types'

/** `public.requirement_templates.requirement_type` of the company requirements (migration 079) */
export const EMPLOYER_REQUIREMENT_TYPE = 'employer_requirements'

/** Status of a document or of the company's verification (public.status_type values PESO uses) */
export type CompanyReviewStatus = 'pending' | 'approved' | 'rejected'

export const COMPANY_REVIEW_STATUS_OPTIONS: { value: CompanyReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/**
 * The mandatory company documents, matched to `requirement_templates` by name (seeded by migration 079).
 * Order here is the display and stepper order.
 */
export const COMPANY_REQUIREMENTS: { name: string; hint: string }[] = [
  { name: 'Company Profile', hint: 'Your company profile document.' },
  {
    name: "BIR Certificate (TIN) / SEC / Mayor's Permit",
    hint: "Upload your BIR certificate of registration, SEC registration and Mayor's permit.",
  },
  { name: 'Order of Payment', hint: 'Your order of payment.' },
]

export type RequirementTemplate = Pick<
  Database['public']['Tables']['requirement_templates']['Row'],
  'id' | 'name' | 'description' | 'sort_order'
>

export type EmployerRequirementFile = Database['employers']['Tables']['employer_requirement_files']['Row']

/** A submitted requirement (employers.employer_requirements) with its files */
export type EmployerRequirementWithFiles = Database['employers']['Tables']['employer_requirements']['Row'] & {
  employer_requirement_files: EmployerRequirementFile[]
}

/** One requirement as the pages show it: the template and the company's submission */
export interface CompanyRequirementItem {
  templateId: number
  name: string
  hint: string
  submission: EmployerRequirementWithFiles | null
  status: CompanyReviewStatus | null
  files: EmployerRequirementFile[]
}

/**
 * employers.companies.verification_remarks (migration 079). Not in database.types.ts until
 * `npm run types:gen` is re-run; read the column from the companies Row after that.
 */
export type CompanyVerificationFields = { verification_remarks?: string | null }
