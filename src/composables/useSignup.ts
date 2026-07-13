import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { UserSearch, Building2 } from '@lucide/vue'
import type { Role, RoleOption } from '@/types/auth'

export function useSignup() {
  const router = useRouter()
  const authStore = useAuthStore()

  // ─── Role options ───
  const roles: RoleOption[] = [
    {
      id: 'applicant',
      label: 'Applicant',
      description: 'Search for jobs and apply to opportunities.',
      icon: UserSearch,
    },
    {
      id: 'employer',
      label: 'Employer',
      description: 'Post jobs and manage candidate applications.',
      icon: Building2,
    },
  ]

  // ─── Step definitions (displayed in the stepper, excludes step 0) ───
  const stepMeta = [
    { title: 'Select Role', description: 'Choose the role that best describes you to get started.' },
    { title: 'Personal Details', description: 'Tell us about yourself.' },
    { title: 'Address & Status', description: 'Where are you located?' },
    { title: 'Account Credentials', description: 'Set up your login information.' },
    { title: 'Additional Information', description: 'Provide details relevant to your role.' },
    { title: 'Review & Submit', description: 'Verify your information before creating your account.' },
  ]

  // Steps shown in the stepper indicator (excludes step 0 role selection)
  const progressSteps = stepMeta.slice(1).map((meta, i) => ({
    step: i + 1,
    title: meta.title,
  }))

  // ─── Role selection ───
  const selectedRole = computed({
    get: () => authStore.selectedRole as Role | null,
    set: (role: Role | null) => {
      authStore.selectedRole = role
    },
  })

  const isSelected = (id: Role) => selectedRole.value === id
  const canContinue = computed(() => selectedRole.value !== null)

  // ─── Step state ───
  const currentStep = ref(0)
  const totalSteps = 6 // 0..5
  const confirmPassword = ref('')
  const isSubmitting = ref(false)
  const submitError = ref('')

  const stepTitle = computed(() => stepMeta[currentStep.value]?.title ?? '')
  const stepDescription = computed(() => stepMeta[currentStep.value]?.description ?? '')

  // ─── Validation per step ───
  const canProceed = computed(() => {
    const s = authStore.signupData
    const a = authStore.applicantData
    const e = authStore.employerData

    switch (currentStep.value) {
      case 0:
        return selectedRole.value !== null
      case 1:
        return !!(s.firstName.trim() && s.lastName.trim() && s.birthdate && s.gender && s.contact_number.trim())
      case 2:
        return !!(s.region.trim() && s.province.trim() && s.geographic.trim() && s.barangay.trim())
      case 3:
        return !!(
          s.email.trim() &&
          s.password.length >= 6 &&
          confirmPassword.value === s.password
        )
      case 4:
        if (selectedRole.value === 'applicant') {
          return !!(a.education_level && a.employment_status)
        }
        if (selectedRole.value === 'employer') {
          return !!(e.company_name.trim() && e.company_email.trim() && e.business_type)
        }
        return false
      case 5:
        return true
      default:
        return false
    }
  })

  // ─── Navigation ───
  function nextStep() {
    if (currentStep.value < totalSteps - 1) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  const handleBack = () => {
    router.push('/login')
  }

  // ─── Submission ───
  async function handleSubmit() {
    isSubmitting.value = true
    submitError.value = ''
    try {
      authStore.signupData.role = selectedRole.value as Role
      await authStore.submitSignup()
      router.push('/login')
    } catch (error: any) {
      submitError.value = error?.message || 'Signup failed. Please try again.'
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    // Role
    roles,
    selectedRole,
    isSelected,
    canContinue,
    // Steps
    currentStep,
    totalSteps,
    stepTitle,
    stepDescription,
    progressSteps,
    canProceed,
    nextStep,
    prevStep,
    // Form
    confirmPassword,
    // Submit
    isSubmitting,
    submitError,
    handleSubmit,
    // Navigation
    handleBack,
    // Store refs
    signupData: authStore.signupData,
    applicantData: authStore.applicantData,
    employerData: authStore.employerData,
  }
}
