import { ref } from 'vue'
import { defineStore } from 'pinia'
import { employerCompletionService } from '@/services/employer/employerCompletionService'
import { establishmentService } from '@/services/common/establishmentService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { buildCompanyPayload, buildEstablishmentForm } from '@/helpers/employer/employerCompletionHelper'
import type { UnclaimedEstablishmentMatch } from '@/types/common/establishment'
import type { EmployerCompletionValues } from '@/types/employer/employerCompletion'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/**
 * Submission state of "Register your establishment". The form values live only in the
 * vee-validate form inside `useEmployerCompletion`.
 */
export const useEmployerCompletionStore = defineStore('employerCompletion', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const isSubmitting = ref(false)
  const isCheckingEstablishment = ref(false)
  const errorMessage = ref('')

  // ─── Actions ───

  /**
   * NSRP Form 2 records PESO already encoded for this establishment and no account has linked yet.
   * Errors return no matches, so the owner files a new Form 2 and PESO merges any duplicate.
   */
  async function findUnclaimedEstablishments(tin: string, businessName: string): Promise<UnclaimedEstablishmentMatch[]> {
    isCheckingEstablishment.value = true
    try {
      return await establishmentService.findUnclaimedEstablishments(tin, businessName)
    } catch {
      return []
    } finally {
      isCheckingEstablishment.value = false
    }
  }

  /**
   * Saves employers.companies (derived from Form 2), then links the PESO-encoded record the owner
   * picked or files a new one (migration 074). Either way PESO reviews it.
   */
  async function submit(values: EmployerCompletionValues): Promise<void> {
    const profileId = authStore.user?.id
    if (!profileId) throw new Error('You are not signed in.')

    isSubmitting.value = true
    errorMessage.value = ''
    try {
      const payload = buildCompanyPayload(values, profileId)
      const existing = authStore.employerProfile
      const company = existing
        ? await employerCompletionService.updateCompany(existing.id, payload)
        : await employerCompletionService.insertCompany(payload)

      await establishmentService.registerCompanyEstablishment(
        company.id,
        buildEstablishmentForm(values),
        values.claim_establishment_id || null,
      )

      // Reload the bundle so the router guard sees the new Form 2 and lets the owner in
      await authStore.hydrateUserData(profileId, true)
      toastAlert.success('Establishment registered', 'PESO will review your NSRP Form 2.')
    } catch (error: unknown) {
      errorMessage.value = errorMessageOf(error, 'Failed to register your establishment. Please try again.')
      toastAlert.error('Error', errorMessage.value)
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    // State
    isSubmitting,
    isCheckingEstablishment,
    errorMessage,
    // Actions
    findUnclaimedEstablishments,
    submit,
  }
})
