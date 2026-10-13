import type { Database } from '@/types/database.types'

export type SpesRow = Database['esmdd']['Tables']['spes']['Row']
export type SpesInsert = Database['esmdd']['Tables']['spes']['Insert']
export type SpesUpdate = Database['esmdd']['Tables']['spes']['Update']

export type { SpesFormRow, SpesFormInsert, SpesFormUpdate } from '@/types/common/spesForm'
import type { SpesFormRow } from '@/types/common/spesForm'

/** Registered jobseeker (Entry of Applicants) that a staff-encoded SPES form is linked to. */
export type SpesLinkableJobseeker = Pick<
  Database['applicants']['Tables']['applicants']['Row'],
  'id' | 'profile_id' | 'first_name' | 'middle_name' | 'surname' | 'date_of_birth' | 'sex' | 'civil_status' | 'contact_numbers' | 'email'
> & { profile_id: string }

/** PESO review of a submitted SPES form (`applicants.spes_form.status` / `remarks`). */
export type SpesFormReview = Pick<SpesFormRow, 'status' | 'remarks'>

/** SPES beneficiary row joined with the SPES form it was enrolled from (`application_id`). */
export type SpesWithApplicant = SpesRow & {
  spes_form: SpesFormRow | null
}

export const SPES_APPLICANT_STATUSES = ['Pending', 'Approved', 'Rejected'] as const
export type SpesApplicantStatus = (typeof SPES_APPLICANT_STATUSES)[number]

export const SPES_STATUSES = ['Active', 'Completed', 'Terminated'] as const
export type SpesStatus = (typeof SPES_STATUSES)[number]

export const SPES_BENEFICIARY_TYPES = ['New', 'Returning'] as const
export type SpesBeneficiaryType = (typeof SPES_BENEFICIARY_TYPES)[number]
