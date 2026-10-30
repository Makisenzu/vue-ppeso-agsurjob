import { ref } from 'vue'
import { defineStore } from 'pinia'
import { companyAccessService } from '@/services/employer/companyAccessService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { CompanyInvitationPreview } from '@/types/employer/companyAccess'

/** Why an invite link arrived signed out, from Supabase's #error_code / #error_description */
function getInviteLinkError(): string {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = params.get('error_code') ?? ''
  if (code === 'otp_expired' || /expired|invalid/i.test(params.get('error_description') ?? '')) {
    return 'This invitation link has expired or was already used. Ask the company owner to resend it, then open the newest email.'
  }
  return params.get('error_description')?.replace(/\+/g, ' ') ||
    'Open this page from the invitation email. If you did, ask the company owner to resend it.'
}

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** Accept-invite page: the invitee joins a company with their own account (migration 081) */
export const useCompanyInvitationStore = defineStore('companyInvitation', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const invitation = ref<CompanyInvitationPreview | null>(null)
  const isLoading = ref(false)
  const isAccepting = ref(false)
  const loadError = ref<string | null>(null)

  // ─── Actions ───

  async function loadInvitation(token: string): Promise<void> {
    isLoading.value = true
    loadError.value = null
    // The link didn't sign them in: Supabase puts the reason in the URL (e.g. otp_expired)
    if (!authStore.isAuthenticated) {
      loadError.value = getInviteLinkError()
      isLoading.value = false
      return
    }
    try {
      invitation.value = token ? await companyAccessService.fetchInvitation(token) : null
      if (!invitation.value) loadError.value = 'This invitation link is not valid for your account, or it was already used.'
      else if (invitation.value.is_expired) loadError.value = 'This invitation has expired. Ask the company owner to invite you again.'
    } catch (error: unknown) {
      loadError.value = errorMessageOf(error, 'Failed to load the invitation.')
    } finally {
      isLoading.value = false
    }
  }

  /** New member: sets up the account (`values`). Re-invited member (`values` omitted): rejoins with theirs */
  async function accept(
    token: string,
    values?: { firstname: string; lastname: string; contactNumber: string; password: string },
  ): Promise<boolean> {
    const userId = authStore.user?.id
    if (!userId) return false
    isAccepting.value = true
    try {
      if (values) await companyAccessService.acceptInvitation(token, values)
      else await companyAccessService.rejoinWithInvitation(token)
      await authStore.hydrateUserData(userId, true)
      toastAlert.success(
        values ? 'Welcome to AGSURJOBS' : 'Welcome back',
        `You joined ${invitation.value?.company_name ?? 'the company'}.`,
      )
      return true
    } catch (error: unknown) {
      toastAlert.error('Could not join', errorMessageOf(error, 'Failed to accept the invitation.'))
      return false
    } finally {
      isAccepting.value = false
    }
  }

  return {
    // State
    invitation,
    isLoading,
    isAccepting,
    loadError,
    // Actions
    loadInvitation,
    accept,
  }
})
