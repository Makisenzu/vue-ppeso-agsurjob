import { ref } from 'vue'
import { defineStore } from 'pinia'
import { companyAccessService } from '@/services/employer/companyAccessService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { CompanyInvitation, CompanyMemberAccount, CompanyMemberRole } from '@/types/employer/companyAccess'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** The owner's Team page: members who sign in for the company, and pending invitations (migration 081) */
export const useCompanyAccessStore = defineStore('employerCompanyAccess', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const members = ref<CompanyMemberAccount[]>([])
  const invitations = ref<CompanyInvitation[]>([])
  const isLoading = ref(false)
  const isInviting = ref(false)
  const isBulkRemoving = ref(false)
  /** Invitation id or member id being changed */
  const busyId = ref<string | number | null>(null)

  // ─── Actions ───

  async function fetchAccess(): Promise<void> {
    const companyId = authStore.employerProfile?.id
    if (!companyId) return
    isLoading.value = true
    try {
      const [memberRows, invitationRows] = await Promise.all([
        companyAccessService.fetchMembers(),
        companyAccessService.fetchPendingInvitations(companyId),
      ])
      members.value = memberRows
      invitations.value = invitationRows
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to load your team.'))
    } finally {
      isLoading.value = false
    }
  }

  async function refreshInvitations(): Promise<void> {
    const companyId = authStore.employerProfile?.id
    if (companyId) invitations.value = await companyAccessService.fetchPendingInvitations(companyId)
  }

  async function invite(email: string, memberRole: CompanyMemberRole): Promise<boolean> {
    isInviting.value = true
    try {
      await companyAccessService.invite(email, memberRole)
      toastAlert.success('Invitation sent', `${email} will get an email to join.`)
      return true
    } catch (error: unknown) {
      toastAlert.error('Invitation not sent', errorMessageOf(error, 'Failed to send the invitation.'))
      return false
    } finally {
      isInviting.value = false
      await refreshInvitations().catch(() => {})
    }
  }

  /** Sends a pending invitation again with a new link (the old link stops working) */
  async function resend(invitation: CompanyInvitation): Promise<void> {
    busyId.value = invitation.id
    try {
      await companyAccessService.invite(invitation.email, invitation.member_role)
      toastAlert.success('Invitation sent again')
      await refreshInvitations()
    } catch (error: unknown) {
      toastAlert.error('Invitation not sent', errorMessageOf(error, 'Failed to send the invitation.'))
    } finally {
      busyId.value = null
    }
  }

  async function revoke(invitation: CompanyInvitation): Promise<void> {
    busyId.value = invitation.id
    try {
      await companyAccessService.revokeInvitation(invitation.id)
      invitations.value = invitations.value.filter((row) => row.id !== invitation.id)
      toastAlert.success('Invitation cancelled')
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to cancel the invitation.'))
    } finally {
      busyId.value = null
    }
  }

  async function removeMember(member: CompanyMemberAccount): Promise<boolean> {
    busyId.value = member.member_id
    try {
      await companyAccessService.removeMember(member.member_id)
      members.value = members.value.filter((row) => row.member_id !== member.member_id)
      toastAlert.success('Member removed', `${member.full_name ?? member.email} can no longer access the company.`)
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to remove the member.'))
      return false
    } finally {
      busyId.value = null
    }
  }

  /** Bulk remove from the Team table (DESIGN.md §13.1); refetches so skipped rows stay visible */
  async function removeMembers(memberIds: number[]): Promise<boolean> {
    isBulkRemoving.value = true
    try {
      const removed = await companyAccessService.removeMembers(memberIds)
      members.value = await companyAccessService.fetchMembers()
      toastAlert.success('Members removed', `${removed} member${removed === 1 ? '' : 's'} can no longer access the company.`)
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to remove the members.'))
      return false
    } finally {
      isBulkRemoving.value = false
    }
  }

  return {
    // State
    members,
    invitations,
    isLoading,
    isInviting,
    isBulkRemoving,
    busyId,
    // Actions
    fetchAccess,
    invite,
    resend,
    revoke,
    removeMember,
    removeMembers,
  }
})
