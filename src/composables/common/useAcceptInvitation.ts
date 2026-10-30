import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyInvitationStore } from '@/stores/common/companyInvitationStore'
import { acceptInvitationSchema, getMemberRoleLabel } from '@/helpers/employer/companyAccessHelper'
import { MIN_PASSWORD_LENGTH } from '@/helpers/common/signupHelper'
import type { AcceptInvitationFormValues } from '@/types/employer/companyAccess'

/**
 * Accept-invite page. The invite email signs the person in and opens /accept-invite?token=…; they set
 * their own name and password and join the company as a member. No NSRP form: the Privacy Notice
 * (router guard) is the only step after this.
 */
export function useAcceptInvitation() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const store = useCompanyInvitationStore()
  const { invitation, isLoading, isAccepting, loadError } = storeToRefs(store)

  const token = computed(() => String(route.query.token ?? ''))
  const roleLabel = computed(() => getMemberRoleLabel(invitation.value?.member_role))
  /** Re-invited member: joins with the account they already have, no set-up form */
  const hasAccount = computed(() => invitation.value?.has_account === true)

  const { handleSubmit } = useForm<AcceptInvitationFormValues>({
    validationSchema: toTypedSchema(acceptInvitationSchema),
    initialValues: { firstname: '', lastname: '', contact_number: '', password: '', confirm_password: '' },
  })

  const acceptInvitation = handleSubmit(async (values) => {
    const joined = await store.accept(token.value, {
      firstname: values.firstname,
      lastname: values.lastname,
      contactNumber: values.contact_number,
      password: values.password,
    })
    // The router guard takes them to the Privacy Notice first, then the employer dashboard
    if (joined) await router.replace({ name: 'employer-dashboard' })
  })

  async function rejoin() {
    if (await store.accept(token.value)) await router.replace({ name: 'employer-dashboard' })
  }

  onMounted(async () => {
    await authStore.init()
    await store.loadInvitation(token.value)
  })

  return {
    invitation,
    roleLabel,
    hasAccount,
    isLoading,
    isAccepting,
    loadError,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    acceptInvitation,
    rejoin,
  }
}
