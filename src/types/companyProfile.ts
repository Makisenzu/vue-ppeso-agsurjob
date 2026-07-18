import type { Database } from '@/types/database.types'

/** Row type for the `employers` table. */
export type EmployerRecord = Database['public']['Tables']['employers']['Row']

/** Row type for the `profiles` table. */
export type ProfileRecord = Database['public']['Tables']['profiles']['Row']

/** Verification status enum pulled from the database types. */
export type VerificationStatus = Database['public']['Enums']['status_type']

/**
 * The shape returned by the company profile service after fetching
 * and joining employer + owner profile data.
 */
export interface CompanyProfileResult {
  employer: EmployerRecord | null
  ownerProfile: ProfileRecord | null
}
