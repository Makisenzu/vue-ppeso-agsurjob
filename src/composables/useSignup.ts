import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { UserSearch, Building2 } from '@lucide/vue'
import type { Role, RoleOption } from '@/types/auth'

export function useSignup() {
  const router = useRouter()
  const authStore = useAuthStore()

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

  const progressStep = [
    {
      step: 0,
      title: 'Select Role',
      icon: 'user',
    },
    {
      step: 1,
      title: 'Personal Details',
      icon: 'user',
    },
    {
      step: 2,
      title: 'Additional Information',
      icon: 'user',
    },
    {
      step: 3,
      title: 'Review & Submit',
      icon: 'user',
    }
  ]

  const selectedRole = computed({
    get: () => authStore.selectedRole as Role | null,
    set: (role: Role | null) => {
      authStore.selectedRole = role
    },
  })
  

  const isSelected = (id: Role) => selectedRole.value === id
  const canContinue = computed(() => selectedRole.value !== null)

  const handleBack = () => {
    router.push('/login')
  }

  const step = ref(1)
  const batch = ref(1)

  function nextStep() {
    if (step.value === 0) {
      step.value = 1
      batch.value = 1
    } else if (step.value === 1) {
      if (batch.value < 3) {
        batch.value++
      } else {
        step.value = 2
        batch.value = 1
      }
    } else if (step.value === 2) {
      const maxBatches = selectedRole.value === 'applicant' ? 2 : 3
      if (batch.value < maxBatches) {
        batch.value++
      } else {
        console.log("Ready to submit!")
      }
    }
  }

    function prevStep() {
    if (step.value === 2) {
      if (batch.value > 1) {
        batch.value--
      } else {
        step.value = 1
        batch.value = 3 // Step 1 has 3 batches
      }
    } else if (step.value === 1) {
      if (batch.value > 1) {
        batch.value--
      } else {
        step.value = 0 // Go back to role selection
      }
    }
  }

  const currentStep = computed(() => step.value)

  return {
    router,
    roles,
    selectedRole,
    isSelected,
    canContinue,
    handleBack,
    step,
    currentStep,
    nextStep,
    prevStep,
    progressStep,
    batch,
  }
}
