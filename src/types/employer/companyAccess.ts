/**
 * Company accounts: members who sign in to work for a company, and their invitations (migration 081).
 * Written by hand until `npm run types:gen` is re-run.
 */

/** What a member may do in the company's account */
export type CompanyMemberRole = 'recruiter' | 'viewer'

export const COMPANY_MEMBER_ROLE_OPTIONS: { value: CompanyMemberRole; label: string; hint: string }[] = [
  { value: 'recruiter', label: 'Recruiter', hint: 'Posts jobs and reviews applicants.' },
  { value: 'viewer', label: 'Viewer', hint: 'Sees jobs and applicants, read only.' },
]

/** Row of employers.list_company_members() */
export interface CompanyMemberAccount {
  member_id: number
  profile_id: string
  full_name: string | null
  email: string | null
  member_role: CompanyMemberRole | null
  status: string
  joined_at: string
}

/** Row of employers.company_invitations (token_hash is never read by the app) */
export interface CompanyInvitation {
  id: string
  email: string
  member_role: CompanyMemberRole
  status: 'pending' | 'accepted' | 'revoked'
  expires_at: string
  created_at: string
}

/** Row of employers.get_company_invitation(token): what the invitee is joining */
export interface CompanyInvitationPreview {
  company_name: string
  email: string
  member_role: CompanyMemberRole
  is_expired: boolean
}

export interface InviteMemberFormValues {
  email: string
  member_role: CompanyMemberRole
}

export interface AcceptInvitationFormValues {
  firstname: string
  lastname: string
  contact_number: string
  password: string
  confirm_password: string
}
