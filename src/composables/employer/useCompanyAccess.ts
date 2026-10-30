import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyAccessStore } from '@/stores/employer/companyAccessStore'
import { formatAccessDate, getMemberRoleLabel, inviteMemberSchema } from '@/helpers/employer/companyAccessHelper'
import {
  COMPANY_MEMBER_ROLE_OPTIONS,
  type CompanyMemberAccount,
  type InviteMemberFormValues,
} from '@/types/employer/companyAccess'

/** Team page (owner only): members who sign in for the company, pending invitations, invite dialog */
export function useCompanyAccess() {
  const authStore = useAuthStore()
  const store = useCompanyAccessStore()
  const { members, invitations, isLoading, isInviting, busyId } = storeToRefs(store)

  const memberRows = computed(() =>
    members.value.map((member) => ({
      member,
      name: member.full_name ?? member.email ?? 'Member',
      detail: [member.email, `Joined ${formatAccessDate(member.joined_at)}`].filter(Boolean).join(' · '),
      roleLabel: getMemberRoleLabel(member.member_role),
    })),
  )

  const invitationRows = computed(() =>
    invitations.value.map((invitation) => ({
      invitation,
      roleLabel: getMemberRoleLabel(invitation.member_role),
      isExpired: new Date(invitation.expires_at) < new Date(),
      expiresLabel: formatAccessDate(invitation.expires_at),
    })),
  )

  // ─── Invite dialog ───
  const isInviteOpen = ref(false)
  const { handleSubmit, resetForm } = useForm<InviteMemberFormValues>({
    validationSchema: toTypedSchema(inviteMemberSchema),
  })

  function openInvite() {
    resetForm({ values: { email: '', member_role: 'recruiter' } })
    isInviteOpen.value = true
  }

  const sendInvite = handleSubmit(async (values) => {
    if (await store.invite(values.email, values.member_role)) isInviteOpen.value = false
  })

  // ─── Remove member (AlertDialog) ───
  const memberToRemove = ref<CompanyMemberAccount | null>(null)
  const isRemoveOpen = computed({
    get: () => memberToRemove.value !== null,
    set: (open: boolean) => {
      if (!open) memberToRemove.value = null
    },
  })

  async function confirmRemove() {
    const member = memberToRemove.value
    if (member && (await store.removeMember(member))) memberToRemove.value = null
  }

  onMounted(async () => {
    await authStore.init()
    await store.fetchAccess()
  })

  return {
    memberRows,
    invitationRows,
    isLoading,
    busyId,
    // Invite
    isInviteOpen,
    isInviting,
    roleOptions: COMPANY_MEMBER_ROLE_OPTIONS,
    openInvite,
    sendInvite,
    resend: store.resend,
    revoke: store.revoke,
    // Remove
    memberToRemove,
    isRemoveOpen,
    confirmRemove,
  }
}
