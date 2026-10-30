// ==============================================================================
// Supabase Edge Function: invite-company-member
// Description: Emails a company invitation link created by employers.invite_company_member
//              (migration 081). The link opens /accept-invite?token=… signed in as the invitee.
// Access:      The company owner who created the invitation. The caller's JWT is verified; the
//              service-role key is used only to send the auth email (it cannot be sent from the
//              browser) and to read the invitation to check the caller owns it and the token matches.
// Secrets:     SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (set by Supabase),
//              SITE_URL (optional; else the calling app's Origin is used), ALLOWED_ORIGINS (optional)
//              The link's address must be in Auth → URL Configuration → Redirect URLs, or Supabase
//              sends the invitee to the Site URL instead, so a forged Origin cannot redirect anywhere.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

// Errors whose message is safe to show the caller, with their HTTP status
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Same hash as employers.hash_invitation_token (SHA-256, hex) */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req)
  const jsonResponse = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders, status: 200 })

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) throw new HttpError(401, 'Sign in to invite members.')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    // The app's own address: the SITE_URL secret, or the page the owner invited from
    const siteUrl = (Deno.env.get('SITE_URL') || req.headers.get('Origin') || '').replace(/\/+$/, '')
    if (!supabaseUrl || !anonKey || !serviceKey || !/^https?:\/\//.test(siteUrl)) {
      throw new HttpError(500, 'Invitations are not set up yet.')
    }

    // 1. The caller
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) throw new HttpError(401, 'Sign in to invite members.')

    // 2. The invitation: pending, not expired, created for the caller's company, token matches
    const body = await req.json().catch(() => ({}))
    const invitationId = String(body.invitationId ?? '')
    const token = String(body.token ?? '')
    if (!UUID_PATTERN.test(invitationId) || !TOKEN_PATTERN.test(token)) throw new HttpError(400, 'Invalid invitation.')

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data: invitation, error: invitationError } = await admin
      .schema('employers')
      .from('company_invitations')
      .select('id, email, status, expires_at, token_hash, companies (profile_id)')
      .eq('id', invitationId)
      .maybeSingle()
    if (invitationError) throw new HttpError(500, 'Could not load the invitation.')

    const ownerId = (invitation?.companies as { profile_id: string } | null)?.profile_id
    if (!invitation || ownerId !== userData.user.id) throw new HttpError(404, 'Invitation not found.')
    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      throw new HttpError(409, 'This invitation is no longer active.')
    }
    if (invitation.token_hash !== (await sha256Hex(token))) throw new HttpError(404, 'Invitation not found.')

    // 3. Send. A first invite creates the login and emails it; a re-invite of a login that never
    //    accepted (the user exists already) is sent as a sign-in link instead.
    const redirectTo = `${siteUrl}/accept-invite?token=${token}`
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(invitation.email, { redirectTo })
    if (inviteError) {
      const alreadyExists = /already|registered|exists/i.test(inviteError.message)
      if (!alreadyExists) {
        console.error('inviteUserByEmail failed:', inviteError.message)
        throw new HttpError(502, `The invitation email could not be sent: ${inviteError.message}`)
      }
      const { error: otpError } = await callerClient.auth.signInWithOtp({
        email: invitation.email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      })
      if (otpError) {
        console.error('signInWithOtp failed:', otpError.message)
        throw new HttpError(502, `The invitation email could not be sent: ${otpError.message}`)
      }
    }

    return jsonResponse({ sent: true }, 200)
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status)
    console.error('invite-company-member failed:', error)
    return jsonResponse({ error: 'The invitation could not be sent.' }, 500)
  }
})
