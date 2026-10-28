import { defineStore } from 'pinia'
import { ref } from 'vue'
import { signupService } from '@/services/common/signupService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useAuthStore } from '@/stores/common/auth'
import type { SignupFormValues, SignupRole } from '@/types/common/signup'
import { PRIVACY_NOTICE_VERSION, type PrivacyPurpose, type SignupPrivacyConsent } from '@/types/common/privacy'
import {
  buildProfileInsert,
  buildApplicantInsert,
  buildCompanyInsert,
} from '@/helpers/common/signupHelper'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/**
 * Signup submission state. The form values (including the password) live only in the
 * vee-validate form inside `useSignup` — never in Pinia (SECURITY.md §6).
 */
export const useSignupStore = defineStore('signup', () => {
  const toastAlert = useToastAlert()
  const authStore = useAuthStore()

  // ─── State ───
  const isSubmitting = ref(false)
  const isCheckingEmail = ref(false)
  const submitError = ref('')

  // ─── Actions ───

  /** True when an account already uses this email; errors are treated as "not taken" so signup can still try. */
  async function isEmailTaken(email: string): Promise<boolean> {
    isCheckingEmail.value = true
    try {
      return await signupService.checkEmailExists(email)
    } catch {
      return false
    } finally {
      isCheckingEmail.value = false
    }
  }

  /**
   * `consentPurposes` are the Privacy Notice purposes the user ticked. They travel in the auth
   * metadata and the database stores them with the server's time when the profile is created
   * (core.record_signup_privacy_consent, migration 073).
   */
  async function submitSignup(role: SignupRole, values: SignupFormValues, consentPurposes: PrivacyPurpose[]): Promise<void> {
    isSubmitting.value = true
    submitError.value = ''

    try {
      // 1. Create the auth user
      const result = await signupService.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            role,
            firstname: values.first_name.trim(),
            middlename: values.middle_name.trim(),
            lastname: values.surname.trim(),
            birthdate: values.date_of_birth,
            contact_number: values.contact_number.trim(),
            username: values.username.trim(),
            privacy_consent: { version: PRIVACY_NOTICE_VERSION, purposes: consentPurposes } satisfies SignupPrivacyConsent,
          },
        },
      })

      const userId = result.user?.id
      if (!userId) {
        throw new Error('No user ID returned from signup.')
      }

      // 2. core.profiles
      await signupService.insertProfile(buildProfileInsert(values, userId, role))

      // 3. Role-specific record
      if (role === 'applicant') {
        await signupService.insertApplicant(buildApplicantInsert(values, userId))
      } else if (role === 'company_owner') {
        await signupService.insertCompany(buildCompanyInsert(values, userId))
      }

      // signUp() fires SIGNED_IN before the rows above exist, so the auth store hydrated an empty
      // profile. Reload it now so the role (and the applicant complete-profile gate) applies.
      // No-op when email confirmation is on: there is no session yet.
      if (result.session) await authStore.init(true)

      toastAlert.success(
        'Account created',
        role === 'applicant'
          ? 'Next, complete your NSRP profile to start using AGSURJOBS.'
          : 'Your employer account is ready.',
      )
    } catch (error: unknown) {
      submitError.value = errorMessageOf(error, 'Signup failed. Please try again.')
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  function clearSignupState(): void {
    isSubmitting.value = false
    isCheckingEmail.value = false
    submitError.value = ''
  }

  return {
    // State
    isSubmitting,
    isCheckingEmail,
    submitError,
    // Actions
    isEmailTaken,
    submitSignup,
    clearSignupState,
  }
})
