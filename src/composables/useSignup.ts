import { computed } from 'vue'
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

  function handleContinue() {
    if (!selectedRole.value) return
    // proceed with selectedRole.value
  }

  return {
    router,
    roles,
    selectedRole,
    isSelected,
    canContinue,
    handleBack,
    handleContinue,
  }
}
