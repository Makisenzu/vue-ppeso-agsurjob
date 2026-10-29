import type { Database } from '@/types/database.types'

/** Row type for the `companies` table in employers schema. */
export type EmployerRecord = Database['employers']['Tables']['companies']['Row']

/** Row type for the `profiles` table in core schema. */
export type ProfileRecord = Database['core']['Tables']['profiles']['Row']

/** Verification status enum pulled from the database types. */
export type VerificationStatus = Database['public']['Enums']['status_type']

/**
 * employers.companies.cover_photo_path / logo_path (migrations 076, 078). Not in database.types.ts until
 * `npm run types:gen` is re-run; drop this and read the columns from EmployerRecord after that.
 */
export type CompanyMediaFields = { cover_photo_path?: string | null; logo_path?: string | null }

/** Company images stored in the owner's media folder */
export type CompanyMediaKind = 'cover' | 'logo'

/**
 * Row of employers.company_team_members (migration 077), written by hand until `npm run types:gen`
 * is re-run; replace with Database['employers']['Tables']['company_team_members']['Row'] after that.
 */
export interface CompanyTeamMember {
  id: string
  company_id: string
  full_name: string
  position: string | null
  photo_path: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/** Values of the add / edit team member form */
export interface CompanyTeamMemberFormValues {
  full_name: string
  position: string
}

/** Company profile sections the owner edits one at a time */
export type CompanyProfileSection = 'details' | 'contact' | 'about' | 'location'

/**
 * The shape returned by the company profile service after fetching
 * and joining employer + owner profile data.
 */
export interface CompanyProfileResult {
  employer: EmployerRecord | null
  ownerProfile: ProfileRecord | null
}
