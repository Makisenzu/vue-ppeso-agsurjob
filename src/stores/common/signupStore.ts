import { defineStore } from 'pinia'
import { ref } from 'vue'
import { signupService } from '@/services/common/signupService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  SignupProfileForm,
  SignupApplicantForm,
  SignupCompanyForm,
  SignupRole,
  UserRole,
} from '@/types/common/signup'
import {
  createEmptyProfileForm,
  createEmptyApplicantForm,
  createEmptyCompanyForm,
  buildProfileInsert,
  buildApplicantInsert,
  buildCompanyInsert,
} from '@/helpers/common/signupHelper'

export const useSignupStore = defineStore('signup', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const selectedRole = ref<SignupRole | null>(null)
  const profileForm = ref<SignupProfileForm>(createEmptyProfileForm())
  const applicantForm = ref<SignupApplicantForm>(createEmptyApplicantForm())
  const companyForm = ref<SignupCompanyForm>(createEmptyCompanyForm())
  const confirmPassword = ref('')
  const currentStep = ref(0)
  const isSubmitting = ref(false)
  const submitError = ref('')

  // ─── Actions ───

  async function submitSignup(): Promise<void> {
    if (!selectedRole.value) {
      throw new Error('No role selected')
    }

    isSubmitting.value = true
    submitError.value = ''

    try {
      const profileRole: UserRole = selectedRole.value

      // 1. Sign up the user with Supabase Auth
      const result = await signupService.signUp({
        email: profileForm.value.email,
        password: profileForm.value.password,
        options: {
          data: {
            role: profileRole,
            firstname: profileForm.value.firstname,
            middlename: profileForm.value.middlename,
            lastname: profileForm.value.lastname,
            birthdate: profileForm.value.birthdate,
            gender: profileForm.value.gender,
            contact_number: profileForm.value.contact_number,
            region: profileForm.value.region,
            province: profileForm.value.province,
            geographic: profileForm.value.geographic,
            barangay: profileForm.value.barangay,
            is_4ps: profileForm.value.is_4ps,
            is_pwd: profileForm.value.is_pwd,
            username: profileForm.value.username,
          },
        },
      })

      const userId = result.user?.id
      if (!userId) {
        throw new Error('No user ID returned from signup.')
      }

      // 2. Insert profile data into core.profiles
      const profilePayload = buildProfileInsert(profileForm.value, userId, profileRole)
      await signupService.insertProfile(profilePayload)

      // 3. Insert role-specific data
      if (profileRole === 'applicant') {
        const applicantPayload = buildApplicantInsert(
          applicantForm.value,
          profileForm.value,
          userId,
        )
        await signupService.insertApplicant(applicantPayload)
      } else if (profileRole === 'company_owner') {
        const companyPayload = buildCompanyInsert(companyForm.value, userId)
        await signupService.insertCompany(companyPayload)
      }

      toastAlert.success('Account created successfully!')
    } catch (error: any) {
      submitError.value = error?.message || 'Signup failed. Please try again.'
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  function clearSignupData(): void {
    selectedRole.value = null
    profileForm.value = createEmptyProfileForm()
    applicantForm.value = createEmptyApplicantForm()
    companyForm.value = createEmptyCompanyForm()
    confirmPassword.value = ''
    currentStep.value = 0
    isSubmitting.value = false
    submitError.value = ''
  }

  return {
    // State
    selectedRole,
    profileForm,
    applicantForm,
    companyForm,
    confirmPassword,
    currentStep,
    isSubmitting,
    submitError,
    // Actions
    submitSignup,
    clearSignupData,
  }
})
