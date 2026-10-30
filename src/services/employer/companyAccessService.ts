import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type {
  CompanyInvitation,
  CompanyInvitationPreview,
  CompanyMemberAccount,
  CompanyMemberRole,
} from '@/types/employer/companyAccess'

/**
 * employers.company_invitations and the member RPCs (migration 081) are not in database.types.ts until
 * `npm run types:gen` is re-run, so the typed client rejects their names. Use `supabase` after that.
 */
const untypedEmployers = () => (supabase as unknown as SupabaseClient).schema('employers')

/** The `{ error }` message the Edge Function returned with a non-2xx status (kept in the response body) */
async function readFunctionError(error: unknown): Promise<string | null> {
  const response = (error as { context?: Response } | null)?.context
  if (!response || typeof response.json !== 'function') return null
  try {
    const body = (await response.clone().json()) as { error?: string; message?: string }
    const message = body.error || body.message || null
    // Not deployed: Supabase answers 404 "Requested function was not found"
    return response.status === 404 && !body.error ? 'Invitations are not set up yet (Edge Function not deployed).' : message
  } catch {
    return null
  }
}

const messageOf = (error: { message?: string } | null, fallback: string) => error?.message || fallback

/**
 * Company members and invitations (migration 081). The owner invites by email; the invitation email
 * is sent by the invite-company-member Edge Function; the invitee accepts with their own account.
 */
export const companyAccessService = {
  async fetchMembers(): Promise<CompanyMemberAccount[]> {
    const { data, error } = await untypedEmployers().rpc('list_company_members')
    if (error) throw new Error(messageOf(error, 'Failed to load the members.'))
    return (data ?? []) as CompanyMemberAccount[]
  },

  async fetchPendingInvitations(companyId: string): Promise<CompanyInvitation[]> {
    const { data, error } = await untypedEmployers()
      .from('company_invitations')
      .select('id, email, member_role, status, expires_at, created_at')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw new Error(messageOf(error, 'Failed to load the invitations.'))
    return (data ?? []) as CompanyInvitation[]
  },

  /** Creates (or renews) the invitation, then emails its link */
  async invite(email: string, memberRole: CompanyMemberRole): Promise<void> {
    const { data, error } = await untypedEmployers().rpc('invite_company_member', {
      p_email: email,
      p_member_role: memberRole,
    })
    if (error) throw new Error(messageOf(error, 'Failed to create the invitation.'))

    const created = (Array.isArray(data) ? data[0] : data) as { invitation_id: string; token: string } | null
    if (!created) throw new Error('Failed to create the invitation.')

    const { data: sent, error: sendError } = await supabase.functions.invoke<{ sent?: boolean; error?: string }>(
      'invite-company-member',
      { body: { invitationId: created.invitation_id, token: created.token } },
    )
    if (sendError || !sent?.sent) {
      throw new Error(
        (await readFunctionError(sendError)) ||
          sent?.error ||
          'The invitation was saved but its email could not be sent. Try Resend.',
      )
    }
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await untypedEmployers().rpc('revoke_company_invitation', { p_invitation_id: invitationId })
    if (error) throw new Error(messageOf(error, 'Failed to cancel the invitation.'))
  },

  async removeMember(memberId: number): Promise<void> {
    const { error } = await untypedEmployers().rpc('remove_company_member', { p_member_id: memberId })
    if (error) throw new Error(messageOf(error, 'Failed to remove the member.'))
  },

  /** Invitee: the invitation behind their link, or null when it is not theirs / no longer pending */
  async fetchInvitation(token: string): Promise<CompanyInvitationPreview | null> {
    const { data, error } = await untypedEmployers().rpc('get_company_invitation', { p_token: token })
    if (error) throw new Error(messageOf(error, 'Failed to load the invitation.'))
    const rows = (data ?? []) as CompanyInvitationPreview[]
    return rows[0] ?? null
  },

  /** Invitee: sets their password, then creates their member profile and joins the company */
  async acceptInvitation(
    token: string,
    values: { firstname: string; lastname: string; contactNumber: string; password: string },
  ): Promise<void> {
    const { error: passwordError } = await supabase.auth.updateUser({ password: values.password })
    // A retry after an earlier attempt already set this password: nothing to change
    if (passwordError && passwordError.code !== 'same_password') {
      throw new Error(messageOf(passwordError, 'Failed to set your password.'))
    }

    const { error } = await untypedEmployers().rpc('accept_company_invitation', {
      p_token: token,
      p_firstname: values.firstname,
      p_lastname: values.lastname,
      p_contact_number: values.contactNumber,
    })
    if (error) throw new Error(messageOf(error, 'Failed to accept the invitation.'))
  },

  /** A member's company: their active membership (company_members, migration 034 / 081) */
  async fetchMemberCompanyId(profileId: string): Promise<string | null> {
    const { data, error } = await supabase
      .schema('employers')
      .from('company_members')
      .select('company_id')
      .eq('profile_id', profileId)
      .in('status', ['active', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(messageOf(error, 'Failed to load your company.'))
    return data?.company_id ?? null
  },
}
